from sqlalchemy import Column, Integer, String, DateTime, JSON, UniqueConstraint, ForeignKey, Boolean, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class ABPolicy(Base):
    __tablename__ = "ab_policies"
    id = Column(Integer, primary_key=True)
    prompt_name = Column(String(255), nullable=False)
    weights = Column(JSON, nullable=False, default=dict)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    user = relationship("User", backref="ab_policies")

    # Unique constraint per user
    __table_args__ = (
        Index("uq_ab_policies_prompt_name_user", "prompt_name", "created_by", unique=True),
        Index("idx_ab_policies_created_by", "created_by"),
        Index("idx_ab_policies_is_public", "is_public"),
    )


class ABAssignment(Base):
    __tablename__ = "ab_assignments"
    id = Column(Integer, primary_key=True)
    experiment_name = Column(String(255), nullable=False)
    prompt_name = Column(String(255), nullable=False)
    user_id = Column(String(255), nullable=False)
    version = Column(Integer, nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('experiment_name', 'prompt_name', 'user_id', name='uq_assignment_unique'),
    )

