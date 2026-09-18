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
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.config import settings
from app.models.message import Message
from app.models.session import Session
from app.models.user import User
from app.providers.base import LLMMessage
from app.providers.factory import get_embedding_provider, get_llm_provider
from app.schemas.chat import (
    MessageCreate,
    MessageResponse,
    SessionCreate,
    SessionResponse,
    SessionUpdate,
)
from app.services.retrieval import RetrievalService
from app.storage.database import AsyncSessionLocal, get_db
from app.storage.vector_store import vector_store
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
        doc_id=payload.document_id,
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
    document_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Session]:
    """
    Returns all chat sessions. Optionally filters by repository_id or document_id.
    """
    query = select(Session).where(Session.user_id == current_user.id)
    if repository_id:
        query = query.where(Session.repo_id == repository_id)
    if document_id:
        query = query.where(Session.doc_id == document_id)
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

    messages_query = (
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at.asc())
    )
    messages_result = await db.execute(messages_query)
    messages = messages_result.scalars().all()

    return {
        "id": session.id,
        "title": session.title,
        "repository_id": session.repo_id,
        "document_id": session.doc_id,
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


@router.patch(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="Update chat session attached repository or title",
)
async def update_session(
    session_id: uuid.UUID,
    payload: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Session:
    query = select(Session).where(
        Session.id == session_id,
        Session.user_id == current_user.id,
    )
    session = await db.scalar(query)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if payload.repository_id is not None or "repository_id" in payload.model_fields_set:
        session.repo_id = payload.repository_id
    if payload.document_id is not None or "document_id" in payload.model_fields_set:
        session.doc_id = payload.document_id
    if payload.title is not None:
        session.title = payload.title

    await db.commit()
    await db.refresh(session)
    logger.info(
        "chat_session_updated",
        session_id=str(session_id),
        repo_id=str(session.repo_id),
        doc_id=str(session.doc_id),
    )
    return session


@router.post(
    "/sessions/{session_id}/messages",
    summary="Send a message and stream the assistant response via SSE",
)
async def send_message(
    session_id: uuid.UUID,
    payload: MessageCreate,
    x_llm_provider: str | None = Header(None, alias="X-LLM-Provider"),
    x_llm_api_key: str | None = Header(None, alias="X-LLM-API-Key"),
    x_embedding_api_key: str | None = Header(None, alias="X-Embedding-API-Key"),
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

    # LLM key priority: user's per-session Gemini key (X-LLM-API-Key header) — required, no server fallback
    if not x_llm_api_key or not x_llm_api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API key is required. Please add your Google AI Studio API key in your Profile settings.",
        )

    # 2. Save user message to PostgreSQL
    user_msg = Message(
        id=uuid.uuid4(),
        session_id=session_id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)
    await db.flush()

    # 3. Observability — start Langfuse trace for the full RAG query
    rag_trace: Any = None  # type: ignore[no-redef]
    try:
        from app.utils.observability import langfuse_trace

        rag_trace = langfuse_trace(
            name="rag-query",
            user_id=str(current_user.id),
            session_id=str(session_id),
            metadata={
                "repository_id": str(session.repo_id) if session.repo_id else None,
                "document_id": str(session.doc_id) if session.doc_id else None,
                "llm_provider": x_llm_provider or settings.llm_provider,
                "llm_model": settings.active_llm_model,
            },
            input_data=payload.content,
        )
    except Exception:
        rag_trace = None

    # 4. Retrieve relevant repository or document context ONLY if session has an attached repository/document
    chunks = []
    if session.repo_id is not None:
        chunks = await retrieval_service.retrieve_context(
            user_id=current_user.id,
            repository_id=session.repo_id,
            query=payload.content,
            embedding_api_key=x_embedding_api_key,
            parent_trace=rag_trace,
        )
    elif session.doc_id is not None:
        from app.models.document import Document

        doc = await db.get(Document, session.doc_id)
        if doc:
            chunks = await retrieval_service.retrieve_document_context(
                user_id=current_user.id,
                document_id=doc.id,
                document_filename=doc.filename,
                query=payload.content,
                embedding_api_key=x_embedding_api_key,
                parent_trace=rag_trace,
            )
    context_str = retrieval_service.format_context_prompt(chunks) if chunks else ""

    # 5. Fetch long-term developer memories from Qdrant
    memories_str = ""
    try:
        embedder = get_embedding_provider(api_key=x_embedding_api_key)
        query_vector = await embedder.embed_text(payload.content)
        memories = await vector_store.search_memories(
            user_id=current_user.id,
            query_vector=query_vector,
            limit=5,
        )
        if memories:
            memories_str = "\n".join([f"- {m['content']}" for m in memories if m.get("content")])
    except Exception as e:
        logger.error("failed_to_retrieve_memories", error=str(e))

    # 5. Fetch last 6 messages for context history
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

    # Inject system instruction with RAG context and developer memories
    if (session.repo_id is not None or session.doc_id is not None) and context_str:
        system_instruction = (
            "You are CodexRAG, a staff software developer assistant.\n"
            "Your task is to answer user questions about the attached repository/document "
            "using ONLY the provided code and document context snippets.\n"
            "Do NOT reference or assume any other repositories, projects, or external files not in the context.\n"
            "Be concise, technical, precise, and cite the file names you are referring to.\n\n"
        )
    else:
        system_instruction = (
            "You are CodexRAG, an intelligent AI developer assistant.\n"
            "No repository or document is attached to this conversation.\n"
            "Answer the user's questions in a clear, general, and helpful manner.\n"
            "Do NOT assume or mention any specific repository or project files unless the user mentions them.\n\n"
        )
    if memories_str:
        system_instruction += (
            "Here are the user's custom instructions/preferences from their developer memory:\n"
            f"{memories_str}\n\n"
        )
    if context_str:
        system_instruction += f"Here are the relevant code snippets for context:\n{context_str}"
    llm_messages.append(LLMMessage(role="system", content=system_instruction))

    # Add conversation history
    for msg in history_msgs:
        # Avoid duplicating the message we just saved
        if msg.id != user_msg.id:
            llm_messages.append(LLMMessage(role=msg.role, content=msg.content))

    # Add current query
    llm_messages.append(LLMMessage(role="user", content=payload.content))

    # 6. Define streaming generator with Langfuse generation + scoring
    async def sse_generator() -> AsyncGenerator[str, None]:
        llm = get_llm_provider(provider=x_llm_provider, api_key=x_llm_api_key)
        full_response: list[str] = []
        assistant_msg_id = uuid.uuid4()
        generation: Any | None = None
        # Estimate tokens upfront for observability metadata
        prompt_len = sum(len(m.content or "") for m in llm_messages)
        est_input_tokens = prompt_len // 4
        # Create generation observation under the rag trace
        if rag_trace is not None:
            try:
                from app.utils.observability import langfuse_generation

                generation = langfuse_generation(
                    rag_trace,
                    name="llm-generation",
                    model=getattr(llm, "_model", settings.active_llm_model),
                    input_data=[
                        {"role": m.role, "content": m.content[:2000]} for m in llm_messages
                    ],
                    metadata={"stream": True, "chunks_retrieved": len(chunks)},
                    usage={"input": est_input_tokens},
                )
            except Exception:
                generation = None

        try:
            # Yield code context metadata to frontend first so user knows what files were used
            sources = [
                {
                    "file_path": c["file_path"],
                    "start_line": c["start_line"],
                    "end_line": c["end_line"],
                }
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
            input_tokens = est_input_tokens
            output_tokens = len(assistant_content) // 4
            if assistant_content.strip():
                # Write to DB using a dedicated session since get_db might close before generator finishes
                async with AsyncSessionLocal() as write_db:
                    assistant_msg = Message(
                        id=assistant_msg_id,
                        session_id=session_id,
                        role="assistant",
                        content=assistant_content,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        sources=sources,
                    )
                    write_db.add(assistant_msg)
                    # Touch/update session updated_at time
                    session_to_update = await write_db.get(Session, session_id)
                    if session_to_update:
                        session_to_update.title = session_to_update.title  # force trigger change
                    await write_db.commit()

            # Langfuse: update generation + score citation precision
            if generation is not None:
                try:
                    from app.utils.observability import (
                        compute_citation_precision,
                        langfuse_score,
                        langfuse_update_generation,
                    )

                    langfuse_update_generation(
                        generation,
                        output_data=assistant_content,
                        usage={"input": input_tokens, "output": output_tokens, "unit": "TOKENS"},
                        metadata={"done": True},
                    )
                    if rag_trace is not None and chunks:
                        precision = compute_citation_precision(chunks, assistant_content)
                        langfuse_score(
                            rag_trace,
                            name="citation-precision",
                            value=precision,
                            comment="file_path citation recall",
                        )
                        langfuse_score(
                            rag_trace,
                            name="grounded-answer",
                            value=1.0 if precision > 0 else 0.0,
                            comment="binary grounded check",
                        )
                except Exception:
                    pass
                try:
                    from app.utils.observability import langfuse_flush

                    langfuse_flush()
                except Exception:
                    pass

            # Also update rag trace output
            if rag_trace is not None:
                try:
                    rag_trace.update(output=assistant_content)  # type: ignore[attr-defined]
                except Exception:
                    pass

            # Final SSE completion packet
            yield f"data: {json.dumps({'done': True, 'message_id': str(assistant_msg_id), 'tokens_used': {'prompt': input_tokens, 'completion': output_tokens, 'total': input_tokens + output_tokens}})}\n\n"

        except Exception as e:
            logger.error("sse_streaming_failed", error=str(e))
            if generation is not None:
                try:
                    from app.utils.observability import langfuse_update_generation

                    langfuse_update_generation(
                        generation, output_data=f"error: {str(e)}", metadata={"error": True}
                    )
                except Exception:
                    pass
            yield f"data: {json.dumps({'error': 'An error occurred during response generation.'})}\n\n"

    # Commit the user message to Postgres first
    await db.commit()

    return StreamingResponse(sse_generator(), media_type="text/event-stream")