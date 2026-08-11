"""
DevAssist AI — Document API Pydantic Schemas
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    """Database representation of an ingested document."""

    id: uuid.UUID
    repo_id: uuid.UUID | None = None
    filename: str
    file_type: str
    file_size: int
    status: str  # "processing" | "ready" | "error"
    chunk_count: int
    error_message: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class URLIngestPayload(BaseModel):
    """Payload to ingest a web page via URL."""

    url: str = Field(..., description="HTTP or HTTPS URL to fetch, parse, and ingest")
    repo_id: uuid.UUID | None = Field(default=None, description="Optional repository scope ID")
