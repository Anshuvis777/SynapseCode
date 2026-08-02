"""
DevAssist AI — Auth Service

Business logic for user registration, login, and token management.
Separated from the HTTP layer so it's testable in isolation.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.utils.logger import get_logger

import jwt

logger = get_logger(__name__)


class AuthError(Exception):
    """Raised for authentication failures — caught by the router."""
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AuthService:
    """Handles user registration, login, and token operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, payload: RegisterRequest) -> User:
        """
        Create a new user account.

        Raises:
            AuthError(409) — if email already exists
        """
        # Check uniqueness
        existing = await self.db.scalar(
            select(User).where(User.email == payload.email)
        )
        if existing:
            raise AuthError("Email already registered", status_code=409)

        user = User(
            id=uuid.uuid4(),
            email=payload.email,
            name=payload.name,
            hashed_password=hash_password(payload.password),
            settings={},
        )
        self.db.add(user)
        await self.db.flush()  # get the id without committing yet

        logger.info("user_registered", user_id=str(user.id), email=user.email)
        return user

    async def login(self, payload: LoginRequest) -> tuple[str, str]:
        """
        Authenticate a user and return (access_token, refresh_token).

        Raises:
            AuthError(401) — invalid credentials
        """
        user = await self.db.scalar(
            select(User).where(User.email == payload.email)
        )

        if not user or not verify_password(payload.password, user.hashed_password):
            raise AuthError("Invalid email or password", status_code=401)

        if not user.is_active:
            raise AuthError("Account is disabled", status_code=403)

        access_token = create_access_token(str(user.id), user.email)
        refresh_token = create_refresh_token(str(user.id))

        logger.info("user_logged_in", user_id=str(user.id))
        return access_token, refresh_token

    async def refresh(self, refresh_token: str) -> str:
        """
        Issue a new access token from a valid refresh token.

        Raises:
            AuthError(401) — invalid or expired refresh token
        """
        try:
            payload = decode_token(refresh_token)
        except jwt.ExpiredSignatureError:
            raise AuthError("Refresh token expired — please log in again")
        except jwt.InvalidTokenError:
            raise AuthError("Invalid refresh token")

        if payload.get("type") != "refresh":
            raise AuthError("Invalid token type")

        user_id = payload.get("sub")
        user = await self.db.get(User, uuid.UUID(user_id))

        if not user or not user.is_active:
            raise AuthError("User not found or disabled")

        return create_access_token(str(user.id), user.email)

    async def get_user_by_id(self, user_id: uuid.UUID) -> User | None:
        """Fetch a user by primary key."""
        return await self.db.get(User, user_id)
