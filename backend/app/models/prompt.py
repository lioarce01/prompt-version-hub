from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Prompt(Base):
    __tablename__ = "prompts"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    template = Column(Text, nullable=False)
    variables = Column(JSON, nullable=False, default=list)
    version = Column(Integer, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    active = Column(Boolean, default=True)
    is_public = Column(Boolean, nullable=False, default=False)

    author = relationship("User")
    __table_args__ = (
        UniqueConstraint('name', 'version', name='uq_prompt_name_version'),
    )
