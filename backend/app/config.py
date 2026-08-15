"""
DevAssist AI — Application Configuration

Default free stack:
- LLM:        Groq API (free tier) — llama-3.1-8b-instant
- Embeddings: Ollama nomic-embed-text (local, free)
- Vector DB:  Qdrant (self-hosted, free)
- Database:   PostgreSQL (self-hosted, free)
- Cache:      Redis (self-hosted, free)
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Root configuration — all settings flat for env var compatibility.

    Defaults are configured for a fully free deployment using Groq API
    for LLM and local Ollama for embeddings.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────────
    app_name: str = Field(default="DevAssist AI")
    app_env: str = Field(default="development")
    debug: bool = Field(default=True)
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"
    )

    # ── Authentication (JWT — free, self-issued) ────────────────
    jwt_secret_key: str = Field(default="CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING")
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_token_expire_minutes: int = Field(default=15)
    jwt_refresh_token_expire_days: int = Field(default=7)

    # ── PostgreSQL (free, self-hosted) ──────────────────────────
    postgres_user: str = Field(default="devassist")
    postgres_password: str = Field(default="devassist_secret")
    postgres_db: str = Field(default="devassist_db")
    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)
    database_url: str = Field(
        default="postgresql+asyncpg://devassist:devassist_secret@localhost:5432/devassist_db"
    )
    database_url_sync: str = Field(
        default="postgresql+psycopg2://devassist:devassist_secret@localhost:5432/devassist_db"
    )

    # ── Redis (free, self-hosted) ───────────────────────────────
    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)
    redis_url: str = Field(default="redis://localhost:6379/0")
    celery_broker_url: str = Field(default="redis://localhost:6379/1")
    celery_result_backend: str = Field(default="redis://localhost:6379/2")

    # ── Qdrant (self-hosted or Qdrant Cloud) ───────────────────
    qdrant_host: str = Field(default="localhost")
    qdrant_port: int = Field(default=6333)
    qdrant_url: str | None = Field(default=None)
    qdrant_api_key: str | None = Field(default=None)
    qdrant_collection_chunks: str = Field(default="code_chunks")
    qdrant_collection_memories: str = Field(default="memories")

    # ── LLM Provider ────────────────────────────────────────────
    # Supported: "groq" (free API) | "ollama" (local) | "openai" (paid)
    llm_provider: str = Field(default="groq")

    # Groq — FREE API (get key at console.groq.com, no credit card)
    groq_api_key: str = Field(default="")
    groq_base_url: str = Field(default="https://api.groq.com/openai/v1")
    # Recommended free models (in order of quality/token-budget):
    #   llama-3.3-70b-versatile   → 100k tokens/day  (best quality)
    #   llama-3.1-8b-instant      → 500k tokens/day  (best for free tier)
    #   mixtral-8x7b-32768        → 100k tokens/day  (good balance)
    groq_llm_model: str = Field(default="llama-3.1-8b-instant")

    # Ollama — FREE, LOCAL (for embeddings only — no GPU needed for small embed models)
    ollama_base_url: str = Field(default="http://ollama:11434")
    ollama_embedding_model: str = Field(default="nomic-embed-text")
    embedding_provider: str = Field(default="fastembed")  # "fastembed" | "ollama" | "openai" | "huggingface"

    # Hugging Face — FREE Serverless Inference API (get token at huggingface.co/settings/tokens)
    huggingface_api_key: str = Field(default="")
    huggingface_embedding_model: str = Field(default="BAAI/bge-small-en-v1.5")

    # OpenAI — OPTIONAL (paid, only if user provides key)
    openai_api_key: str = Field(default="")
    openai_llm_model: str = Field(default="gpt-4o")
    openai_embedding_model: str = Field(default="text-embedding-3-small")
    openai_embedding_dimensions: int = Field(default=1536)

    # ── LLM Inference Parameters ────────────────────────────────
    llm_temperature: float = Field(default=0.1)
    # Keep low to preserve daily token budget on free tier
    llm_max_tokens: int = Field(default=1024)
    llm_top_k_chunks: int = Field(default=6)  # 6 chunks × 512 ≈ 3k context tokens
    embedding_dimensions: int = Field(default=384)  # BAAI/bge-small-en-v1.5

    # ── Indexing ────────────────────────────────────────────────
    max_repo_size_mb: int = Field(default=50)
    max_file_size_kb: int = Field(default=1024)
    chunk_size_tokens: int = Field(default=512)  # smaller = more chunks, less context
    chunk_overlap_tokens: int = Field(default=64)
    embedding_batch_size: int = Field(default=25)

    # ── Storage (local disk — free) ─────────────────────────────
    repo_storage_path: str = Field(default="/app/storage/repos")
    document_storage_path: str = Field(default="/app/storage/documents")
    fastembed_cache_path: str = Field(default="/app/storage/cache")

    # ── Properties ──────────────────────────────────────────────

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def active_llm_model(self) -> str:
        """Return active LLM model name based on configured provider."""
        match self.llm_provider:
            case "openai":
                return self.openai_llm_model
            case "ollama":
                return self.ollama_embedding_model  # fallback for local
            case _:  # groq (default)
                return self.groq_llm_model

    @property
    def active_embedding_model(self) -> str:
        """Return active embedding model name based on configured provider."""
        match self.llm_provider:
            case "openai":
                return self.openai_embedding_model
            case _:
                return self.ollama_embedding_model

    @property
    def active_llm_base_url(self) -> str:
        """
        Groq uses the OpenAI-compatible API format.
        This means we can use the openai SDK pointed at Groq's endpoint.
        """
        match self.llm_provider:
            case "openai":
                return "https://api.openai.com/v1"
            case "ollama":
                return f"{self.ollama_base_url}/v1"
            case _:  # groq (default)
                return self.groq_base_url

    @property
    def active_llm_api_key(self) -> str:
        """Return the API key for the active provider."""
        match self.llm_provider:
            case "openai":
                return self.openai_api_key
            case "ollama":
                return "ollama"  # Ollama doesn't need a real key
            case _:  # groq (default)
                return self.groq_api_key


# Singleton — import this everywhere
settings = Settings()
