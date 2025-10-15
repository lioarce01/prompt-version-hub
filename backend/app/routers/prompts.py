from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Prompt, RoleEnum
from ..schemas import PromptCreate, PromptOut, PromptUpdate, DiffOut, PromptListOut
from ..auth import get_current_user, require_roles
from ..services import prompts as svc


router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("/", response_model=PromptListOut)
def list_prompts(
    q: Optional[str] = None,
    active: Optional[bool] = None,
    created_by: Optional[int] = None,
    latest_only: bool = False,
    sort_by: str = "created_at",  # created_at|version|name
    order: str = "desc",           # asc|desc
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    if sort_by not in {"created_at", "version", "name"}:
        sort_by = "created_at"
    if order not in {"asc", "desc"}:
        order = "desc"
    rows = svc.list_prompts(
        db,
        q=q,
        active=active,
        created_by=created_by,
        latest_only=latest_only,
        sort_by=sort_by,
        order=order,
        limit=limit + 1,
        offset=offset,
    )
    items = rows[:limit]
    has_next = len(rows) > limit
    return {
        "items": items,
        "limit": limit,
        "offset": offset,
        "count": len(items),
        "has_next": has_next,
    }

@router.post("/", response_model=PromptOut, dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))])
def create_prompt(payload: PromptCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        return svc.create_prompt(db, user.id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{name}", response_model=PromptOut, dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))])
def update_prompt(name: str, payload: PromptUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        return svc.update_prompt(db, name, user.id, payload)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{name}/versions", response_model=PromptListOut)
def list_versions(
    name: str,
    limit: int = 20,
    offset: int = 0,
    active: Optional[bool] = None,
    created_by: Optional[int] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    rows = svc.list_versions(db, name, limit=limit + 1, offset=offset, active=active, created_by=created_by)
    items = rows[:limit]
    has_next = len(rows) > limit
    return {
        "items": items,
        "limit": limit,
        "offset": offset,
        "count": len(items),
        "has_next": has_next,
    }


@router.get("/{name}/versions/{version}", response_model=PromptOut)
def get_version(name: str, version: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    prompt = svc.get_version(db, name, version)
    if not prompt:
        raise HTTPException(status_code=404, detail="Version not found")
    return prompt


@router.post("/{name}/rollback/{version}", response_model=PromptOut, dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))])
def rollback_prompt(name: str, version: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        return svc.rollback(db, name, version, user.id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{name}/diff", response_model=DiffOut)
def diff_versions(name: str, from_version: int = Query(..., alias="from"), to_version: int = Query(..., alias="to"), db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        diff = svc.diff_versions(db, name, from_version, to_version)
        return DiffOut(from_version=from_version, to_version=to_version, diff=diff)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
