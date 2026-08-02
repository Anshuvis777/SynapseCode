"""
DevAssist AI — Memory API Router

Endpoints:
  POST /api/memories       — Add a long-term user memory/preference
  GET /api/memories        — List all memories
  DELETE /api/memories/{id} — Delete a specific memory
"""

import uuid
from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.memory import MemoryCreate, MemoryResponse
from app.storage.vector_store import vector_store
from app.providers.factory import get_embedding_provider
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "",
    response_model=MemoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a long-term developer memory/preference",
)
async def create_memory(
    payload: MemoryCreate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Saves user-specific preferences or code style patterns to long-term memory.
    These are embedded and stored in Qdrant.
    """
    memory_id = uuid.uuid4()
    
    # 1. Embed preference content
    embed_provider = get_embedding_provider()
    embedding = await embed_provider.embed_text(payload.content)
    
    # 2. Upsert memory in Qdrant
    memory_data = {
        "id": memory_id,
        "content": payload.content,
        "category": payload.category,
    }
    await vector_store.upsert_memories(
        user_id=current_user.id,
        memories=[memory_data],
        embeddings=[embedding],
    )
    
    logger.info("memory_created", memory_id=str(memory_id), user_id=str(current_user.id))
    return memory_data


@router.get(
    "",
    response_model=list[MemoryResponse],
    summary="List all developer memories",
)
async def list_memories(
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """
    Returns all long-term memories and preferences stored for the current user.
    """
    results = await vector_store.list_memories(current_user.id)
    return results


@router.delete(
    "/{memory_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a developer memory",
)
async def delete_memory(
    memory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Permanently deletes a developer memory.
    """
    await vector_store.delete_memory(current_user.id, memory_id)
    logger.info("memory_deleted", memory_id=str(memory_id), user_id=str(current_user.id))
    return None
