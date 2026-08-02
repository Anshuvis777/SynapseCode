"""
DevAssist AI — Repository Pydantic Schemas
"""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class RepositoryCreate(BaseModel):
    """Payload to add a new repository for indexing."""

    name: str = Field(min_length=1, max_length=255, examples=["my-fastapi-app"])
    url: HttpUrl | None = Field(
        default=None,
        examples=["https://github.com/fastapi/fastapi"],
        description="Public GitHub repository URL (required if source_type is github)",
    )
    source_type: str = Field(
        default="github",
        description="Source of the repo: 'github' or 'local_zip'",
    )
    description: str | None = Field(default=None, max_length=1000)


class RepositoryResponse(BaseModel):
    """Safe database representation of a repository."""

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    url: str | None
    source_type: str
    language: str | None
    status: str
    progress: int
    error_message: str | None
    file_count: int
    chunk_count: int
    size: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
