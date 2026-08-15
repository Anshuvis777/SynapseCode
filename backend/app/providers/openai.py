"""
DevAssist AI — OpenAI Provider (Optional, Paid)

Used only if LLM_PROVIDER=openai is set and OPENAI_API_KEY is provided.
Also implements EmbeddingProvider for OpenAI embeddings as an alternative
to Ollama (useful when no local Ollama is available).
"""

from collections.abc import AsyncGenerator
from typing import cast

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.config import settings
from app.providers.base import (
    EmbeddingProvider,
    LLMMessage,
    LLMProvider,
    LLMResponse,
    StreamChunk,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class OpenAIProvider(LLMProvider):
    """
    LLM provider backed by OpenAI API.
    Optional — only used when user explicitly sets LLM_PROVIDER=openai.
    """

    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or settings.openai_api_key or "sk-byok_placeholder"
        self._client = AsyncOpenAI(api_key=key)
        self._model = settings.openai_llm_model
        self._default_temperature = settings.llm_temperature
        self._default_max_tokens = settings.llm_max_tokens

    def _to_openai_messages(self, messages: list[LLMMessage]) -> list[ChatCompletionMessageParam]:
        return cast(
            list[ChatCompletionMessageParam],
            [{"role": m.role, "content": m.content} for m in messages],
        )

    async def generate(
        self,
        messages: list[LLMMessage],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=self._to_openai_messages(messages),
            temperature=temperature or self._default_temperature,
            max_tokens=max_tokens or self._default_max_tokens,
        )
        choice = response.choices[0]
        usage = response.usage
        return LLMResponse(
            content=choice.message.content or "",
            model=self._model,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
        )

    async def stream(
        self,
        messages: list[LLMMessage],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=self._to_openai_messages(messages),
            temperature=temperature or self._default_temperature,
            max_tokens=max_tokens or self._default_max_tokens,
            stream=True,
        )
        async for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            finish_reason = chunk.choices[0].finish_reason
            if delta.content:
                yield StreamChunk(delta=delta.content, is_done=False, model=self._model)
            if finish_reason == "stop":
                yield StreamChunk(delta="", is_done=True, model=self._model)

    async def health_check(self) -> bool:
        try:
            await self._client.models.list()
            return True
        except Exception as e:
            logger.warning("openai_health_check_failed", error=str(e))
            return False


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """
    Embedding provider using OpenAI text-embedding-3-small.
    Optional — use Ollama embeddings to stay free.
    """

    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or settings.openai_api_key
        self._client = AsyncOpenAI(api_key=key)
        self._model = settings.openai_embedding_model
        self._dims = settings.openai_embedding_dimensions

    @property
    def dimensions(self) -> int:
        return self._dims

    async def embed_text(self, text: str) -> list[float]:
        response = await self._client.embeddings.create(
            model=self._model,
            input=text.strip() or "empty",
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        cleaned = [t.strip() or "empty" for t in texts]
        response = await self._client.embeddings.create(
            model=self._model,
            input=cleaned,
        )
        # Results are returned in order
        return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]

    async def health_check(self) -> bool:
        try:
            await self.embed_text("health check")
            return True
        except Exception as e:
            logger.warning("openai_embed_health_check_failed", error=str(e))
            return False
