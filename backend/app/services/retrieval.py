"""
DevAssist AI — Retrieval Service

Handles semantic context retrieval for user questions.
Converts search query to vectors, queries Qdrant with tenant isolation,
performs keyword-based scoring adjustment, and formats the output
as context blocks for LLM prompt ingestion.
"""

import uuid
from typing import Any

from app.providers.factory import get_embedding_provider
from app.storage.vector_store import vector_store
from app.utils.logger import get_logger

logger = get_logger(__name__)


class RetrievalService:
    """
    Service responsible for finding relevant code snippets from Qdrant vector store
    and formatting them into coherent context prompts.
    """

    def __init__(self) -> None:
        self.embedding_provider = get_embedding_provider()
        self.vector_store = vector_store

    async def retrieve_context(
        self,
        user_id: uuid.UUID,
        repository_id: uuid.UUID | None,
        query: str,
        limit: int = 6,
        embedding_api_key: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Embed the user query, execute semantic search in Qdrant,
        apply basic code-focused re-scoring, and return list of chunks.
        Strictly returns an empty list if no repository is attached.
        """
        if not repository_id:
            logger.info("no_repository_attached_skipping_retrieval")
            return []

        logger.info("retrieving_context", repo_id=str(repository_id), query=query)

        # 1. Embed query
        provider = get_embedding_provider(api_key=embedding_api_key) if embedding_api_key else self.embedding_provider
        query_vector = await provider.embed_text(query)

        # 2. Query Qdrant with tenant isolation
        chunks = await self.vector_store.search_code_chunks(
            user_id=user_id,
            repository_id=repository_id,
            query_vector=query_vector,
            limit=limit * 2,  # Fetch more for re-ranking/filtering
        )

        # 3. Simple lexical/keyword booster (rerank)
        # Boost chunk scores if they contain exact match words from the query
        stop_words = {
            "to",
            "in",
            "on",
            "at",
            "by",
            "of",
            "is",
            "it",
            "he",
            "me",
            "we",
            "us",
            "am",
            "an",
            "as",
            "if",
            "or",
            "so",
        }
        query_words = {w for w in query.lower().split() if w not in stop_words}
        scored_chunks = []
        for chunk in chunks:
            score = chunk["score"]
            content_lower = chunk["content"].lower()
            file_path_lower = chunk["file_path"].lower()

            # Boost if query terms are in the file name
            filename = file_path_lower.split("/")[-1]
            for word in query_words:
                if len(word) >= 2:  # Match 2+ character technical terms (e.g. 'db', 'go', 'py')
                    if word in filename:
                        score += 0.15  # Strong filename match boost
                    elif word in content_lower:
                        score += 0.05  # Lexical match boost

            chunk["score"] = min(score, 1.0)  # Cap at 1.0
            scored_chunks.append(chunk)

        # Sort by updated score descending and limit to target size
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        final_chunks = scored_chunks[:limit]

        return final_chunks

    def format_context_prompt(self, chunks: list[dict[str, Any]]) -> str:
        """
        Format retrieved code chunks into a single string to be injected in LLM prompt.
        Uses clear separators and includes metadata for citations.
        """
        if not chunks:
            return "No matching code snippets were found in the codebase."

        context_blocks = []
        for i, chunk in enumerate(chunks, 1):
            block = (
                f"--- CODE BLOCK {i} ---\n"
                f"File: {chunk['file_path']}\n"
                f"Lines: {chunk['start_line']}-{chunk['end_line']}\n"
                f"Language: {chunk.get('language', 'unknown')}\n"
                f"Relevance Score: {chunk['score']:.2f}\n"
                f"```\n"
                f"{chunk['content']}\n"
                f"```\n"
            )
            context_blocks.append(block)

        return "\n".join(context_blocks)

    async def retrieve_document_context(
        self,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        document_filename: str,
        query: str,
        limit: int = 6,
        embedding_api_key: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Embed the user query, search in Qdrant specifically for document chunks, and return chunks.
        """
        logger.info("retrieving_document_context", doc_id=str(document_id), filename=document_filename, query=query)

        # 1. Embed query
        provider = get_embedding_provider(api_key=embedding_api_key) if embedding_api_key else self.embedding_provider
        query_vector = await provider.embed_text(query)

        # 2. Query Qdrant with document filter
        chunks = await self.vector_store.search_document_chunks(
            user_id=user_id,
            document_id=document_id,
            document_filename=document_filename,
            query_vector=query_vector,
            limit=limit,
        )

        return chunks

