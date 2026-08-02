"""
DevAssist AI — Auth FastAPI Dependency

Provides `get_current_user` as a reusable FastAPI dependency
that validates the JWT on every protected request.
"""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.storage.database import get_db
from app.utils.security import decode_token
from app.utils.logger import get_logger

import jwt

logger = get_logger(__name__)

# Bearer token extractor — reads Authorization: Bearer <token>
bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency: validates JWT and returns the current user.

    Usage:
        @router.get("/protected")
        async def endpoint(user: User = Depends(get_current_user)):
            ...

    Raises:
        401 — missing/invalid/expired token
        401 — user not found or deactivated
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired — please log in again",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

    # Validate token type
    if payload.get("type") != "access":
        raise credentials_exception

    user_id_str: str | None = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = await db.get(User, user_id)

    if not user or not user.is_active:
        raise credentials_exception

    return user
