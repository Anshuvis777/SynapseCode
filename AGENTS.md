# AGENTS.md

AI-powered RAG dev assistant (DevAssist AI). Monorepo: `backend/` (FastAPI) + `frontend/` (Vite/React). Clones repos → chunks → embeds → Qdrant; chat/search/memory over grounded code.

## Commands

```bash
# Backend (cd backend, venv: python -m venv .venv, pip install -e ".[dev]")
uvicorn app.main:app --reload            # dev server (port 8000)
alembic upgrade head                     # migrations
celery -A app.workers.celery_app worker --loglevel=info   # async indexing worker
pytest                                   # all tests (in-memory SQLite, no DB needed)
pytest tests/unit/test_retrieval.py -v   # single test file
ruff check . && ruff format .            # lint + format (line-length 100)
mypy app                                 # strict=true — must pass clean

# Frontend (cd frontend)
npm install
npm run dev          # Vite, port 5173
npm run lint         # oxlint (NOT eslint)
npm run build        # tsc -b && vite build
```

## Architecture / wiring

- **Entrypoint**: `backend/app/main.py` → `create_app()`. All routes under `/api` via `app/api/router.py`; per-domain routers in `app/api/`.
- **Async stack**: SQLAlchemy async + asyncpg, FastAPI lifespan verifies Postgres + Qdrant + warms LLM/embed providers at startup.
- **Ingestion is async**: Celery worker (`app/workers/tasks.py`) does clone→parse→chunk→embed→upload. `api` and `worker` are separate Docker services sharing the same volume. Indexing is NOT synchronous in the API.
- **Provider pattern**: LLM/embedding providers live in `app/providers/`, selected via `LLM_PROVIDER` / `EMBEDDING_PROVIDER` env; use `get_llm_provider()` / `get_embedding_provider()` factory, never instantiate providers directly.
- **Config**: all settings via `app/config.py` (pydantic-settings) reading `.env`. Never hardcode config.
- **Vector store**: `app/storage/vector_store.py` (Qdrant); DB session `app/storage/database.py`. Two collections: `code_chunks`, `memories`.

## Gotchas (verified)

- **Mypy is `strict = true`** and **Ruff line-length = 100**. Match or backend checks fail.
- **Frontend lint is oxlint**, not eslint/prettier — run `npm run lint`, don't assume eslint.
- **README claim is stale**: it says a "default admin is created in the DB", but NO admin seeding exists anywhere in the code. Auth relies on `/api/auth/register`. Don't trust the README on this.
- **Tests need no infra**: `tests/conftest.py` uses in-memory SQLite (`sqlite+aiosqlite`), `asyncio_mode = "auto"`. Integration dir exists but empty. Any test touching Qdrant/vector store will not run against real infra.
- **Docker env hostnames**: `.env` default hosts are service names (`postgres`, `qdrant`, `redis`), which only resolve inside Docker. For local (Option B) dev, override `POSTGRES_HOST`/`QDRANT_HOST`/`REDIS_HOST` to `localhost`.
- **Async everywhere**: use async SQLAlchemy sessions; Celery tasks wrap async work (`tasks.py` uses `_async_index_repository` with `asyncio`).
- **API key must be real**: default `GROQ_API_KEY=gsk_...` is a placeholder; startup logs `llm_provider_unhealthy` until set. Add `GROQ_API_KEY` to `backend/.env` before running.

## Conventions

- Security: never commit real secrets/keys; only `.env.example` is committed. Change `JWT_SECRET_KEY` and DB creds from defaults before deploy.
- Authoring: keep `api/` routers thin, logic in `services/`, models in `models/`, Pydantic schemas in `schemas/`.

## Spec-driven workflow (OpenSpec)

- OpenSpec initialized for OpenCode. Commands live in `.opencode/commands/` + `.opencode/skills/`, invoked as `/opsx-propose`, `/opsx-apply`, `/opsx-archive`, `/opsx-explore`, `/opsx-sync`, `/opsx-update`.
- State in `openspec/`: `specs/` = source of truth, `changes/<name>/` = proposed deltas, `config.yaml` = optional context/rules. `openspec init` and `openspec update` manage install.
- Docs: https://github.com/Fission-AI/OpenSpec

## References

- Full setup/API/DB/security docs: `README.md` (authoritative, except the stale admin-seed claim above).
