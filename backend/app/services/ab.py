from sqlalchemy.orm import Session
from typing import Dict
import hashlib
from ..models import ABPolicy, ABAssignment


def set_policy(db: Session, prompt_name: str, weights: Dict[str, int]) -> ABPolicy:
    norm: Dict[str, int] = {}
    for k, v in weights.items():
        iv = int(v)
        if iv <= 0:
            raise ValueError("Weights must be positive")
        norm[str(int(k))] = iv
    policy = db.query(ABPolicy).filter(ABPolicy.prompt_name == prompt_name).first()
    if not policy:
        policy = ABPolicy(prompt_name=prompt_name, weights=norm)
        db.add(policy)
    else:
        policy.weights = norm
    db.commit()
    db.refresh(policy)
    return policy


def choose_variant(user_id: str, weights: Dict[str, int]) -> int:
    total = sum(weights.values())
    if total == 0:
        return int(next(iter(weights.keys())))
    h = hashlib.sha256(user_id.encode()).hexdigest()
    bucket = int(h, 16) % total
    cumulative = 0
    for version_str, w in sorted(weights.items(), key=lambda x: int(x[0])):
        cumulative += w
        if bucket < cumulative:
            return int(version_str)
    return int(next(iter(weights.keys())))


def assign(db: Session, experiment_name: str, prompt_name: str, user_id: str) -> int:
    policy = db.query(ABPolicy).filter(ABPolicy.prompt_name == prompt_name).first()
    if not policy or not policy.weights:
        raise LookupError("No AB policy for prompt")
    existing = db.query(ABAssignment).filter(
        ABAssignment.experiment_name == experiment_name,
        ABAssignment.prompt_name == prompt_name,
        ABAssignment.user_id == user_id,
    ).first()
    if existing:
        return existing.version
    version = choose_variant(user_id, policy.weights)
    rec = ABAssignment(experiment_name=experiment_name, prompt_name=prompt_name, user_id=user_id, version=version)
    db.add(rec)
    db.commit()
    return version

