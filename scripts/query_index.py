# 간단 쿼리 테스트 스크립트
from app.services.faiss_store import FaissStore
import sys
if __name__ == "__main__":
    q = " ".join(sys.argv[1:]) or "예약 취소 방법"
    store = FaissStore()
    results = store.query(q, top_k=5)
    for r in results:
        print(r["score"], r["meta"]["source"], r["meta"]["chunk_idx"])
        print(r["meta"]["text"][:400])
        print("----")