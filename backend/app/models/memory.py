"""
DevAssist AI — Memory ORM Model
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.database import Base
from app.models.mixins import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Memory(UUIDMixin, TimestampMixin, Base):
    """
    A persistent memory rule for a user.

    Memories are injected into the system prompt on every LLM call.
    Pinned memories appear first and are always included.
    Non-pinned memories are fetched from DB (all, for v1 simplicity).
    """

    __tablename__ = "memories"

    # ── Ownership ───────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Content ──────────────────────────────────────────────────
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Priority ─────────────────────────────────────────────────
    # Pinned memories always appear at the top of the system prompt
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Relationship ─────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="memories")

    def __repr__(self) -> str:
        return f"<Memory id={self.id} pinned={self.pinned} user={self.user_id}>"
