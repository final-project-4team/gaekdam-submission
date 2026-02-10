from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date


class NLUResult(BaseModel):
    intent: Literal['checkin_count', 'checkout_count', 'facility_usage', 'customer_profile', 'unknown'] = Field('unknown')
    start: Optional[date] = None
    end: Optional[date] = None
    hotel_group: Optional[str] = None
    customer_code: Optional[int] = None
    period: Optional[Literal['this_month', 'last_month', 'last_30_days']] = None

    class Config:
        extra = 'ignore'
