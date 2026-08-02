"""
DevAssist AI — Chat Service & Session Router

Endpoints:
  POST   /api/chat/sessions            — Create new chat session
  GET    /api/chat/sessions            — List user's sessions
  GET    /api/chat/sessions/{id}       — Get session details and history
  DELETE /api/chat/sessions/{id}       — Delete chat session
  POST   /api/chat/sessions/{id}/messages — Send message and stream back response via SSE
"""

import json
import uuid
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.session import Session
from app.models.message import Message
from app.schemas.chat import SessionCreate, SessionResponse, MessageCreate, MessageResponse
from app.storage.database import get_db, AsyncSessionLocal
from app.services.retrieval import RetrievalService
from app.providers.factory import get_llm_provider
from app.providers.base import LLMMessage
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()
retrieval_service = RetrievalService()


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session scoped to a repository",
)
async def create_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Session:
    """
    Creates a new conversational workspace for asking questions about a repository.
    """
    session = Session(
        id=uuid.uuid4(),
        user_id=current_user.id,
        repo_id=payload.repository_id,
        title=payload.title,
    )
    db.add(session)
    await db.flush()
    logger.info("chat_session_created", session_id=str(session.id), title=session.title)
    return session


@router.get(
    "/sessions",
    response_model=list[SessionResponse],
    summary="List all chat sessions owned by user",
)
async def list_sessions(
    repository_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Session]:
    """
    Returns all chat sessions. Optionally filters by repository_id.
    """
    query = select(Session).where(Session.user_id == current_user.id)
    if repository_id:
        query = query.where(Session.repo_id == repository_id)
    query = query.order_by(Session.updated_at.desc())
    
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get(
    "/sessions/{session_id}",
    summary="Get chat session details and message history",
)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Fetches session details and all associated messages ordered chronologically.
    """
    query = select(Session).where(
        Session.id == session_id,
        Session.user_id == current_user.id,
    )
    session = await db.scalar(query)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    messages_query = select(Message).where(Message.session_id == session_id).order_by(Message.created_at.asc())
    messages_result = await db.execute(messages_query)
    messages = messages_result.scalars().all()

    return {
        "id": session.id,
        "title": session.title,
        "repository_id": session.repo_id,
        "created_at": session.created_at,
        "messages": [MessageResponse.model_validate(m) for m in messages],
    }


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete chat session and all messages",
)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Deletes the session. Cascading delete removes messages automatically.
    """
    query = select(Session).where(
        Session.id == session_id,
        Session.user_id == current_user.id,
    )
    session = await db.scalar(query)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    await db.delete(session)
    logger.info("chat_session_deleted", session_id=str(session_id))
    return None


@router.post(
    "/sessions/{session_id}/messages",
    summary="Send a message and stream the assistant response via SSE",
)
async def send_message(
    session_id: uuid.UUID,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Submit a user query. 
    Retrieves matching repository code, references historical context, and streams the answer.
    
    Response format: Server-Sent Events (SSE).
    """
    # 1. Verify session ownership
    query = select(Session).where(
        Session.id == session_id,
        Session.user_id == current_user.id,
    )
    session = await db.scalar(query)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # 2. Save user message to PostgreSQL
    user_msg = Message(
        id=uuid.uuid4(),
        session_id=session_id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)
    await db.flush()

    # 3. Retrieve relevant repository code context
    chunks = []
    if session.repo_id is not None:
        chunks = await retrieval_service.retrieve_context(
            user_id=current_user.id,
            repository_id=session.repo_id,
            query=payload.content,
        )
    context_str = retrieval_service.format_context_prompt(chunks)

    # 4. Fetch last 6 messages for context memory
    history_query = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.desc())
        .limit(6)
    )
    history_result = await db.execute(history_query)
    history_msgs = list(reversed(list(history_result.scalars().all())))

    # Construct conversation payload for LLM
    llm_messages = []
    
    # Inject system instruction with RAG context
    system_instruction = (
        "You are DevAssist AI, a staff software developer assistant.\n"
        "Your task is to answer user questions about their software repository using the provided code snippets.\n"
        "Be concise, technical, precise, and cite the file names you are referring to.\n\n"
        "Here are the relevant code snippets for context:\n"
        f"{context_str}"
    )
    llm_messages.append(LLMMessage(role="system", content=system_instruction))

    # Add conversation history
    for msg in history_msgs:
        # Avoid duplicating the message we just saved
        if msg.id != user_msg.id:
            llm_messages.append(LLMMessage(role=msg.role, content=msg.content))

    # Add current query
    llm_messages.append(LLMMessage(role="user", content=payload.content))

    # 5. Define streaming generator
    async def sse_generator() -> AsyncGenerator[str, None]:
        llm = get_llm_provider()
        full_response = []
        assistant_msg_id = uuid.uuid4()

        try:
            # Yield code context metadata to frontend first so user knows what files were used
            sources = [
                {"file_path": c["file_path"], "start_line": c["start_line"], "end_line": c["end_line"]}
                for c in chunks
            ]
            yield f"data: {json.dumps({'sources': sources})}\n\n"

            # Stream response chunks from LLM provider
            async for chunk in llm.stream(llm_messages):
                if chunk.delta:
                    full_response.append(chunk.delta)
                    # SSE data wrapper
                    yield f"data: {json.dumps({'token': chunk.delta})}\n\n"

            # Save assistant message to DB
            assistant_content = "".join(full_response)
            if assistant_content.strip():
                # Write to DB using a dedicated session since get_db might close before generator finishes
                async with AsyncSessionLocal() as write_db:
                    assistant_msg = Message(
                        id=assistant_msg_id,
                        session_id=session_id,
                        role="assistant",
                        content=assistant_content,
                    )
                    write_db.add(assistant_msg)
                    # Touch/update session updated_at time
                    session_to_update = await write_db.get(Session, session_id)
                    if session_to_update:
                        session_to_update.title = session_to_update.title # force trigger change
                    await write_db.commit()

            # Final SSE completion packet
            yield f"data: {json.dumps({'done': True, 'message_id': str(assistant_msg_id)})}\n\n"

        except Exception as e:
            logger.error("sse_streaming_failed", error=str(e))
            yield f"data: {json.dumps({'error': 'An error occurred during response generation.'})}\n\n"

    # Commit the user message to Postgres first
    await db.commit()

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
