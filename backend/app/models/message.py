"""
DevAssist AI — Chat Message ORM Model
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.database import Base
from app.models.mixins import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.session import Session


class Message(UUIDMixin, TimestampMixin, Base):
    """
    A single message within a chat session.

    Stores the full content, role, and source citations from RAG.
    """

    __tablename__ = "messages"

    # ── Session reference ────────────────────────────────────────
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Content ──────────────────────────────────────────────────
    # "user" | "assistant" | "system"
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # ── RAG sources (list of chunk citations) ────────────────────
    # [{"file_path": "src/auth.py", "start_line": 45, "end_line": 92, "score": 0.87}, ...]
    sources: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # ── Model metadata ───────────────────────────────────────────
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Status ───────────────────────────────────────────────────
    # "complete" | "error"
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="complete")

    # ── Relationship ─────────────────────────────────────────────
    session: Mapped["Session"] = relationship("Session", back_populates="messages")

    def __repr__(self) -> str:
        return f"<Message id={self.id} role={self.role} session={self.session_id}>"
