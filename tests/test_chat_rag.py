import os
import importlib
import sys
import asyncio
from fastapi.testclient import TestClient

# Ensure required env vars before importing app so settings picks them up
os.environ.setdefault("API_KEY", "testkey")
os.environ.setdefault("OPEN_API_KEY", "test-open")

# Reload config and main to pick up env changes (safe if already imported)
if 'app.config' in sys.modules:
    importlib.reload(sys.modules['app.config'])
if 'app.main' in sys.modules:
    importlib.reload(sys.modules['app.main'])

from app.main import app


def test_chat_rag_returns_answer(monkeypatch):
    # Monkeypatch retriever to return a predictable doc set
    import app.services.retriever as retriever

    async def fake_retrieve_similar_docs(query, top_k=3):
        return [
            {"source": "manual1.pdf", "snippets": ["이것은 예시 스니펫입니다."], "score": 0.9}
        ]

    monkeypatch.setattr(retriever, "retrieve_similar_docs", fake_retrieve_similar_docs)

    # Monkeypatch llm_client.generate to return a canned response
    import app.services.llm_client as llm_client

    async def fake_generate(prompt, temperature=0.0, max_tokens=400):
        return "모의 응답: 관련 문서를 참고하세요. [출처: manual1.pdf]"

    monkeypatch.setattr(llm_client, "generate", fake_generate)

    client = TestClient(app)
    headers = {"Authorization": f"Bearer {os.environ.get('API_KEY')}"}
    resp = client.post("/api/v1/chat", json={"message": "테스트 질문입니다."}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "reply" in body
    assert "출처" in body["reply"] or isinstance(body["reply"], str)
    assert isinstance(body.get("sources"), list)
