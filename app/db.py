from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

# Note: DB runtime was archived to `app.legacy_db` to keep the main runtime DB-free for RAG-only use.
# To re-enable DB access, restore a real SQLAlchemy engine and session maker here or import from app.legacy_db.db.
try:
    # If user intentionally re-enabled DB by restoring legacy_db.db, prefer that implementation
    from app.legacy_db import db as legacy_db
    # re-export the legacy get_db if it exists
    get_db = getattr(legacy_db, 'get_db', None)
except Exception:
    # Provide a no-op async generator to keep imports working in runtime (returns None)
    async def get_db():
        """No-op DB session generator for RAG-only runtime. Returns None.
        Replace by importing `app.legacy_db.db.get_db` to re-enable real DB sessions.
        """
        yield None