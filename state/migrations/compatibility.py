"""
Version compatibility checking for state files.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any

from core import config


class CompatibilityLevel(Enum):
    """Compatibility level between app and state file."""
    COMPATIBLE = "compatible"           # Can load directly
    NEEDS_MIGRATION = "needs_migration" # Requires migration first
    INCOMPATIBLE = "incompatible"       # Cannot load (future version)
    CHANNEL_MISMATCH = "channel_mismatch"  # Different channel


@dataclass
class CompatibilityResult:
    """Result of compatibility check."""
    level: CompatibilityLevel
    current_schema: str
    current_channel: str
    file_schema: str
    file_channel: str
    message: str
    can_auto_migrate: bool
    requires_backup_first: bool
    has_beta_data: bool


def parse_version(version: str) -> tuple:
    """Parse version string into comparable tuple."""
    try:
        parts = version.split(".")
        return tuple(int(p) for p in parts)
    except (ValueError, AttributeError):
        return (0, 0)


def check_compatibility(
    state_data: dict[str, Any],
    app_schema_version: str | None = None,
    app_channel: str | None = None,
) -> CompatibilityResult:
    """
    Check if current app can load the state file.

    Called before loading state to determine if migration is needed.

    Args:
        state_data: Raw JSON data from state file
        app_schema_version: Current app's schema version (default: config.SCHEMA_VERSION)
        app_channel: Current app's channel (default: config.RELEASE_CHANNEL)

    Returns:
        CompatibilityResult with details about compatibility
    """
    app_schema_version = app_schema_version or config.SCHEMA_VERSION
    app_channel = app_channel or config.RELEASE_CHANNEL

    file_schema = state_data.get("schema_version", "1.0")
    file_channel = state_data.get("schema_channel", "stable")
    has_beta_data = state_data.get("_migration_metadata", {}).get("has_beta_data", False)

    # Parse versions for comparison
    app_version_tuple = parse_version(app_schema_version)
    file_version_tuple = parse_version(file_schema)

    # Case 1: Exact match
    if app_schema_version == file_schema and app_channel == file_channel:
        return CompatibilityResult(
            level=CompatibilityLevel.COMPATIBLE,
            current_schema=app_schema_version,
            current_channel=app_channel,
            file_schema=file_schema,
            file_channel=file_channel,
            message="State file is compatible",
            can_auto_migrate=False,
            requires_backup_first=False,
            has_beta_data=has_beta_data,
        )

    # Case 2: Same channel, older file version (upgrade)
    if app_channel == file_channel and app_version_tuple > file_version_tuple:
        return CompatibilityResult(
            level=CompatibilityLevel.NEEDS_MIGRATION,
            current_schema=app_schema_version,
            current_channel=app_channel,
            file_schema=file_schema,
            file_channel=file_channel,
            message=f"State needs migration from {file_schema} to {app_schema_version}",
            can_auto_migrate=True,
            requires_backup_first=True,
            has_beta_data=has_beta_data,
        )

    # Case 3: Same channel, newer file version (downgrade warning)
    if app_channel == file_channel and app_version_tuple < file_version_tuple:
        return CompatibilityResult(
            level=CompatibilityLevel.INCOMPATIBLE,
            current_schema=app_schema_version,
            current_channel=app_channel,
            file_schema=file_schema,
            file_channel=file_channel,
            message=f"State file is from a newer version ({file_schema}). "
                    f"Please update the app or restore from backup.",
            can_auto_migrate=False,
            requires_backup_first=False,
            has_beta_data=has_beta_data,
        )

    # Case 4: Channel mismatch - beta state with stable app
    if file_channel == "beta" and app_channel == "stable":
        return CompatibilityResult(
            level=CompatibilityLevel.CHANNEL_MISMATCH,
            current_schema=app_schema_version,
            current_channel=app_channel,
            file_schema=file_schema,
            file_channel=file_channel,
            message="State file is from beta channel. "
                    "Migration to stable channel is available.",
            can_auto_migrate=False,  # Requires explicit user action
            requires_backup_first=True,
            has_beta_data=True,
        )

    # Case 5: Channel mismatch - stable state with beta app
    if file_channel == "stable" and app_channel == "beta":
        return CompatibilityResult(
            level=CompatibilityLevel.CHANNEL_MISMATCH,
            current_schema=app_schema_version,
            current_channel=app_channel,
            file_schema=file_schema,
            file_channel=file_channel,
            message="State file is from stable channel. "
                    "Migration to beta channel is available.",
            can_auto_migrate=True,
            requires_backup_first=True,
            has_beta_data=has_beta_data,
        )

    # Case 6: Same version, different channel
    if app_schema_version == file_schema and app_channel != file_channel:
        return CompatibilityResult(
            level=CompatibilityLevel.CHANNEL_MISMATCH,
            current_schema=app_schema_version,
            current_channel=app_channel,
            file_schema=file_schema,
            file_channel=file_channel,
            message=f"State file is from {file_channel} channel, "
                    f"current app is {app_channel}.",
            can_auto_migrate=True,
            requires_backup_first=True,
            has_beta_data=has_beta_data or file_channel == "beta",
        )

    # Case 7: Mixed version and channel mismatch
    return CompatibilityResult(
        level=CompatibilityLevel.NEEDS_MIGRATION,
        current_schema=app_schema_version,
        current_channel=app_channel,
        file_schema=file_schema,
        file_channel=file_channel,
        message=f"State needs migration from {file_channel}/{file_schema} "
                f"to {app_channel}/{app_schema_version}",
        can_auto_migrate=False,
        requires_backup_first=True,
        has_beta_data=has_beta_data or file_channel == "beta",
    )
