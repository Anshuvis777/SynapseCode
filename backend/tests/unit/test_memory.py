"""
Unit tests for long-term Chat Memory API Router.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status

from app.api.dependencies import get_current_user
from app.main import app
from app.models.user import User


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email=f"developer-{uuid.uuid4()}@test.com",
        name="Memory Tester",
        hashed_password="some_mock_hash",
        is_active=True,
    )


@pytest.fixture
def override_auth(mock_user):
    """Overrides get_current_user dependency for the test duration."""
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]


@pytest.mark.asyncio
@patch("app.api.memory.vector_store")
@patch("app.api.memory.get_embedding_provider")
async def test_create_memory_flow(
    mock_get_embed,
    mock_vector_store,
    client,
    mock_user,
    override_auth,
):
    # Mock embedding provider
    mock_embed = MagicMock()
    mock_embed.embed_text = AsyncMock(return_value=[0.1] * 768)
    mock_get_embed.return_value = mock_embed

    # Mock Qdrant upsert
    mock_vector_store.upsert_memories = AsyncMock()

    payload = {"content": "I prefer using async/await syntax in JavaScript", "category": "style"}

    response = await client.post("/api/memories", json=payload)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["content"] == payload["content"]
    assert data["category"] == "style"
    assert "id" in data

    # Verify embeddings were requested and saved
    mock_embed.embed_text.assert_called_once_with(payload["content"])
    mock_vector_store.upsert_memories.assert_called_once()


@pytest.mark.asyncio
@patch("app.api.memory.vector_store")
async def test_list_memories(
    mock_vector_store,
    client,
    mock_user,
    override_auth,
):
    mock_id = uuid.uuid4()
    mock_vector_store.list_memories = AsyncMock(
        return_value=[
            {"id": mock_id, "content": "Prefers typescript over javascript", "category": "style"}
        ]
    )

    response = await client.get("/api/memories")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(mock_id)
    assert data[0]["content"] == "Prefers typescript over javascript"
    assert data[0]["category"] == "style"


@pytest.mark.asyncio
@patch("app.api.memory.vector_store")
async def test_delete_memory(
    mock_vector_store,
    client,
    mock_user,
    override_auth,
):
    mock_id = uuid.uuid4()
    mock_vector_store.delete_memory = AsyncMock()

    response = await client.delete(f"/api/memories/{mock_id}")

    assert response.status_code == status.HTTP_204_NO_CONTENT
    mock_vector_store.delete_memory.assert_called_once_with(mock_user.id, mock_id)
