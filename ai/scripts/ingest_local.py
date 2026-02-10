# 로컬개발용
import os
from app.ingestion import pipeline

if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "manuals")
    pipeline.ingest_folder(data_dir)
