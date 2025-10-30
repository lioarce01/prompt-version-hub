from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, Literal
from ..database import get_db
from ..models import RoleEnum
from ..schemas import (
    PromptCreate,
    PromptOut,
    PromptUpdate,
    DiffOut,
    PromptListOut,
    PromptVisibilityUpdate,
    PromptCloneRequest,
)
from ..auth import get_current_user, require_roles
from ..services import prompts as svc


router = APIRouter(prefix="/prompts", tags=["prompts"])
VisibilityFilter = Literal["all", "public", "private", "owned"]


@router.get("/", response_model=PromptListOut)
def list_prompts(
    q: Optional[str] = None,
    active: Optional[bool] = None,
    created_by: Optional[int] = None,
    latest_only: bool = False,
    sort_by: str = "created_at",  # created_at|version|name
    order: str = "desc",  # asc|desc
    limit: int = 20,
    offset: int = 0,
    visibility: VisibilityFilter = "all",
    owned: Optional[bool] = None,
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
        viewer_id=user.id,
        q=q,
        active=active,
        created_by=created_by,
        latest_only=latest_only,
        sort_by=sort_by,
        order=order,
        limit=limit + 1,
        offset=offset,
        visibility=visibility,
        owned=owned,
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


@router.get("/mine", response_model=PromptListOut)
def list_my_prompts(
    q: Optional[str] = None,
    active: Optional[bool] = None,
    visibility: VisibilityFilter = "all",
    sort_by: str = "created_at",
    order: str = "desc",
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
        viewer_id=user.id,
        q=q,
        active=active,
        latest_only=False,
        sort_by=sort_by,
        order=order,
        limit=limit + 1,
        offset=offset,
        visibility=visibility if visibility in {"all", "public", "private"} else "all",
        owned=True,
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


@router.post(
    "/",
    response_model=PromptOut,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def create_prompt(
    payload: PromptCreate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    try:
        return svc.create_prompt(db, user.id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{name}", response_model=PromptOut)
def get_prompt(name: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Get the active version of a prompt by name"""
    prompt = svc.get_active_prompt(db, name, user.id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


@router.put(
    "/{name}",
    response_model=PromptOut,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def update_prompt(
    name: str,
    payload: PromptUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return svc.update_prompt(db, name, user.id, payload)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.delete("/{name}", dependencies=[Depends(require_roles(RoleEnum.admin))])
def delete_prompt(name: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Delete all versions of a prompt (admin only)"""
    try:
        deleted_count = svc.delete_prompt(db, name)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Prompt not found")
        return {"success": True, "deleted_versions": deleted_count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
    try:
        rows = svc.list_versions(
            db,
            name,
            viewer_id=user.id,
            limit=limit + 1,
            offset=offset,
            active=active,
            created_by=created_by,
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
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
def get_version(
    name: str, version: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    prompt = svc.get_version(db, name, version, user.id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Version not found")
    return prompt


@router.post(
    "/{name}/rollback/{version}",
    response_model=PromptOut,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def rollback_prompt(
    name: str, version: int, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    try:
        return svc.rollback(db, name, version, user.id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/{name}/diff", response_model=DiffOut)
def diff_versions(
    name: str,
    from_version: int = Query(..., alias="from"),
    to_version: int = Query(..., alias="to"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        diff = svc.diff_versions(db, name, from_version, to_version, user.id)
        return DiffOut(from_version=from_version, to_version=to_version, diff=diff)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch(
    "/{name}/visibility",
    response_model=PromptOut,
    dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))],
)
def update_visibility(
    name: str,
    payload: PromptVisibilityUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return svc.set_visibility(db, name, user.id, payload.is_public)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/{name}/clone", response_model=PromptOut)
def clone_prompt(
    name: str,
    payload: Optional[PromptCloneRequest] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        new_name = payload.new_name if payload else None
        return svc.clone_prompt(db, name, user.id, new_name)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
