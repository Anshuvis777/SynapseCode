"""
DevAssist AI — Chat Session ORM Model
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.database import Base
from app.models.mixins import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.repository import Repository
    from app.models.message import Message


class Session(UUIDMixin, TimestampMixin, Base):
    """
    A chat session — groups messages under a single conversation.
    Can optionally be scoped to a specific repository.
    """

    __tablename__ = "sessions"

    # ── Ownership ───────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Repository scope (optional) ─────────────────────────────
    repo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repositories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── Session identity ────────────────────────────────────────
    title: Mapped[str] = mapped_column(
        String(500), nullable=False, default="New Chat"
    )

    # ── Relationships ───────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    repository: Mapped["Repository | None"] = relationship(
        "Repository", back_populates="sessions"
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:
        return f"<Session id={self.id} title={self.title!r}>"
