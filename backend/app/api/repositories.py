"""
DevAssist AI — Repositories API Router

Endpoints:
  POST /api/repos          — Add repository and start indexing
  GET  /api/repos          — List all repositories owned by user
  GET  /api/repos/{id}     — Get repository details and progress
  DELETE /api/repos/{id}   — Delete repository records, cloned files, and vectors
  POST /api/repos/{id}/index — Re-index repository
"""

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.config import settings
from app.models.repository import Repository
from app.models.user import User
from app.schemas.repository import RepositoryCreate, RepositoryResponse
from app.storage.database import get_db
from app.storage.vector_store import vector_store
from app.utils.logger import get_logger
from app.workers.tasks import index_repository_task

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new repository and start indexing",
)
async def create_repository(
    payload: RepositoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Repository:
    """
    Register a repository in DevAssist AI.

    Triggers a background Celery task to clone, chunk, and embed code files.
    """
    # Validate GitHub URL if source_type is github
    if payload.source_type == "github" and not payload.url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL is required when source_type is github",
        )

    # Check if a repository with the same URL or name already exists for this user
    query = select(Repository).where(
        Repository.user_id == current_user.id,
        Repository.name == payload.name,
    )
    existing = await db.scalar(query)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Repository with name '{payload.name}' already exists.",
        )

    # Create new repository record
    repo = Repository(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        url=str(payload.url) if payload.url else None,
        source_type=payload.source_type,
        status="pending",
        progress=0,
    )
    db.add(repo)
    await db.flush()

    # Trigger background Celery indexing task
    index_repository_task.delay(str(repo.id), str(current_user.id))

    logger.info("repository_created", repo_id=str(repo.id), repo_name=repo.name)
    return repo


@router.get(
    "",
    response_model=list[RepositoryResponse],
    summary="List all user repositories",
)
async def list_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Repository]:
    """
    Returns all repositories registered by the current user.
    """
    query = (
        select(Repository)
        .where(Repository.user_id == current_user.id)
        .order_by(Repository.created_at.desc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get(
    "/{repo_id}",
    response_model=RepositoryResponse,
    summary="Get repository details by ID",
)
async def get_repository(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Repository:
    """
    Fetch repository configuration and status by ID.
    Enforces user ownership.
    """
    query = select(Repository).where(
        Repository.id == repo_id,
        Repository.user_id == current_user.id,
    )
    repo = await db.scalar(query)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found",
        )
    return repo


@router.delete(
    "/{repo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete repository metadata and vector embeddings",
)
async def delete_repository(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Deletes the repository metadata from PostgreSQL, clean ups cloned files
    from local disk storage, and wipes associated code vectors from Qdrant.
    """
    query = select(Repository).where(
        Repository.id == repo_id,
        Repository.user_id == current_user.id,
    )
    repo = await db.scalar(query)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found",
        )

    # 1. Delete vector embeddings from Qdrant
    try:
        await vector_store.delete_by_repository(current_user.id, repo_id)
    except Exception as e:
        logger.error("failed_to_delete_vectors", repo_id=str(repo_id), error=str(e))
        # Proceed with metadata deletion even if vector DB fails to keep DB in sync

    # 2. Cleanup cloned repo files from local storage if exists
    repo_dir = Path(settings.repo_storage_path) / str(repo_id)
    if repo_dir.exists() and repo_dir.is_dir():
        try:
            shutil.rmtree(repo_dir)
            logger.info("cleaned_up_repository_directory", repo_id=str(repo_id))
        except Exception as e:
            logger.error("failed_to_clean_repository_directory", repo_id=str(repo_id), error=str(e))

    # 3. Delete metadata from PostgreSQL
    await db.delete(repo)
    logger.info("repository_deleted", repo_id=str(repo_id))
    return None


@router.post(
    "/{repo_id}/index",
    response_model=RepositoryResponse,
    summary="Re-index repository manually",
)
async def reindex_repository(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Repository:
    """
    Cleans up existing vector embeddings and triggers the background indexing
    pipeline again to sync with remote repo updates.
    """
    query = select(Repository).where(
        Repository.id == repo_id,
        Repository.user_id == current_user.id,
    )
    repo = await db.scalar(query)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found",
        )

    if repo.status == "cloning" or repo.status == "embedding" or repo.status == "parsing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository is currently being indexed.",
        )

    # Reset repository status
    repo.status = "pending"
    repo.progress = 0
    repo.error_message = None
    await db.flush()

    # Clear old vectors from Qdrant before re-indexing
    try:
        await vector_store.delete_by_repository(current_user.id, repo_id)
    except Exception as e:
        logger.warning("failed_to_clear_vectors_before_reindex", repo_id=str(repo_id), error=str(e))

    # Re-trigger indexing task
    index_repository_task.delay(str(repo.id), str(current_user.id))

    logger.info("reindex_triggered", repo_id=str(repo.id))
    return repo
