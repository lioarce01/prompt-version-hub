from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ============================================================
# GET /kpis/summary
# ============================================================

class TotalsSummary(BaseModel):
    """Summary metrics for dashboard cards"""
    prompts: int
    active_prompts: int
    deployments: int
    experiments: int
    usage_7d: int


class SummaryOut(BaseModel):
    """Response for /kpis/summary endpoint"""
    totals: TotalsSummary


# ============================================================
# GET /kpis/usage-trend
# ============================================================

class UsageTrendPoint(BaseModel):
    """Single data point in usage trend series"""
    start: str  # ISO date string (YYYY-MM-DD)
    executions: int
    failures: int
    avg_latency: Optional[float] = None
    avg_cost: Optional[float] = None


class UsageTrendOut(BaseModel):
    """Response for /kpis/usage-trend endpoint"""
    bucket: str  # "week" | "day"
    points: List[UsageTrendPoint]


# ============================================================
# GET /kpis/version-velocity
# ============================================================

class VersionVelocityPoint(BaseModel):
    """Monthly version release count"""
    month: str  # YYYY-MM format
    releases: int


class VersionVelocityOut(BaseModel):
    """Response for /kpis/version-velocity endpoint"""
    points: List[VersionVelocityPoint]


# ============================================================
# GET /kpis/top-prompts
# ============================================================

class TopPromptItem(BaseModel):
    """Single top-performing prompt"""
    name: str
    executions: int
    success_rate: float
    avg_cost: Optional[float] = None
    last_updated: datetime


class TopPromptsOut(BaseModel):
    """Response for /kpis/top-prompts endpoint"""
    items: List[TopPromptItem]


# ============================================================
# GET /kpis/experiments
# ============================================================

class ExperimentArm(BaseModel):
    """Single variant in A/B experiment"""
    version: int
    weight: float
    assignments: int
    success_rate: Optional[float] = None


class ExperimentItem(BaseModel):
    """Single A/B experiment summary"""
    experiment: str
    prompt: str
    arms: List[ExperimentArm]


class ExperimentsOut(BaseModel):
    """Response for /kpis/experiments endpoint"""
    items: List[ExperimentItem]
