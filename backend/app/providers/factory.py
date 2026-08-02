"""
DevAssist AI — Provider Factory

Single entry point to get LLM and Embedding providers.
Reads LLM_PROVIDER from config and returns the correct implementation.

Usage (in services):
    from app.providers.factory import get_llm_provider, get_embedding_provider

    llm = get_llm_provider()
    embedding = get_embedding_provider()

Providers are instantiated as singletons at startup to avoid
re-creating HTTP clients on every request.
"""

from functools import lru_cache

from app.config import settings
from app.providers.base import EmbeddingProvider, LLMProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_llm_provider() -> LLMProvider:
    """
    Return the configured LLM provider singleton.

    Provider is selected based on LLM_PROVIDER env var:
      - "groq"   → GroqProvider   (FREE — default)
      - "openai" → OpenAIProvider (paid, optional)
      - "ollama" → OllamaProvider (local, optional)
    """
    provider = settings.llm_provider.lower()

    match provider:
        case "groq":
            from app.providers.groq import GroqProvider
            logger.info("llm_provider_selected", provider="groq", model=settings.groq_llm_model)
            return GroqProvider()

        case "openai":
            if not settings.openai_api_key:
                raise ValueError(
                    "LLM_PROVIDER=openai but OPENAI_API_KEY is not set. "
                    "Either set the key or switch to LLM_PROVIDER=groq (free)."
                )
            from app.providers.openai import OpenAIProvider
            logger.info("llm_provider_selected", provider="openai", model=settings.openai_llm_model)
            return OpenAIProvider()

        case "ollama":
            # Ollama as LLM (generate via Ollama API using openai-compat)
            from app.providers.groq import GroqProvider
            from openai import AsyncOpenAI
            import types

            # For Ollama LLM, reuse GroqProvider logic with Ollama endpoint
            # Ollama exposes OpenAI-compatible API at /v1
            logger.info("llm_provider_selected", provider="ollama", model=settings.ollama_llm_model)

            class OllamaLLMProvider(GroqProvider):
                def __init__(self) -> None:
                    from openai import AsyncOpenAI
                    self._client = AsyncOpenAI(
                        api_key="ollama",
                        base_url=f"{settings.ollama_base_url}/v1",
                    )
                    self._model = settings.ollama_llm_model
                    self._default_temperature = settings.llm_temperature
                    self._default_max_tokens = settings.llm_max_tokens

            return OllamaLLMProvider()

        case _:
            raise ValueError(
                f"Unknown LLM_PROVIDER: '{provider}'. "
                "Supported: groq (free), openai, ollama"
            )


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    """
    Return the configured Embedding provider singleton.

    Provider is selected based on EMBEDDING_PROVIDER env var:
      - "fastembed" → FastEmbedEmbeddingProvider (local, FREE, low-RAM — default)
      - "ollama"    → OllamaEmbeddingProvider    (local, FREE, needs separate server)
      - "openai"    → OpenAIEmbeddingProvider    (paid, optional)
    """
    provider = settings.embedding_provider.lower()

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError(
                "EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set."
            )
        from app.providers.openai import OpenAIEmbeddingProvider
        logger.info(
            "embedding_provider_selected",
            provider="openai",
            model=settings.openai_embedding_model,
        )
        return OpenAIEmbeddingProvider()

    elif provider == "ollama":
        from app.providers.embeddings import OllamaEmbeddingProvider
        logger.info(
            "embedding_provider_selected",
            provider="ollama",
            model=settings.ollama_embedding_model,
        )
        return OllamaEmbeddingProvider()

    else:
        from app.providers.embeddings import FastEmbedEmbeddingProvider
        logger.info(
            "embedding_provider_selected",
            provider="fastembed",
            model="nomic-ai/nomic-embed-text-v1.5",
        )
        return FastEmbedEmbeddingProvider()


def clear_provider_cache() -> None:
    """Clear cached providers — used in tests to reset state."""
    get_llm_provider.cache_clear()
    get_embedding_provider.cache_clear()
