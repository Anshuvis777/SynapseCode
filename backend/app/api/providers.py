"""
DevAssist AI — Provider Status Endpoint

GET /api/providers/status — checks LLM and embedding provider health.
Useful for debugging configuration issues.
"""

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.models.user import User
from app.providers.factory import get_llm_provider, get_embedding_provider
from app.config import settings

router = APIRouter()


@router.get(
    "/status",
    summary="Check LLM and embedding provider health",
    tags=["providers"],
)
async def provider_status(
    _: User = Depends(get_current_user),
) -> dict:
    """
    Returns health status of the configured LLM and embedding providers.
    Requires authentication.
    """
    llm = get_llm_provider()
    embed = get_embedding_provider()

    llm_ok = await llm.health_check()
    embed_ok = await embed.health_check()

    return {
        "llm": {
            "provider": settings.llm_provider,
            "model": settings.active_llm_model,
            "healthy": llm_ok,
        },
        "embedding": {
            "provider": "ollama" if settings.llm_provider != "openai" else "openai",
            "model": settings.active_embedding_model,
            "dimensions": settings.embedding_dimensions,
            "healthy": embed_ok,
        },
    }
