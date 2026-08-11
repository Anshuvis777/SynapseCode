"""
DevAssist AI — Chat API Pydantic Schemas
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class SessionCreate(BaseModel):
    """Payload to create a new chat session."""

    repository_id: uuid.UUID | None = Field(
        default=None, description="ID of the repository this session is scoped to"
    )
    title: str = Field(default="New Conversation", max_length=255)


class SessionUpdate(BaseModel):
    """Payload to update an existing chat session."""

    repository_id: uuid.UUID | None = None
    title: str | None = None


class SessionResponse(BaseModel):
    """Database representation of a chat session."""

    id: uuid.UUID
    user_id: uuid.UUID
    repository_id: uuid.UUID | None = None
    title: str
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def map_repo_id(cls, data: any) -> any:
        # Standardize repo_id to repository_id for API consumption
        if hasattr(data, "repo_id"):
            data.repository_id = data.repo_id
        elif isinstance(data, dict) and "repo_id" in data:
            data["repository_id"] = data["repo_id"]
        return data

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    """Payload to send a new message in a session."""

    content: str = Field(..., min_length=1, description="Message text from the developer")


class MessageResponse(BaseModel):
    """Database representation of a chat message."""

    id: uuid.UUID
    session_id: uuid.UUID
    role: str  # "user" | "assistant" | "system"
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
