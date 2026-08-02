"""
DevAssist AI — Auth Pydantic Schemas

Request/response models for authentication endpoints.
"""

import uuid
from pydantic import BaseModel, EmailStr, Field, model_validator


# ── Request schemas ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Payload to create a new user account."""

    name: str = Field(min_length=2, max_length=255, examples=["Anshu Kumar"])
    email: EmailStr = Field(examples=["anshu@example.com"])
    password: str = Field(
        min_length=8,
        max_length=128,
        examples=["StrongPass123!"],
        description="Minimum 8 characters",
    )


class LoginRequest(BaseModel):
    """Payload to authenticate an existing user."""

    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Payload to issue a new access token."""

    refresh_token: str


# ── Response schemas ────────────────────────────────────────────

class TokenResponse(BaseModel):
    """Returned on login and refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Safe public representation of a user (no password)."""

    id: uuid.UUID
    email: str
    name: str
    is_active: bool

    model_config = {"from_attributes": True}


class MeResponse(BaseModel):
    """Extended user info returned by /auth/me."""

    id: uuid.UUID
    email: str
    name: str
    is_active: bool
    settings: dict = Field(default_factory=dict)

    model_config = {"from_attributes": True}
