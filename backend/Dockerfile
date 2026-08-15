FROM python:3.12-slim

WORKDIR /app

# System dependencies for tree-sitter and git
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e ".[dev]"

# Create storage directories
RUN mkdir -p /app/storage/repos /app/storage/documents

# Pre-download FastEmbed model weights to bake them into the image
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5', cache_dir='/app/storage/cache')"

EXPOSE 8000

CMD ["/app/start.sh"]
