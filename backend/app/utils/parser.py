"""
DevAssist AI — Code Parser and Chunker

Scans directories recursively, filters out binary/ignored files,
detects programming languages, and chunks source files into semantic windows
suitable for embeddings and vector storage.
"""

from pathlib import Path
from typing import Any

from app.utils.logger import get_logger

logger = get_logger(__name__)

# List of directory names to skip during recursive scan
IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "env",
    "dist",
    "build",
    "target",
    "out",
    ".idea",
    ".vscode",
    ".next",
    "bin",
    "obj",
}

# List of extensions to index
SUPPORTED_EXTENSIONS = {
    # Python
    ".py": "python",
    # JavaScript / TypeScript
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    # Go
    ".go": "go",
    # Rust
    ".rs": "rust",
    # C / C++ / C#
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    # Java / Kotlin
    ".java": "java",
    ".kt": "kotlin",
    # Ruby
    ".rb": "ruby",
    # PHP
    ".php": "php",
    # Web structure
    ".html": "html",
    ".css": "css",
    # Configuration / Docs
    ".md": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".sql": "sql",
}


def should_ignore(path: Path, root_dir: Path) -> bool:
    """Check if the given path should be excluded from indexing."""
    # Check if any parent directory is in the ignored list
    try:
        relative = path.relative_to(root_dir)
        for part in relative.parts:
            if part in IGNORED_DIRS:
                return True
    except ValueError:
        return True

    # Ignore hidden files/dirs (starting with .) except configuration files
    if path.name.startswith(".") and path.name not in [".env", ".gitignore", ".babelrc"]:
        return True

    return False


def get_language(path: Path) -> str:
    """Return the normalized language identifier based on file extension."""
    ext = path.suffix.lower()
    return SUPPORTED_EXTENSIONS.get(ext, "text")


def chunk_file_content(
    file_path_rel: str,
    content: str,
    language: str,
    chunk_size_lines: int = 50,
    overlap_lines: int = 10,
) -> list[dict[str, Any]]:
    """
    Split file content into smaller semantic code chunks.
    Uses sliding window based on line counts to preserve logical code blocks
    rather than splitting middle of sentences/syntax nodes.
    """
    lines = content.splitlines()
    total_lines = len(lines)
    chunks = []

    if total_lines == 0:
        return []

    # If the file is smaller than target chunk size, return it as a single chunk
    if total_lines <= chunk_size_lines:
        chunks.append(
            {
                "file_path": file_path_rel,
                "content": content,
                "start_line": 1,
                "end_line": total_lines,
                "language": language,
                "is_ast": False,
            }
        )
        return chunks

    start = 0
    while start < total_lines:
        end = min(start + chunk_size_lines, total_lines)
        chunk_lines = lines[start:end]
        chunk_content = "\n".join(chunk_lines)

        chunks.append(
            {
                "file_path": file_path_rel,
                "content": chunk_content,
                "start_line": start + 1,
                "end_line": end,
                "language": language,
                "is_ast": False,
            }
        )

        # Slide the window forward
        start += chunk_size_lines - overlap_lines
        if start >= total_lines or end == total_lines:
            break

    return chunks


def parse_repository(root_dir: Path) -> list[dict[str, Any]]:
    """
    Scan the repository directory, identify indexable source files,
    read them, and split them into chunks.
    """
    all_chunks = []
    file_count = 0

    for path in root_dir.rglob("*"):
        if not path.is_file():
            continue

        if should_ignore(path, root_dir):
            continue

        ext = path.suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue

        language = get_language(path)
        relative_path = str(path.relative_to(root_dir))

        try:
            # Safely read text content
            with open(path, encoding="utf-8", errors="replace") as f:
                content = f.read()

            file_count += 1
            file_chunks = chunk_file_content(relative_path, content, language)
            all_chunks.extend(file_chunks)

        except Exception as e:
            logger.warning("failed_to_parse_file", file=relative_path, error=str(e))

    logger.info(
        "repository_parsing_complete", files_parsed=file_count, chunks_created=len(all_chunks)
    )
    return all_chunks
