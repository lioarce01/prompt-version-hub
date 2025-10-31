from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime


class ABPolicyIn(BaseModel):
    prompt_name: str
    weights: Dict[str, int]
    is_public: bool = False


class ABPolicyOut(BaseModel):
    id: int
    prompt_name: str
    weights: Dict[str, int]
    created_by: Optional[int]
    is_public: bool
    created_at: datetime
    updated_at: datetime


class ABPolicyListItem(BaseModel):
    id: int
    prompt_name: str
    weights: Dict[str, int]
    is_public: bool
    created_at: datetime
    is_owner: bool  # Computed field to show if current user owns it


class ABAssignIn(BaseModel):
    experiment_name: str
    prompt_name: str
    user_id: str


class ABAssignOut(BaseModel):
    experiment_name: str
    prompt_name: str
    user_id: str
    version: int


class ABStatsOut(BaseModel):
    experiment_name: str
    total_assignments: int
    variants: Dict[str, Dict[str, int | float]]  # version: {count, percentage}

