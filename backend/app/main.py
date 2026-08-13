"""
DevAssist AI — FastAPI Application Factory

Entry point for the API server.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.storage.database import async_engine
from app.utils.logger import get_logger, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — startup and shutdown events."""
    # ── Startup ──
    setup_logging()
    logger.info(
        "application_starting",
        app_name=settings.app_name,
        env=settings.app_env,
        llm_provider=settings.llm_provider,
        llm_model=settings.active_llm_model,
        embedding_model=settings.active_embedding_model,
    )

    # Verify database connectivity
    try:
        async with async_engine.connect() as conn:
            await conn.execute(sa.text("SELECT 1"))
        logger.info("database_connected")
    except Exception as e:
        logger.error("database_connection_failed", error=str(e))
        raise

    # Initialize Qdrant collections
    try:
        from app.storage.vector_store import vector_store

        await vector_store.init_collections()
        logger.info("qdrant_initialized")
    except Exception as e:
        logger.error("qdrant_initialization_failed", error=str(e))
        raise

    # Warm up and health-check LLM + embedding providers
    from app.providers.factory import get_embedding_provider, get_llm_provider

    llm = get_llm_provider()
    embed = get_embedding_provider()

    llm_ok = await llm.health_check()
    embed_ok = await embed.health_check()

    if not llm_ok:
        logger.warning(
            "llm_provider_unhealthy",
            provider=settings.llm_provider,
            hint="Check GROQ_API_KEY or ensure Ollama is running",
        )
    else:
        logger.info(
            "llm_provider_ready", provider=settings.llm_provider, model=settings.active_llm_model
        )

    if not embed_ok:
        logger.warning(
            "embedding_provider_unhealthy",
            hint="Run: docker compose exec ollama ollama pull nomic-embed-text",
        )
    else:
        logger.info("embedding_provider_ready", model=settings.active_embedding_model)

    yield

    # ── Shutdown ──
    logger.info("application_shutting_down")
    # Close vector store connection
    from app.storage.vector_store import vector_store

    await vector_store.close()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.app_name,
        description="AI-powered developer assistant that understands software repositories",
        version="0.1.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    class DynamicCORSMiddleware(CORSMiddleware):
        """Custom CORS middleware to allow dynamic Vercel preview domains."""
        def is_allowed_origin(self, origin: str) -> bool:
            if origin in self.allow_origins:
                return True
            if "*" in self.allow_origins:
                return True
            # Allow any Vercel dynamic preview or production subdomains
            if origin.endswith(".vercel.app"):
                return True
            return False

    # ── CORS Middleware ──
    app.add_middleware(
        DynamicCORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health Check ──
    @app.get("/health", tags=["system"])
    async def health_check() -> dict[str, str]:
        return {
            "status": "healthy",
            "app": settings.app_name,
            "env": settings.app_env,
        }

    # ── Register API Routers ──
    from app.api.router import api_router

    app.include_router(api_router, prefix="/api")

    return app


# Application instance — used by uvicorn
app = create_app()
