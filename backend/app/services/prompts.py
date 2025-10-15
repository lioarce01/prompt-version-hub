from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Prompt
from ..schemas import PromptCreate, PromptUpdate
from ..utils.diff import unified_diff_text


def create_prompt(db: Session, user_id: int, payload: PromptCreate) -> Prompt:
    exists = db.query(Prompt).filter(Prompt.name == payload.name).first()
    if exists:
        raise ValueError("Prompt with this name already exists; use update to add a version")
    prompt = Prompt(
        name=payload.name,
        template=payload.template,
        variables=payload.variables,
        version=1,
        created_by=user_id,
        active=True,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


def update_prompt(db: Session, name: str, user_id: int, payload: PromptUpdate) -> Prompt:
    latest = db.query(Prompt).filter(Prompt.name == name).order_by(Prompt.version.desc()).first()
    if not latest:
        raise LookupError("Prompt not found")
    new_version = (latest.version or 0) + 1
    db.query(Prompt).filter(Prompt.name == name, Prompt.active == True).update({Prompt.active: False})
    prompt = Prompt(
        name=name,
        template=payload.template,
        variables=payload.variables,
        version=new_version,
        created_by=user_id,
        active=True,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


def list_versions(db: Session, name: str, limit: int = 20, offset: int = 0, active: Optional[bool] = None, created_by: Optional[int] = None) -> List[Prompt]:
    q = db.query(Prompt).filter(Prompt.name == name)
    if active is not None:
        q = q.filter(Prompt.active == active)
    if created_by is not None:
        q = q.filter(Prompt.created_by == created_by)
    return q.order_by(Prompt.version.desc()).limit(limit).offset(offset).all()


def get_version(db: Session, name: str, version: int) -> Prompt | None:
    return db.query(Prompt).filter(Prompt.name == name, Prompt.version == version).first()


def rollback(db: Session, name: str, target_version: int, user_id: int) -> Prompt:
    target = get_version(db, name, target_version)
    if not target:
        raise LookupError("Version not found")
    latest = db.query(Prompt).filter(Prompt.name == name).order_by(Prompt.version.desc()).first()
    new_version = (latest.version or 0) + 1
    db.query(Prompt).filter(Prompt.name == name, Prompt.active == True).update({Prompt.active: False})
    prompt = Prompt(
        name=name,
        template=target.template,
        variables=target.variables,
        version=new_version,
        created_by=user_id,
        active=True,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


def diff_versions(db: Session, name: str, from_version: int, to_version: int) -> str:
    a = get_version(db, name, from_version)
    b = get_version(db, name, to_version)
    if not a or not b:
        raise LookupError("One or both versions not found")
    return unified_diff_text(a.template, b.template, f"{name}@{from_version}", f"{name}@{to_version}")


def list_prompts(
    db: Session,
    q: Optional[str] = None,
    active: Optional[bool] = None,
    created_by: Optional[int] = None,
    latest_only: bool = False,
    sort_by: str = "created_at",
    order: str = "desc",
    limit: int = 20,
    offset: int = 0,
) -> List[Prompt]:
    query = db.query(Prompt)
    if q:
        query = query.filter(Prompt.name.ilike(f"%{q}%"))
    if active is not None:
        query = query.filter(Prompt.active == active)
    if created_by is not None:
        query = query.filter(Prompt.created_by == created_by)
    if latest_only:
        query = query.filter(Prompt.active == True)

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

    return query.limit(limit).offset(offset).all()
