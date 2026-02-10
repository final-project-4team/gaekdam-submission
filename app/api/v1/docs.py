# app/api/v1/docs.py
# 설명: 프론트에서 파일 업로드를 받아 로컬에 저장하고 백그라운드로 ingestion 을 호출합니다.

import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from typing import Dict

from app.ingestion import pipeline  # reuse existing pipeline.ingest_folder for full-folder reindex
from app.ingestion import job_status

router = APIRouter(prefix="/api/v1/docs")

# local storage directory for uploaded manuals
MANUALS_DIR = Path("data/manuals")
MANUALS_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_manual(file: UploadFile = File(...), background_tasks: BackgroundTasks = None) -> Dict:
    # Accept only pdf and txt for prototype
    filename = Path(file.filename).name
    ext = filename.split(".")[-1].lower()
    if ext not in ("pdf", "txt"):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use pdf or txt.")

    job_id = str(uuid.uuid4())
    dest = MANUALS_DIR / f"{job_id}_{filename}"

    # Upload Handler
    # save file to local disk
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    # record initial job status as 'pending'
    try:
        job_status.set_status(job_id, "pending", detail=f"saved {dest.name}")
    except Exception:
        pass

    # schedule background ingestion (fast response)
    if background_tasks is not None:
        # Use incremental ingest: process only the uploaded file and append to FAISS
        background_tasks.add_task(pipeline.ingest_single_file, str(dest), pipeline.DEFAULT_INDEX_PATH, pipeline.DEFAULT_META_PATH, 1000, 200, job_id)
    else:
        # synchronous fallback: run incremental ingest (blocking)
        pipeline.ingest_single_file(str(dest), pipeline.DEFAULT_INDEX_PATH, pipeline.DEFAULT_META_PATH, 1000, 200, job_id)

    return {"job_id": job_id, "filename": filename, "status": "processing"}


@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Return ingestion job status for given job_id (pending/processing/done/failed)."""
    try:
        return job_status.get_status(job_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="job not found")