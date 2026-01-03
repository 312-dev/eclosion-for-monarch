"""
Migration system for Eclosion state files.

Provides forward and backward migrations between schema versions,
enabling safe transitions between stable and beta channels.
"""

from .backup import BackupManager
from .base import Migration, MigrationDirection
from .compatibility import (
    CompatibilityLevel,
    CompatibilityResult,
    check_compatibility,
)
from .executor import MigrationExecutor
from .registry import MigrationRegistry

__all__ = [
    "BackupManager",
    "CompatibilityLevel",
    "CompatibilityResult",
    "Migration",
    "MigrationDirection",
    "MigrationExecutor",
    "MigrationRegistry",
    "check_compatibility",
]
