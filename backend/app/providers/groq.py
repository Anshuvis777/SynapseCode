"""
DevAssist AI — Groq LLM Provider (FREE)

Uses the OpenAI-compatible SDK pointed at Groq's endpoint.
Groq free tier: https://console.groq.com
- llama-3.1-8b-instant  → 500k tokens/day
- llama-3.3-70b-versatile → 100k tokens/day

No additional SDK needed — standard `openai` package works with Groq.
"""

from collections.abc import AsyncGenerator
from typing import cast

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.config import settings
from app.providers.base import (
    LLMMessage,
    LLMProvider,
    LLMResponse,
    StreamChunk,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class GroqProvider(LLMProvider):
    """
    LLM provider backed by Groq's free API.

    Groq uses the OpenAI API format — we point the openai SDK
    at Groq's base URL with a Groq API key.
    """

    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or settings.groq_api_key or "gsk_byok_placeholder"
        self._client = AsyncOpenAI(
            api_key=key,
            base_url=settings.groq_base_url,
        )
        self._model = settings.groq_llm_model
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
        """Blocking generation — waits for full response."""
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=self._to_openai_messages(messages),
            temperature=temperature or self._default_temperature,
            max_tokens=max_tokens or self._default_max_tokens,
            stream=False,
        )

        choice = response.choices[0]
        usage = response.usage

        logger.info(
            "groq_generate_complete",
            model=self._model,
            input_tokens=usage.prompt_tokens if usage else 0,
            output_tokens=usage.completion_tokens if usage else 0,
        )

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
        """
        Stream response token-by-token.
        Yields StreamChunk; final chunk has is_done=True with token counts.
        """
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=self._to_openai_messages(messages),
            temperature=temperature or self._default_temperature,
            max_tokens=max_tokens or self._default_max_tokens,
            stream=True,
            stream_options={"include_usage": True},
        )

        input_tokens = 0
        output_tokens = 0

        async for chunk in response:
            # Usage is included in the final chunk by Groq
            if chunk.usage:
                input_tokens = chunk.usage.prompt_tokens
                output_tokens = chunk.usage.completion_tokens

            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta
            finish_reason = chunk.choices[0].finish_reason

            if delta.content:
                yield StreamChunk(
                    delta=delta.content,
                    is_done=False,
                    model=self._model,
                )

            if finish_reason == "stop":
                yield StreamChunk(
                    delta="",
                    is_done=True,
                    model=self._model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                )

        logger.info(
            "groq_stream_complete",
            model=self._model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )

    async def health_check(self) -> bool:
        """Verify Groq API is reachable by making a minimal request."""
        if not settings.groq_api_key:
            # Server runs in Zero-Retention BYOK mode (keys supplied per-request by client)
            return True
        try:
            await self._client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            )
            return True
        except Exception as e:
            logger.warning("groq_health_check_failed", error=str(e))
            return False
