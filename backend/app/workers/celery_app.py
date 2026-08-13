"""
DevAssist AI — Celery Application Config

Initializes background task worker.
Uses Redis broker and result backend.
"""

import ssl

from celery import Celery

from app.config import settings

# If using rediss:// (SSL), configure Celery to bypass certificate verification
broker_use_ssl = None
redis_backend_use_ssl = None

if settings.celery_broker_url.startswith("rediss://"):
    broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}
if settings.celery_result_backend.startswith("rediss://"):
    redis_backend_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}

celery_app = Celery(
    "devassist_workers",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# Configure Celery settings
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Clean up orphan tasks
    result_expires=86400,  # 24 hours
    broker_use_ssl=broker_use_ssl,
    redis_backend_use_ssl=redis_backend_use_ssl,
    # Auto-discover tasks from the app.workers package
    imports=[
        "app.workers.tasks",
    ],
)
