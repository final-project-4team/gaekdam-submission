# app/ingestion/job_status.py
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

JOBS_DIR = Path("data/jobs")
JOBS_DIR.mkdir(parents=True, exist_ok=True)

def _path_for(job_id: str) -> Path:
    return JOBS_DIR / f"{job_id}.json"

def set_status(job_id: str, status: str, detail: Optional[str] = None, s3_key: Optional[str] = None, source: Optional[str] = None, extra: Optional[Dict[str, Any]] = None) -> None:
    """Set job status. status: pending/processing/done/failed
    detail: human-readable detail
    s3_key: if job refers to S3 object key (uploads/...)
    source: optional source label (s3/local)
    extra: any other metadata dict
    """
    p = _path_for(job_id)
    payload: Dict[str, Any] = {
        "job_id": job_id,
        "status": status,
        "detail": detail or "",
        "s3_key": s3_key or "",
        "source": source or "",
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "meta": extra or {}
    }
    p.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

def get_status(job_id: str) -> Dict:
    """Return status dict; raise FileNotFoundError if not exists."""
    p = _path_for(job_id)
    if not p.exists():
        raise FileNotFoundError(job_id)
    return json.loads(p.read_text(encoding="utf-8"))