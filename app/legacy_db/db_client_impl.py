from sqlalchemy import insert, select
from app.legacy_db.db import AsyncSession
from app.legacy_db.db_models import Conversation

async def save_conversation(session: AsyncSession, user_id: str | None, message: str, reply: str | None):
    stmt = insert(Conversation).values(user_id=user_id, message=message, reply=reply)
    await session.execute(stmt)
    await session.commit()

async def get_recent_conversations(session: AsyncSession, limit: int = 20):
    q = select(Conversation).order_by(Conversation.id.desc()).limit(limit)
    res = await session.execute(q)
    return res.scalars().all()
