"""
DevAssist AI — Security Utilities

JWT token creation/verification and password hashing.
Uses PyJWT + passlib[bcrypt]. No paid services.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
import bcrypt

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt."""
    pw_bytes = plain.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    pw_bytes = plain.encode("utf-8")
    hashed_bytes = hashed.encode("utf-8")
    try:
        return bcrypt.checkpw(pw_bytes, hashed_bytes)
    except Exception:
        return False


# ── JWT tokens ──────────────────────────────────────────────────

def _create_token(payload: dict[str, Any], expires_delta: timedelta) -> str:
    """Internal: sign a JWT with expiry."""
    now = datetime.now(timezone.utc)
    data = {
        **payload,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(data, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str, email: str) -> str:
    """
    Create a short-lived access token (15 min default).
    Carries: sub (user_id), email, type=access
    """
    return _create_token(
        payload={"sub": user_id, "email": email, "type": "access"},
        expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )


def create_refresh_token(user_id: str) -> str:
    """
    Create a long-lived refresh token (7 days default).
    Carries: sub (user_id), type=refresh
    """
    return _create_token(
        payload={"sub": user_id, "type": "refresh"},
        expires_delta=timedelta(days=settings.jwt_refresh_token_expire_days),
    )


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.

    Raises:
        jwt.ExpiredSignatureError — token has expired
        jwt.InvalidTokenError     — token is invalid/tampered
    """
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
