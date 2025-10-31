from datetime import datetime, timedelta
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_minutes: int | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes or settings.jwt_access_expires_min)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get current user from JWT token"""
    from ..models import User

    payload = decode_token(token)
    user_id: str = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def create_refresh_token(user_id: int, db: Session) -> str:
    """Create a refresh token and store it in the database"""
    from ..models import RefreshToken

    # Generate secure random token
    token = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(days=settings.jwt_refresh_expires_days)

    # Store in database
    refresh_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(refresh_token)
    db.commit()

    return token


def verify_refresh_token(token: str, db: Session):
    """Verify refresh token and return user if valid"""
    from ..models import RefreshToken, User

    # Find refresh token in database
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.utcnow()
    ).first()

    if not refresh_token:
        return None

    # Get associated user
    user = db.query(User).filter(User.id == refresh_token.user_id).first()
    return user


def revoke_refresh_token(token: str, db: Session) -> bool:
    """Revoke a refresh token (mark as revoked)"""
    from ..models import RefreshToken

    result = db.query(RefreshToken).filter(
        RefreshToken.token == token
    ).update({"revoked": True})

    db.commit()
    return result > 0


def revoke_all_user_tokens(user_id: int, db: Session):
    """Revoke all refresh tokens for a specific user"""
    from ..models import RefreshToken

    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked == False
    ).update({"revoked": True})

    db.commit()


def cleanup_expired_tokens(db: Session):
    """Delete expired and revoked refresh tokens (for cleanup cron job)"""
    from ..models import RefreshToken

    # Delete tokens that are expired OR revoked
    db.query(RefreshToken).filter(
        (RefreshToken.expires_at < datetime.utcnow()) | (RefreshToken.revoked == True)
    ).delete()

    db.commit()
