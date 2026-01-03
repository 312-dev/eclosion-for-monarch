"""
Logging Configuration

Provides Docker-aware logging setup that works in both local
development and containerized environments.
"""

import logging
import os
from pathlib import Path


def configure_logging(
    log_level: int = logging.DEBUG,
    log_format: str = "%(asctime)s - %(levelname)s - %(message)s",
) -> logging.Logger:
    """
    Configure logging with Docker-aware paths.

    Uses LOG_DIR environment variable if set (for Docker),
    otherwise falls back to project directory.

    Args:
        log_level: Logging level (default: DEBUG)
        log_format: Log message format

    Returns:
        Configured logger instance
    """
    # Docker-friendly: use environment variable or default to project root
    log_dir = os.environ.get("LOG_DIR")

    if log_dir:
        log_file = Path(log_dir) / "api.log"
    else:
        # Default to project directory (where this module is)
        project_root = Path(__file__).parent.parent
        log_file = project_root / "api.log"

    # Ensure directory exists
    log_file.parent.mkdir(parents=True, exist_ok=True)

    # Configure logging
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[logging.FileHandler(str(log_file)), logging.StreamHandler()],
    )

    return logging.getLogger(__name__)


def get_logger(name: str | None = None) -> logging.Logger:
    """
    Get a logger instance.

    Args:
        name: Logger name (default: calling module name)

    Returns:
        Logger instance
    """
    return logging.getLogger(name or __name__)
