from sqlalchemy.orm import Session
from ..models import Deployment, Prompt


def create_deployment(db: Session, prompt_name: str, version: int, environment: str, user_id: int) -> Deployment:
    prompt = db.query(Prompt).filter(Prompt.name == prompt_name, Prompt.version == version).first()
    if not prompt:
        raise LookupError("Prompt version not found")
    dep = Deployment(prompt_id=prompt.id, environment=environment, deployed_by=user_id)
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


def current_deployment(db: Session, environment: str) -> Deployment | None:
    return db.query(Deployment).filter(Deployment.environment == environment).order_by(Deployment.deployed_at.desc()).first()


def history(db: Session, environment: str, limit: int = 20, offset: int = 0) -> list[Deployment]:
    return (
        db.query(Deployment)
        .filter(Deployment.environment == environment)
        .order_by(Deployment.deployed_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
