# 인덱스 재생성 실행 스크립트
import sys, os
# 프로젝트 루트를 파이썬 경로에 추가하여 `from app...`가 항상 동작하도록 합니다.
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import json
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer

# Simple text chunker

def chunk_text(text: str, max_chars: int = 1000) -> List[str]:
    # naive paragraph-based chunking
    paras = [p.strip() for p in text.split('\n') if p.strip()]
    chunks = []
    cur = []
    cur_len = 0
    for p in paras:
        if cur_len + len(p) + 1 > max_chars and cur:
            chunks.append('\n'.join(cur))
            cur = [p]
            cur_len = len(p)
        else:
            cur.append(p)
            cur_len += len(p) + 1
    if cur:
        chunks.append('\n'.join(cur))
    return chunks


def build_index(manuals_dir: str = "data/manuals", out_index: str = "data/snapshots/faiss.index", out_meta: str = "data/snapshots/metadata.json"):
    os.makedirs(os.path.dirname(out_index), exist_ok=True)
    model = SentenceTransformer("all-MiniLM-L6-v2")

    vectors = []
    metadata = []

    for fname in os.listdir(manuals_dir):
        path = os.path.join(manuals_dir, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception:
            continue
        chunks = chunk_text(text, max_chars=1000)
        for i, chunk in enumerate(chunks):
            emb = model.encode(chunk, normalize_embeddings=True)
            vectors.append(emb)
            metadata.append({"id": f"{fname}-{i}", "source": fname, "text": chunk[:800]})

    if not vectors:
        raise RuntimeError("No vectors generated; check manuals directory")

    import faiss
    vecs = np.vstack(vectors).astype("float32")
    d = vecs.shape[1]
    index = faiss.IndexFlatIP(d)
    index.add(vecs)
    faiss.write_index(index, out_index)

    with open(out_meta, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False)

    print(f"Wrote index to {out_index} and metadata to {out_meta}")


if __name__ == "__main__":
    build_index()