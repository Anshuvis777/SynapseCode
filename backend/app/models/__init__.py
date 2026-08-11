"""
DevAssist AI — Models package

Import all models here so Alembic's autogenerate can detect them.
"""

from app.models.document import Document
from app.models.memory import Memory
from app.models.message import Message
from app.models.repository import Repository
from app.models.session import Session
from app.models.user import User

__all__ = [
    "User",
    "Repository",
    "Session",
    "Message",
    "Document",
    "Memory",
]
