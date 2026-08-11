"""
Unit tests for RAG Context Retrieval Service.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.retrieval import RetrievalService


@pytest.mark.asyncio
@patch("app.services.retrieval.get_embedding_provider")
@patch("app.services.retrieval.vector_store")
async def test_retrieve_context_flow_and_boosting(mock_vector_store, mock_get_embed):
    # Mock embedding provider
    mock_provider = MagicMock()
    mock_provider.embed_text = AsyncMock(return_value=[0.1] * 768)
    mock_get_embed.return_value = mock_provider

    # Mock Qdrant search results
    # Query contains keyword "database", let's mock one file matching that word and one not
    mock_vector_store.search_code_chunks = AsyncMock(
        return_value=[
            {
                "id": "1",
                "score": 0.70,
                "file_path": "app/db.py",  # match filename "db" / "database"
                "content": "connect_db()",
                "start_line": 1,
                "end_line": 10,
                "language": "python",
            },
            {
                "id": "2",
                "score": 0.80,
                "file_path": "app/main.py",  # no match
                "content": "print('hello')",
                "start_line": 1,
                "end_line": 5,
                "language": "python",
            },
        ]
    )

    service = RetrievalService()
    user_id = uuid.uuid4()
    repo_id = uuid.uuid4()

    # Query has word "db"
    results = await service.retrieve_context(user_id, repo_id, "how to connect to db", limit=2)

    # Check embedding calls
    mock_provider.embed_text.assert_called_once_with("how to connect to db")
    mock_vector_store.search_code_chunks.assert_called_once()

    # Verify keyword boosting re-sorted the results
    # Item 1 had score 0.70, but got boosted (filename contains "db" which is in query terms)
    # Item 2 had score 0.80, no boost
    # Check if Item 1 score was boosted above Item 2 and sorting changed
    assert len(results) == 2
    assert results[0]["id"] == "1"  # Should be first now due to boost
    assert results[0]["score"] > 0.80


def test_format_context_prompt_structure():
    service = RetrievalService()
    chunks = [
        {
            "file_path": "main.py",
            "content": "print('hello')",
            "start_line": 1,
            "end_line": 3,
            "language": "python",
            "score": 0.95,
        }
    ]

    formatted = service.format_context_prompt(chunks)
    assert "main.py" in formatted
    assert "1-3" in formatted
    assert "print('hello')" in formatted
    assert "Relevance Score: 0.95" in formatted
