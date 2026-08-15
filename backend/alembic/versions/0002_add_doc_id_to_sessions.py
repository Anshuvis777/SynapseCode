"""Add doc_id to sessions

Revision ID: 0002_add_doc_id_to_sessions
Revises: 0001_initial
Create Date: 2026-08-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_add_doc_id_to_sessions"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("doc_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_sessions_documents",
        "sessions",
        "documents",
        ["doc_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_sessions_doc_id", "sessions", ["doc_id"])


def downgrade() -> None:
    op.drop_index("ix_sessions_doc_id", "sessions")
    op.drop_constraint("fk_sessions_documents", "sessions")
    op.drop_column("sessions", "doc_id")
