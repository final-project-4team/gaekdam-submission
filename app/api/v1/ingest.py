from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class IngestResponse(BaseModel):
    message: str


@router.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    # 간단히 파일을 data/manuals에 저장하는 최소 동작
    dest = f"../data/manuals/{file.filename}"
    with open(dest, "wb") as f:
        content = await file.read()
        f.write(content)
    return IngestResponse(message=f"saved {file.filename}")
