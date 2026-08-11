"""
DevAssist AI — Auth API Router

Endpoints:
  POST /api/auth/register   — create account
  POST /api/auth/login      — get JWT pair
  POST /api/auth/refresh    — refresh access token
  POST /api/auth/logout     — client-side (stateless)
  GET  /api/auth/me         — get current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.auth import AuthError, AuthService
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.storage.database import get_db
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user account",
)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Register a new DevAssist AI user.

    Returns the created user (no tokens — user must login separately).
    """
    service = AuthService(db)
    try:
        user = await service.register(payload)
        return UserResponse.model_validate(user)
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive JWT pair",
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Login with email + password.

    Returns an access token (15 min) and refresh token (7 days).
    Store both on the client — use access token for API requests,
    refresh token to get a new access token when it expires.
    """
    service = AuthService(db)
    try:
        access_token, refresh_token = await service.login(payload)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Issue a new access token using a refresh token",
)
async def refresh(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Exchange a valid refresh token for a new access token.

    The refresh token itself is NOT rotated in v1 (stateless for simplicity).
    """
    service = AuthService(db)
    try:
        new_access_token = await service.refresh(payload.refresh_token)
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=payload.refresh_token,  # Return same refresh token
        )
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout (client-side token discard)",
)
async def logout() -> None:
    """
    Logout endpoint — stateless in v1.

    The client should discard both tokens from storage.
    Blacklisting tokens (Redis-based) is a v2 feature.
    """
    return None


@router.get(
    "/me",
    response_model=MeResponse,
    summary="Get current authenticated user",
)
async def me(
    current_user: User = Depends(get_current_user),
) -> MeResponse:
    """
    Returns the profile of the currently authenticated user.

    Requires: Authorization: Bearer <access_token>
    """
    return MeResponse.model_validate(current_user)
