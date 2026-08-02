"""
Unit tests for Qdrant Vector Store wrapper.
Mocks the AsyncQdrantClient to verify correct payload assembly and filtering.
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from qdrant_client.http import models as rest_models

from app.storage.vector_store import QdrantVectorStore


@pytest.mark.asyncio
@patch("app.storage.vector_store.AsyncQdrantClient")
async def test_init_collections(mock_client_class):
    mock_client = AsyncMock()
    mock_client_class.return_value = mock_client
    mock_client.collection_exists.return_value = False

    store = QdrantVectorStore()
    await store.init_collections()

    # Verify create_collection was called twice (chunks and memories)
    assert mock_client.create_collection.call_count == 2
    # Verify index creation
    assert mock_client.create_payload_index.call_count == 3


@pytest.mark.asyncio
@patch("app.storage.vector_store.AsyncQdrantClient")
async def test_upsert_code_chunks(mock_client_class):
    mock_client = AsyncMock()
    mock_client_class.return_value = mock_client

    store = QdrantVectorStore()
    user_id = uuid.uuid4()
    repo_id = uuid.uuid4()
    chunks = [
        {
            "file_path": "test.py",
            "content": "def hello(): pass",
            "start_line": 1,
            "end_line": 2,
            "language": "python",
            "is_ast": True
        }
    ]
    embeddings = [[0.1] * 768]

    await store.upsert_code_chunks(user_id, repo_id, chunks, embeddings)

    # Check upsert arguments
    mock_client.upsert.assert_called_once()
    kwargs = mock_client.upsert.call_args[1]
    assert kwargs["collection_name"] == store.collection_chunks
    points = kwargs["points"]
    assert len(points) == 1
    assert points[0].payload["user_id"] == str(user_id)
    assert points[0].payload["repository_id"] == str(repo_id)
    assert points[0].payload["file_path"] == "test.py"
    assert points[0].payload["content"] == "def hello(): pass"
    assert points[0].payload["language"] == "python"
    assert points[0].payload["is_ast"] is True


@pytest.mark.asyncio
@patch("app.storage.vector_store.AsyncQdrantClient")
async def test_search_code_chunks(mock_client_class):
    mock_client = AsyncMock()
    mock_client_class.return_value = mock_client

    # Mock search result item
    mock_response = AsyncMock()
    mock_result = AsyncMock()
    mock_result.id = "test-id"
    mock_result.score = 0.95
    mock_result.payload = {
        "file_path": "test.py",
        "content": "def hello(): pass",
        "start_line": 1,
        "end_line": 2,
        "language": "python"
    }
    mock_response.points = [mock_result]
    mock_client.query_points.return_value = mock_response

    store = QdrantVectorStore()
    user_id = uuid.uuid4()
    repo_id = uuid.uuid4()
    query_vector = [0.1] * 768

    results = await store.search_code_chunks(user_id, repo_id, query_vector, limit=5)

    assert len(results) == 1
    assert results[0]["file_path"] == "test.py"
    assert results[0]["score"] == 0.95

    # Check filter constraints (tenant isolation is active)
    mock_client.query_points.assert_called_once()
    kwargs = mock_client.query_points.call_args[1]
    query_filter = kwargs["query_filter"]
    
    # Must contain user_id filter and repository_id filter
    must_conditions = query_filter.must
    assert len(must_conditions) == 2
    assert must_conditions[0].key == "user_id"
    assert must_conditions[0].match.value == str(user_id)
    assert must_conditions[1].key == "repository_id"
    assert must_conditions[1].match.value == str(repo_id)
