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

EXPOSE 8000

CMD ["/app/start.sh"]
