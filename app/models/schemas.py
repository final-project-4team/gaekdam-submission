from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ChatRequest(BaseModel):
    userId: Optional[str]
    sessionId: Optional[str]
    message: str
    customerAttributes: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
    sources: Optional[List[Dict[str, Any]]] = None
