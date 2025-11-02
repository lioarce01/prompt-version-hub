from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from ..database import Base


class TestCategoryEnum(str, enum.Enum):
    happy_path = "happy_path"
    edge_case = "edge_case"
    boundary = "boundary"
    negative = "negative"


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    input_text = Column(Text, nullable=False)
    expected_output = Column(Text)
    category = Column(Enum(TestCategoryEnum), nullable=False, default=TestCategoryEnum.happy_path)
    auto_generated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))

    prompt = relationship("Prompt", backref="test_cases")
    creator = relationship("User")


class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(Integer, primary_key=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False)
    prompt_version = Column(Integer, nullable=False)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="SET NULL"))
    input_text = Column(Text, nullable=False)
    output_text = Column(Text)
    success = Column(Boolean)
    latency_ms = Column(Integer)
    tokens_used = Column(Integer)
    cost_cents = Column(Integer)
    error_message = Column(Text)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    executed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))

    prompt = relationship("Prompt")
    test_case = relationship("TestCase", backref="runs")
    executor = relationship("User")
