from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import RoleEnum
from ..schemas import ABPolicyIn, ABPolicyOut, ABAssignIn, ABAssignOut
from ..auth import get_current_user, require_roles
from ..services import ab as svc


router = APIRouter(prefix="/ab", tags=["ab-testing"])


@router.post("/policy", response_model=ABPolicyOut, dependencies=[Depends(require_roles(RoleEnum.admin, RoleEnum.editor))])
def set_policy(payload: ABPolicyIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        policy = svc.set_policy(db, payload.prompt_name, payload.weights)
        return ABPolicyOut(prompt_name=policy.prompt_name, weights=policy.weights, updated_at=policy.updated_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/assign", response_model=ABAssignOut)
def assign_variant(payload: ABAssignIn, db: Session = Depends(get_db)):
    try:
        version = svc.assign(db, payload.experiment_name, payload.prompt_name, payload.user_id)
        return ABAssignOut(experiment_name=payload.experiment_name, prompt_name=payload.prompt_name, user_id=payload.user_id, version=version)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
