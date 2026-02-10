import os
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

OPENAI_KEY = settings.OPEN_API_KEY
MODEL = settings.OPEN_MODEL
DEFAULT_TIMEOUT = float(os.getenv("OPENAI_TIMEOUT", "30"))

async def generate(prompt: str, temperature: float = 0.0, max_tokens: int = 512) -> str:
    if not OPENAI_KEY:
        raise RuntimeError("OPEN_API_KEY not configured")

    url = "https://api.openai.com/v1/responses"
    headers = {
        "Authorization": f"Bearer {OPENAI_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "input": prompt,
        "max_output_tokens": max_tokens,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        r = await client.post(url, json=payload, headers=headers)
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.exception("OpenAI API error")
            raise RuntimeError(
                f"OpenAI error {e.response.status_code}: {e.response.text}"
            )

        data = r.json()

    # Responses API 표준 파싱
    try:
        return data["output"][0]["content"][0]["text"]
    except Exception:
        logger.error("Unexpected OpenAI response format: %s", data)
        raise RuntimeError("Invalid OpenAI response format")
