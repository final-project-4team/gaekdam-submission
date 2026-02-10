# 인덱스 저장/로딩/쿼리 유틸
import json, faiss, numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"

# Archived implementation moved to app.legacy_db.faiss_store
from app.legacy_db import faiss_store as archived_faiss

FaissStore = getattr(archived_faiss, 'FaissStore', None)
