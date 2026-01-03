"""
Migration execution engine.
"""

import json
from datetime import datetime
from pathlib import Path

from core import config

from .backup import BackupManager
from .base import MigrationDirection
from .registry import MigrationRegistry


class MigrationError(Exception):
    """Error during migration execution."""
    pass


class MigrationExecutor:
    """
    Executes schema migrations on state files.

    Handles both forward (upgrade) and backward (downgrade) migrations,
    with automatic backup creation before any changes.
    """

    def __init__(
        self,
        state_file: Path | None = None,
        backup_manager: BackupManager | None = None,
    ):
        self.state_file = state_file or config.STATE_FILE
        self.backup_manager = backup_manager or BackupManager()

    def execute_migration(
        self,
        target_version: str,
        target_channel: str,
        create_backup: bool = True,
    ) -> tuple[bool, str, Path | None]:
        """
        Execute migration to target version and channel.

        Args:
            target_version: Target schema version
            target_channel: Target channel (stable, beta)
            create_backup: Whether to create backup before migration

        Returns:
            Tuple of (success, message, backup_path)
        """
        if not self.state_file.exists():
            return (False, "State file does not exist", None)

        # Load current state
        with open(self.state_file) as f:
            data = json.load(f)

        current_version = data.get("schema_version", "1.0")
        current_channel = data.get("schema_channel", "stable")

        # Check if migration is needed
        if current_version == target_version and current_channel == target_channel:
            return (True, "No migration needed", None)

        # Create backup
        backup_path = None
        if create_backup:
            backup_path = self.backup_manager.create_backup(
                self.state_file,
                reason="pre-migration"
            )

        try:
            # Determine direction and get migration path
            if self._compare_versions(current_version, target_version) < 0:
                # Forward migration (upgrade)
                direction = MigrationDirection.FORWARD
                migrations = MigrationRegistry.get_forward_path(
                    current_version, target_version
                )
            elif self._compare_versions(current_version, target_version) > 0:
                # Backward migration (downgrade)
                direction = MigrationDirection.BACKWARD
                migrations = MigrationRegistry.get_backward_path(
                    current_version, target_version
                )
            else:
                # Same version, just channel switch
                direction = MigrationDirection.FORWARD if target_channel == "beta" else MigrationDirection.BACKWARD
                migrations = []

            # Execute migrations in sequence
            for migration_class in migrations:
                migration = migration_class()

                if direction == MigrationDirection.FORWARD:
                    data = migration.forward(data)
                else:
                    # Check if backward migration is safe
                    can_migrate, reason = migration.can_migrate_backward(data)
                    if not can_migrate:
                        raise MigrationError(
                            f"Cannot migrate backward: {reason}"
                        )
                    data = migration.backward(data)

            # Update channel if different
            if target_channel != current_channel:
                data["schema_channel"] = target_channel

            # Update migration metadata
            metadata = data.get("_migration_metadata", {})
            metadata["last_migrated_at"] = datetime.now().isoformat()
            path = metadata.get("migration_path", [])
            path.append(target_version)
            metadata["migration_path"] = path
            metadata["source_channel"] = current_channel
            data["_migration_metadata"] = metadata

            # Save migrated state
            with open(self.state_file, "w") as f:
                json.dump(data, f, indent=2)

            return (
                True,
                f"Migrated from {current_channel}/{current_version} "
                f"to {target_channel}/{target_version}",
                backup_path
            )

        except Exception as e:
            # Migration failed - backup is available for restore
            return (
                False,
                f"Migration failed: {e!s}. Backup available at {backup_path}",
                backup_path
            )

    def check_migration_safety(
        self,
        target_version: str,
        target_channel: str,
    ) -> tuple[bool, list[str]]:
        """
        Check if migration to target is safe.

        Args:
            target_version: Target schema version
            target_channel: Target channel

        Returns:
            Tuple of (is_safe, list of warnings)
        """
        if not self.state_file.exists():
            return (True, [])

        with open(self.state_file) as f:
            data = json.load(f)

        current_version = data.get("schema_version", "1.0")
        warnings = []

        # Check backward migration safety
        if self._compare_versions(current_version, target_version) > 0:
            migrations = MigrationRegistry.get_backward_path(
                current_version, target_version
            )
            for migration_class in migrations:
                migration = migration_class()
                can_migrate, reason = migration.can_migrate_backward(data)
                if not can_migrate:
                    warnings.append(reason)

        # Check for beta data when switching to stable
        has_beta_data = data.get("_migration_metadata", {}).get("has_beta_data", False)
        if has_beta_data and target_channel == "stable":
            warnings.append(
                "Your data contains features from a beta version. "
                "These will be preserved but hidden until you switch back to beta."
            )

        return (len(warnings) == 0, warnings)

    def _compare_versions(self, v1: str, v2: str) -> int:
        """
        Compare two version strings.

        Returns:
            -1 if v1 < v2, 0 if equal, 1 if v1 > v2
        """
        try:
            parts1 = [int(p) for p in v1.split(".")]
            parts2 = [int(p) for p in v2.split(".")]

            # Pad shorter version with zeros
            while len(parts1) < len(parts2):
                parts1.append(0)
            while len(parts2) < len(parts1):
                parts2.append(0)

            for p1, p2 in zip(parts1, parts2, strict=False):
                if p1 < p2:
                    return -1
                if p1 > p2:
                    return 1
            return 0
        except (ValueError, AttributeError):
            return 0
