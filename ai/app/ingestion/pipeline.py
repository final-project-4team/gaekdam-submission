# 문서청크/임베딩/FAISS 생성 및 단일 파일 증분 인제스트 지원

import os
from pathlib import Path
import json
import time
import tempfile
import shutil
from typing import List, Dict

import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from app.ingestion.parsers.pdf import extract_text_from_pdf
from app.ingestion.parsers.pptx import extract_text_from_pptx
from app.ingestion import job_status
import subprocess
from app.services import s3_client

# 사용할 임베딩 모델 이름
MODEL_NAME = "all-MiniLM-L6-v2"

# 기본 스냅샷 경로 (프로토타입용)
DEFAULT_INDEX_PATH = "data/snapshots/faiss.index"
DEFAULT_META_PATH = "data/snapshots/metadata.json"


def chunk_text(text, chunk_size=1000, overlap=200):
    """문자열을 지정한 크기와 오버랩으로 잘라서 순차적으로 반환하는 제너레이터

    Args:
        text (str): 전체 문서 텍스트
        chunk_size (int): 청크 하나의 문자 길이
        overlap (int): 이전 청크와 겹치는 문자 수

    반환:
        각 청크 문자열을 순차적으로 yield
    """
    i = 0
    n = len(text)
    while i < n:
        end = min(i + chunk_size, n)
        yield text[i:end]
        i += chunk_size - overlap


def _extract_text_for_file(path: str) -> str:
    """파일 경로에 따라 적절한 파서로 텍스트를 추출합니다. 지원: pdf, pptx, md, txt 등."""
    p = Path(path)
    suffix = p.suffix.lower()
    text = ""
    if suffix == ".pdf":
        text = extract_text_from_pdf(str(p))
    elif suffix == ".pptx":
        text = extract_text_from_pptx(str(p))
    elif suffix == ".ppt":
        try:
            outdir = str(p.parent)
            subprocess.run(["soffice", "--headless", "--convert-to", "pdf", str(p), "--outdir", outdir], check=True)
            converted = Path(outdir) / (p.stem + ".pdf")
            if converted.exists():
                text = extract_text_from_pdf(str(converted))
            else:
                text = ""
        except Exception:
            text = ""
    elif suffix in [".md", ".txt"]:
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            text = ""
    else:
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            text = ""
    return text


def _make_dirs_for(path: str):
    os.makedirs(Path(path).parent, exist_ok=True)


def _atomic_write_index_and_meta(index, meta: Dict, index_path: str, meta_path: str):
    """원자적으로 FAISS 인덱스와 메타데이터를 저장합니다.

    임시 파일에 쓰고 os.replace (원자적 교체가 가능한 시스템 호출)로 교체합니다.
    """
    index_path = str(index_path)
    meta_path = str(meta_path)
    tmp_idx = None
    tmp_meta = None
    try:
        # 임시 파일 생성
        tmp_dir = tempfile.mkdtemp(dir=os.path.dirname(index_path) or ".")
        tmp_idx = os.path.join(tmp_dir, "faiss.tmp.index")
        tmp_meta = os.path.join(tmp_dir, "metadata.tmp.json")
        faiss.write_index(index, tmp_idx)
        with open(tmp_meta, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        # 디렉토리 생성 보장
        _make_dirs_for(index_path)
        # 원자적 교체
        os.replace(tmp_idx, index_path)
        os.replace(tmp_meta, meta_path)
    finally:
        # 임시 디렉토리 정리
        try:
            if tmp_dir and os.path.isdir(tmp_dir):
                shutil.rmtree(tmp_dir)
        except Exception:
            pass


def ingest_folder(folder_path, index_path=DEFAULT_INDEX_PATH, meta_path=DEFAULT_META_PATH, chunk_size=1000, overlap=200):
    """폴더 내 모든 문서를 읽어 FAISS 벡터 인덱스와 메타데이터를 생성한다 (full rebuild).

    기존 pipeline 구현을 재사용하며, 전체 재생성(rebuild)을 수행합니다.
    """
    folder = Path(folder_path)
    model = SentenceTransformer(MODEL_NAME)
    docs = []
    metas = []

    for p in folder.glob("*"):
        if not p.is_file():
            continue
        text = _extract_text_for_file(str(p))
        # 전처리: 빈 라인 제거 등
        text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        for idx, chunk in enumerate(chunk_text(text, chunk_size=chunk_size, overlap=overlap)):
            docs.append(chunk)
            metas.append({"source": p.name, "chunk_idx": idx, "text": chunk[:300]})

    if not docs:
        print("no docs")
        return

    embeds = model.encode(docs, show_progress_bar=True, convert_to_numpy=True)
    faiss.normalize_L2(embeds)
    dim = embeds.shape[1]
    index = faiss.IndexIDMap(faiss.IndexFlatIP(dim))
    ids = np.arange(1, len(embeds) + 1).astype("int64")
    index.add_with_ids(embeds, ids)

    # 메타데이터 구조: entries(list of dict), next_id(int)
    meta = {"entries": [], "next_id": int(ids[-1]) + 1}
    for i, m in enumerate(metas):
        entry = {"id": int(ids[i]), **m}
        meta["entries"].append(entry)

    _atomic_write_index_and_meta(index, meta, index_path, meta_path)
    print(f"saved index ({len(docs)} vectors) -> {index_path}")


def _load_meta(meta_path: str) -> Dict:
    p = Path(meta_path)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {"entries": [], "next_id": 1}
    return {"entries": [], "next_id": 1}


def _load_or_create_index(index_path: str, dim: int):
    p = Path(index_path)
    if p.exists():
        try:
            return faiss.read_index(str(p))
        except Exception:
            # 실패 시 새 인덱스 생성
            return faiss.IndexIDMap(faiss.IndexFlatIP(dim))
    return faiss.IndexIDMap(faiss.IndexFlatIP(dim))


def ingest_single_file(path: str, index_path=DEFAULT_INDEX_PATH, meta_path=DEFAULT_META_PATH, chunk_size=1000, overlap=200, job_id: str = None):
    """단일 파일을 읽어 청크별로 임베딩을 만들고 기존 FAISS 인덱스에 증분 추가합니다.

    동작:
    - 파일에서 텍스트 추출
    - chunk_text로 분할
    - 임베딩 생성 및 L2 정규화
    - 기존 인덱스/메타를 로드하고, 새로운 벡터를 add_with_ids로 추가
    - 메타데이터에 새 항목을 append하고 next_id 갱신
    - 원자적으로 index와 meta를 저장

    이 함수는 job_id가 주어지면 job_status에 상태(pending->processing->done/failed)를 기록합니다.
    """
    p = Path(path)

    # mark job as processing if job_id provided
    if job_id:
        try:
            job_status.set_status(job_id, "processing", detail=f"ingest start: {p.name}")
        except Exception:
            # 상태 기록 실패는 프로세스를 중단시키지 않음
            pass

    try:
        text = _extract_text_for_file(str(p))
        text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        if not text:
            # 빈 텍스트는 실패로 기록
            if job_id:
                try:
                    job_status.set_status(job_id, "failed", detail="no text extracted from file")
                except Exception:
                    pass
            return

        chunks = list(chunk_text(text, chunk_size=chunk_size, overlap=overlap))
        if not chunks:
            if job_id:
                try:
                    job_status.set_status(job_id, "failed", detail="no chunks generated")
                except Exception:
                    pass
            return

        model = SentenceTransformer(MODEL_NAME)
        embeds = model.encode(chunks, show_progress_bar=False, convert_to_numpy=True)
        faiss.normalize_L2(embeds)
        embeds = embeds.astype("float32")

        dim = embeds.shape[1]
        # 기존 인덱스/메타 로드
        meta = _load_meta(meta_path)
        index = _load_or_create_index(index_path, dim)

        start_id = int(meta.get("next_id", 1))
        ids = np.arange(start_id, start_id + embeds.shape[0]).astype("int64")

        # FAISS에 추가
        try:
            index.add_with_ids(embeds, ids)
        except Exception:
            # 만약 index 차원이 맞지 않으면 새 인덱스를 생성하여 마이그레이션 필요
            new_index = faiss.IndexIDMap(faiss.IndexFlatIP(dim))
            # 기존 인덱스가 비어있다면 그냥 새로 추가
            new_index.add_with_ids(embeds, ids)
            index = new_index

        # 메타데이터 항목 생성
        for i, c in enumerate(chunks):
            entry = {
                "id": int(ids[i]),
                "source": p.name,
                "chunk_idx": i,
                "text": c[:300],
                "job_id": job_id,
            }
            meta.setdefault("entries", []).append(entry)

        meta["next_id"] = int(ids[-1]) + 1

        # 원자적 저장
        _atomic_write_index_and_meta(index, meta, index_path, meta_path)

        # retriever가 있다면 재로딩 시도
        try:
            from app.services import retriever
            if hasattr(retriever, "reload_index"):
                # call reload to refresh in-memory index/metadata without server restart
                try:
                    retriever.reload_index(index_path=index_path, meta_path=meta_path)
                except Exception:
                    # best-effort; ignore failures here
                    pass
        except Exception:
            pass

        # 성공 기록
        if job_id:
            try:
                job_status.set_status(job_id, "done", detail=f"ingested {len(chunks)} chunks")
            except Exception:
                pass

        return

    except Exception as e:
        # 실패 기록
        if job_id:
            try:
                job_status.set_status(job_id, "failed", detail=str(e))
            except Exception:
                pass
        # 예외 재던지기하여 상위에서 로그를 남기게 함
        raise

def ingest_from_s3(s3_uri: str, index_path: str, meta_path: str, chunk_size: int, overlap: int, job_id: str):
    """
    S3 경로에서 파일을 다운로드하여 기존 ingest_single_file로 처리.
    - s3_uri: 's3://bucket/uploads/xxx_filename.pdf'
    """
    bucket, key = s3_client.parse_s3_uri(s3_uri)
    local_path = s3_client.download_to_temp(bucket, key)
    try:
        # 기존 ingest_single_file 함수 재사용: (로컬파일경로, index_path, meta_path, chunk_size, overlap, job_id)
        ingest_single_file(local_path, index_path, meta_path, chunk_size, overlap, job_id)
    finally:
        # 임시파일 정리
        try:
            os.remove(local_path)
        except Exception:
            pass