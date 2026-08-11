"""
DevAssist AI — Provider Abstract Base Classes

Defines the interfaces that all LLM and Embedding providers must implement.
Adding a new provider = implement these interfaces. Zero other changes needed.
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass

# ── Data transfer objects ───────────────────────────────────────


@dataclass
class LLMMessage:
    """A single message in a chat conversation."""

    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass
class LLMResponse:
    """Completed (non-streaming) LLM response."""

    content: str
    model: str
    input_tokens: int
    output_tokens: int


@dataclass
class StreamChunk:
    """A single streamed token chunk."""

    delta: str  # the new text fragment
    is_done: bool  # True on the final chunk
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0


# ── Abstract interfaces ─────────────────────────────────────────


class LLMProvider(ABC):
    """
    Abstract interface for LLM text generation.

    All concrete implementations must support both streaming
    and blocking generation modes.
    """

    @abstractmethod
    async def generate(
        self,
        messages: list[LLMMessage],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """
        Generate a complete response (blocking).
        Use for non-streaming tasks like summarization.
        """
        ...

    @abstractmethod
    def stream(
        self,
        messages: list[LLMMessage],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Stream a response token-by-token.
        Yields StreamChunk objects. Last chunk has is_done=True.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the provider is reachable and ready."""
        ...


class EmbeddingProvider(ABC):
    """
    Abstract interface for text embedding.

    Converts text into dense vector representations
    for storage in Qdrant and similarity search.
    """

    @abstractmethod
    async def embed_text(self, text: str) -> list[float]:
        """Embed a single text string. Returns a float vector."""
        ...

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a batch of texts efficiently.
        Returns a list of vectors in the same order as input.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the embedding service is reachable."""
        ...

    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Number of dimensions in the embedding vector."""
        ...
