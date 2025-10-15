from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import RoleEnum
from ..schemas import DeploymentCreate, DeploymentOut, DeploymentListOut
from ..auth import get_current_user, require_roles
from ..services import deployments as svc


router = APIRouter(prefix="/deployments", tags=["deployments"])


@router.post("/", response_model=DeploymentOut, dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))])
def create_deployment(payload: DeploymentCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        return svc.create_deployment(db, payload.prompt_name, payload.version, payload.environment, user.id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{environment}", response_model=DeploymentOut)
def get_current_deployment(environment: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    dep = svc.current_deployment(db, environment)
    if not dep:
        raise HTTPException(status_code=404, detail="No deployment for environment")
    return dep


@router.get("/history/{environment}", response_model=DeploymentListOut)
def get_deployment_history(environment: str, limit: int = 20, offset: int = 0, db: Session = Depends(get_db), user=Depends(get_current_user)):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    rows = svc.history(db, environment, limit=limit + 1, offset=offset)
    items = rows[:limit]
    has_next = len(rows) > limit
    return {
        "items": items,
        "limit": limit,
        "offset": offset,
        "count": len(items),
        "has_next": has_next,
    }
