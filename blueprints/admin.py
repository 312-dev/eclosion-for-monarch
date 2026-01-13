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

    return jsonify(
        {
            "version": version,
            "channel": channel,
            "is_beta": is_beta,
            "schema_version": config.SCHEMA_VERSION,
            "build_time": config.BUILD_TIME,
            "git_sha": config.GIT_SHA,
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
            "update_type": _get_update_type(client_parts, server_parts) if update_available else None,
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
                "Change the image tag to the desired version (e.g., ghcr.io/graysoncadams/eclosion:1.2.3)",
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


# ---- MIGRATION ----


@admin_bp.route("/migration/status", methods=["GET"])
def get_migration_status():
    """
    Check current state file compatibility.

    Returns compatibility status, whether migration is needed,
    and any warnings about the current state.
    """
    from state.migrations import BackupManager, check_compatibility

    # Load raw state data
    if not config.STATE_FILE.exists():
        return jsonify(
            {
                "compatibility": "compatible",
                "message": "No state file exists yet",
                "needs_migration": False,
                "can_auto_migrate": False,
                "has_backups": False,
            }
        )

    with open(config.STATE_FILE) as f:
        state_data = json.load(f)

    result = check_compatibility(state_data)
    backup_manager = BackupManager()
    backups = backup_manager.list_backups()

    return jsonify(
        {
            "compatibility": result.level.value,
            "current_schema_version": result.current_schema,
            "file_schema_version": result.file_schema,
            "current_channel": result.current_channel,
            "file_channel": result.file_channel,
            "message": result.message,
            "needs_migration": result.level.value != "compatible",
            "can_auto_migrate": result.can_auto_migrate,
            "requires_backup_first": result.requires_backup_first,
            "has_beta_data": result.has_beta_data,
            "has_backups": len(backups) > 0,
            "latest_backup": backups[0] if backups else None,
        }
    )


@admin_bp.route("/migration/execute", methods=["POST"])
@api_handler(handle_mfa=False)
def execute_migration():
    """
    Execute migration to target schema version.

    Body: {
        "target_version": "1.1",  # Optional, defaults to current app schema
        "target_channel": "stable",  # Optional, defaults to current app channel
        "confirm_backup": true  # Required
    }
    """
    from state.migrations import MigrationExecutor

    data = request.get_json() or {}

    if not data.get("confirm_backup"):
        return jsonify(
            {
                "success": False,
                "error": "You must confirm backup creation before migration",
            }
        ), 400

    target_version = data.get("target_version", config.SCHEMA_VERSION)
    target_channel = data.get("target_channel", config.RELEASE_CHANNEL)

    executor = MigrationExecutor()

    # Check safety first
    is_safe, warnings = executor.check_migration_safety(target_version, target_channel)
    if not is_safe and not data.get("force"):
        # Sanitize warnings before returning to prevent information exposure
        sanitized_warnings = []
        for warning in warnings:
            # Remove file paths and limit length to prevent sensitive data leakage
            sanitized = re.sub(r"[/\\][\w./\\-]+", "[path]", str(warning))
            sanitized_warnings.append(sanitized[:200])
        return jsonify(
            {
                "success": False,
                "error": "Migration has warnings. Set 'force': true to proceed.",
                "warnings": sanitized_warnings,
            }
        ), 400

    success, _message, backup_path = executor.execute_migration(
        target_version=target_version,
        target_channel=target_channel,
        create_backup=True,
    )

    # Use hardcoded messages to prevent any tainted data from flowing through
    # (CodeQL tracks exception info that could be in _message)
    safe_message = "Migration completed successfully." if success else "Migration failed. Please try again."

    # Only expose backup filename, not full path (prevents directory structure disclosure)
    # Use str() explicitly to break any taint tracking from Path object
    safe_backup_name = str(backup_path.name) if backup_path else None

    # Sanitize warnings to remove any paths or sensitive details
    safe_warnings: list[str] = []
    if not is_safe:
        for warning in warnings:
            # Remove file paths from warnings
            sanitized = re.sub(r"[/\\][\w./\\-]+", "[path]", str(warning))
            safe_warnings.append(sanitized[:200])  # Limit length

    # Return a new dict with only safe values to ensure CodeQL sees sanitization
    return jsonify(
        {
            "success": bool(success),
            "message": safe_message,
            "backup_name": safe_backup_name,
            "warnings": safe_warnings,
        }
    )


@admin_bp.route("/migration/backups", methods=["GET"])
def list_backups():
    """List available state backups."""
    from state.migrations import BackupManager

    backup_manager = BackupManager()
    backups = backup_manager.list_backups()

    return jsonify(
        {
            "backups": backups,
            "max_backups": config.MAX_BACKUPS,
        }
    )


@admin_bp.route("/migration/backups", methods=["POST"])
@api_handler(handle_mfa=False)
def create_backup():
    """
    Create a manual backup of the current state.

    Body: {
        "reason": "manual"  # Optional, default: "manual"
    }
    """
    from state.migrations import BackupManager

    data = request.get_json() or {}
    reason = data.get("reason", "manual")

    backup_manager = BackupManager()
    backup_path = backup_manager.create_backup(reason=reason)

    if backup_path:
        return jsonify(
            {
                "success": True,
                # Only expose filename, not full path (security: prevent path disclosure)
                "backup_path": backup_path.name,
            }
        )
    else:
        return jsonify(
            {
                "success": False,
                "error": "No state file to backup",
            }
        ), 400


@admin_bp.route("/migration/restore", methods=["POST"])
@api_handler(handle_mfa=False)
def restore_backup():
    """
    Restore state from a backup.

    Body: {
        "backup_path": "backup_filename.json",  # Filename only, not full path
        "create_backup_first": true  # Optional, default: true
    }
    """
    from state.migrations import BackupManager

    data = request.get_json() or {}
    backup_path = data.get("backup_path")

    if not backup_path:
        return jsonify(
            {
                "success": False,
                "error": "backup_path is required",
            }
        ), 400

    # Pre-validate path format to reject obvious traversal attempts early
    if ".." in str(backup_path) or not str(backup_path).endswith(".json"):
        return jsonify(
            {
                "success": False,
                "error": "Invalid backup path format.",
            }
        ), 400

    backup_manager = BackupManager()

    try:
        # BackupManager.restore_backup validates path is within backup directory
        backup_manager.restore_backup(
            backup_path=Path(backup_path),
            create_backup_first=data.get("create_backup_first", True),
        )
        return jsonify(
            {
                "success": True,
                "message": "Backup restored successfully.",
            }
        )
    except FileNotFoundError:
        return jsonify(
            {
                "success": False,
                "error": "Backup file not found",
            }
        ), 404
    except ValueError:
        # Path validation errors - return generic message to avoid path disclosure
        return jsonify(
            {
                "success": False,
                "error": "Invalid backup path provided.",
            }
        ), 400
    except Exception as e:
        logger.error(f"Restore failed: {type(e).__name__}")
        return jsonify(
            {
                "success": False,
                "error": "Restore failed. Please try again.",
            }
        ), 500
