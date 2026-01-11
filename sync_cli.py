#!/usr/bin/env python3
"""
Eclosion Background Sync CLI

Standalone CLI for running sync operations from OS-level schedulers
(launchd, Task Scheduler, systemd). Reads passphrase from OS keychain,
unlocks credentials, runs sync, and exits.

Exit codes:
  0 - Sync completed successfully
  1 - No passphrase stored in keychain
  2 - Failed to unlock credentials (wrong passphrase or corrupted)
  3 - Sync failed
  4 - Another sync is already in progress (lock file exists)
  5 - Sync disabled due to previous failures
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

# Add project root to path for imports
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from core.keychain import get_passphrase, SERVICE_NAME
from services.credentials_service import CredentialsService
from services.sync_service import SyncService
from state.state_manager import StateManager

# Configure logging to file
LOG_DIR = Path(os.environ.get("STATE_DIR", Path.home() / ".config" / "eclosion")) / "logs"
LOG_FILE = LOG_DIR / "background-sync.log"

# Maximum consecutive failures before disabling
MAX_CONSECUTIVE_FAILURES = 3
FAILURE_STATE_FILE = "background_sync_failures.json"


def setup_logging() -> None:
    """Configure logging for background sync."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    # Rotate log if too large (>1MB)
    if LOG_FILE.exists() and LOG_FILE.stat().st_size > 1024 * 1024:
        rotated = LOG_FILE.with_suffix(".log.1")
        if rotated.exists():
            rotated.unlink()
        LOG_FILE.rename(rotated)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def get_lock_file_path() -> Path:
    """Get the path to the sync lock file."""
    state_dir = Path(os.environ.get("STATE_DIR", Path.home() / ".config" / "eclosion"))
    return state_dir / "sync.lock"


def is_sync_locked() -> bool:
    """Check if another sync is in progress."""
    lock_file = get_lock_file_path()
    if not lock_file.exists():
        return False

    # Check if lock is stale (older than 10 minutes)
    try:
        lock_age = datetime.now().timestamp() - lock_file.stat().st_mtime
        if lock_age > 10 * 60:  # 10 minutes
            logging.info("Removing stale lock file")
            lock_file.unlink()
            return False
        return True
    except OSError:
        return False


def acquire_lock() -> bool:
    """Acquire the sync lock."""
    if is_sync_locked():
        return False

    lock_file = get_lock_file_path()
    try:
        lock_file.parent.mkdir(parents=True, exist_ok=True)
        lock_file.write_text(
            json.dumps(
                {
                    "pid": os.getpid(),
                    "timestamp": datetime.now().isoformat(),
                    "source": "background-sync-cli",
                }
            )
        )
        return True
    except OSError as e:
        logging.error("Failed to acquire lock: %s", e)
        return False


def release_lock() -> None:
    """Release the sync lock."""
    lock_file = get_lock_file_path()
    try:
        if lock_file.exists():
            lock_file.unlink()
    except OSError as e:
        logging.error("Failed to release lock: %s", e)


def get_failure_state_path() -> Path:
    """Get the path to the failure state file."""
    state_dir = Path(os.environ.get("STATE_DIR", Path.home() / ".config" / "eclosion"))
    return state_dir / FAILURE_STATE_FILE


def get_failure_count() -> int:
    """Get the current consecutive failure count."""
    state_file = get_failure_state_path()
    if not state_file.exists():
        return 0
    try:
        data = json.loads(state_file.read_text())
        return data.get("consecutive_failures", 0)
    except (json.JSONDecodeError, OSError):
        return 0


def record_failure(error: str) -> None:
    """Record a sync failure."""
    state_file = get_failure_state_path()
    try:
        current = get_failure_count()
        state_file.write_text(
            json.dumps(
                {
                    "consecutive_failures": current + 1,
                    "last_failure": datetime.now().isoformat(),
                    "last_error": error,
                }
            )
        )
    except OSError as e:
        logging.error("Failed to record failure: %s", e)


def clear_failures() -> None:
    """Clear the failure count on success."""
    state_file = get_failure_state_path()
    try:
        if state_file.exists():
            state_file.unlink()
    except OSError as e:
        logging.error("Failed to clear failure state: %s", e)


def is_disabled_due_to_failures() -> bool:
    """Check if background sync is disabled due to too many failures."""
    return get_failure_count() >= MAX_CONSECUTIVE_FAILURES


async def run_sync() -> int:
    """
    Run the background sync.

    Returns:
        Exit code (0 for success, non-zero for failure)
    """
    logger = logging.getLogger(__name__)

    # Check if disabled due to failures
    if is_disabled_due_to_failures():
        logger.error(
            "Background sync disabled due to %d consecutive failures. "
            "Please re-enable in settings.",
            MAX_CONSECUTIVE_FAILURES,
        )
        return 5

    # Check lock
    if is_sync_locked():
        logger.info("Another sync is in progress, skipping")
        return 4

    # Get passphrase from keychain
    logger.info("Retrieving passphrase from OS keychain (service=%s)", SERVICE_NAME)
    passphrase = get_passphrase()
    if not passphrase:
        logger.error("No passphrase found in OS keychain")
        return 1

    # Acquire lock
    if not acquire_lock():
        logger.error("Failed to acquire sync lock")
        return 4

    try:
        # Unlock credentials
        logger.info("Unlocking credentials")
        creds_service = CredentialsService()
        unlock_result = creds_service.unlock(passphrase)

        if not unlock_result.get("success"):
            error = unlock_result.get("error", "Unknown error")
            logger.error("Failed to unlock credentials: %s", error)
            record_failure(f"Unlock failed: {error}")
            return 2

        # Run sync
        logger.info("Starting sync")
        sync_service = SyncService()
        result = await sync_service.full_sync()

        if result.get("success"):
            logger.info("Sync completed successfully")
            clear_failures()
            return 0
        else:
            error = result.get("error", "Unknown error")
            logger.error("Sync failed: %s", error)
            record_failure(f"Sync failed: {error}")
            return 3

    except Exception as e:
        logger.exception("Unexpected error during sync: %s", e)
        record_failure(f"Exception: {e}")
        return 3

    finally:
        release_lock()


def main() -> int:
    """Main entry point."""
    setup_logging()

    logger = logging.getLogger(__name__)
    logger.info("=" * 60)
    logger.info("Eclosion Background Sync CLI starting")
    logger.info("=" * 60)

    try:
        exit_code = asyncio.run(run_sync())
    except KeyboardInterrupt:
        logger.info("Sync interrupted by user")
        release_lock()
        exit_code = 130
    except Exception as e:
        logger.exception("Fatal error: %s", e)
        release_lock()
        exit_code = 1

    logger.info("Exiting with code %d", exit_code)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
