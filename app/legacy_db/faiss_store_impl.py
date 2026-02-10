# Full original FaissStore implementation archived here.
import json, faiss, numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"

class FaissStore:
    def __init__(self, index_path="data/snapshots/faiss.index", meta_path="data/snapshots/metadata.json"):
        self.index_path = index_path
        self.meta_path = meta_path
        self.model = SentenceTransformer(MODEL_NAME)
        self.index = None
        self.metas = []
        self._load()

    def _load(self):
        try:
            self.index = faiss.read_index(self.index_path)
            with open(self.meta_path, "r", encoding="utf-8") as f:
                self.metas = json.load(f)
            print("faiss index loaded")
        except Exception as e:
            print("failed to load index:", e)
            self.index = None

    def query(self, query_text, top_k=12):
        if self.index is None: return []
        q_emb = self.model.encode([query_text], convert_to_numpy=True)
        faiss.normalize_L2(q_emb)
        D, I = self.index.search(q_emb, top_k)
        results = []
        for score, idx in zip(D[0], I[0]):
            if idx < 0: continue
            meta = self.metas[idx]
            results.append({"score": float(score), "meta": meta})
        return results
