"""
DevAssist AI — Qdrant Vector Store Wrapper

Handles connection, collection initialization, upserting,
searching, and deleting vectors. Enforces tenant isolation
by requiring user_id on all read/write operations.
"""

import uuid
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as rest_models
from qdrant_client.http.exceptions import UnexpectedResponse

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class QdrantVectorStore:
    """
    Wrapper around AsyncQdrantClient for managing vector collections.
    Provides methods for code chunks and memory vector operations.
    """

    def __init__(self) -> None:
        self.client = AsyncQdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
        )
        self.collection_chunks = settings.qdrant_collection_chunks
        self.collection_memories = settings.qdrant_collection_memories
        self.dims = settings.embedding_dimensions

    async def init_collections(self) -> None:
        """
        Create the required Qdrant collections if they don't already exist.
        Uses Cosine distance for embeddings.
        """
        for collection_name in [self.collection_chunks, self.collection_memories]:
            try:
                exists = await self.client.collection_exists(collection_name)
                if not exists:
                    logger.info(
                        "creating_qdrant_collection",
                        collection=collection_name,
                        dimensions=self.dims,
                    )
                    await self.client.create_collection(
                        collection_name=collection_name,
                        vectors_config=rest_models.VectorParams(
                            size=self.dims,
                            distance=rest_models.Distance.COSINE,
                        ),
                    )
                    # Create payload indexes for faster queries
                    if collection_name == self.collection_chunks:
                        await self.client.create_payload_index(
                            collection_name=collection_name,
                            field_name="user_id",
                            field_schema=rest_models.PayloadSchemaType.KEYWORD,
                        )
                        await self.client.create_payload_index(
                            collection_name=collection_name,
                            field_name="repository_id",
                            field_schema=rest_models.PayloadSchemaType.KEYWORD,
                        )
                    elif collection_name == self.collection_memories:
                        await self.client.create_payload_index(
                            collection_name=collection_name,
                            field_name="user_id",
                            field_schema=rest_models.PayloadSchemaType.KEYWORD,
                        )
                else:
                    logger.debug("qdrant_collection_exists", collection=collection_name)
            except UnexpectedResponse as e:
                logger.error(
                    "qdrant_collection_init_failed", collection=collection_name, error=str(e)
                )
                raise

    async def upsert_code_chunks(
        self,
        user_id: uuid.UUID,
        repository_id: uuid.UUID | None,
        chunks: list[dict[str, Any]],
        embeddings: list[list[float]],
    ) -> None:
        """
        Upsert a batch of code chunks with their vector embeddings into Qdrant.
        Ensures user_id and repository_id are injected in the payload for isolation.

        chunks list item structure:
        {
            "id": uuid.UUID (optional, generated if missing),
            "file_path": str,
            "content": str,
            "start_line": int,
            "end_line": int,
            "language": str,
            "is_ast": bool
        }
        """
        if len(chunks) != len(embeddings):
            raise ValueError("Size of chunks and embeddings lists must match.")

        points = []
        for i, chunk in enumerate(chunks):
            point_id = str(chunk.get("id") or uuid.uuid4())
            payload = {
                "user_id": str(user_id),
                "repository_id": str(repository_id) if repository_id is not None else None,
                "file_path": chunk["file_path"],
                "content": chunk["content"],
                "start_line": chunk["start_line"],
                "end_line": chunk["end_line"],
                "language": chunk.get("language", "unknown"),
                "is_ast": chunk.get("is_ast", False),
            }
            points.append(
                rest_models.PointStruct(
                    id=point_id,
                    vector=embeddings[i],
                    payload=payload,
                )
            )

        if points:
            logger.info("upserting_chunks_to_qdrant", count=len(points), repo_id=str(repository_id))
            await self.client.upsert(
                collection_name=self.collection_chunks,
                wait=True,
                points=points,
            )

    async def search_code_chunks(
        self,
        user_id: uuid.UUID,
        repository_id: uuid.UUID | None,
        query_vector: list[float],
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        """
        Perform a semantic vector search scoped strictly to the current user
        and strictly scoped to the specified repository/document context.
        """
        if not repository_id:
            return []

        # Build filter forcing user_id AND repository_id scope (strict isolation)
        must_filters = [
            rest_models.FieldCondition(
                key="user_id",
                match=rest_models.MatchValue(value=str(user_id)),
            ),
            rest_models.FieldCondition(
                key="repository_id",
                match=rest_models.MatchValue(value=str(repository_id)),
            ),
        ]

        query_filter = rest_models.Filter(must=must_filters)

        response = await self.client.query_points(
            collection_name=self.collection_chunks,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
        )

        return [
            {
                "id": r.id,
                "score": r.score,
                "file_path": r.payload.get("file_path"),  # type: ignore
                "content": r.payload.get("content"),  # type: ignore
                "start_line": r.payload.get("start_line"),  # type: ignore
                "end_line": r.payload.get("end_line"),  # type: ignore
                "language": r.payload.get("language"),  # type: ignore
            }
            for r in response.points
        ]

    async def delete_by_repository(self, user_id: uuid.UUID, repository_id: uuid.UUID) -> None:
        """
        Delete all vectors associated with a specific repository.
        Requires user_id for tenant verification.
        """
        logger.info(
            "deleting_vectors_by_repository", repo_id=str(repository_id), user_id=str(user_id)
        )
        await self.client.delete(
            collection_name=self.collection_chunks,
            points_selector=rest_models.FilterSelector(
                filter=rest_models.Filter(
                    must=[
                        rest_models.FieldCondition(
                            key="user_id",
                            match=rest_models.MatchValue(value=str(user_id)),
                        ),
                        rest_models.FieldCondition(
                            key="repository_id",
                            match=rest_models.MatchValue(value=str(repository_id)),
                        ),
                    ]
                )
            ),
        )

    async def upsert_memories(
        self,
        user_id: uuid.UUID,
        memories: list[dict[str, Any]],
        embeddings: list[list[float]],
    ) -> None:
        """
        Upsert a list of conversational memories/preferences into Qdrant memories collection.
        Injects user_id for tenant isolation.
        """
        if len(memories) != len(embeddings):
            raise ValueError("Size of memories and embeddings lists must match.")

        points = []
        for i, memory in enumerate(memories):
            point_id = str(memory.get("id") or uuid.uuid4())
            payload = {
                "user_id": str(user_id),
                "content": memory["content"],
                "category": memory.get("category", "general"),
            }
            points.append(
                rest_models.PointStruct(
                    id=point_id,
                    vector=embeddings[i],
                    payload=payload,
                )
            )

        if points:
            logger.info("upserting_memories_to_qdrant", count=len(points), user_id=str(user_id))
            await self.client.upsert(
                collection_name=self.collection_memories,
                wait=True,
                points=points,
            )

    async def search_memories(
        self,
        user_id: uuid.UUID,
        query_vector: list[float],
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """
        Perform a semantic vector search over long-term memories.
        Enforces user_id tenant isolation.
        """
        query_filter = rest_models.Filter(
            must=[
                rest_models.FieldCondition(
                    key="user_id",
                    match=rest_models.MatchValue(value=str(user_id)),
                )
            ]
        )

        response = await self.client.query_points(
            collection_name=self.collection_memories,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
        )

        return [
            {
                "id": r.id,
                "score": r.score,
                "content": r.payload.get("content"),  # type: ignore
                "category": r.payload.get("category"),  # type: ignore
            }
            for r in response.points
        ]

    async def delete_memory(self, user_id: uuid.UUID, memory_id: uuid.UUID) -> None:
        """
        Delete a specific memory by ID.
        Requires user_id for tenant verification.
        """
        logger.info("deleting_memory", memory_id=str(memory_id), user_id=str(user_id))
        await self.client.delete(
            collection_name=self.collection_memories,
            points_selector=rest_models.FilterSelector(
                filter=rest_models.Filter(
                    must=[
                        rest_models.FieldCondition(
                            key="user_id",
                            match=rest_models.MatchValue(value=str(user_id)),
                        ),
                        rest_models.HasIdCondition(has_id=[str(memory_id)]),
                    ]
                )
            ),
        )

    async def list_memories(self, user_id: uuid.UUID) -> list[dict[str, Any]]:
        """
        List all memories associated with a user using Qdrant scroll API.
        Enforces tenant isolation.
        """
        query_filter = rest_models.Filter(
            must=[
                rest_models.FieldCondition(
                    key="user_id",
                    match=rest_models.MatchValue(value=str(user_id)),
                )
            ]
        )

        # Scroll returns a tuple: (list of points, next offset)
        points, _ = await self.client.scroll(
            collection_name=self.collection_memories,
            scroll_filter=query_filter,
            limit=100,
            with_payload=True,
            with_vectors=False,
        )

        return [
            {
                "id": uuid.UUID(p.id) if isinstance(p.id, str) else p.id,
                "content": p.payload.get("content"),  # type: ignore
                "category": p.payload.get("category", "general"),  # type: ignore
            }
            for p in points
        ]

    async def health_check(self) -> bool:
        """Verify Qdrant is running and reachable."""
        try:
            # Check cluster status or perform a simple operation
            await self.client.get_collections()
            return True
        except Exception as e:
            logger.warning("qdrant_health_check_failed", error=str(e))
            return False

    async def close(self) -> None:
        """Close connection to Qdrant."""
        await self.client.close()


# Singleton Instance
vector_store = QdrantVectorStore()
