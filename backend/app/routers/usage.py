from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import UsageIn, UsageOut, AnalyticsByVersion, AnalyticsListOut
from ..services import usage as svc


router = APIRouter(prefix="/usage", tags=["usage"])


@router.post("/", response_model=UsageOut)
def record_usage(payload: UsageIn, db: Session = Depends(get_db)):
    rec = svc.record(db, payload.prompt_id, payload.user_id, payload.output, payload.success, payload.latency_ms, payload.cost)
    return rec


@router.get("/analytics/by-version", response_model=AnalyticsListOut)
def usage_by_version(prompt_name: str, min_version: int | None = None, max_version: int | None = None, db: Session = Depends(get_db)):
    rows = svc.analytics_by_version(db, prompt_name, min_version=min_version, max_version=max_version)
    items = [
        AnalyticsByVersion(version=int(r.version), count=int(r.count), success_rate=float(r.success_rate or 0.0), avg_cost=float(r.avg_cost) if r.avg_cost is not None else None)
        for r in rows
    ]
    return {
        "items": items,
        "count": len(items),
    }
