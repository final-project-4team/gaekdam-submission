from jinja2 import Template
from typing import List, Dict

BASE_PROMPT = """

문의: {{ message }}
응답: {{ tone }}:

지침:
- 출력은 문서 내의 'A.'로 시작하는 답변 부분만 그대로 출력하세요.
- 다른 설명, 접두어/후속 문장, 추가 형식(마크다운 등)을 포함하지 마세요.
- 공백과 줄바꿈은 원문 A. 부분을 그대로 유지하세요.
"""


def _format_local_docs(local_docs: List[Dict]) -> str:
    if not local_docs:
        return "(없음)"
    lines = []
    for i, d in enumerate(local_docs):
        src = d.get("source") or d.get("file") or "unknown"
        chunk = d.get("chunk_idx")
        score = d.get("score")
        excerpt = d.get("text") or d.get("excerpt") or ""
        excerpt = (excerpt[:300] + "...") if len(excerpt) > 300 else excerpt
        meta = f"source={src}"
        if chunk is not None:
            meta += f", chunk_idx={chunk}"
        if score is not None:
            meta += f", score={score:.3f}"
        lines.append(f"- [DOC{i}] {meta}\n  {excerpt}")
    return "\n".join(lines)


def _format_web_docs(web_docs: List[Dict]) -> str:
    if not web_docs:
        return "(없음)"
    lines = []
    for i, d in enumerate(web_docs):
        title = d.get("title") or "(no title)"
        url = d.get("source") or d.get("url") or "unknown"
        fetched = d.get("fetched_at") or "unknown"
        snippet = d.get("snippet") or (d.get("text") or "")
        snippet = (snippet[:300] + "...") if len(snippet) > 300 else snippet
        lines.append(f"- [WEB{i}] {title} | {url} | fetched_at={fetched}\n  {snippet}")
    return "\n".join(lines)


def build_prompt(local_docs: List[Dict], web_docs: List[Dict], message: str, tone: str = "정중한") -> str:
    """Build prompt including formatted local and web context blocks.

    local_docs: list of dicts with keys like source, chunk_idx, score, text
    web_docs: list of dicts with keys like source (url), title, snippet, text, fetched_at, source_type
    """
    t = Template(BASE_PROMPT)
    local_block = _format_local_docs(local_docs or [])
    web_block = _format_web_docs(web_docs or [])
    return t.render(local_docs_block=local_block, web_docs_block=web_block, message=message, tone=tone)
