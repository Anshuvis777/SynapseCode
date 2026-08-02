"""
Unit tests for background Celery indexing pipeline tasks.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.repository import Repository
from app.models.user import User
from app.workers.tasks import _async_index_repository


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="owner@test.com",
        name="Owner Name",
        hashed_password="some_mock_hash",
    )


@pytest.fixture
def mock_repo(mock_user):
    return Repository(
        id=uuid.uuid4(),
        user_id=mock_user.id,
        name="sample-project",
        url="https://github.com/owner/sample-project",
        source_type="github",
        status="pending",
        progress=0,
    )


@pytest.mark.asyncio
@patch("app.workers.tasks.clone_repository")
@patch("app.workers.tasks.parse_repository")
@patch("app.workers.tasks.get_embedding_provider")
@patch("app.workers.tasks.vector_store")
async def test_async_index_repository_success(
    mock_vector_store,
    mock_get_embed,
    mock_parse,
    mock_clone,
    mock_user,
    mock_repo,
    test_engine,
):
    # Create a fresh non-transactional session maker for this test
    local_sessionmaker = async_sessionmaker(test_engine, expire_on_commit=False)

    # Insert user and repository configuration into SQLite DB
    async with local_sessionmaker() as session:
        session.add(mock_user)
        session.add(mock_repo)
        await session.commit()

    # Mock cloner path
    mock_clone.return_value = MagicMock()
    
    # Mock parser chunks output
    mock_parse.return_value = [
        {
            "file_path": "main.py",
            "content": "def run(): pass",
            "start_line": 1,
            "end_line": 2,
            "language": "python",
        },
        {
            "file_path": "utils.py",
            "content": "def helper(): pass",
            "start_line": 1,
            "end_line": 2,
            "language": "python",
        }
    ]

    # Mock embedding provider output
    mock_embed_provider = MagicMock()
    mock_embed_provider.embed_batch = AsyncMock(return_value=[[0.1]*768, [0.2]*768])
    mock_get_embed.return_value = mock_embed_provider

    # Mock Qdrant upsert
    mock_vector_store.upsert_code_chunks = AsyncMock()

    # Patch AsyncSessionLocal with local session maker
    with patch("app.workers.tasks.AsyncSessionLocal", local_sessionmaker), \
         patch("app.workers.tasks.shutil.rmtree") as mock_rmtree:
        
        success = await _async_index_repository(mock_repo.id, mock_user.id)
        
        assert success is True
        
        # Verify db_session state was updated to completed
        async with local_sessionmaker() as session:
            repo = await session.get(Repository, mock_repo.id)
            assert repo is not None
            assert repo.status == "completed"
            assert repo.progress == 100
            assert repo.file_count == 2
            assert repo.chunk_count == 2

        # Verify cloner, parser and embedder calls
        mock_clone.assert_called_once_with(mock_repo.url, str(mock_repo.id))
        mock_get_embed.assert_called_once()
        mock_embed_provider.embed_batch.assert_called_once_with(
            ["def run(): pass", "def helper(): pass"]
        )
        mock_vector_store.upsert_code_chunks.assert_called_once()
        mock_rmtree.assert_called_once()
