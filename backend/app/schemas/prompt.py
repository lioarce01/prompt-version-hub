from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PromptBase(BaseModel):
    name: str
    template: str
    variables: List[str] = Field(default_factory=list)
    is_public: bool = False


class PromptCreate(PromptBase):
    pass


class PromptUpdate(BaseModel):
    template: str
    variables: List[str] = Field(default_factory=list)


class PromptOut(BaseModel):
    id: int
    name: str
    template: str
    variables: List[str]
    version: int
    created_by: int
    created_at: datetime
    active: bool
    is_public: bool

    class Config:
        from_attributes = True


class DiffOut(BaseModel):
    from_version: int
    to_version: int
    diff: str


class PromptListOut(BaseModel):
    items: List["PromptOut"]
    limit: int
    offset: int
    count: int
    has_next: bool


class PromptVisibilityUpdate(BaseModel):
    is_public: bool


class PromptCloneRequest(BaseModel):
    new_name: Optional[str] = None
