"""
Unit tests for External Document Ingestion API and Background Processing.
"""

import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.dependencies import get_current_user
from app.main import app
from app.models.document import Document
from app.models.user import User


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email=f"developer-{uuid.uuid4()}@test.com",
        name="Document Tester",
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
@patch("app.workers.tasks.process_document_task")
async def test_upload_document_success(
    mock_task,
    client,
    mock_user,
    db_session,
    override_auth,
):
    db_session.add(mock_user)
    await db_session.flush()

    file_content = b"This is some external configuration documentation."
    file_obj = io.BytesIO(file_content)

    response = await client.post(
        "/api/documents",
        files={"file": ("config_doc.txt", file_obj, "text/plain")},
        data={"repo_id": str(uuid.uuid4())}
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["filename"] == "config_doc.txt"
    assert data["file_type"] == "txt"
    assert data["status"] == "processing"
    assert "id" in data

    # Verify background Celery task was triggered
    mock_task.delay.assert_called_once_with(data["id"])


@pytest.mark.asyncio
@patch("app.workers.tasks.process_document_task")
@patch("httpx.AsyncClient.get")
async def test_ingest_url_success(
    mock_get,
    mock_task,
    client,
    mock_user,
    db_session,
    override_auth,
):
    db_session.add(mock_user)
    await db_session.flush()

    # Mock HTTP response containing simple HTML page
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "<html><body><h1>Guide</h1><p>Setup instructions here.</p></body></html>"
    mock_get.return_value = mock_response

    payload = {
        "url": "https://example.com/guide",
        "repo_id": str(uuid.uuid4())
    }

    response = await client.post("/api/documents/url", json=payload)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "web_example.com" in data["filename"]
    assert data["status"] == "processing"

    mock_task.delay.assert_called_once_with(data["id"])


@pytest.mark.asyncio
@patch("app.workers.tasks.vector_store")
@patch("app.workers.tasks.get_embedding_provider")
async def test_celery_process_document_task(
    mock_get_embed,
    mock_vector_store,
    test_engine,
    mock_user,
):
    from app.workers.tasks import _async_process_document

    local_sessionmaker = async_sessionmaker(test_engine, expire_on_commit=False)
    
    # Save a mock user and document record to database
    async with local_sessionmaker() as db:
        db.add(mock_user)
        await db.commit()

        # Write a temporary physical file mock
        doc_id = uuid.uuid4()
        temp_file_path = f"/tmp/doc_{doc_id}.txt"
        with open(temp_file_path, "w", encoding="utf-8") as f:
            f.write("Some mock guidelines contents.")

        doc = Document(
            id=doc_id,
            user_id=mock_user.id,
            filename="guidelines.txt",
            file_type="txt",
            file_size=30,
            storage_path=temp_file_path,
            status="processing",
        )
        db.add(doc)
        await db.commit()

    # Mock embeddings and upsert
    mock_embed = MagicMock()
    mock_embed.embed_batch = AsyncMock(return_value=[[0.2] * 768])
    mock_get_embed.return_value = mock_embed
    mock_vector_store.upsert_code_chunks = AsyncMock()

    # Run the pipeline task using the patched Local session maker
    with patch("app.workers.tasks.AsyncSessionLocal", local_sessionmaker):
        result = await _async_process_document(doc_id)
        assert result is True

    # Check updated database record status
    async with local_sessionmaker() as db:
        updated_doc = await db.get(Document, doc_id)
        assert updated_doc is not None
        assert updated_doc.status == "ready"
        assert updated_doc.chunk_count == 1

    # Cleanup temp file
    import os
    if os.path.exists(temp_file_path):
        os.remove(temp_file_path)
