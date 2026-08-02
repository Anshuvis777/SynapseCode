"""
DevAssist AI — Document Ingestion Router

Endpoints:
  POST   /api/documents       — Upload text/markdown file for RAG ingestion
  POST   /api/documents/url   — Ingest web page text from a URL
  GET    /api/documents       — List user's documents
  DELETE /api/documents/{id}  — Delete document and its vector chunks
"""

import os
import re
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse, URLIngestPayload
from app.storage.database import get_db
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Local storage path for uploaded files
STORAGE_DIR = Path("/home/anshu-kumar/AI/backend/storage/documents")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_TYPES = {
    "text/plain": "txt",
    "text/markdown": "md",
    "text/x-markdown": "md",
    "text/html": "html",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}


def clean_html(html_content: str) -> str:
    """Removes HTML tags and returns clean plain text."""
    # Remove scripts, styles, and headers/footers
    clean = re.sub(r'<(script|style|header|footer|nav|noscript)[^>]*>([\s\S]*?)<\/\1>', ' ', html_content, flags=re.IGNORECASE)
    # Remove all HTML tags
    clean = re.sub(r'<[^>]+>', ' ', clean)
    # Collapse multiple whitespaces
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file (TXT, MD, HTML, PDF, DOCX) for RAG ingestion",
)
async def upload_document(
    file: UploadFile = File(...),
    repo_id: uuid.UUID | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    """
    Upload a document. Parsed text is chunked and embedded in the background.
    """
    # Validate MIME type
    content_type = file.content_type or "text/plain"
    if content_type not in SUPPORTED_TYPES:
        # Fallback to file extension check
        ext = Path(file.filename or "").suffix.lower()
        if ext in [".txt", ".md", ".html", ".htm", ".pdf", ".docx"]:
            file_type = ext.strip(".")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {content_type}. Only TXT, MD, HTML, PDF, and DOCX are supported.",
            )
    else:
        file_type = SUPPORTED_TYPES[content_type]

    doc_id = uuid.uuid4()
    filename = file.filename or f"doc-{doc_id}.{file_type}"
    storage_path = STORAGE_DIR / f"{doc_id}_{filename}"

    # 1. Read and save file content locally
    try:
        content = await file.read()
        file_size = len(content)
        with open(storage_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error("failed_to_save_uploaded_file", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to write upload to storage disk.",
        )

    # 2. Save Document record in database
    doc = Document(
        id=doc_id,
        user_id=current_user.id,
        repo_id=repo_id,
        filename=filename,
        file_type=file_type,
        file_size=file_size,
        storage_path=str(storage_path),
        status="processing",
    )
    db.add(doc)
    await db.commit()

    # 3. Fire Celery background parsing and embedding task
    from app.workers.tasks import process_document_task
    process_document_task.delay(str(doc.id))

    logger.info("document_upload_registered", doc_id=str(doc.id), filename=filename)
    return doc


@router.post(
    "/url",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Fetch and ingest web page text from a URL",
)
async def ingest_url(
    payload: URLIngestPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    """
    Fetch HTML from a website, strip page elements, extract raw text, and index.
    """
    # 1. Fetch URL content using HTTPX
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(payload.url, follow_redirects=True)
            response.raise_for_status()
            html_content = response.text
    except Exception as e:
        logger.error("url_fetch_failed", url=payload.url, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch content from the URL: {str(e)}",
        )

    # 2. Clean HTML content
    cleaned_text = clean_html(html_content)
    if not cleaned_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scraped URL returned empty text content.",
        )

    doc_id = uuid.uuid4()
    # Create simple readable filename from URL
    domain = re.sub(r'https?://(www\.)?', '', payload.url).split('/')[0]
    filename = f"web_{domain}_{doc_id.hex[:6]}.txt"
    storage_path = STORAGE_DIR / filename

    # 3. Save text content to storage path
    try:
        with open(storage_path, "w", encoding="utf-8") as f:
            f.write(cleaned_text)
    except Exception as e:
        logger.error("failed_to_save_url_content", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save parsed URL content to disk.",
        )

    # 4. Save Document record in database
    doc = Document(
        id=doc_id,
        user_id=current_user.id,
        repo_id=payload.repo_id,
        filename=filename,
        file_type="txt",
        file_size=len(cleaned_text.encode("utf-8")),
        storage_path=str(storage_path),
        status="processing",
    )
    db.add(doc)
    await db.commit()

    # 5. Fire Celery background task
    from app.workers.tasks import process_document_task
    process_document_task.delay(str(doc.id))

    logger.info("url_ingestion_registered", doc_id=str(doc.id), url=payload.url)
    return doc


@router.get(
    "",
    response_model=list[DocumentResponse],
    summary="List all user's uploaded documents",
)
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Document]:
    """
    List all documents uploaded by the user.
    """
    query = select(Document).where(Document.user_id == current_user.id).order_by(Document.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.delete(
    "/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete a document and its parsed chunks",
)
async def delete_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Deletes the document from SQL database, deletes local file, and deletes chunks from Qdrant.
    """
    # 1. Fetch document and verify ownership
    query = select(Document).where(
        Document.id == doc_id,
        Document.user_id == current_user.id,
    )
    doc = await db.scalar(query)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    # 2. Delete from Qdrant Vector Store
    # We delete by searching points containing filename as file_path payload parameter in chunk collection
    from app.storage.vector_store import vector_store
    from qdrant_client.http import models as rest_models
    try:
        await vector_store.client.delete(
            collection_name=vector_store.collection_chunks,
            points_selector=rest_models.FilterSelector(
                filter=rest_models.Filter(
                    must=[
                        rest_models.FieldCondition(
                            key="user_id",
                            match=rest_models.MatchValue(value=str(current_user.id)),
                        ),
                        rest_models.FieldCondition(
                            key="file_path",
                            match=rest_models.MatchValue(value=doc.filename),
                        ),
                    ]
                )
            ),
        )
    except Exception as e:
        logger.warning("failed_to_delete_vector_chunks", doc_id=str(doc_id), error=str(e))

    # 3. Delete physical local file from disk
    try:
        if os.path.exists(doc.storage_path):
            os.remove(doc.storage_path)
    except Exception as e:
        logger.warning("failed_to_delete_physical_file", path=doc.storage_path, error=str(e))

    # 4. Remove SQL record
    await db.delete(doc)
    await db.commit()

    logger.info("document_deleted", doc_id=str(doc_id))
    return None
