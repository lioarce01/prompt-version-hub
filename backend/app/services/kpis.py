from sqlalchemy.orm import Session
from sqlalchemy import func, case, distinct, extract, desc, text
from datetime import datetime, timedelta
from typing import List, Literal
from ..models import Prompt, UsageEvent, Deployment, ABPolicy, ABAssignment


def get_summary(db: Session) -> dict:
    """
    Calculate summary metrics for dashboard cards:
    - total prompts (distinct names)
    - active prompts (distinct names where active=True)
    - total deployments
    - running experiments (active ABPolicies)
    - usage in last 7 days
    """

    # Total prompts (distinct names)
    total_prompts = db.query(func.count(distinct(Prompt.name))).scalar() or 0

    # Active prompts: prompts where latest version is active=True
    # Subquery to get max version per name
    max_versions = (
        db.query(
            Prompt.name,
            func.max(Prompt.version).label("max_version")
        )
        .group_by(Prompt.name)
        .subquery()
    )

    active_prompts = (
        db.query(func.count(distinct(Prompt.name)))
        .join(
            max_versions,
            (Prompt.name == max_versions.c.name) &
            (Prompt.version == max_versions.c.max_version)
        )
        .filter(Prompt.active == True)
        .scalar() or 0
    )

    # Total deployments
    total_deployments = db.query(func.count(Deployment.id)).scalar() or 0

    # Running experiments (count ABPolicy records)
    running_experiments = db.query(func.count(ABPolicy.id)).scalar() or 0

    # Usage in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    usage_7d = (
        db.query(func.count(UsageEvent.id))
        .filter(UsageEvent.created_at >= seven_days_ago)
        .scalar() or 0
    )

    return {
        "prompts": total_prompts,
        "active_prompts": active_prompts,
        "deployments": total_deployments,
        "experiments": running_experiments,
        "usage_7d": usage_7d,
    }


def get_usage_trend(
    db: Session,
    period_days: int = 42,
    bucket: Literal["week", "day"] = "week"
) -> List[dict]:
    """
    Get time series of usage metrics grouped by week or day.
    Returns list of data points with executions, failures, avg_latency, avg_cost.
    """

    cutoff_date = datetime.utcnow() - timedelta(days=period_days)

    # PostgreSQL date_trunc function
    if bucket == "week":
        trunc_expr = func.date_trunc("week", UsageEvent.created_at)
    else:
        trunc_expr = func.date_trunc("day", UsageEvent.created_at)

    results = (
        db.query(
            trunc_expr.label("bucket_start"),
            func.count(UsageEvent.id).label("executions"),
            func.sum(case((UsageEvent.success == False, 1), else_=0)).label("failures"),
            func.avg(UsageEvent.latency_ms).label("avg_latency"),
            func.avg(UsageEvent.cost).label("avg_cost"),
        )
        .filter(UsageEvent.created_at >= cutoff_date)
        .group_by("bucket_start")
        .order_by("bucket_start")
        .all()
    )

    points = []
    for row in results:
        points.append({
            "start": row.bucket_start.strftime("%Y-%m-%d"),
            "executions": int(row.executions or 0),
            "failures": int(row.failures or 0),
            "avg_latency": float(row.avg_latency) if row.avg_latency is not None else None,
            "avg_cost": float(row.avg_cost) if row.avg_cost is not None else None,
        })

    return points


def get_version_velocity(db: Session, months: int = 6) -> List[dict]:
    """
    Count version releases per month for the last N months.
    Returns list of {month: "YYYY-MM", releases: int}
    """

    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)

    results = (
        db.query(
            func.date_trunc("month", Prompt.created_at).label("month"),
            func.count(Prompt.id).label("releases"),
        )
        .filter(Prompt.created_at >= cutoff_date)
        .group_by("month")
        .order_by("month")
        .all()
    )

    points = []
    for row in results:
        points.append({
            "month": row.month.strftime("%Y-%m"),
            "releases": int(row.releases or 0),
        })

    return points


def get_top_prompts(db: Session, limit: int = 10, period_days: int = 30) -> List[dict]:
    """
    Get top N prompts by execution volume in the last period_days.
    Includes: name, executions, success_rate, avg_cost, last_updated
    """

    cutoff_date = datetime.utcnow() - timedelta(days=period_days)

    # Join UsageEvent with Prompt to get prompt names
    # Group by prompt name, calculate metrics
    results = (
        db.query(
            Prompt.name,
            func.count(UsageEvent.id).label("executions"),
            (
                func.sum(case((UsageEvent.success == True, 1), else_=0)) * 1.0 /
                func.nullif(func.count(UsageEvent.id), 0)
            ).label("success_rate"),
            func.avg(UsageEvent.cost).label("avg_cost"),
            func.max(Prompt.created_at).label("last_updated"),
        )
        .join(Prompt, Prompt.id == UsageEvent.prompt_id)
        .filter(UsageEvent.created_at >= cutoff_date)
        .group_by(Prompt.name)
        .order_by(desc("executions"))
        .limit(limit)
        .all()
    )

    items = []
    for row in results:
        items.append({
            "name": row.name,
            "executions": int(row.executions or 0),
            "success_rate": float(row.success_rate or 0.0),
            "avg_cost": float(row.avg_cost) if row.avg_cost is not None else None,
            "last_updated": row.last_updated,
        })

    return items


def get_experiments(db: Session) -> List[dict]:
    """
    Get summary of active A/B experiments.
    For each ABPolicy, return arms with version, weight, assignments, success_rate.
    """

    # Get all active policies
    policies = db.query(ABPolicy).all()

    experiments = []

    for policy in policies:
        arms = []

        # Parse weights from policy (e.g., {"1": 50, "2": 50})
        weights = policy.weights or {}

        for version_str, weight in weights.items():
            version = int(version_str)

            # Count assignments for this version
            assignment_count = (
                db.query(func.count(ABAssignment.id))
                .filter(
                    ABAssignment.prompt_name == policy.prompt_name,
                    ABAssignment.version == version
                )
                .scalar() or 0
            )

            # Calculate success rate for this version
            # Find prompt_id for this version
            prompt = (
                db.query(Prompt)
                .filter(Prompt.name == policy.prompt_name, Prompt.version == version)
                .first()
            )

            success_rate = None
            if prompt:
                stats = (
                    db.query(
                        func.sum(case((UsageEvent.success == True, 1), else_=0)).label("successes"),
                        func.count(UsageEvent.id).label("total"),
                    )
                    .filter(UsageEvent.prompt_id == prompt.id)
                    .first()
                )

                if stats and stats.total and stats.total > 0:
                    success_rate = float(stats.successes or 0) / float(stats.total)

            arms.append({
                "version": version,
                "weight": float(weight) / 100.0,  # Convert to decimal (0.5 instead of 50)
                "assignments": assignment_count,
                "success_rate": success_rate,
            })

        # Use prompt_name as experiment name (or could derive from ABAssignment if needed)
        experiments.append({
            "experiment": policy.prompt_name,  # Can be enhanced with experiment_name from ABAssignment
            "prompt": policy.prompt_name,
            "arms": arms,
        })

    return experiments
