"""
Unit tests for Repositories API endpoints using local SQLite in-memory database.
Tests the actual CRUD operations and queries while mocking external services (Qdrant & Celery).
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import status
from sqlalchemy import select

from app.api.dependencies import get_current_user
from app.main import app
from app.models.repository import Repository
from app.models.user import User


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="test@example.com",
        name="Test User",
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
@patch("app.api.repositories.index_repository_task")
async def test_create_repository_success(mock_task, client, mock_user, db_session, override_auth):
    # Register mock user in SQLite DB so constraints pass if needed
    db_session.add(mock_user)
    await db_session.flush()

    payload = {
        "name": "new-repo",
        "url": "https://github.com/my/new-repo",
        "source_type": "github",
        "description": "Some description",
    }

    response = await client.post("/api/repos", json=payload)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "new-repo"
    assert data["status"] == "pending"

    # Verify celery task was dispatched
    mock_task.delay.assert_called_once()

    # Query DB to check if repository was persisted
    query = select(Repository).where(Repository.name == "new-repo")
    repo = await db_session.scalar(query)
    assert repo is not None
    assert repo.user_id == mock_user.id


@pytest.mark.asyncio
async def test_list_repositories(client, mock_user, db_session, override_auth):
    # Save user and repo in DB
    db_session.add(mock_user)
    await db_session.flush()

    mock_repo = Repository(
        id=uuid.uuid4(),
        user_id=mock_user.id,
        name="test-repo",
        url="https://github.com/test/test-repo",
        source_type="github",
        status="pending",
        progress=0,
    )
    db_session.add(mock_repo)
    await db_session.flush()

    response = await client.get("/api/repos")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "test-repo"
    assert data[0]["id"] == str(mock_repo.id)


@pytest.mark.asyncio
@patch("app.api.repositories.vector_store")
async def test_delete_repository(mock_vector_store, client, mock_user, db_session, override_auth):
    # Save user and repo in DB
    db_session.add(mock_user)
    await db_session.flush()

    mock_repo = Repository(
        id=uuid.uuid4(),
        user_id=mock_user.id,
        name="test-repo",
        url="https://github.com/test/test-repo",
        source_type="github",
        status="pending",
        progress=0,
    )
    db_session.add(mock_repo)
    await db_session.flush()

    mock_vector_store.delete_by_repository = AsyncMock()

    with patch("app.api.repositories.shutil.rmtree") as mock_rmtree:
        response = await client.delete(f"/api/repos/{mock_repo.id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify vector store delete called
        mock_vector_store.delete_by_repository.assert_called_once_with(mock_user.id, mock_repo.id)

        # Query DB to check if repo was deleted
        query = select(Repository).where(Repository.id == mock_repo.id)
        repo = await db_session.scalar(query)
        assert repo is None
