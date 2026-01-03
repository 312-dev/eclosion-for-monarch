"""
Backup management for state files.
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from core import config


class BackupManager:
    """
    Manages state file backups for safe migrations.

    Backups are created automatically before any migration and can be
    restored if something goes wrong.
    """

    def __init__(
        self,
        state_dir: Path | None = None,
        backup_dir: Path | None = None,
        max_backups: int = 10,
    ):
        self.state_dir = state_dir or config.STATE_DIR
        self.backup_dir = backup_dir or config.BACKUP_DIR
        self.max_backups = max_backups

    def create_backup(
        self,
        state_file: Path | None = None,
        reason: str = "manual",
    ) -> Path | None:
        """
        Create a timestamped backup of the state file.

        Args:
            state_file: Path to current state file (default: config.STATE_FILE)
            reason: "pre-migration", "channel-switch", "manual", etc.

        Returns:
            Path to backup file, or None if state file doesn't exist
        """
        state_file = state_file or config.STATE_FILE

        if not state_file.exists():
            return None

        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # Read current state to get metadata
        with open(state_file) as f:
            data = json.load(f)

        channel = data.get("schema_channel", "stable")
        schema_version = data.get("schema_version", "1.0")
        timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")

        backup_name = f"tracker_state.{timestamp}.{channel}.{schema_version}.{reason}.json"
        backup_path = self.backup_dir / backup_name

        shutil.copy2(state_file, backup_path)
        self._cleanup_old_backups()

        return backup_path

    def list_backups(self) -> list[dict[str, Any]]:
        """
        List available backups with metadata.

        Returns:
            List of dicts with path, timestamp, channel, schema_version, reason, size_bytes
        """
        if not self.backup_dir.exists():
            return []

        backups = []
        for backup_file in self.backup_dir.glob("tracker_state.*.json"):
            try:
                # Parse filename: tracker_state.{timestamp}.{channel}.{schema}.{reason}.json
                parts = backup_file.stem.split(".")
                if len(parts) >= 5:
                    _, timestamp, channel, schema, reason = (
                        parts[0],
                        parts[1],
                        parts[2],
                        parts[3],
                        parts[4],
                    )
                else:
                    # Legacy format or unknown
                    timestamp = parts[1] if len(parts) > 1 else "unknown"
                    channel = "unknown"
                    schema = "unknown"
                    reason = "unknown"

                backups.append(
                    {
                        "path": str(backup_file),
                        "filename": backup_file.name,
                        "timestamp": timestamp,
                        "channel": channel,
                        "schema_version": schema,
                        "reason": reason,
                        "size_bytes": backup_file.stat().st_size,
                        "created_at": datetime.fromtimestamp(
                            backup_file.stat().st_mtime
                        ).isoformat(),
                    }
                )
            except (ValueError, IndexError):
                # Skip malformed backup files
                continue

        # Sort by creation time, newest first
        backups.sort(key=lambda x: x["created_at"], reverse=True)
        return backups

    def restore_backup(
        self,
        backup_path: Path,
        state_file: Path | None = None,
        create_backup_first: bool = True,
    ) -> bool:
        """
        Restore state from a backup file.

        Args:
            backup_path: Path to backup file to restore
            state_file: Target state file (default: config.STATE_FILE)
            create_backup_first: Create backup of current state before restoring

        Returns:
            True if restore was successful
        """
        state_file = state_file or config.STATE_FILE
        backup_path = Path(backup_path)

        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        # Create backup of current state before restoring
        if create_backup_first and state_file.exists():
            self.create_backup(state_file, reason="pre-restore")

        shutil.copy2(backup_path, state_file)
        return True

    def get_latest_backup(self, channel: str | None = None) -> Path | None:
        """
        Get most recent backup, optionally filtered by channel.

        Args:
            channel: Filter by channel ("stable", "beta", etc.)

        Returns:
            Path to most recent backup or None
        """
        backups = self.list_backups()

        if channel:
            backups = [b for b in backups if b["channel"] == channel]

        if backups:
            return Path(backups[0]["path"])
        return None

    def get_backup_metadata(self, backup_path: Path) -> dict[str, Any] | None:
        """
        Read metadata from a backup file.

        Args:
            backup_path: Path to backup file

        Returns:
            Dict with schema_version, schema_channel, and other state metadata
        """
        backup_path = Path(backup_path)
        if not backup_path.exists():
            return None

        try:
            with open(backup_path) as f:
                data = json.load(f)
            return {
                "schema_version": data.get("schema_version", "1.0"),
                "schema_channel": data.get("schema_channel", "stable"),
                "version": data.get("version", "1.0.0"),
                "has_beta_data": data.get("_migration_metadata", {}).get("has_beta_data", False),
            }
        except (json.JSONDecodeError, KeyError):
            return None

    def _cleanup_old_backups(self) -> None:
        """Remove old backups exceeding max_backups limit."""
        backups = self.list_backups()

        if len(backups) > self.max_backups:
            # Remove oldest backups
            import contextlib

            for backup in backups[self.max_backups :]:
                with contextlib.suppress(OSError):
                    Path(backup["path"]).unlink()
