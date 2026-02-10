from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, Tuple, TYPE_CHECKING
from datetime import date, datetime, timedelta
import asyncio
import logging
import unicodedata
import sys
import importlib
import types

from app.services import llm_client
from app.services.masking import mask_object, mask_string
from app.schemas.nlu import NLUResult

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    # avoid runtime import issues with static type checkers
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class ChatRequest(BaseModel):
    userId: Optional[str] = None
    sessionId: Optional[str] = None
    message: str
    customerAttributes: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
    sources: Optional[list] = []


async def handle_manual_rag(message: str) -> ChatResponse:
    """문서 기반(RAG) 처리 로직을 별도 함수로 분리하여 테스트에서 모킹/호출하기 쉽게 만듭니다."""
    from app.services import retriever

    docs = retriever.retrieve_similar_docs(message, top_k=3)
    # retriever may be sync or async (tests may monkeypatch an async function); await if coroutine
    if asyncio.iscoroutine(docs):
        docs = await docs
    if not docs:
        return ChatResponse(reply="관련 매뉴얼을 찾지 못했습니다. 질문을 다르게 표현해 보시겠어요?", sources=[])

    # docs now grouped by source with snippets
    context_parts = []
    sources = []
    for d in docs:
        src = d.get("source")
        snippets = d.get("snippets", [])
        masked_snips = [mask_string(s) for s in snippets]
        context_parts.append(f"[출처: {src}]\n" + "\n\n".join(masked_snips))
        sources.append({"type": "manual", "source": src, "score": d.get("score")})

    context = "\n\n".join(context_parts)
    prompt = (
        "아래는 매뉴얼/문서의 발췌(그룹화된 스니펫)입니다. 사용자의 질문에 대해 출처 표기를 포함하여 한국어로 친절히 답변하시오. 민감정보(PII)는 절대 노출하지 마시오.\n\n"
        f"사용자 질문: {mask_string(message)}\n\n문서들:\n{context}\n\n응답 시 각 문단 끝에 [출처: 파일명] 형식으로 표기하고, 불필요한 전문용어는 풀어서 설명하세요."
    )
    summary = await llm_client.generate(prompt, temperature=0.0, max_tokens=400)
    return ChatResponse(reply=summary, sources=sources)


@router.post("/chat")
async def chat(req: ChatRequest, session=None):
    """모든 수신 질의를 문서(RAG) 경로로 강제 라우팅합니다.
    The `session` parameter is accepted for compatibility with legacy callers/tests
    that pass a DB session; it's not used in the RAG-only runtime.
    """
    logger.debug("모든 질의에 대한 라우팅을 메뉴얼 RAG 기반으로 응답합니다. message=%s", req.message)    
    return await handle_manual_rag(req.message)

# Create a virtual submodule name so tests can import "app.api.v1.chat.nlu" even
# though we keep the runtime nlu implementation under app.services.nlu. This avoids
# having to convert this module into a package on disk.
try:
    # Try to import the real runtime implementation and register it under the virtual
    # import path. Also set it as an attribute on this module so `app.api.v1.chat.nlu`
    # is available as an attribute (not only in sys.modules) which allows monkeypatch
    # to replace attributes like `nlu.some_fn` by assigning to the attribute on the
    # module object.
    target = importlib.import_module("app.services.nlu")
    sys.modules.setdefault("app.api.v1.chat.nlu", target)
    # expose as attribute on this module
    sys.modules[__name__].nlu = sys.modules["app.api.v1.chat.nlu"]
except Exception:
    # If the real service module cannot be imported (test isolation), ensure there's
    # at least an empty module object so monkeypatching of attributes succeeds.
    mod = types.ModuleType("app.api.v1.chat.nlu")
    sys.modules["app.api.v1.chat.nlu"] = mod
    sys.modules[__name__].nlu = mod