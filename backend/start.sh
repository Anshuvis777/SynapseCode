#!/usr/bin/env bash
set -e

# 1. Run database migrations
echo "Running database migrations..."
alembic upgrade head

# 2. Start Celery worker in the background (using solo pool for low memory consumption)
echo "Starting Celery worker..."
celery -A app.workers.celery_app worker --loglevel=info --pool=solo &

# 3. Start FastAPI API server in the foreground
echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
