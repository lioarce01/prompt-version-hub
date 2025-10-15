from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List
from ..models import UsageEvent, Prompt


def record(db: Session, prompt_id: int, user_id: str | None, output: str | None, success: bool = True, latency_ms: int | None = None, cost: int | None = None) -> UsageEvent:
    rec = UsageEvent(prompt_id=prompt_id, user_id=user_id, output=output, success=success, latency_ms=latency_ms, cost=cost)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def analytics_by_version(db: Session, prompt_name: str, min_version: int | None = None, max_version: int | None = None):
    rows = (
        db.query(
            Prompt.version.label("version"),
            func.count(UsageEvent.id).label("count"),
            (func.sum(case((UsageEvent.success == True, 1), else_=0)) / func.nullif(func.count(UsageEvent.id), 0)).label("success_rate"),
            (func.avg(UsageEvent.cost)).label("avg_cost"),
        )
        .join(Prompt, Prompt.id == UsageEvent.prompt_id)
        .filter(Prompt.name == prompt_name)
        .group_by(Prompt.version)
        .order_by(Prompt.version)
    )
    if min_version is not None:
        rows = rows.filter(Prompt.version >= min_version)
    if max_version is not None:
        rows = rows.filter(Prompt.version <= max_version)
    rows = rows.all()
    return rows
