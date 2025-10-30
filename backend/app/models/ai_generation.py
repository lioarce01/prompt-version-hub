from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from ..database import Base


class AIGeneration(Base):
    __tablename__ = "ai_generations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_data = Column(JSONB, nullable=False)
    response_data = Column(JSONB, nullable=False)
    prompt_template = Column(Text, nullable=False)
    variables = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ai_provider = Column(String(50))
    ai_model = Column(String(100))
    tokens_used = Column(Integer)
    cost_cents = Column(Integer)
