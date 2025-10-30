from sqlalchemy.orm import Session
from typing import Optional
from ..models import Deployment, Prompt


def create_deployment(
    db: Session,
    prompt_name: str,
    version: int,
    environment: str,
    user_id: int,
) -> Deployment:
    prompt = (
        db.query(Prompt)
        .filter(
            Prompt.name == prompt_name,
            Prompt.version == version,
            Prompt.created_by == user_id,
        )
        .first()
    )
    if not prompt:
        raise LookupError("Prompt version not found or not owned by user")
    dep = Deployment(prompt_id=prompt.id, environment=environment, deployed_by=user_id)
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


def current_deployment(
    db: Session,
    environment: str,
    user_id: int,
    prompt_name: Optional[str] = None,
) -> Deployment | None:
    query = db.query(Deployment).join(Prompt).filter(
        Deployment.environment == environment,
        Deployment.deployed_by == user_id,
    )
    if prompt_name:
        query = query.filter(Prompt.name == prompt_name)
    return query.order_by(Deployment.deployed_at.desc()).first()


def history(
    db: Session,
    environment: str,
    user_id: int,
    prompt_name: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> list[Deployment]:
    query = (
        db.query(Deployment)
        .join(Prompt)
        .filter(
            Deployment.environment == environment,
            Deployment.deployed_by == user_id,
        )
    )
    if prompt_name:
        query = query.filter(Prompt.name == prompt_name)
    return (
        query.order_by(Deployment.deployed_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
