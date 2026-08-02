"""
Unit tests for Chat API Session and Streaming message endpoints.
"""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.dependencies import get_current_user
from app.main import app
from app.models.session import Session
from app.models.message import Message
from app.models.user import User


@pytest.fixture
def mock_user():
    return User(
        id=uuid.uuid4(),
        email="developer@test.com",
        name="Dev Name",
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
async def test_create_chat_session(client, mock_user, db_session, override_auth):
    db_session.add(mock_user)
    await db_session.flush()

    repo_id = uuid.uuid4()
    payload = {
        "repository_id": str(repo_id),
        "title": "Debug Build Failure"
    }

    response = await client.post("/api/chat/sessions", json=payload)
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "Debug Build Failure"
    assert data["repository_id"] == str(repo_id)


@pytest.mark.asyncio
async def test_list_chat_sessions(client, mock_user, db_session, override_auth):
    db_session.add(mock_user)
    await db_session.flush()

    repo_id = uuid.uuid4()
    session = Session(
        id=uuid.uuid4(),
        user_id=mock_user.id,
        repo_id=repo_id,
        title="Refactoring Helpers"
    )
    db_session.add(session)
    await db_session.flush()

    response = await client.get("/api/chat/sessions")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Refactoring Helpers"


@pytest.mark.asyncio
@patch("app.api.chat.retrieval_service")
@patch("app.api.chat.get_llm_provider")
async def test_send_message_streaming_sse(
    mock_get_llm,
    mock_retrieval,
    client,
    mock_user,
    test_engine,
    override_auth,
):
    # Setup database records using a fresh non-transactional session maker
    local_sessionmaker = async_sessionmaker(test_engine, expire_on_commit=False)
    
    async with local_sessionmaker() as db:
        db.add(mock_user)
        await db.commit()
        
        session = Session(
            id=uuid.uuid4(),
            user_id=mock_user.id,
            repo_id=uuid.uuid4(),
            title="Streaming Test"
        )
        db.add(session)
        await db.commit()

    # Mock retrieval service results
    mock_retrieval.retrieve_context = AsyncMock(return_value=[
        {
            "file_path": "main.py",
            "start_line": 1,
            "end_line": 10,
            "language": "python",
            "score": 0.9,
            "content": "def main(): print('hello')"
        }
    ])
    mock_retrieval.format_context_prompt = MagicMock(return_value="mocked context")

    # Mock LLM stream generator
    async def mock_stream_generator(*args, **kwargs):
        class MockChunk:
            def __init__(self, delta):
                self.delta = delta
        yield MockChunk("I can ")
        yield MockChunk("help with ")
        yield MockChunk("that.")

    mock_llm = MagicMock()
    mock_llm.stream = MagicMock(side_effect=mock_stream_generator)
    mock_get_llm.return_value = mock_llm

    from app.storage.database import get_db

    # Patch AsyncSessionLocal inside chat endpoints with local session maker
    with patch("app.api.chat.AsyncSessionLocal", local_sessionmaker):
        # We also need to override the API dependency get_db to yield from local sessionmaker
        # to ensure the API endpoint and the SSE generator share the same engine connection
        async def override_get_db():
            async with local_sessionmaker() as db:
                yield db
                await db.commit()
        
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            # Request Streaming via stream context manager in HTTPX
            async with client.stream(
                "POST", 
                f"/api/chat/sessions/{session.id}/messages",
                json={"content": "Explain main function"}
            ) as response:
                assert response.status_code == status.HTTP_200_OK
                assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

                # Read lines asynchronously
                lines = []
                async for line in response.aiter_lines():
                    if line:
                        lines.append(line)

                assert len(lines) >= 3
                assert "sources" in lines[0]
                assert "I can " in lines[1]
                assert "help with " in lines[2]
                
        finally:
            if get_db in app.dependency_overrides:
                del app.dependency_overrides[get_db]
