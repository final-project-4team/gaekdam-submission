# Archived: app/services/db_read.py
from sqlalchemy import text
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

logger = logging.getLogger(__name__)

async def get_checkin_count(session: AsyncSession, start: str, end: str, hotel_group: Optional[str] = None) -> int:
    # archived
    return 0

async def get_checkout_count(session: AsyncSession, start: str, end: str, hotel_group: Optional[str] = None) -> int:
    # archived
    return 0
