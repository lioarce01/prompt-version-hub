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


# Nested schemas for enriched deployment response
class PromptInfo(BaseModel):
    id: int
    name: str
    version: int
    template: str

    class Config:
        from_attributes = True


class UserInfo(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class DeploymentWithInfo(BaseModel):
    id: int
    prompt_id: int
    environment: str
    deployed_at: datetime
    deployed_by: int
    prompt: PromptInfo
    user: UserInfo

    class Config:
        from_attributes = True


class DeploymentListOut(BaseModel):
    items: List["DeploymentOut"]
    limit: int
    offset: int
    count: int
    has_next: bool


class DeploymentListWithInfoOut(BaseModel):
    items: List["DeploymentWithInfo"]
    limit: int
    offset: int
    count: int
    has_next: bool
