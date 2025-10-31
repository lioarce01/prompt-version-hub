from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import RoleEnum, User
from ..schemas import (
    ABPolicyIn,
    ABPolicyOut,
    ABPolicyListItem,
    ABAssignIn,
    ABAssignOut,
    ABStatsOut
)
from ..auth import get_current_user, require_roles
from ..services import ab as svc


router = APIRouter(prefix="/ab", tags=["ab-testing"])


@router.post("/policy", response_model=ABPolicyOut, dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))])
def create_or_update_policy(
    payload: ABPolicyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create or update an AB testing policy (experiment)"""
    try:
        policy = svc.set_policy(
            db,
            payload.prompt_name,
            payload.weights,
            user.id,
            payload.is_public
        )
        return ABPolicyOut(
            id=policy.id,
            prompt_name=policy.prompt_name,
            weights=policy.weights,
            created_by=policy.created_by,
            is_public=policy.is_public,
            created_at=policy.created_at,
            updated_at=policy.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/policies", response_model=List[ABPolicyListItem])
def list_policies(
    include_public: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List all AB policies accessible by the current user (own + public)"""
    policies = svc.get_policies(db, user.id, include_public)

    return [
        ABPolicyListItem(
            id=p.id,
            prompt_name=p.prompt_name,
            weights=p.weights,
            is_public=p.is_public,
            created_at=p.created_at,
            is_owner=(p.created_by == user.id)
        )
        for p in policies
    ]


@router.get("/policy/{prompt_name}", response_model=ABPolicyOut)
def get_policy(
    prompt_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get specific AB policy by prompt name"""
    policy = svc.get_policy_by_name(db, prompt_name, user.id)

    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return ABPolicyOut(
        id=policy.id,
        prompt_name=policy.prompt_name,
        weights=policy.weights,
        created_by=policy.created_by,
        is_public=policy.is_public,
        created_at=policy.created_at,
        updated_at=policy.updated_at
    )


@router.delete("/policy/{policy_id}", status_code=204)
def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete an AB policy (only owner can delete)"""
    success = svc.delete_policy(db, policy_id, user.id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Policy not found or you don't have permission to delete it"
        )

    return None


@router.post("/assign", response_model=ABAssignOut)
def assign_variant(
    payload: ABAssignIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Assign a variant to a user based on AB policy"""
    try:
        version = svc.assign(
            db,
            payload.experiment_name,
            payload.prompt_name,
            payload.user_id,
            user.id
        )
        return ABAssignOut(
            experiment_name=payload.experiment_name,
            prompt_name=payload.prompt_name,
            user_id=payload.user_id,
            version=version
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/stats/{experiment_name}", response_model=ABStatsOut)
def get_experiment_statistics(
    experiment_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get statistics for an experiment"""
    stats = svc.get_experiment_stats(db, experiment_name, user.id)
    return ABStatsOut(**stats)
