"""
DevAssist AI — Ollama Embedding Provider (FREE, LOCAL)

Uses Ollama's HTTP API to generate text embeddings locally.
No GPU required for embedding models — they run efficiently on CPU.

Setup (one-time):
  docker compose exec ollama ollama pull nomic-embed-text

Model: nomic-embed-text
  - 768 dimensions
  - Strong performance on code + documentation
  - ~274MB download
  - Runs on CPU (no GPU needed for embeddings)
"""

import asyncio
from typing import cast

import httpx
from fastembed import TextEmbedding

from app.config import settings
from app.providers.base import EmbeddingProvider
from app.utils.logger import get_logger

logger = get_logger(__name__)

_OLLAMA_EMBED_PATH = "/api/embeddings"


class OllamaEmbeddingProvider(EmbeddingProvider):
    """
    Embedding provider using Ollama's local API.

    Uses nomic-embed-text by default — free, runs on CPU,
    768 dimensions, strong on code and technical text.
    """

    def __init__(self) -> None:
        self._base_url = settings.ollama_base_url
        self._model = settings.ollama_embedding_model
        self._dims = settings.embedding_dimensions
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=60.0,  # embedding can be slow on first call (model load)
        )

    @property
    def dimensions(self) -> int:
        return self._dims

    async def embed_text(self, text: str) -> list[float]:
        """
        Embed a single text string.
        Strips and truncates to avoid empty inputs.
        """
        text = text.strip()
        if not text:
            return [0.0] * self._dims

        response = await self._client.post(
            _OLLAMA_EMBED_PATH,
            json={"model": self._model, "prompt": text},
        )
        response.raise_for_status()
        data = response.json()
        vector = cast(list[float], data["embedding"])

        logger.debug(
            "ollama_embed_text",
            model=self._model,
            dims=len(vector),
            text_len=len(text),
        )
        return vector

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a batch of texts sequentially.

        Ollama doesn't support batch embedding in a single request,
        so we call embed_text per item. This is fine for our
        batch sizes (50 chunks) — each call is fast locally.
        """
        results: list[list[float]] = []
        for i, text in enumerate(texts):
            try:
                vector = await self.embed_text(text)
                results.append(vector)
            except Exception as e:
                logger.error(
                    "ollama_embed_batch_item_failed",
                    index=i,
                    error=str(e),
                )
                # Return zero vector for failed items — don't break the batch
                results.append([0.0] * self._dims)

        logger.info(
            "ollama_embed_batch_complete",
            total=len(texts),
            model=self._model,
        )
        return results

    async def health_check(self) -> bool:
        """Verify Ollama is running and the embedding model is available."""
        try:
            # Try a minimal embed — if model not pulled, this will fail with a clear error
            response = await self._client.post(
                _OLLAMA_EMBED_PATH,
                json={"model": self._model, "prompt": "test"},
                timeout=10.0,
            )
            response.raise_for_status()
            return True
        except httpx.ConnectError:
            logger.warning("ollama_not_running", url=self._base_url)
            return False
        except Exception as e:
            logger.warning("ollama_health_check_failed", error=str(e))
            return False

    async def aclose(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()


class FastEmbedEmbeddingProvider(EmbeddingProvider):
    """
    Embedding provider using FastEmbed for local, lightweight embeddings.
    Runs ONNX Runtime under the hood in CPU threadpool, saving GBs of RAM.
    """

    def __init__(self) -> None:
        self._model_name = "BAAI/bge-small-en-v1.5"
        self._dims = settings.embedding_dimensions
        # TextEmbedding is loaded synchronously inside the constructor
        # Limit threads to 1 to prevent memory exhaustion / OOM killer on low-resource machines
        self._model = TextEmbedding(model_name=self._model_name, threads=1)

    @property
    def dimensions(self) -> int:
        return self._dims

    async def embed_text(self, text: str) -> list[float]:
        """Embed a single text string by delegating to a worker thread."""
        text = text.strip()
        if not text:
            return [0.0] * self._dims

        embeddings = await asyncio.to_thread(self._embed_sync, [text])
        return embeddings[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts in a background worker thread."""
        cleaned = [t.strip() for t in texts]
        embeddings = await asyncio.to_thread(self._embed_sync, cleaned)
        return embeddings

    def _embed_sync(self, texts: list[str]) -> list[list[float]]:
        # FastEmbed.embed returns a generator of numpy arrays with batch processing
        generator = self._model.embed(texts, batch_size=32)
        return [list(vector) for vector in generator]

    async def health_check(self) -> bool:
        """FastEmbed is local and requires no server process, so health check always succeeds."""
        return True

    async def aclose(self) -> None:
        """No HTTP client or persistent connections to close."""
        pass
