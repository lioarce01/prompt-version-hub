from pydantic import BaseModel
from typing import Dict
from datetime import datetime


class ABPolicyIn(BaseModel):
    prompt_name: str
    weights: Dict[str, int]


class ABPolicyOut(ABPolicyIn):
    updated_at: datetime


class ABAssignIn(BaseModel):
    experiment_name: str
    prompt_name: str
    user_id: str


class ABAssignOut(BaseModel):
    experiment_name: str
    prompt_name: str
    user_id: str
    version: int

