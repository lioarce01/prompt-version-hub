from pydantic import BaseModel
from datetime import datetime
from typing import List


class DeploymentCreate(BaseModel):
    prompt_name: str
    version: int
    environment: str


class DeploymentOut(BaseModel):
    id: int
    prompt_id: int
    environment: str
    deployed_at: datetime
    deployed_by: int

    class Config:
        from_attributes = True


class DeploymentListOut(BaseModel):
    items: List["DeploymentOut"]
    limit: int
    offset: int
    count: int
    has_next: bool
