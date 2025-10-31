from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, RoleEnum
from ..schemas import UserCreate, UserOut, TokenOut
from ..config import settings
from ..utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
    get_current_user
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already in use")
    user = User(email=payload.email, hashed_password=get_password_hash(payload.password), role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # Create access token (short-lived: 15 minutes)
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})

    # Create refresh token (long-lived: 7 days) and store in database
    refresh_token = create_refresh_token(user.id, db)

    # Set refresh token in httpOnly cookie (secure, not accessible from JavaScript)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,  # True in production (HTTPS only), False in development
        samesite="lax",
        max_age=7 * 24 * 60 * 60  # 7 days in seconds
    )

    return TokenOut(access_token=access_token)


@router.post("/refresh", response_model=TokenOut)
def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token from httpOnly cookie"""
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail="No refresh token found"
        )

    # Verify refresh token and get user
    user = verify_refresh_token(refresh_token, db)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token"
        )

    # Create new access token
    new_access_token = create_access_token(
        {"sub": str(user.id), "role": user.role.value}
    )

    # REFRESH TOKEN ROTATION (security best practice)
    # Revoke old refresh token and create a new one
    revoke_refresh_token(refresh_token, db)
    new_refresh_token = create_refresh_token(user.id, db)

    # Set new refresh token in cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.is_production,  # True in production (HTTPS only), False in development
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )

    return TokenOut(access_token=new_access_token)


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Logout: revoke refresh token and clear cookie"""
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token:
        revoke_refresh_token(refresh_token, db)

    # Delete refresh token cookie
    response.delete_cookie("refresh_token")

    return {"message": "Logged out successfully"}


@router.post("/logout-all")
def logout_all(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Logout from all devices: revoke all user's refresh tokens"""
    revoke_all_user_tokens(current_user.id, db)

    # Delete refresh token cookie
    response.delete_cookie("refresh_token")

    return {"message": "Logged out from all devices"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user
