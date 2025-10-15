from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UsageIn(BaseModel):
    prompt_id: int
    user_id: Optional[str] = None
    output: Optional[str] = None
    success: bool = True
    latency_ms: Optional[int] = None
    cost: Optional[int] = None


class UsageOut(BaseModel):
    id: int
    prompt_id: int
    created_at: datetime
    success: bool

    class Config:
        from_attributes = True


class AnalyticsByVersion(BaseModel):
    version: int
    count: int
    success_rate: float
    avg_cost: Optional[float] = None


class AnalyticsListOut(BaseModel):
    items: List[AnalyticsByVersion]
    count: int
