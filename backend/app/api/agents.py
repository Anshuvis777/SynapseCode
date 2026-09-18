# mypy: ignore-errors
"""
DevAssist AI — Multi-Agent & MCP Tool Router

Endpoints:
  POST /api/agents/multi-agent-chat  — Run planner→retriever→synthesizer
  GET  /api/agents/tools             — List MCP tool schemas
  GET  /api/agents/mcp-trace         — Canned MCP trace example
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.models.repository import Repository
from app.models.user import User
from app.services.agents import MultiAgentOrchestrator, get_mcp_trace_example
from app.storage.database import get_db
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()
orchestrator = MultiAgentOrchestrator()


class MultiAgentRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000, description="Developer question")
    repository_id: uuid.UUID | None = Field(default=None, description="Scope to a repository")
    stream: bool = Field(default=False, description="Unused — reserved for SSE variant")


class MultiAgentResponse(BaseModel):
    answer: str
    sources: list[dict[str, Any]]
    plan: list[str]
    chunks_used: int
    metadata: dict[str, Any]
    mcp_tools: list[dict[str, Any]] | None = None


@router.post(
    "/multi-agent-chat",
    response_model=MultiAgentResponse,
    summary="Run multi-agent RAG (planner → retriever → synthesizer)",
)
async def multi_agent_chat(
    payload: MultiAgentRequest,
    x_llm_provider: str | None = Header(None, alias="X-LLM-Provider"),
    x_llm_api_key: str | None = Header(None, alias="X-LLM-API-Key"),
    x_embedding_api_key: str | None = Header(None, alias="X-Embedding-API-Key"),
    current_user: User = Depends(get_current_user),  # noqa: B008
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> dict[str, Any]:
    if not x_llm_api_key or not x_llm_api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API key is required. Add it in Profile settings.",
        )

    # Validate repository ownership if scoped
    if payload.repository_id is not None:
        q = select(Repository).where(
            Repository.id == payload.repository_id,
            Repository.user_id == current_user.id,
        )
        repo = await db.scalar(q)
        if not repo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found"
            )

    # Langfuse trace for multi-agent run
    parent_trace: Any | None = None
    try:
        from app.utils.observability import langfuse_trace

        parent_trace = langfuse_trace(
            name="multi-agent-rag",
            user_id=str(current_user.id),
            metadata={
                "repository_id": str(payload.repository_id) if payload.repository_id else None,
                "mode": "planner→retriever→synthesizer",
            },
            input_data=payload.query,
        )
    except Exception:
        parent_trace = None

    result = await orchestrator.run(
        query=payload.query,
        user_id=current_user.id,
        repository_id=payload.repository_id,
        llm_api_key=x_llm_api_key,
        embedding_api_key=x_embedding_api_key,
        llm_provider=x_llm_provider,
        parent_trace=parent_trace,
    )

    if parent_trace is not None:
        try:
            parent_trace.update(output=result.answer)  # type: ignore[attr-defined]
            from app.utils.observability import langfuse_flush

            langfuse_flush()
        except Exception:
            pass

    logger.info("multi_agent_complete", user_id=str(current_user.id), chunks=result.chunks_used)
    return {
        "answer": result.answer,
        "sources": result.sources,
        "plan": result.plan,
        "chunks_used": result.chunks_used,
        "metadata": result.metadata,
        "mcp_tools": orchestrator.get_tool_schemas(),
    }


@router.get(
    "/tools",
    summary="List MCP-compatible tool schemas",
)
async def list_tools() -> dict[str, Any]:
    return {"tools": orchestrator.get_tool_schemas(), "count": len(orchestrator.get_tool_schemas())}


@router.get(
    "/mcp-trace",
    summary="Get a canned MCP tool-calling trace (for README/demo)",
)
async def mcp_trace() -> dict[str, Any]:
    return get_mcp_trace_example()
