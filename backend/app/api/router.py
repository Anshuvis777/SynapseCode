from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.providers import router as providers_router

api_router = APIRouter()

# ── Module 3: Auth ───────────────────────────────────────────────
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])

# ── Module 4: Provider Status ────────────────────────────────────
api_router.include_router(providers_router, prefix="/providers", tags=["providers"])

# ── Module 10: Chat ───────────────────────────────────────────────
from app.api.chat import router as chat_router

api_router.include_router(chat_router, prefix="/chat", tags=["chat"])

# ── Module 6: Repositories ──────────────────────────────────────────
from app.api.repositories import router as repo_router

api_router.include_router(repo_router, prefix="/repos", tags=["repositories"])

# ── Module 13: Documents ─────────────────────────────────────────────
from app.api.documents import router as doc_router

api_router.include_router(doc_router, prefix="/documents", tags=["documents"])

# ── Module 11: Search ───────────────────────────────────────────────
from app.api.search import router as search_router

api_router.include_router(search_router, prefix="/search", tags=["search"])

# ── Module 12: Memory ───────────────────────────────────────────────
from app.api.memory import router as memory_router

api_router.include_router(memory_router, prefix="/memories", tags=["memory"])
