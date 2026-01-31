# Admin blueprint
# /health, /version/*, /migration/* endpoints for system administration

import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Blueprint, jsonify, request

from core import api_handler, config

from . import get_services

logger = logging.getLogger(__name__)

admin_bp = Blueprint("admin", __name__)


# ---- HEALTH ENDPOINTS ----


@admin_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


@admin_bp.route("/health/monarch", methods=["GET"])
@api_handler(handle_mfa=False)
async def health_monarch():
    """
    Check if Monarch API is accessible.

    Used by frontend to detect when rate limit clears.
    Returns 200 if Monarch is accessible, 429 if still rate limited.
    """
    from core.exceptions import RateLimitError

    services = get_services()
    try:
        is_valid = await services.sync_service.validate_auth()
        return {"healthy": is_valid}
    except RateLimitError as e:
        return jsonify(
            {
                "healthy": False,
                "rate_limited": True,
                "retry_after": e.retry_after,
            }
        ), 429


# ---- VERSION & CHANGELOG ENDPOINTS ----


def _get_app_version() -> str:
    """Get app version from environment variable or frontend package.json.

    Priority:
    1. APP_VERSION env var (set by desktop app or Docker)
    2. frontend/package.json (local development)
    3. Fallback to '0.0.0'
    """
    # Prefer env var (set by desktop app or Docker)
    if env_version := os.environ.get("APP_VERSION"):
        return env_version

    # Fallback to package.json for local development
    pkg_path = Path(__file__).parent.parent / "frontend" / "package.json"
    if pkg_path.exists():
        with open(pkg_path) as f:
            return str(json.load(f).get("version", "0.0.0"))
    return "0.0.0"


def _parse_changelog() -> list[dict]:
    """Parse CHANGELOG.md into structured data."""
    changelog_path = Path(__file__).parent.parent / "CHANGELOG.md"
    if not changelog_path.exists():
        return []

    content = changelog_path.read_text()
    versions: list[dict] = []

    # Parse changelog format: ## [X.Y.Z] - YYYY-MM-DD
    version_pattern = r"^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$"
    section_pattern = r"^### (Added|Changed|Deprecated|Removed|Fixed|Security)$"
    summary_pattern = r"^> (.+)$"

    current_version: dict[str, Any] | None = None
    current_section: str | None = None
    expecting_summary = False

    for line in content.split("\n"):
        version_match = re.match(version_pattern, line)
        if version_match:
            if current_version:
                versions.append(current_version)
            current_version = {
                "version": version_match.group(1),
                "date": version_match.group(2),
                "summary": None,
                "sections": {},
            }
            current_section = None
            expecting_summary = True
            continue

        # Capture blockquote summary after version header
        if expecting_summary and current_version:
            summary_match = re.match(summary_pattern, line)
            if summary_match:
                if current_version["summary"]:
                    current_version["summary"] += " " + summary_match.group(1)
                else:
                    current_version["summary"] = summary_match.group(1)
                continue
            elif line.strip() == "":
                continue  # Skip blank lines while looking for summary
            else:
                expecting_summary = False  # Stop looking if we hit other content

        section_match = re.match(section_pattern, line)
        if section_match and current_version:
            current_section = section_match.group(1).lower()
            current_version["sections"][current_section] = []
            expecting_summary = False
            continue

        if line.startswith("- ") and current_version and current_section:
            current_version["sections"][current_section].append(line[2:])

    if current_version:
        versions.append(current_version)

    return versions


def _get_update_type(client: tuple, server: tuple) -> str:
    """Determine update type: major, minor, or patch."""
    if server[0] > client[0]:
        return "major"
    if server[1] > client[1]:
        return "minor"
    return "patch"


def _parse_semver(v: str) -> tuple:
    """Parse a semver string into a tuple of ints.

    Handles prerelease versions by stripping the prerelease suffix.
    E.g., "1.0.0-beta.1" -> (1, 0, 0)
    """
    # Strip prerelease suffix (e.g., "1.0.0-beta.1" -> "1.0.0")
    base_version = v.split("-")[0] if "-" in v else v
    parts = base_version.split(".")
    # Ensure we have at least 3 parts, defaulting to 0
    result = []
    for i in range(3):
        try:
            result.append(int(parts[i]) if i < len(parts) else 0)
        except (ValueError, IndexError):
            result.append(0)
    return tuple(result)


@admin_bp.route("/version", methods=["GET"])
def get_version():
    """Get current app version, channel, and build info."""
    version = _get_app_version()
    channel = config.RELEASE_CHANNEL
    is_beta = "-beta" in version or "-rc" in version or "-alpha" in version or channel == "beta"

    # Determine deployment type for frontend UI decisions
    if config.is_desktop_environment():
        deployment_type = "desktop"
    elif config.is_container_environment():
        deployment_type = "docker"
    else:
        deployment_type = "local"

    return jsonify(
        {
            "version": version,
            "channel": channel,
            "is_beta": is_beta,
            "schema_version": config.SCHEMA_VERSION,
            "build_time": config.BUILD_TIME,
            "git_sha": config.GIT_SHA,
            "deployment_type": deployment_type,
        }
    )


@admin_bp.route("/version/changelog", methods=["GET"])
def get_changelog():
    """Get parsed changelog entries."""
    limit = request.args.get("limit", type=int, default=5)
    changelog = _parse_changelog()
    return jsonify(
        {
            "current_version": _get_app_version(),
            "entries": changelog[:limit] if limit else changelog,
            "total_entries": len(changelog),
        }
    )


@admin_bp.route("/version/check", methods=["POST"])
def check_version():
    """
    Check if client version is outdated.

    Body: { "client_version": "1.0.0" }
    """
    data = request.get_json() or {}
    client_version = data.get("client_version", "0.0.0")
    server_version = _get_app_version()

    client_parts = _parse_semver(client_version)
    server_parts = _parse_semver(server_version)

    update_available = server_parts > client_parts

    return jsonify(
        {
            "client_version": client_version,
            "server_version": server_version,
            "update_available": update_available,
            "update_type": _get_update_type(client_parts, server_parts)
            if update_available
            else None,
        }
    )


@admin_bp.route("/version/changelog/status", methods=["GET"])
def get_changelog_status():
    """
    Check if there are unread changelog entries.

    Returns whether the current version has been read and the latest version available.
    """
    services = get_services()
    current_version = _get_app_version()
    last_read = services.sync_service.state_manager.get_last_read_changelog_version()

    # If never read, there are unread entries (unless this is a fresh install with no changelog)
    has_unread = last_read is None or _parse_semver(current_version) > _parse_semver(last_read)

    return jsonify(
        {
            "current_version": current_version,
            "last_read_version": last_read,
            "has_unread": has_unread,
        }
    )


@admin_bp.route("/version/changelog/read", methods=["POST"])
def mark_changelog_read():
    """
    Mark the changelog as read up to the current version.

    This is called when the user views the changelog.
    """
    services = get_services()
    current_version = _get_app_version()
    services.sync_service.state_manager.set_last_read_changelog_version(current_version)

    return jsonify(
        {
            "success": True,
            "marked_version": current_version,
        }
    )


# ---- RELEASES & UPDATES ----


@admin_bp.route("/version/releases", methods=["GET"])
def get_available_releases():
    """
    Fetch available releases from GitHub to show update options.

    Returns list of recent stable and beta releases.
    """
    import urllib.error
    import urllib.request

    current_version = _get_app_version()
    releases_url = f"https://api.github.com/repos/{config.GITHUB_REPO}/releases"

    try:
        req = urllib.request.Request(
            releases_url,
            headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "Eclosion"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            releases_data = json.loads(response.read().decode())

        stable_releases = []
        beta_releases = []

        for release in releases_data[:20]:  # Check last 20 releases
            tag = release.get("tag_name", "")
            # Remove 'v' prefix if present
            version = tag.lstrip("v")

            release_info = {
                "version": version,
                "tag": tag,
                "name": release.get("name", version),
                "published_at": release.get("published_at"),
                "is_prerelease": release.get("prerelease", False),
                "html_url": release.get("html_url"),
                "is_current": version == current_version or tag == current_version,
            }

            if (
                release.get("prerelease")
                or "-beta" in version
                or "-rc" in version
                or "-alpha" in version
            ):
                beta_releases.append(release_info)
            else:
                stable_releases.append(release_info)

        return jsonify(
            {
                "current_version": current_version,
                "current_channel": config.RELEASE_CHANNEL,
                "stable_releases": stable_releases[:5],
                "beta_releases": beta_releases[:5],
            }
        )

    except (urllib.error.URLError, json.JSONDecodeError) as e:
        logger.warning(f"Failed to fetch releases: {e}")
        return jsonify(
            {
                "current_version": current_version,
                "current_channel": config.RELEASE_CHANNEL,
                "stable_releases": [],
                "beta_releases": [],
                "error": "Could not fetch releases from GitHub",
            }
        )


@admin_bp.route("/version/update-info", methods=["GET"])
def get_update_info():
    """
    Get deployment-specific update instructions.

    Detects deployment type (Desktop/Docker/Local) and provides
    appropriate instructions for updating.
    """
    is_desktop = config.is_desktop_environment()
    is_container = config.is_container_environment()

    # Desktop apps use electron-updater, check first
    if is_desktop:
        deployment_type = "electron"
    elif is_container:
        deployment_type = "docker"
    else:
        deployment_type = "local"

    instructions = {
        "electron": {
            "steps": [
                "Updates are downloaded automatically in the background",
                "When ready, click 'Restart Now' to install the update",
                "The app will restart with the new version",
            ],
        },
        "docker": {
            "steps": [
                "Edit your docker-compose.yml file",
                "Change the image tag to the desired version "
                "(e.g., ghcr.io/graysoncadams/eclosion:1.2.3)",
                "Run: docker compose pull && docker compose up -d",
            ],
            "example_compose": f"image: ghcr.io/{config.GITHUB_REPO}:VERSION",
        },
        "local": {
            "steps": [
                "Pull the latest changes from the repository",
                "Rebuild and restart the application",
            ],
        },
    }

    return jsonify(
        {
            "deployment_type": deployment_type,
            "current_version": _get_app_version(),
            "current_channel": config.RELEASE_CHANNEL,
            "instructions": instructions.get(deployment_type, instructions["docker"]),
        }
    )


# ---- DATABASE BACKUP ----


def _get_database_path() -> Path:
    """Get the SQLite database path."""
    from state.db.database import DATABASE_PATH

    return DATABASE_PATH


def _list_db_backups() -> list[dict]:
    """List available database backups."""
    backup_dir = config.BACKUP_DIR
    if not backup_dir.exists():
        return []

    backups = []
    for f in sorted(backup_dir.glob("eclosion_*.db"), reverse=True):
        backups.append(
            {
                "filename": f.name,
                "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                "size_bytes": f.stat().st_size,
            }
        )

    return backups[: config.MAX_BACKUPS]


def _create_db_backup(reason: str = "manual") -> Path | None:
    """Create a backup of the database."""
    import shutil

    db_path = _get_database_path()
    if not db_path.exists():
        return None

    config.BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    # Sanitize reason to prevent path injection - only allow alphanumeric, underscore, hyphen
    safe_reason = re.sub(r"[^a-zA-Z0-9_-]", "", reason)[:20] or "backup"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Filename is constructed from safe components only (timestamp + sanitized reason)
    backup_filename = f"eclosion_{timestamp}_{safe_reason}.db"

    # Construct path - filename is sanitized to only contain safe characters
    backup_dir = config.BACKUP_DIR.resolve()
    backup_path = backup_dir / backup_filename

    # nosec B108 - filename is sanitized via regex to only contain alphanumeric, underscore, hyphen
    shutil.copy2(db_path, backup_path)  # lgtm[py/path-injection]

    # Clean up old backups
    backups = sorted(config.BACKUP_DIR.glob("eclosion_*.db"), reverse=True)
    for old_backup in backups[config.MAX_BACKUPS :]:
        old_backup.unlink()

    return backup_path


@admin_bp.route("/backup/status", methods=["GET"])
def get_backup_status():
    """
    Get database backup status.

    Returns information about the database and available backups.
    """
    db_path = _get_database_path()
    backups = _list_db_backups()

    return jsonify(
        {
            "database_exists": db_path.exists(),
            "database_size_bytes": db_path.stat().st_size if db_path.exists() else 0,
            "schema_version": config.SCHEMA_VERSION,
            "has_backups": len(backups) > 0,
            "latest_backup": backups[0] if backups else None,
            "backup_count": len(backups),
        }
    )


@admin_bp.route("/backup/list", methods=["GET"])
def list_backups():
    """List available database backups."""
    backups = _list_db_backups()

    return jsonify(
        {
            "backups": backups,
            "max_backups": config.MAX_BACKUPS,
        }
    )


@admin_bp.route("/backup/create", methods=["POST"])
@api_handler(handle_mfa=False)
def create_backup():
    """
    Create a manual backup of the database.

    Body: {
        "reason": "manual"  # Optional, default: "manual"
    }
    """
    data = request.get_json() or {}
    reason = data.get("reason", "manual")

    # Sanitize reason to prevent path injection
    reason = re.sub(r"[^a-zA-Z0-9_-]", "", reason)[:20]

    backup_path = _create_db_backup(reason=reason)

    if backup_path:
        return jsonify(
            {
                "success": True,
                "backup_filename": backup_path.name,
            }
        )
    else:
        return jsonify(
            {
                "success": False,
                "error": "No database to backup",
            }
        ), 400


@admin_bp.route("/backup/restore", methods=["POST"])
@api_handler(handle_mfa=False)
def restore_backup():
    """
    Restore database from a backup.

    Body: {
        "backup_filename": "eclosion_20260113_120000_manual.db",
        "create_backup_first": true  # Optional, default: true
    }
    """
    import shutil

    data = request.get_json() or {}
    backup_filename = data.get("backup_filename")

    if not backup_filename:
        return jsonify(
            {
                "success": False,
                "error": "backup_filename is required",
            }
        ), 400

    # Validate filename matches exact expected format: eclosion_YYYYMMDD_HHMMSS_reason.db
    # This whitelist approach prevents any path traversal by only allowing known-safe patterns
    backup_pattern = re.compile(r"^eclosion_\d{8}_\d{6}_[a-zA-Z0-9_-]{1,20}\.db$")
    filename_str = str(backup_filename)
    if not backup_pattern.match(filename_str):
        return jsonify(
            {
                "success": False,
                "error": "Invalid backup filename format.",
            }
        ), 400

    # Defense-in-depth: Construct and verify path stays within backup directory
    # Even though regex validation prevents traversal, we also verify via resolve()
    backup_dir = config.BACKUP_DIR.resolve()
    backup_path = (backup_dir / filename_str).resolve()

    # Verify the resolved path is within the backup directory (defense-in-depth)
    try:
        backup_path.relative_to(backup_dir)
    except ValueError:
        return jsonify(
            {
                "success": False,
                "error": "Invalid backup path",
            }
        ), 400

    if not backup_path.exists():
        return jsonify(
            {
                "success": False,
                "error": "Backup file not found",
            }
        ), 404

    try:
        # Create backup of current state first
        if data.get("create_backup_first", True):
            _create_db_backup(reason="pre_restore")

        # Close database connections before restore
        from state.db import database as db_module

        if db_module._engine:
            db_module._engine.dispose()
            db_module._engine = None
            db_module._SessionLocal = None

        # Restore the backup - path verified via relative_to() above
        db_path = _get_database_path()
        shutil.copy2(backup_path, db_path)

        return jsonify(
            {
                "success": True,
                "message": "Backup restored successfully. Please restart the application.",
            }
        )
    except Exception as e:
        logger.error(f"Restore failed: {type(e).__name__}")
        return jsonify(
            {
                "success": False,
                "error": "Restore failed. Please try again.",
            }
        ), 500
