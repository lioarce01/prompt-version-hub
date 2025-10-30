import re
from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import Prompt
from ..schemas import PromptCreate, PromptUpdate
from ..utils.diff import unified_diff_text


def _is_visible(prompt: Prompt, viewer_id: int) -> bool:
    return prompt.created_by == viewer_id or prompt.is_public


def _require_latest_prompt(db: Session, name: str) -> Prompt | None:
    return (
        db.query(Prompt)
        .filter(Prompt.name == name)
        .order_by(Prompt.version.desc())
        .first()
    )


def _require_visible_prompt(db: Session, name: str, viewer_id: int) -> Prompt:
    prompt = _require_latest_prompt(db, name)
    if not prompt or not _is_visible(prompt, viewer_id):
        raise LookupError("Prompt not found")
    return prompt


def _require_owner(prompt: Prompt, user_id: int) -> None:
    if prompt.created_by != user_id:
        raise PermissionError("Not authorized to modify this prompt")


def _generate_unique_name(db: Session, base: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", base).strip("-").lower()
    if not slug:
        slug = "prompt"
    candidate = slug
    suffix = 2
    while db.query(Prompt).filter(Prompt.name == candidate).first():
        candidate = f"{slug}-{suffix}"
        suffix += 1
    return candidate


def create_prompt(db: Session, user_id: int, payload: PromptCreate) -> Prompt:
    exists = db.query(Prompt).filter(Prompt.name == payload.name).first()
    if exists:
        raise ValueError(
            "Prompt with this name already exists; use update to add a version"
        )
    prompt = Prompt(
        name=payload.name,
        template=payload.template,
        variables=payload.variables,
        version=1,
        created_by=user_id,
        active=True,
        is_public=payload.is_public,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


def update_prompt(db: Session, name: str, user_id: int, payload: PromptUpdate) -> Prompt:
    latest = _require_latest_prompt(db, name)
    if not latest:
        raise LookupError("Prompt not found")
    _require_owner(latest, user_id)
    new_version = (latest.version or 0) + 1
    db.query(Prompt).filter(Prompt.name == name, Prompt.active == True).update(
        {Prompt.active: False}
    )
    prompt = Prompt(
        name=name,
        template=payload.template,
        variables=payload.variables,
        version=new_version,
        created_by=user_id,
        active=True,
        is_public=latest.is_public,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


def list_versions(
    db: Session,
    name: str,
    viewer_id: int,
    limit: int = 20,
    offset: int = 0,
    active: Optional[bool] = None,
    created_by: Optional[int] = None,
) -> List[Prompt]:
    _require_visible_prompt(db, name, viewer_id)
    query = db.query(Prompt).filter(Prompt.name == name)
    if active is not None:
        query = query.filter(Prompt.active == active)
    if created_by is not None:
        query = query.filter(Prompt.created_by == created_by)
    return query.order_by(Prompt.version.desc()).limit(limit).offset(offset).all()


def get_version(db: Session, name: str, version: int, viewer_id: int) -> Prompt | None:
    prompt = db.query(Prompt).filter(Prompt.name == name, Prompt.version == version).first()
    if not prompt or not _is_visible(prompt, viewer_id):
        return None
    return prompt


def get_active_prompt(db: Session, name: str, viewer_id: int) -> Prompt | None:
    prompt = (
        db.query(Prompt)
        .filter(Prompt.name == name, Prompt.active == True)
        .order_by(Prompt.version.desc())
        .first()
    )
    if not prompt or not _is_visible(prompt, viewer_id):
        return None
    return prompt


def delete_prompt(db: Session, name: str) -> int:
    from ..models import Deployment

    prompt_ids = [p.id for p in db.query(Prompt.id).filter(Prompt.name == name).all()]
    if prompt_ids:
        has_deployments = (
            db.query(Deployment)
            .filter(Deployment.prompt_id.in_(prompt_ids))
            .first()
        )
        if has_deployments:
            raise ValueError(
                "Cannot delete prompt with existing deployments. Remove deployments first."
            )

    deleted_count = (
        db.query(Prompt).filter(Prompt.name == name).delete(synchronize_session=False)
    )
    db.commit()
    return deleted_count


def rollback(db: Session, name: str, target_version: int, user_id: int) -> Prompt:
    latest = _require_latest_prompt(db, name)
    if not latest:
        raise LookupError("Prompt not found")
    _require_owner(latest, user_id)
    target = get_version(db, name, target_version, user_id)
    if not target:
        raise LookupError("Version not found")
    new_version = (latest.version or 0) + 1
    db.query(Prompt).filter(Prompt.name == name, Prompt.active == True).update(
        {Prompt.active: False}
    )
    prompt = Prompt(
        name=name,
        template=target.template,
        variables=target.variables,
        version=new_version,
        created_by=user_id,
        active=True,
        is_public=latest.is_public,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


def diff_versions(
    db: Session, name: str, from_version: int, to_version: int, viewer_id: int
) -> str:
    a = get_version(db, name, from_version, viewer_id)
    b = get_version(db, name, to_version, viewer_id)
    if not a or not b:
        raise LookupError("One or both versions not found")
    return unified_diff_text(
        a.template, b.template, f"{name}@{from_version}", f"{name}@{to_version}"
    )


def list_prompts(
    db: Session,
    viewer_id: int,
    q: Optional[str] = None,
    active: Optional[bool] = None,
    created_by: Optional[int] = None,
    latest_only: bool = False,
    sort_by: str = "created_at",
    order: str = "desc",
    limit: int = 20,
    offset: int = 0,
    visibility: Optional[str] = None,
    owned: Optional[bool] = None,
) -> Tuple[List[Prompt], int]:
    query = db.query(Prompt).filter(
        or_(Prompt.is_public == True, Prompt.created_by == viewer_id)
    )
    if q:
        query = query.filter(Prompt.name.ilike(f"%{q}%"))
    if active is not None:
        query = query.filter(Prompt.active == active)
    if created_by is not None:
        query = query.filter(Prompt.created_by == created_by)
    if visibility == "public":
        query = query.filter(Prompt.is_public == True)
    elif visibility == "private":
        query = query.filter(Prompt.created_by == viewer_id, Prompt.is_public == False)
    elif visibility == "owned":
        query = query.filter(Prompt.created_by == viewer_id)
    if owned is True:
        query = query.filter(Prompt.created_by == viewer_id)
    elif owned is False:
        query = query.filter(Prompt.created_by != viewer_id, Prompt.is_public == True)
    if latest_only:
        query = query.filter(Prompt.active == True)

    total = query.count()

    sort_map = {
        "created_at": Prompt.created_at,
        "version": Prompt.version,
        "name": Prompt.name,
    }
    col = sort_map.get(sort_by, Prompt.created_at)
    if order.lower() == "asc":
        query = query.order_by(col.asc())
    else:
        query = query.order_by(col.desc())

    items = query.offset(offset).limit(limit).all()
    return items, total


def set_visibility(db: Session, name: str, user_id: int, make_public: bool) -> Prompt:
    latest = _require_latest_prompt(db, name)
    if not latest:
        raise LookupError("Prompt not found")
    _require_owner(latest, user_id)
    if latest.is_public == make_public:
        return latest
    db.query(Prompt).filter(Prompt.name == name).update(
        {"is_public": make_public}, synchronize_session=False
    )
    db.commit()
    db.refresh(latest)
    return latest


def clone_prompt(
    db: Session, source_name: str, viewer_id: int, new_name: Optional[str] = None
) -> Prompt:
    source = _require_visible_prompt(db, source_name, viewer_id)
    clone_name = new_name.strip() if new_name else f"{source.name}-copy"
    unique_name = _generate_unique_name(db, clone_name)
    prompt = Prompt(
        name=unique_name,
        template=source.template,
        variables=list(source.variables) if source.variables else [],
        version=1,
        created_by=viewer_id,
        active=True,
        is_public=False,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt
