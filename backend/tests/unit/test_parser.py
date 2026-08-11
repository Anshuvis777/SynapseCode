"""
Unit tests for git repository cloner and code parser/chunker.
"""

from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from app.utils.clone import clone_repository
from app.utils.parser import chunk_file_content, parse_repository, should_ignore

# ── Cloner Tests ────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.utils.clone.asyncio.create_subprocess_exec")
async def test_clone_repository_success(mock_exec, tmp_path):
    mock_process = AsyncMock()
    mock_process.returncode = 0
    mock_process.communicate.return_value = (b"Cloning into...", b"")
    mock_exec.return_value = mock_process

    with patch("app.utils.clone.shutil.rmtree"), patch("app.utils.clone.settings") as mock_settings:
        mock_settings.repo_storage_path = str(tmp_path)
        repo_path = await clone_repository("https://github.com/user/repo", "repo-123")
        assert "repo-123" in str(repo_path)


# ── Chunker / Parser Tests ──────────────────────────────────────


def test_should_ignore_rules():
    root = Path("/workspace")
    assert should_ignore(Path("/workspace/.git/config"), root) is True
    assert should_ignore(Path("/workspace/node_modules/express/index.js"), root) is True
    assert should_ignore(Path("/workspace/app/main.py"), root) is False


def test_chunk_file_content_small():
    content = "line1\nline2\nline3"
    chunks = chunk_file_content("test.py", content, "python", chunk_size_lines=10)
    assert len(chunks) == 1
    assert chunks[0]["content"] == content
    assert chunks[0]["start_line"] == 1
    assert chunks[0]["end_line"] == 3


def test_chunk_file_content_sliding():
    lines = [f"line{i}" for i in range(1, 21)]
    content = "\n".join(lines)

    # 20 lines total, window size 10, overlap 2
    # Chunk 1: lines 1 to 10 (start_line=1, end_line=10)
    # Slide: 10 - 2 = 8 steps. Next start is 8.
    # Chunk 2: lines 9 to 18 (start_line=9, end_line=18)
    # Slide: 18 - 2 = 16 steps. Next start is 16.
    # Chunk 3: lines 17 to 20 (start_line=17, end_line=20)
    chunks = chunk_file_content("test.py", content, "python", chunk_size_lines=10, overlap_lines=2)

    assert len(chunks) == 3
    assert chunks[0]["start_line"] == 1
    assert chunks[0]["end_line"] == 10
    assert chunks[1]["start_line"] == 9
    assert chunks[1]["end_line"] == 18
    assert chunks[2]["start_line"] == 17
    assert chunks[2]["end_line"] == 20


def test_parse_repository_ignores_binary_and_directories(tmp_path):
    # Create mock repo file structure
    (tmp_path / ".git").mkdir()
    (tmp_path / "node_modules").mkdir()

    # Files to index
    py_file = tmp_path / "app.py"
    py_file.write_text("print('hello')\nprint('world')", encoding="utf-8")

    # Files to ignore
    img_file = tmp_path / "logo.png"
    img_file.write_bytes(b"\x89PNG\r\n\x1a\n")

    ignored_file = tmp_path / ".git" / "config"
    ignored_file.write_text("some git config", encoding="utf-8")

    chunks = parse_repository(tmp_path)

    assert len(chunks) == 1
    assert chunks[0]["file_path"] == "app.py"
    assert chunks[0]["language"] == "python"
