# mypy: ignore-errors
"""
DevAssist AI — Observability (Langfuse + LangSmith)

Provides optional tracing for RAG pipelines. If Langfuse SDK is not
installed or LANGFUSE_ENABLED=false, all helpers degrade to no-ops so
the app runs without extra infra (free-tier friendly).

Usage:
    from app.utils.observability import get_langfuse_client, langfuse_trace, langfuse_score

    trace = langfuse_trace(name="rag-query", user_id=str(user.id), metadata={...})
    # ... do retrieval / generation ...
    langfuse_score(trace, name="citation-precision", value=0.9)

Decorator:
    from app.utils.observability import observe

    @observe(name="rag-query")
    async def my_handler(...): ...
"""

from __future__ import annotations

import functools
from collections.abc import Callable
from typing import Any, ParamSpec, TypeVar, cast

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

P = ParamSpec("P")
T = TypeVar("T")

# ── Lazy Langfuse import ──────────────────────────────────────────
_HAS_LANGFUSE = False
_Langfuse: Any = None
_langfuse_observe: Any = None

try:
    from langfuse import Langfuse as _Langfuse

    _HAS_LANGFUSE = True
    try:
        from langfuse.decorators import (
            observe as _langfuse_observe,  # type: ignore[import-not-found,no-redef]
        )
    except ImportError:
        try:
            from langfuse import observe as _langfuse_observe  # type: ignore[import-not-found]
        except ImportError:
            _langfuse_observe = None
except ImportError:
    _HAS_LANGFUSE = False
    _Langfuse = None
    _langfuse_observe = None

_client: Any | None = None


def get_langfuse_client() -> Any | None:
    """Return a cached Langfuse client or None if disabled / unavailable."""
    global _client
    if not settings.is_langfuse_enabled:
        return None
    if not _HAS_LANGFUSE or _Langfuse is None:
        logger.warning("langfuse_not_installed", hint="pip install langfuse")
        return None
    if _client is not None:
        return _client
    try:
        _client = _Langfuse(
            secret_key=settings.langfuse_secret_key,
            public_key=settings.langfuse_public_key,
            host=settings.langfuse_host,
        )
        logger.info("langfuse_client_initialized", host=settings.langfuse_host)
    except Exception as e:
        logger.warning("langfuse_init_failed", error=str(e))
        return None
    return _client


def langfuse_trace(
    name: str,
    user_id: str | None = None,
    session_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    input_data: Any | None = None,
) -> Any | None:
    """Create a Langfuse trace. Returns None when disabled."""
    client = get_langfuse_client()
    if client is None:
        return None
    try:
        trace = client.trace(
            name=name,
            user_id=user_id,
            session_id=session_id,
            metadata=metadata or {},
            input=input_data,
        )
        return trace
    except Exception as e:
        logger.warning("langfuse_trace_failed", error=str(e))
        return None


def langfuse_span(
    trace: Any | None,
    name: str,
    input_data: Any | None = None,
    metadata: dict[str, Any] | None = None,
) -> Any | None:
    """Create a child span under a trace. No-op when trace is None."""
    if trace is None:
        return None
    try:
        # SDK v2: trace.span(), older: trace.span()
        span = trace.span(name=name, input=input_data, metadata=metadata or {})
        return span
    except Exception as e:
        logger.debug("langfuse_span_failed", error=str(e))
        return None


def langfuse_generation(
    trace: Any | None,
    name: str,
    model: str,
    input_data: Any | None = None,
    output_data: Any | None = None,
    metadata: dict[str, Any] | None = None,
    usage: dict[str, Any] | None = None,
) -> Any | None:
    """Create a generation observation under a trace."""
    if trace is None:
        return None
    try:
        gen = trace.generation(
            name=name,
            model=model,
            input=input_data,
            output=output_data,
            metadata=metadata or {},
            usage=usage,
        )
        return gen
    except Exception as e:
        logger.debug("langfuse_generation_failed", error=str(e))
        return None


def langfuse_score(
    trace: Any | None,
    name: str,
    value: float,
    comment: str | None = None,
    data_type: str = "NUMERIC",
) -> None:
    """Attach a score to a trace (e.g. citation-precision)."""
    if trace is None:
        return
    try:
        trace.score(name=name, value=value, comment=comment, data_type=data_type)
    except Exception as e:
        # Fallback: client.score(trace_id=...)
        try:
            client = get_langfuse_client()
            if client is not None and hasattr(trace, "id"):
                client.score(
                    trace_id=cast(str, trace.id),
                    name=name,
                    value=value,
                    comment=comment,
                    data_type=data_type,
                )
        except Exception as inner:
            logger.debug("langfuse_score_failed", error=str(inner), outer=str(e))


def langfuse_update_generation(
    generation: Any | None,
    output_data: Any | None = None,
    usage: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Update a generation observation with output/usage after streaming."""
    if generation is None:
        return
    try:
        generation.update(output=output_data, usage=usage, metadata=metadata)
    except Exception:
        try:
            generation.end(output=output_data, usage=usage)
        except Exception as e:
            logger.debug("langfuse_generation_update_failed", error=str(e))


def langfuse_update_span(
    span: Any | None,
    output_data: Any | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Update a span observation with output."""
    if span is None:
        return
    try:
        span.update(output=output_data, metadata=metadata)
    except Exception:
        try:
            span.end(output=output_data)
        except Exception as e:
            logger.debug("langfuse_span_update_failed", error=str(e))


def langfuse_flush() -> None:
    """Flush buffered events (call on shutdown or after request)."""
    client = get_langfuse_client()
    if client is None:
        return
    try:
        client.flush()
    except Exception as e:
        logger.debug("langfuse_flush_failed", error=str(e))


# ── Decorator ─────────────────────────────────────────────────────
def observe(
    name: str | None = None, **observe_kwargs: Any
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """
    Drop-in @observe decorator. Delegates to langfuse.decorators.observe
    when Langfuse is enabled + installed, otherwise returns fn unchanged.
    """

    def decorator(fn: Callable[P, T]) -> Callable[P, T]:
        if _langfuse_observe is not None and settings.is_langfuse_enabled and _HAS_LANGFUSE:
            try:
                # langfuse observe signature: observe(name=..., as_type=...)
                wrapped = _langfuse_observe(name=name or fn.__name__, **observe_kwargs)(fn)
                return cast(Callable[P, T], wrapped)
            except Exception as e:
                logger.debug("langfuse_observe_wrap_failed", error=str(e))
                return fn

        @functools.wraps(fn)
        def sync_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            return fn(*args, **kwargs)  # type: ignore[no-any-return]

        @functools.wraps(fn)
        async def async_wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            return await cast(Any, fn)(*args, **kwargs)

        # Return async wrapper if fn is coroutine, else sync
        import inspect

        if inspect.iscoroutinefunction(fn):
            return cast(Callable[P, T], async_wrapper)
        return cast(Callable[P, T], sync_wrapper)

    return decorator


def compute_citation_precision(chunks: list[dict[str, Any]], answer: str) -> float:
    """
    Naïve citation-precision: fraction of retrieved chunks whose file_path
    is mentioned in the answer. Used as Langfuse score.
    Real implementation could use LLM-as-judge; this one is cheap + deterministic.
    """
    if not chunks or not answer:
        return 0.0
    answer_lower = answer.lower()
    cited = 0
    for c in chunks:
        fp = str(c.get("file_path", "")).lower()
        # match filename or full path token
        filename = fp.split("/")[-1]
        if filename and filename in answer_lower or fp and fp in answer_lower:
            cited += 1
    return round(cited / len(chunks), 3) if chunks else 0.0
