from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Literal
from ..database import get_db
from ..auth import get_current_user
from ..schemas import (
    SummaryOut,
    TotalsSummary,
    UsageTrendOut,
    UsageTrendPoint,
    VersionVelocityOut,
    VersionVelocityPoint,
    TopPromptsOut,
    TopPromptItem,
    ExperimentsOut,
    ExperimentItem,
    ExperimentArm,
)
from ..services import kpis as svc


router = APIRouter(prefix="/kpis", tags=["kpis"])


@router.get("/summary", response_model=SummaryOut)
def get_summary(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get summary metrics for dashboard cards:
    - total prompts (distinct names)
    - active prompts (latest version active)
    - total deployments
    - running experiments
    - usage in last 7 days
    """
    totals_data = svc.get_summary(db)
    totals = TotalsSummary(**totals_data)
    return SummaryOut(totals=totals)


@router.get("/usage-trend", response_model=UsageTrendOut)
def get_usage_trend(
    period_days: int = Query(42, ge=1, le=365, description="Number of days to look back"),
    bucket: Literal["week", "day"] = Query("week", description="Time bucket for grouping"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get time series of usage metrics grouped by week or day.
    Returns executions, failures, avg_latency, avg_cost per bucket.
    """
    points_data = svc.get_usage_trend(db, period_days=period_days, bucket=bucket)
    points = [UsageTrendPoint(**point) for point in points_data]
    return UsageTrendOut(bucket=bucket, points=points)


@router.get("/version-velocity", response_model=VersionVelocityOut)
def get_version_velocity(
    months: int = Query(6, ge=1, le=24, description="Number of months to look back"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get monthly count of version releases for the last N months.
    Useful for tracking release velocity over time.
    """
    points_data = svc.get_version_velocity(db, months=months)
    points = [VersionVelocityPoint(**point) for point in points_data]
    return VersionVelocityOut(points=points)


@router.get("/top-prompts", response_model=TopPromptsOut)
def get_top_prompts(
    limit: int = Query(10, ge=1, le=50, description="Number of top prompts to return"),
    period_days: int = Query(30, ge=1, le=365, description="Period to analyze (days)"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get top N prompts by execution volume in the last period_days.
    Includes executions, success_rate, avg_cost, last_updated.
    """
    items_data = svc.get_top_prompts(db, limit=limit, period_days=period_days)
    items = [TopPromptItem(**item) for item in items_data]
    return TopPromptsOut(items=items)


@router.get("/experiments", response_model=ExperimentsOut)
def get_experiments(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get summary of active A/B experiments.
    For each experiment, returns arms with version, weight, assignments, success_rate.
    """
    experiments_data = svc.get_experiments(db)
    items = []
    for exp_data in experiments_data:
        arms = [ExperimentArm(**arm) for arm in exp_data["arms"]]
        items.append(
            ExperimentItem(
                experiment=exp_data["experiment"],
                prompt=exp_data["prompt"],
                arms=arms,
            )
        )
    return ExperimentsOut(items=items)
