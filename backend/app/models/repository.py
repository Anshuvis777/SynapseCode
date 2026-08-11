"""
DevAssist AI — Repository ORM Model
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.mixins import TimestampMixin, UUIDMixin
from app.storage.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.session import Session
    from app.models.user import User


class Repository(UUIDMixin, TimestampMixin, Base):
    """
    Represents an indexed code repository.

    A repository can be sourced from GitHub (clone) or a ZIP upload.
    Once indexed, its chunks live in Qdrant. Metadata lives here.
    """

    __tablename__ = "repositories"

    # ── Ownership ───────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Identity ────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)  # GitHub URL if remote

    # ── Source ──────────────────────────────────────────────────
    # "github" | "local_zip" | "local_dir"
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="github")
    language: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ── Indexing State ──────────────────────────────────────────
    # pending → cloning → parsing → embedding → ready | error
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Stats (populated after indexing) ────────────────────────
    file_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    size: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "12.4 MB"

    # ── Relationships ───────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="repositories")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="repository")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="repository")

    def __repr__(self) -> str:
        return f"<Repository id={self.id} name={self.name} status={self.status}>"
