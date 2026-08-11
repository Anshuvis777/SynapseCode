"""
DevAssist AI — Memory API Pydantic Schemas
"""

import uuid

from pydantic import BaseModel, Field


class MemoryCreate(BaseModel):
    """Payload to create a new conversational memory/preference."""

    content: str = Field(..., min_length=2, description="Fact or preference to remember")
    category: str = Field(
        default="general", max_length=100, description="Optional category (e.g. style, environment)"
    )


class MemoryResponse(BaseModel):
    """Output representation of a saved memory."""

    id: uuid.UUID
    content: str
    category: str
