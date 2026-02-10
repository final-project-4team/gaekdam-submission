import re
from typing import Any, Dict, List

# Simple rule-based PII masking utilities

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\b(?:\+\d{1,3}[- ]?)?(?:0\d|\d{2,3})[- ]?\d{3,4}[- ]?\d{4}\b")
RRN_RE = re.compile(r"\b\d{6}-\d{7}\b")
CARD_RE = re.compile(r"\b(?:\d[ -]*?){13,16}\b")


def mask_string(text: str) -> str:
    if not isinstance(text, str):
        return text
    s = text
    # emails
    s = EMAIL_RE.sub("[EMAIL_REDACTED]", s)
    # phones
    s = PHONE_RE.sub("[PHONE_REDACTED]", s)
    # resident registration numbers
    s = RRN_RE.sub("[ID_REDACTED]", s)
    # credit card like numbers
    s = CARD_RE.sub("[CARD_REDACTED]", s)
    return s


def mask_object(obj: Any, keys_for_strong_mask: List[str] = None) -> Any:
    """Recursively mask PII in strings inside dicts/lists.

    keys_for_strong_mask: keys that should be fully redacted (e.g. ['customer_memo_content', 'phone']).
    """
    if keys_for_strong_mask is None:
        keys_for_strong_mask = ["phone", "phone_number", "contact", "email", "dek_enc", "customer_memo_content", "customer_memo"]

    if obj is None:
        return None
    if isinstance(obj, str):
        return mask_string(obj)
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            kl = k.lower()
            if any(kf in kl for kf in keys_for_strong_mask):
                # redact fully except keep length hint
                if isinstance(v, str):
                    out[k] = f"[REDACTED {len(v)} chars]"
                else:
                    out[k] = "[REDACTED]"
            else:
                out[k] = mask_object(v, keys_for_strong_mask)
        return out
    if isinstance(obj, list):
        return [mask_object(i, keys_for_strong_mask) for i in obj]
    # numbers/other types
    return obj
