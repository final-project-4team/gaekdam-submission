import json
import re
from typing import Dict, Any, Optional
from app.services import llm_client
from pydantic import ValidationError
from app.schemas.nlu import NLUResult

# 자연어 질의를 LLM 에게 JSON 으로 추출하도록 요청
async def parse_query(text: str) -> NLUResult:
    """사용자 자연어 질의를 intent/파라미터 pydantic 모델(NLUResult)로 변환합니다.

    반환: NLUResult 인스턴스 (pydantic 검증을 통과한 결과). LLM 출력을 우선 사용하고,
    실패 시 룰 기반 폴백을 사용합니다.
    """
    system_prompt = (
        "You are a JSON extractor. Given a user query about hotel analytics, output only a JSON object with these keys if available:"
        " intent (one of: checkin_count, checkout_count, facility_usage, customer_profile, unknown),"
        " period (e.g. 'this_month', 'last_month', 'last_30_days', or 'YYYY-MM-DD to YYYY-MM-DD'),"
        " start (ISO date YYYY-MM-DD), end (ISO date YYYY-MM-DD), hotel_group (string), customer_code (integer)."
        " Do not include any explanatory text, only the JSON object. If unsure, set intent to 'unknown'."
    )

    prompt = system_prompt + "\nUser query:\n" + text

    # helper to convert simple rule extraction into NLUResult
    def _fallback_parse(text: str) -> NLUResult:
        text_l = text.lower()
        intent = "unknown"
        if any(k in text_l for k in ["checkin", "체크인", "도착", "입실"]):
            intent = "checkin_count"
        if any(k in text_l for k in ["checkout", "체크아웃", "퇴실"]):
            intent = "checkout_count"
        if any(k in text_l for k in ["부대시설", "시설", "스파", "헬스", "레스토랑"]):
            intent = "facility_usage"
        if any(k in text_l for k in ["고객", "프로필", "멤버십", "회원"]):
            intent = "customer_profile"

        # customer_code: 숫자 ID 추출
        cust = None
        m = re.search(r"customer[_\s-]?code\D*(\d{3,})", text_l)
        if not m:
            m = re.search(r"고객\D*(\d{3,})", text_l)
        if m:
            try:
                cust = int(m.group(1))
            except Exception:
                cust = None

        # 날짜 범위(YYYY-MM-DD to YYYY-MM-DD)
        start = None
        end = None
        m = re.search(r"(\d{4}-\d{2}-\d{2})\s*(to|~|-)\s*(\d{4}-\d{2}-\d{2})", text)
        if m:
            start = m.group(1)
            end = m.group(3)

        # 간단한 period 키워드
        period = None
        if any(k in text_l for k in ["this month", "this_month", "이번달", "이번 달"]):
            period = "this_month"
        if any(k in text_l for k in ["last month", "last_month", "지난달", "지난 달"]):
            period = "last_month"
        if any(k in text_l for k in ["last 30", "last_30", "최근 30", "지난 30"]) :
            period = "last_30_days"

        # hotel_group detection (very basic: HG or group token)
        hotel_group = None
        m = re.search(r"hg\s*(\w+)", text_l)
        if m:
            hotel_group = m.group(1).upper()

        # Build NLUResult (pydantic will parse ISO dates)
        obj = {
            "intent": intent,
            "start": start,
            "end": end,
            "hotel_group": hotel_group,
            "customer_code": cust,
            "period": period,
        }
        return NLUResult.parse_obj(obj)

    try:
        raw = await llm_client.generate(prompt, temperature=0.0, max_tokens=300)
        # LLM may include markdown or surrounding text; try to extract the first JSON object
        jmatch = re.search(r"\{[\s\S]*?\}", raw)
        if jmatch:
            payload = jmatch.group(0)
            parsed = json.loads(payload)
            try:
                nlu = NLUResult.parse_obj(parsed)
                return nlu
            except ValidationError:
                # fallthrough to fallback
                pass
    except Exception:
        # LLM 실패시 폴백
        pass

    return _fallback_parse(text)
