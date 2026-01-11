"""
SQLAlchemy models for Eclosion.
"""

from .base import Base
from .credentials import AutomationCredentials, Credentials
from .notes import ArchivedNote, GeneralNote, KnownCategory, Note
from .security import GeolocationCache, SecurityEvent, SecurityPreference
from .tracker import (
    AutoSyncState,
    Category,
    EnabledItem,
    RemovedItemNotice,
    Rollup,
    RollupItem,
    TrackerConfig,
)

__all__ = [
    "Base",
    # Credentials
    "Credentials",
    "AutomationCredentials",
    # Tracker
    "TrackerConfig",
    "Category",
    "EnabledItem",
    "Rollup",
    "RollupItem",
    "RemovedItemNotice",
    "AutoSyncState",
    # Notes
    "Note",
    "GeneralNote",
    "ArchivedNote",
    "KnownCategory",
    # Security
    "SecurityEvent",
    "GeolocationCache",
    "SecurityPreference",
]
