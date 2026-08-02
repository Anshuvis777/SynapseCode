"""
Unit tests for Code Search API Endpoint.
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import status

from app.api.dependencies import get_current_user
from app.main import app
from app.models.repository import Repository
from app.models.user import User


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email=f"developer-{uuid.uuid4()}@test.com",
        name="Developer Name",
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
@patch("app.api.search.retrieval_service")
async def test_search_codebase_success(mock_retrieval, client, mock_user, db_session, override_auth):
    # Setup database state
    db_session.add(mock_user)
    await db_session.flush()

    repo_id = uuid.uuid4()
    repo = Repository(
        id=repo_id,
        user_id=mock_user.id,
        name="project-alpha",
        status="completed",
    )
    db_session.add(repo)
    await db_session.flush()

    # Mock retrieval service results
    mock_retrieval.retrieve_context = AsyncMock(return_value=[
        {
            "file_path": "src/index.js",
            "content": "const express = require('express');",
            "start_line": 1,
            "end_line": 2,
            "language": "javascript",
            "score": 0.85
        }
    ])

    response = await client.get(
        "/api/search",
        params={
            "repo_id": str(repo_id),
            "q": "express server setup",
            "limit": 5
        }
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["file_path"] == "src/index.js"
    assert data[0]["language"] == "javascript"
    assert data[0]["score"] == 0.85

    # Verify retrieval called with correct parameters
    mock_retrieval.retrieve_context.assert_called_once_with(
        user_id=mock_user.id,
        repository_id=repo_id,
        query="express server setup",
        limit=5,
    )


@pytest.mark.asyncio
async def test_search_codebase_unauthorized_repository(client, mock_user, db_session, override_auth):
    db_session.add(mock_user)
    await db_session.flush()

    # Create repository owned by a different user
    repo = Repository(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(), # different user id
        name="project-beta",
        status="completed",
    )
    db_session.add(repo)
    await db_session.flush()

    response = await client.get(
        "/api/search",
        params={
            "repo_id": str(repo.id),
            "q": "some query",
        }
    )

    # Should deny access since repo belongs to a different user
    assert response.status_code == status.HTTP_404_NOT_FOUND
