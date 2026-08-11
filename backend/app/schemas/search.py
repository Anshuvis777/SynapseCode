"""
DevAssist AI — Search API Pydantic Schemas
"""

from pydantic import BaseModel


class SearchResultResponse(BaseModel):
    """Pydantic model representing a semantic search result chunk."""

    file_path: str
    content: str
    start_line: int
    end_line: int
    language: str
    score: float
