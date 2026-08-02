"""
DevAssist AI — User ORM Model
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.database import Base
from app.models.mixins import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.session import Session
    from app.models.repository import Repository
    from app.models.document import Document
    from app.models.memory import Memory


class User(UUIDMixin, TimestampMixin, Base):
    """
    Represents an authenticated user of DevAssist AI.
    """

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # User-level LLM/UI preferences stored as JSON
    # e.g. {"llm_provider": "groq", "model": "llama-3.1-8b-instant", "temperature": 0.1}
    settings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # ── Relationships ───────────────────────────────────────────
    sessions: Mapped[list["Session"]] = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )
    repositories: Mapped[list["Repository"]] = relationship(
        "Repository", back_populates="user", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="user", cascade="all, delete-orphan"
    )
    memories: Mapped[list["Memory"]] = relationship(
        "Memory", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
