# DevAssist AI — RAG Project

An AI-powered developer assistant that understands software repositories. Ask questions in natural language about any codebase, and get answers grounded in the actual code — powered by Retrieval-Augmented Generation (RAG).

You can clone a GitHub repository, the system indexes it into a vector database, and then you can chat with it, search its code, and even build a persistent memory of what you learn.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Option A: Docker Compose (recommended)](#option-a-docker-compose-recommended)
  - [Option B: Run locally without Docker](#option-b-run-locally-without-docker)
- [Configuration](#configuration)
  - [Backend Environment (`.env`)](#backend-environment-env)
  - [LLM Providers](#llm-providers)
  - [Frontend Environment (`.env`)](#frontend-environment-env)
- [Usage](#usage)
  - [Add a Repository](#add-a-repository)
  - [Chat with Your Code](#chat-with-your-code)
  - [Search Code](#search-code)
  - [Memory](#memory)
- [API Reference](#api-reference)
- [Database & Migrations](#database--migrations)
- [Background Tasks (Celery)](#background-tasks-celery)
- [Testing](#testing)
- [Linting & Type Checking](#linting--type-checking)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- **Repository ingestion** — clone and index GitHub repositories automatically.
- **RAG-powered chat** — ask questions in plain English about your codebase; answers cite the relevant code.
- **Semantic code search** — find code by meaning, not just keywords.
- **Persistent memory** — store and recall cross-repository insights.
- **Multi-provider LLM support** — Groq (free, recommended), Ollama (100% local), or OpenAI.
- **Local embeddings** — fastembed (default, low RAM) or Ollama.
- **File upload** — index PDF and DOCX documents alongside code.
- **JWT authentication** — secure login and token-based API access.
- **Full text + vector hybrid retrieval** for high-quality grounding.

---

## Architecture

```
┌───────────────────────────┐
│   Frontend (Vite + React) │   Port 5173
└───────────┬───────────────┘
            │ HTTP /api
            ▼
┌───────────────────────────┐
│   FastAPI (uvicorn)       │   Port 8000
└──┬────────┬────────┬──────┘
   │        │        │
   ▼        ▼        ▼
┌────────┐┌────────┐┌──────────────┐
│Postgres││ Qdrant ││    Redis     │
│  :5432 ││ :6333  ││    :6379     │
└────────┘└────────┘└──────┬───────┘
                           │ broker
                           ▼
                  ┌───────────────┐
                  │ Celery Worker │   async indexing
                  └───────────────┘
```

**Data flow**

1. You submit a GitHub URL (or upload a file).
2. Celery clones the repo / parses the file, splits it into chunks, and embeds them.
3. Embeddings are stored in **Qdrant**; metadata lives in **PostgreSQL**.
4. On a question, the system embeds your query, retrieves the top `K` relevant chunks from Qdrant, and feeds them as context to the LLM.
5. The LLM returns a grounded answer, with Redis used for caching and as the Celery broker.

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|------------|
| Framework | FastAPI, Uvicorn |
| ORM / Migrations | SQLAlchemy 2.0, Alembic |
| Relational DB | PostgreSQL 16 |
| Vector DB | Qdrant |
| Cache / Broker | Redis 7 |
| Background jobs | Celery |
| LLM providers | Groq, Ollama, OpenAI |
| Embeddings | FastEmbed (local) / Ollama |
| Auth | JWT, passlib/bcrypt |
| Parsing | tree-sitter, pypdf, python-docx |
| Code parsing | tree-sitter |
| Testing | pytest, pytest-asyncio, pytest-cov |
| Lint / Types | Ruff, mypy |

### Frontend
| Layer | Technology |
|-------|------------|
| Framework | React 19, TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Data fetching | TanStack Query, Axios |
| Forms | React Hook Form, Zod |
| State | Zustand |
| UI | Radix UI primitives, lucide-react |

---

## Project Structure

```
RAG-project/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers (FastAPI routers)
│   │   │   ├── auth.py     #   POST /api/auth/...
│   │   │   ├── providers.py#   GET  /api/providers/...
│   │   │   ├── chat.py     #   /api/chat/...
│   │   │   ├── repositories.py # /api/repos/...
│   │   │   ├── documents.py#   /api/documents/...
│   │   │   ├── search.py   #   /api/search/...
│   │   │   └── memory.py   #   /api/memories/...
│   │   ├── core/           # Auth, security utilities
│   │   ├── models/         # SQLAlchemy models
│   │   ├── providers/      # LLM/embedding providers (groq, openai, base)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Retrieval + business logic
│   │   ├── storage/        # DB session, vector store client
│   │   ├── utils/          # cloning, parsing, logging, security
│   │   └── workers/        # Celery app + tasks
│   ├── alembic/            # DB migrations
│   ├── tests/              # unit + integration tests
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── pyproject.toml
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/            # Axios client + interceptors
    │   ├── components/     # UI primitives (Button, Card, Dialog…)
    │   ├── layouts/        # Dashboard layout
    │   ├── pages/          # Chat, Dashboard, Documents, Memory,
    │   │                   # Repositories, Search, Settings, Login
    │   ├── store/          # Zustand stores
    │   ├── types/          # TypeScript types
    │   └── utils/
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

---

## Getting Started

### Prerequisites

- **Docker** + Docker Compose v2 *(for Option A)*
- **Node.js 20+** and **npm** *(for Option B frontend)*
- **Python 3.12+** *(for Option B backend)*
- A free **Groq API key** from [console.groq.com](https://console.groq.com) *(no credit card required)*

### Option A: Docker Compose (recommended)

The whole stack (API, worker, Postgres, Qdrant, Redis) runs via Docker.

```bash
cd backend
cp .env.example .env
# 1. Edit .env and set GROQ_API_KEY (and JWT_SECRET_KEY)
docker compose up --build
```

The API starts at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

Run the frontend separately (it's not containerized):

```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Option B: Run locally without Docker

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
# Edit .env: point POSTGRES_HOST=localhost, REDIS_HOST=localhost, QDRANT_HOST=localhost
uvicorn app.main:app --reload
```

You still need PostgreSQL, Qdrant, and Redis running. Quickest way for just those three:

```bash
docker run -d --name devassist-postgres -e POSTGRES_USER=devassist \
  -e POSTGRES_PASSWORD=devassist_secret -e POSTGRES_DB=devassist_db \
  -p 5432:5432 postgres:16-alpine

docker run -d --name devassist-qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant

docker run -d --name devassist-redis -p 6379:6379 redis:7-alpine
```

Apply migrations and start the Celery worker (in separate terminals):

```bash
alembic upgrade head
celery -A app.workers.celery_app worker --loglevel=info
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Configuration

### Backend Environment (`.env`)

Copy `backend/.env.example` to `backend/.env`. Key settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | DevAssist AI | Application name |
| `DEBUG` | true | Enable debug mode |
| `CORS_ORIGINS` | localhost:5173… | Allowed frontend origins |
| `JWT_SECRET_KEY` | *(change me)* | **Change to a random 64-char string** |
| `POSTGRES_*` / `DATABASE_URL` | devassist | DB connection details |
| `REDIS_URL` | redis://redis:6379/0 | Redis connection |
| `CELERY_BROKER_URL` | redis://redis:6379/1 | Celery broker |
| `QDRANT_HOST` / `QDRANT_PORT` | qdrant / 6333 | Qdrant connection |
| `QDRANT_COLLECTION_CHUNKS` | code_chunks | Chunk collection name |
| `QDRANT_COLLECTION_MEMORIES` | memories | Memory collection name |

### LLM Providers

Pick **one** `LLM_PROVIDER`. The default is free:

```dotenv
# OPTION 1: Groq (RECOMMENDED — free, fast, no GPU)
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_LLM_MODEL=llama-3.1-8b-instant

# OPTION 2: Ollama (100% local)
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://ollama:11434

# OPTION 3: OpenAI (paid)
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-your-key-here
# OPENAI_LLM_MODEL=gpt-4o
```

**Embeddings** — default is `fastembed` (local, low RAM). To use Ollama embeddings instead, set `EMBEDDING_PROVIDER=ollama`, `OLLAMA_BASE_URL`, and `OLLAMA_EMBEDDING_MODEL`.

**Indexing knobs:** `MAX_REPO_SIZE_MB`, `MAX_FILE_SIZE_KB`, `CHUNK_SIZE_TOKENS`, `CHUNK_OVERLAP_TOKENS`, `EMBEDDING_BATCH_SIZE`.

### Frontend Environment (`.env`)

```dotenv
# frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## Usage

### Add a Repository

1. Log in (default admin is created in the DB).
2. Go to **Repositories** and paste a GitHub URL.
3. Celery clones + indexes it in the background.
4. When indexing completes, the repo is queryable.

### Chat with Your Code

Open the **Chat** page and ask questions like:

- *"How does authentication work in this codebase?"*
- *"Where is the vector store client defined?"*
- *"What does the retry logic do?"*

Answers are grounded in your indexed code, so they point at real files.

### Search Code

Use the **Search** page for semantic search. Results are ranked by relevance to your query's meaning, not just keyword matches.

### Memory

The **Memory** page lets you save notes/insights that persist across sessions and repos, enabling cross-project recall.

### Documents

Upload **PDF** and **DOCX** files to index them alongside code.

---

## API Reference

Interactive OpenAPI docs: `http://localhost:8000/docs` (Swagger UI).

All routes are mounted under `/api`:

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Register, login, refresh tokens |
| `/api/providers` | LLM/embedding provider status |
| `/api/repos` | Repository CRUD + indexing status |
| `/api/documents` | Document upload + indexing |
| `/api/chat` | Chat completions (RAG) |
| `/api/search` | Semantic search |
| `/api/memories` | Persistent memory CRUD |

Authentication: send `Authorization: Bearer <JWT>` for protected routes.

---

## Database & Migrations

Migrations are managed with **Alembic**:

```bash
cd backend
alembic current          # current revision
alembic upgrade head     # apply all migrations
alembic revision --autogenerate -m "message"   # create a new migration
alembic downgrade -1     # roll back one revision
```

The initial migration is at `backend/alembic/versions/0001_initial.py`.

---

## Background Tasks (Celery)

Repository indexing runs asynchronously via Celery.

```bash
# Start the worker (Docker: docker compose up worker)
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2 --pool=prefork
```

Workers use Redis as the broker and result backend. See `backend/app/workers/tasks.py`.

---

## Testing

Backend tests use `pytest` with async support:

```bash
cd backend
pytest                      # run all tests
pytest tests/unit -v        # unit tests only
pytest --cov=app --cov-report=term-missing   # coverage report
```

Test configuration lives in `backend/tests/conftest.py`; tests use in-memory SQLite (`aiosqlite`) so no DB is required.

---

## Linting & Type Checking

```bash
# Backend (Ruff + mypy)
cd backend
ruff check .
ruff format .
mypy app

# Frontend (oxlint)
cd frontend
npm run lint
```

---

## Security Notes

- **Never commit real secrets.** `.env`, `.venv/`, `node_modules/`, and `dist/` are gitignored.
- **Change `JWT_SECRET_KEY`** to a long random string before deploying.
- **Change DB credentials** from the default `devassist_secret` in production.
- Use HTTPS and strong passwords in any non-local deployment.
- Real API keys must only live in your local `.env`, never in committed files.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Connection refused` to postgres/qdrant/redis | Ensure containers are up: `docker compose ps`; host names match `.env` (`postgres`, `qdrant`, `redis`) |
| CORS errors in the browser | Add your frontend origin to `CORS_ORIGINS` in `.env` |
| Groq 401 | Verify `GROQ_API_KEY` is set and active |
| Empty search/chat results | Confirm the repo finished indexing; check the Celery worker logs |
| `ModuleNotFoundError` locally | Re-run `pip install -e ".[dev]"` inside the venv |
| Slow indexing | Reduce `MAX_REPO_SIZE_MB` or raise `EMBEDDING_BATCH_SIZE` |

---

## Roadmap

- [ ] Multi-user workspaces and sharing
- [ ] Incremental re-indexing on repo updates
- [ ] Webhook-triggered sync with GitHub
- [ ] Frontend containerization + one-command `docker compose up`
- [ ] Support for more file types and languages

---

## License

Released under the [MIT License](https://opensource.org/licenses/MIT). See `backend/pyproject.toml`.
