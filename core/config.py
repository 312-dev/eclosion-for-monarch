"""
Centralized configuration module for Eclosion.

All hardcoded configuration values should be defined here to ensure
consistency across the application and easy modification.
"""
import os
from datetime import timedelta
from pathlib import Path

# Determine if running in Docker container
_IN_CONTAINER = os.path.exists("/.dockerenv") or os.environ.get("DOCKER_CONTAINER") == "1"


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
# RATE LIMITING
# ============================================================================

# Daily request limit per IP
RATE_LIMIT_DAILY = int(os.environ.get("RATE_LIMIT_DAILY", 1000))

# Hourly request limit per IP
RATE_LIMIT_HOURLY = int(os.environ.get("RATE_LIMIT_HOURLY", 200))

# Default rate limits as list for Flask-Limiter
DEFAULT_RATE_LIMITS = [f"{RATE_LIMIT_DAILY} per day", f"{RATE_LIMIT_HOURLY} per hour"]


# ============================================================================
# STATE & DATA PATHS
# ============================================================================

# Base directory for persistent state
# In container: /app/state (mounted volume)
# Local: ./state (relative to project root)
if _IN_CONTAINER:
    STATE_DIR = Path("/app/state")
else:
    STATE_DIR = Path(__file__).parent.parent / "state"

# Ensure state directory exists
STATE_DIR.mkdir(parents=True, exist_ok=True)

# Individual state file paths
STATE_FILE = STATE_DIR / "tracker_state.json"
CREDENTIALS_FILE = STATE_DIR / "credentials.json"
AUTOMATION_CREDENTIALS_FILE = STATE_DIR / "automation_credentials.json"
SESSION_SECRET_FILE = STATE_DIR / ".session_secret"

# Legacy paths for backward compatibility (check these first during migration)
LEGACY_STATE_FILE = Path(__file__).parent.parent / "state" / "tracker_state.json"
LEGACY_CREDENTIALS_FILE = Path(__file__).parent.parent / "state" / "credentials.json"


# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================

# Instance secret for access control (optional)
INSTANCE_SECRET = os.environ.get("INSTANCE_SECRET")

# Cookie name for instance access
INSTANCE_SECRET_COOKIE = "eclosion_access"


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

# App version from Docker build args or fallback
APP_VERSION = os.environ.get("APP_VERSION", "dev")

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
