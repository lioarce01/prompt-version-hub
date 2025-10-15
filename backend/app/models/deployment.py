from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Deployment(Base):
    __tablename__ = "deployments"
    id = Column(Integer, primary_key=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    environment = Column(String(32), nullable=False)
    deployed_at = Column(DateTime(timezone=True), server_default=func.now())
    deployed_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    prompt = relationship("Prompt")
    user = relationship("User")

