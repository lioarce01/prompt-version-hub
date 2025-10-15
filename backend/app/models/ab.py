from sqlalchemy import Column, Integer, String, DateTime, JSON, UniqueConstraint
from sqlalchemy.sql import func
from ..database import Base


class ABPolicy(Base):
    __tablename__ = "ab_policies"
    id = Column(Integer, primary_key=True)
    prompt_name = Column(String(255), nullable=False, unique=True)
    weights = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


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

