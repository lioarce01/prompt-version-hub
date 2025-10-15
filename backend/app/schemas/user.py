from pydantic import BaseModel, EmailStr
from datetime import datetime
from ..models import RoleEnum


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: RoleEnum = RoleEnum.editor


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: RoleEnum
    created_at: datetime

    class Config:
        from_attributes = True

