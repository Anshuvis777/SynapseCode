"""
DevAssist AI — Code Search Router

Endpoints:
  GET /api/search — Query codebase semantically, returning ranked code chunks
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.models.repository import Repository
from app.models.user import User
from app.schemas.search import SearchResultResponse
from app.services.retrieval import RetrievalService
from app.storage.database import get_db

router = APIRouter()
retrieval_service = RetrievalService()


@router.get(
    "",
    response_model=list[SearchResultResponse],
    summary="Search codebase semantically",
)
async def search_codebase(
    repo_id: uuid.UUID = Query(..., description="ID of the repository to search within"),
    q: str = Query(..., min_length=1, description="Semantic or lexical search query"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """
    Search code chunks in the specified repository.
    Enforces user tenant isolation.
    """
    # Verify repository existence and ownership
    query = select(Repository).where(
        Repository.id == repo_id,
        Repository.user_id == current_user.id,
    )
    repo = await db.scalar(query)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found or access denied.",
        )

    # Perform retrieval using RetrievalService (includes lexical boosting)
    results = await retrieval_service.retrieve_context(
        user_id=current_user.id,
        repository_id=repo_id,
        query=q,
        limit=limit,
    )

    return results
