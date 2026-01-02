"""
Migration system for Eclosion state files.

Provides forward and backward migrations between schema versions,
enabling safe transitions between stable and beta channels.
"""

from .base import Migration, MigrationDirection
from .registry import MigrationRegistry
from .executor import MigrationExecutor
from .backup import BackupManager
from .compatibility import (
    CompatibilityLevel,
    CompatibilityResult,
    check_compatibility,
)

__all__ = [
    "Migration",
    "MigrationDirection",
    "MigrationRegistry",
    "MigrationExecutor",
    "BackupManager",
    "CompatibilityLevel",
    "CompatibilityResult",
    "check_compatibility",
]
