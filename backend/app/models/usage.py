from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class UsageEvent(Base):
    __tablename__ = "usage_events"
    id = Column(Integer, primary_key=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    user_id = Column(String(255), nullable=True)
    output = Column(Text, nullable=True)
    success = Column(Boolean, default=True)
    latency_ms = Column(Integer, nullable=True)
    cost = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    prompt = relationship("Prompt")

