"""
DevAssist AI — Git Repository Cloner

Safely clones public git repositories to local storage for parsing.
"""

import asyncio
import shutil
from pathlib import Path

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def clone_repository(repo_url: str, repo_id: str) -> Path:
    """
    Clone a public git repository to the local storage path.
    Returns the path to the cloned repository.

    Raises:
        ValueError: if clone fails or URL is invalid.
    """
    storage_dir = Path(settings.repo_storage_path)
    target_dir = storage_dir / repo_id

    # Clean up existing directory if it exists (e.g. from failed run)
    if target_dir.exists():
        try:
            shutil.rmtree(target_dir)
        except Exception as e:
            logger.warning("cleanup_failed_before_clone", path=str(target_dir), error=str(e))

    target_dir.mkdir(parents=True, exist_ok=True)

    # Use git CLI to clone
    # Limit depth to 1 to save bandwidth, speed up cloning, and save tokens/indexing time
    cmd = [
        "git",
        "clone",
        "--depth",
        "1",
        "--single-branch",
        repo_url,
        str(target_dir),
    ]

    logger.info("starting_repo_clone", url=repo_url, target=str(target_dir))

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode("utf-8", errors="replace").strip()
        logger.error("repo_clone_failed", url=repo_url, error=error_msg)
        # Clean up directory on failure
        if target_dir.exists():
            shutil.rmtree(target_dir)
        raise ValueError(f"Failed to clone repository: {error_msg}")

    # Remove the .git folder to save space and prevent git command confusion
    git_dir = target_dir / ".git"
    if git_dir.exists():
        try:
            shutil.rmtree(git_dir)
        except Exception as e:
            logger.warning("failed_to_remove_git_metadata", path=str(git_dir), error=str(e))

    logger.info("repo_clone_success", url=repo_url, target=str(target_dir))
    return target_dir
