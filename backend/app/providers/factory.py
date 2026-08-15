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


def _create_llm_provider(provider: str | None = None, api_key: str | None = None) -> LLMProvider:
    provider_name = (provider or settings.llm_provider).lower()

    match provider_name:
        case "groq":
            from app.providers.groq import GroqProvider

            logger.info("llm_provider_selected", provider="groq", model=settings.groq_llm_model)
            return GroqProvider(api_key=api_key)

        case "openai":
            key = api_key or settings.openai_api_key
            if not key:
                raise ValueError(
                    "LLM_PROVIDER=openai but OPENAI_API_KEY / custom key is not set. "
                    "Either set the key or switch to LLM_PROVIDER=groq (free)."
                )
            from app.providers.openai import OpenAIProvider

            logger.info("llm_provider_selected", provider="openai", model=settings.openai_llm_model)
            return OpenAIProvider(api_key=key)

        case "ollama":
            # Ollama as LLM (generate via Ollama API using openai-compat)
            from app.providers.groq import GroqProvider

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
                f"Unknown LLM_PROVIDER: '{provider_name}'. Supported: groq (free), openai, ollama"
            )


@lru_cache(maxsize=1)
def _get_cached_llm_provider() -> LLMProvider:
    return _create_llm_provider()


def get_llm_provider(provider: str | None = None, api_key: str | None = None) -> LLMProvider:
    """
    Return the configured LLM provider.
    If a custom provider or api_key is supplied, return a new provider instance.
    Otherwise, return the cached default provider singleton.
    """
    if provider or api_key:
        return _create_llm_provider(provider=provider, api_key=api_key)
    return _get_cached_llm_provider()


def _create_embedding_provider(provider: str | None = None, api_key: str | None = None) -> EmbeddingProvider:
    provider_name = (provider or settings.embedding_provider).lower()

    if provider_name == "openai":
        key = api_key or settings.openai_api_key
        from app.providers.openai import OpenAIEmbeddingProvider

        logger.info(
            "embedding_provider_selected",
            provider="openai",
            model=settings.openai_embedding_model,
        )
        return OpenAIEmbeddingProvider(api_key=key)

    elif provider_name == "huggingface":
        key = api_key or settings.huggingface_api_key
        from app.providers.embeddings import HuggingFaceEmbeddingProvider

        logger.info(
            "embedding_provider_selected",
            provider="huggingface",
            model=settings.huggingface_embedding_model,
        )
        return HuggingFaceEmbeddingProvider(api_key=key)

    else:
        # Fall back to huggingface to prevent startup crash on Render Free Tier
        logger.warning(
            "embedding_provider_fallback",
            requested=provider_name,
            fallback="huggingface",
        )
        key = api_key or settings.huggingface_api_key
        from app.providers.embeddings import HuggingFaceEmbeddingProvider
        return HuggingFaceEmbeddingProvider(api_key=key)


@lru_cache(maxsize=1)
def _get_cached_embedding_provider() -> EmbeddingProvider:
    return _create_embedding_provider()


def get_embedding_provider(provider: str | None = None, api_key: str | None = None) -> EmbeddingProvider:
    """
    Return the configured Embedding provider.
    If a custom provider or api_key is supplied, return a new provider instance.
    Otherwise, return the cached default provider singleton.
    """
    if provider or api_key:
        return _create_embedding_provider(provider=provider, api_key=api_key)
    return _get_cached_embedding_provider()


def clear_provider_cache() -> None:
    """Clear cached providers — used in tests to reset state."""
    _get_cached_llm_provider.cache_clear()
    _get_cached_embedding_provider.cache_clear()
