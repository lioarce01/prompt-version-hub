from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, conint

from ..models import TestCategoryEnum


class TestCaseBase(BaseModel):
    name: str
    input_text: str = Field(..., description="Serialized payload for the prompt")
    expected_output: Optional[str] = None
    category: TestCategoryEnum = TestCategoryEnum.happy_path


class TestCaseCreate(TestCaseBase):
    auto_generated: bool = False


class TestCaseUpdate(BaseModel):
    name: Optional[str] = None
    input_text: Optional[str] = None
    expected_output: Optional[str] = None
    category: Optional[TestCategoryEnum] = None


class TestCaseOut(TestCaseBase):
    id: int
    prompt_id: int
    auto_generated: bool
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class TestRunRequest(BaseModel):
    case_ids: Optional[List[int]] = None
    prompt_version: Optional[int] = None


class TestRunOut(BaseModel):
    id: int
    prompt_id: int
    prompt_version: int
    test_case_id: Optional[int] = None
    input_text: str
    output_text: Optional[str] = None
    success: Optional[bool] = None
    latency_ms: Optional[int] = None
    tokens_used: Optional[int] = None
    cost_cents: Optional[int] = None
    error_message: Optional[str] = None
    executed_at: datetime
    executed_by: Optional[int] = None

    class Config:
        from_attributes = True


class TestSuiteOut(BaseModel):
    cases: List[TestCaseOut]
    runs: List[TestRunOut]
    prompt_version: int
    prompt_template: str
    prompt_variables: List[str]


class TestGenerationRequest(BaseModel):
    count: conint(ge=1, le=20) = 5
