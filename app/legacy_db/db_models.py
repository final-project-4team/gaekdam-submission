# Archived: app/models/db_models.py
from sqlalchemy import Integer, String, Text, Column, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=True)
    message = Column(Text, nullable=False)
    reply = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
