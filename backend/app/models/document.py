"""
DevAssist AI — Document ORM Model
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.storage.database import Base
from app.models.mixins import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.repository import Repository


class Document(UUIDMixin, TimestampMixin, Base):
    """
    A user-uploaded document for RAG augmentation.

    Supports PDF, Markdown, DOCX, TXT.
    Can be associated with a repository for scoped retrieval.
    """

    __tablename__ = "documents"

    # ── Ownership ───────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Optional repo scope ─────────────────────────────────────
    repo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repositories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── File metadata ────────────────────────────────────────────
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    # "pdf" | "md" | "docx" | "txt"
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # bytes
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Processing state ────────────────────────────────────────
    # "processing" | "ready" | "error"
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="processing", index=True
    )
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relationships ───────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="documents")
    repository: Mapped["Repository | None"] = relationship(
        "Repository", back_populates="documents"
    )

    def __repr__(self) -> str:
        return f"<Document id={self.id} filename={self.filename} status={self.status}>"
