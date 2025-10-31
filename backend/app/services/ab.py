from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Dict, List, Optional
import hashlib
from ..models import ABPolicy, ABAssignment, User


def set_policy(db: Session, prompt_name: str, weights: Dict[str, int], user_id: int, is_public: bool = False) -> ABPolicy:
    """Create or update AB policy (user-scoped)"""
    norm: Dict[str, int] = {}
    for k, v in weights.items():
        iv = int(v)
        if iv <= 0:
            raise ValueError("Weights must be positive")
        norm[str(int(k))] = iv

    # Find existing policy for this user and prompt
    policy = db.query(ABPolicy).filter(
        ABPolicy.prompt_name == prompt_name,
        ABPolicy.created_by == user_id
    ).first()

    if not policy:
        policy = ABPolicy(
            prompt_name=prompt_name,
            weights=norm,
            created_by=user_id,
            is_public=is_public
        )
        db.add(policy)
    else:
        policy.weights = norm
        policy.is_public = is_public

    db.commit()
    db.refresh(policy)
    return policy


def get_policies(db: Session, user_id: int, include_public: bool = True) -> List[ABPolicy]:
    """Get all policies accessible by user (own + public)"""
    query = db.query(ABPolicy)

    if include_public:
        query = query.filter(
            or_(
                ABPolicy.created_by == user_id,
                ABPolicy.is_public == True
            )
        )
    else:
        query = query.filter(ABPolicy.created_by == user_id)

    return query.order_by(ABPolicy.created_at.desc()).all()


def get_policy_by_name(db: Session, prompt_name: str, user_id: int) -> Optional[ABPolicy]:
    """Get policy by name (user's own or public)"""
    return db.query(ABPolicy).filter(
        ABPolicy.prompt_name == prompt_name,
        or_(
            ABPolicy.created_by == user_id,
            ABPolicy.is_public == True
        )
    ).first()


def delete_policy(db: Session, policy_id: int, user_id: int) -> bool:
    """Delete policy (only owner can delete)"""
    policy = db.query(ABPolicy).filter(
        ABPolicy.id == policy_id,
        ABPolicy.created_by == user_id
    ).first()

    if not policy:
        return False

    db.delete(policy)
    db.commit()
    return True


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


def assign(db: Session, experiment_name: str, prompt_name: str, user_id: str, requester_id: int) -> int:
    """Assign variant to user (can use own or public policies)"""
    # Find policy (own or public)
    policy = db.query(ABPolicy).filter(
        ABPolicy.prompt_name == prompt_name,
        or_(
            ABPolicy.created_by == requester_id,
            ABPolicy.is_public == True
        )
    ).first()

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
    rec = ABAssignment(
        experiment_name=experiment_name,
        prompt_name=prompt_name,
        user_id=user_id,
        version=version
    )
    db.add(rec)
    db.commit()
    return version


def get_experiment_stats(db: Session, experiment_name: str, user_id: int) -> dict:
    """Get statistics for an experiment"""
    # Get all assignments for this experiment (only for user's policies)
    assignments = db.query(ABAssignment).join(
        ABPolicy,
        ABAssignment.prompt_name == ABPolicy.prompt_name
    ).filter(
        ABAssignment.experiment_name == experiment_name,
        or_(
            ABPolicy.created_by == user_id,
            ABPolicy.is_public == True
        )
    ).all()

    if not assignments:
        return {
            "experiment_name": experiment_name,
            "total_assignments": 0,
            "variants": {}
        }

    # Count by version
    variant_counts = {}
    for assignment in assignments:
        version_str = str(assignment.version)
        variant_counts[version_str] = variant_counts.get(version_str, 0) + 1

    total = len(assignments)
    variants = {
        version: {
            "count": count,
            "percentage": round((count / total) * 100, 2) if total > 0 else 0
        }
        for version, count in variant_counts.items()
    }

    return {
        "experiment_name": experiment_name,
        "total_assignments": total,
        "variants": variants
    }

