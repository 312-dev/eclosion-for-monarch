"""
Base classes for schema migrations.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any


class MigrationDirection(Enum):
    """Direction of migration."""

    FORWARD = "forward"  # stable -> beta or version upgrade
    BACKWARD = "backward"  # beta -> stable or version downgrade


class Migration(ABC):
    """
    Base class for all schema migrations.

    Each migration handles conversion between two schema versions.
    Migrations must implement both forward and backward methods to
    enable safe transitions between stable and beta channels.
    """

    # Source and target versions (e.g., "1.0", "1.1")
    from_version: str
    to_version: str

    # Optional channel constraints (None = any channel)
    from_channel: str | None = None
    to_channel: str | None = None

    @abstractmethod
    def forward(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Migrate data forward to newer version.

        Args:
            data: Raw JSON data from state file

        Returns:
            Migrated data with updated schema
        """
        pass

    @abstractmethod
    def backward(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Migrate data backward to older version.

        Args:
            data: Raw JSON data from state file

        Returns:
            Migrated data with downgraded schema
        """
        pass

    @abstractmethod
    def can_migrate_backward(self, data: dict[str, Any]) -> tuple[bool, str]:
        """
        Check if backward migration is safe.

        Some beta features may have transformed data in ways that
        cannot be reversed without data loss. This method checks
        for such conditions.

        Args:
            data: Raw JSON data from state file

        Returns:
            Tuple of (can_migrate, reason_if_not)
        """
        pass

    @property
    def key(self) -> str:
        """Unique key for this migration."""
        return f"{self.from_version}->{self.to_version}"

    def __repr__(self) -> str:
        return f"<Migration {self.key}>"
