"""
Centralized configuration module for Eclosion.

All hardcoded configuration values should be defined here to ensure
consistency across the application and easy modification.
"""

import os
import sys
from datetime import timedelta
from pathlib import Path


def _get_version() -> str:
    """
    Get the application version.

    Priority:
    1. APP_VERSION env var (from Electron or Docker)
    2. Bundled version.txt (baked in during PyInstaller build)
    3. Fallback to "dev"
    """
    env_version = os.environ.get("APP_VERSION")
    if env_version:
        return env_version

    try:
        if getattr(sys, "frozen", False):
            # Running as PyInstaller bundle
            bundle_dir = os.path.dirname(sys.executable)
            version_file = os.path.join(bundle_dir, "_internal", "version.txt")
        else:
            # Running as script - version.txt is in project root
            version_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "version.txt")

        if os.path.exists(version_file):
            with open(version_file) as f:
                return f.read().strip()
    except Exception:
        pass

    return "dev"


# Determine if running in Docker container
_IN_CONTAINER = os.path.exists("/.dockerenv") or os.environ.get("DOCKER_CONTAINER") == "1"

# Determine if running as desktop app (Electron-bundled)
# Desktop mode is explicitly signaled by the Electron main process via ECLOSION_DESKTOP=1
# Falls back to STATE_DIR heuristic for backward compatibility
_IS_DESKTOP = os.environ.get("ECLOSION_DESKTOP") == "1" or (
    bool(os.environ.get("STATE_DIR")) and not _IN_CONTAINER
)


# ============================================================================
# SERVER CONFIGURATION
# ============================================================================

# Server port (default: 5001)
SERVER_PORT = int(os.environ.get("PORT", 5001))

# Enable Flask debug mode (disables HTTPS redirect)
DEBUG_MODE = os.environ.get("FLASK_DEBUG", "0") == "1"


# ============================================================================
# SESSION CONFIGURATION
# ============================================================================

# Session timeout in minutes (locks after inactivity)
SESSION_TIMEOUT_MINUTES = int(os.environ.get("SESSION_TIMEOUT_MINUTES", 30))

# Session cookie lifetime
SESSION_LIFETIME_DAYS = int(os.environ.get("SESSION_LIFETIME_DAYS", 7))
SESSION_COOKIE_LIFETIME = timedelta(days=SESSION_LIFETIME_DAYS)


# ============================================================================
# STATE & DATA PATHS
# ============================================================================

# Base directory for persistent state
# Priority:
# 1. STATE_DIR env var (desktop mode - user's app data folder)
# 2. Container: /app/state (mounted volume)
# 3. Local dev: ./state (relative to project root)
_state_dir_env = os.environ.get("STATE_DIR")
if _state_dir_env:
    STATE_DIR = Path(_state_dir_env)
elif _IN_CONTAINER:
    STATE_DIR = Path("/app/state")
else:
    STATE_DIR = Path(__file__).parent.parent / "state"

# Ensure state directory exists
STATE_DIR.mkdir(parents=True, exist_ok=True)

# Individual state file paths
# Note: Main state is now stored in SQLite (eclosion.db)
AUTOMATION_CREDENTIALS_FILE = STATE_DIR / "automation_credentials.json"
SESSION_SECRET_FILE = STATE_DIR / ".session_secret"
SECURITY_DB_FILE = STATE_DIR / "security_events.db"
MONARCH_SESSION_FILE = STATE_DIR / "mm_session.pickle"

# Dev mode session file - persists credentials across Flask restarts in dev mode
# Only used when FLASK_DEBUG=1 AND running in desktop mode
DEV_SESSION_FILE = STATE_DIR / ".dev_session.json"

# Security event retention (days)
SECURITY_EVENT_RETENTION_DAYS = 90


# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================

# Instance secret for access control (optional)
INSTANCE_SECRET = os.environ.get("INSTANCE_SECRET")

# Cookie name for instance access
INSTANCE_SECRET_COOKIE = "eclosion_access"

# Desktop secret for API authentication in Electron mode
# This is a runtime secret passed by the Electron main process
# to prevent other local processes from accessing the API
DESKTOP_SECRET = os.environ.get("DESKTOP_SECRET")


# ============================================================================
# API CONFIGURATION (for frontend/vite)
# ============================================================================

# API base URL for frontend development
API_BASE_URL = os.environ.get("API_BASE_URL", f"http://127.0.0.1:{SERVER_PORT}")


# ============================================================================
# VERSIONING & RELEASE CHANNEL
# ============================================================================

# Current schema version (tracks data structure, not app version)
# Increment MAJOR for breaking changes, MINOR for additive changes
SCHEMA_VERSION = "1.0"

# App version from Electron, Docker, or bundled version.txt
APP_VERSION = _get_version()

# Release channel: stable, beta, or dev
RELEASE_CHANNEL = os.environ.get("RELEASE_CHANNEL", "dev")

# Build metadata
BUILD_TIME = os.environ.get("BUILD_TIME", "unknown")
GIT_SHA = os.environ.get("GIT_SHA", "unknown")

# GitHub repository for fetching releases
GITHUB_REPO = "graysoncadams/eclosion"


# ============================================================================
# BACKUP CONFIGURATION
# ============================================================================

# Directory for state backups
BACKUP_DIR = STATE_DIR / "backups"

# Maximum number of backups to retain
MAX_BACKUPS = 10


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def get_state_file_path(filename: str) -> Path:
    """Get the full path for a state file."""
    return STATE_DIR / filename


def is_container_environment() -> bool:
    """Check if running inside a Docker container."""
    return _IN_CONTAINER


def is_desktop_environment() -> bool:
    """Check if running as a desktop application (Electron-bundled)."""
    return _IS_DESKTOP


def requires_instance_secret() -> bool:
    """
    Check if instance secret should be required.

    Instance secret is NOT required for:
    - Desktop mode (localhost only, inherently trusted)
    - Development mode when not explicitly set

    Instance secret IS required for:
    - Container/server deployments when INSTANCE_SECRET is set
    """
    if _IS_DESKTOP:
        return False
    return bool(INSTANCE_SECRET)
