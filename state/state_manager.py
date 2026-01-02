"""
State Manager for Recurring Savings Tracker

Persists tracker state to JSON file including:
- Configuration (target group)
- Category mappings (recurring_id -> monarch_category_id)
- Over-contribution tracking
- Previous due dates for cycle detection
"""

import json
from pathlib import Path
from datetime import datetime, date
from dataclasses import dataclass, field, asdict
from typing import Dict, Optional, List, Any
import os
import uuid
import tempfile
import shutil

from core import config


def _atomic_write_json(file_path: Path, data: dict, indent: int = 2) -> None:
    """
    Atomically write JSON data to a file.

    Uses a temp file + rename pattern to prevent corruption if the process
    crashes during write. This ensures the file is either fully written or
    not modified at all.

    Args:
        file_path: Target file path
        data: JSON-serializable data to write
        indent: JSON indentation level
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)

    # Create temp file in same directory (ensures same filesystem for atomic rename)
    fd, temp_path = tempfile.mkstemp(
        dir=file_path.parent,
        prefix='.tmp_',
        suffix='.json'
    )
    try:
        with os.fdopen(fd, 'w') as f:
            json.dump(data, f, indent=indent)
        # Atomic rename (on POSIX systems)
        shutil.move(temp_path, file_path)
    except Exception:
        # Clean up temp file on error
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise


@dataclass
class RemovedItemNotice:
    """Notice for a recurring item that was removed from Monarch."""
    id: str                    # UUID for dismissal
    recurring_id: str          # Original recurring item ID
    name: str                  # Display name (e.g., "Netflix")
    category_name: str         # Linked category name
    was_rollup: bool           # Was it in rollup category
    removed_at: str            # ISO timestamp
    dismissed: bool = False    # User dismissed this notice


@dataclass
class CategoryState:
    """State for a single tracked category."""
    monarch_category_id: str
    name: str
    target_amount: float
    over_contribution: float = 0.0
    previous_due_date: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    last_synced_at: Optional[str] = None
    emoji: str = "🔄"  # Default emoji for category name prefix
    # Frozen monthly target (doesn't change mid-month)
    frozen_monthly_target: Optional[float] = None
    target_month: Optional[str] = None  # e.g., "2025-01"
    balance_at_month_start: Optional[float] = None
    # Track inputs used for calculation - recalculate if these change
    frozen_amount: Optional[float] = None  # subscription amount when calculated
    frozen_frequency_months: Optional[float] = None  # frequency when calculated
    # Whether to sync name/emoji from transaction to category (True) or keep category as-is (False)
    sync_name: bool = True
    # Whether this category was linked to an existing category (vs. created new)
    is_linked: bool = False


@dataclass
class RollupState:
    """State for the rollup category feature."""
    enabled: bool = False
    monarch_category_id: Optional[str] = None
    category_name: str = "Recurring Rollup"
    item_ids: set = field(default_factory=set)  # IDs of items in rollup
    total_budgeted: float = 0.0  # User-editable budgeted amount
    created_at: Optional[str] = None
    last_updated_at: Optional[str] = None
    emoji: str = "🔄"  # Default emoji for category name prefix
    # Whether this rollup was linked to an existing category (vs. created new)
    is_linked: bool = False


@dataclass
class AutoSyncState:
    """State for automatic background sync."""
    enabled: bool = False
    interval_minutes: int = 360  # 6 hours default
    last_auto_sync: Optional[str] = None
    last_auto_sync_success: Optional[bool] = None
    last_auto_sync_error: Optional[str] = None
    consent_acknowledged: bool = False  # User explicitly acknowledged security disclosure
    consent_timestamp: Optional[str] = None


@dataclass
class MigrationMetadata:
    """Tracks migration history for debugging and rollback."""
    last_migrated_at: Optional[str] = None
    migration_path: List[str] = field(default_factory=list)
    source_channel: Optional[str] = None  # Channel before last migration
    has_beta_data: bool = False  # Flag if state contains beta-only fields


@dataclass
class TrackerState:
    """Full tracker state."""
    # Schema versioning (separate from app version)
    schema_version: str = "1.0"  # Data structure version
    schema_channel: str = "stable"  # Channel this data was created in
    _migration_metadata: MigrationMetadata = field(default_factory=MigrationMetadata)
    _unknown_fields: Dict[str, Any] = field(default_factory=dict)  # Preserve unknown fields from newer versions

    # Legacy app version (kept for backward compatibility)
    version: str = "1.0.0"

    # Configuration
    target_group_id: Optional[str] = None
    target_group_name: Optional[str] = None
    last_sync: Optional[str] = None
    auto_sync_new: bool = False  # Auto-enable tracking for new recurring items
    auto_track_threshold: Optional[float] = None  # Max monthly amount to auto-track (null = any)
    auto_update_targets: bool = False  # Auto-update category targets when recurring amount changes
    enabled_items: set = field(default_factory=set)  # IDs of items enabled for tracking
    categories: Dict[str, CategoryState] = field(default_factory=dict)
    rollup: RollupState = field(default_factory=RollupState)
    removed_item_notices: List[RemovedItemNotice] = field(default_factory=list)  # Notices for removed items
    last_read_changelog_version: Optional[str] = None  # Last changelog version user has read
    auto_sync: AutoSyncState = field(default_factory=AutoSyncState)  # Background sync settings
    user_first_name: Optional[str] = None  # User's first name from Monarch profile

    def is_configured(self) -> bool:
        """Check if the tracker has been configured with a target group."""
        return self.target_group_id is not None

    def is_item_enabled(self, recurring_id: str) -> bool:
        """Check if a recurring item is enabled for tracking."""
        return recurring_id in self.enabled_items


class StateManager:
    """Manages persistence of tracker state to JSON file."""

    def __init__(self, state_file: Optional[Path] = None):
        if state_file is None:
            state_file = config.STATE_FILE
        self.state_file = state_file

    def load(self) -> TrackerState:
        """Load state from JSON file, or return default state."""
        if not self.state_file.exists():
            return TrackerState()

        try:
            with open(self.state_file, "r") as f:
                data = json.load(f)
            return self._deserialize(data)
        except (json.JSONDecodeError, KeyError) as e:
            # Corrupted file - back up and return default
            print(f"Warning: State file corrupted ({e}), creating backup")
            backup = self.state_file.with_suffix(".json.bak")
            if self.state_file.exists():
                self.state_file.rename(backup)
            return TrackerState()

    def save(self, state: TrackerState) -> None:
        """Persist state to JSON file atomically."""
        _atomic_write_json(self.state_file, self._serialize(state))

    def _serialize(self, state: TrackerState) -> dict:
        """Convert TrackerState to JSON-serializable dict."""
        data = {
            # Schema versioning
            "schema_version": state.schema_version,
            "schema_channel": state.schema_channel,
            "_migration_metadata": self._serialize_migration_metadata(state._migration_metadata),
            # Legacy version
            "version": state.version,
            # Configuration
            "target_group_id": state.target_group_id,
            "target_group_name": state.target_group_name,
            "last_sync": state.last_sync,
            "auto_sync_new": state.auto_sync_new,
            "auto_track_threshold": state.auto_track_threshold,
            "auto_update_targets": state.auto_update_targets,
            "enabled_items": list(state.enabled_items),
            "categories": {
                k: self._serialize_category(v)
                for k, v in state.categories.items()
            },
            "rollup": self._serialize_rollup(state.rollup),
            "removed_item_notices": [
                self._serialize_notice(n) for n in state.removed_item_notices
            ],
            "last_read_changelog_version": state.last_read_changelog_version,
            "auto_sync": self._serialize_auto_sync(state.auto_sync),
            "user_first_name": state.user_first_name,
        }
        # Merge unknown fields back into output (preserves beta data when running stable)
        if state._unknown_fields:
            data.update(state._unknown_fields)
        return data

    def _serialize_migration_metadata(self, metadata: MigrationMetadata) -> dict:
        """Convert MigrationMetadata to dict."""
        return {
            "last_migrated_at": metadata.last_migrated_at,
            "migration_path": metadata.migration_path,
            "source_channel": metadata.source_channel,
            "has_beta_data": metadata.has_beta_data,
        }

    def _serialize_notice(self, notice: RemovedItemNotice) -> dict:
        """Convert RemovedItemNotice to dict."""
        return {
            "id": notice.id,
            "recurring_id": notice.recurring_id,
            "name": notice.name,
            "category_name": notice.category_name,
            "was_rollup": notice.was_rollup,
            "removed_at": notice.removed_at,
            "dismissed": notice.dismissed,
        }

    def _serialize_rollup(self, rollup: RollupState) -> dict:
        """Convert RollupState to dict."""
        return {
            "enabled": rollup.enabled,
            "monarch_category_id": rollup.monarch_category_id,
            "category_name": rollup.category_name,
            "item_ids": list(rollup.item_ids),
            "total_budgeted": rollup.total_budgeted,
            "created_at": rollup.created_at,
            "last_updated_at": rollup.last_updated_at,
            "emoji": rollup.emoji,
        }

    def _serialize_auto_sync(self, auto_sync: AutoSyncState) -> dict:
        """Convert AutoSyncState to dict."""
        return {
            "enabled": auto_sync.enabled,
            "interval_minutes": auto_sync.interval_minutes,
            "last_auto_sync": auto_sync.last_auto_sync,
            "last_auto_sync_success": auto_sync.last_auto_sync_success,
            "last_auto_sync_error": auto_sync.last_auto_sync_error,
            "consent_acknowledged": auto_sync.consent_acknowledged,
            "consent_timestamp": auto_sync.consent_timestamp,
        }

    def _serialize_category(self, cat: CategoryState) -> dict:
        """Convert CategoryState to dict."""
        return {
            "monarch_category_id": cat.monarch_category_id,
            "name": cat.name,
            "target_amount": cat.target_amount,
            "over_contribution": cat.over_contribution,
            "previous_due_date": cat.previous_due_date,
            "is_active": cat.is_active,
            "created_at": cat.created_at,
            "last_synced_at": cat.last_synced_at,
            "emoji": cat.emoji,
            "frozen_monthly_target": cat.frozen_monthly_target,
            "target_month": cat.target_month,
            "balance_at_month_start": cat.balance_at_month_start,
            "frozen_amount": cat.frozen_amount,
            "frozen_frequency_months": cat.frozen_frequency_months,
            "sync_name": cat.sync_name,
            "is_linked": cat.is_linked,
        }

    def _deserialize(self, data: dict) -> TrackerState:
        """Convert JSON dict back to TrackerState."""
        # Define all known field names at this schema version
        KNOWN_FIELDS = {
            "schema_version", "schema_channel", "_migration_metadata",
            "version", "target_group_id", "target_group_name", "last_sync",
            "auto_sync_new", "auto_track_threshold", "auto_update_targets",
            "enabled_items", "categories", "rollup",
            "removed_item_notices", "last_read_changelog_version",
            "auto_sync", "user_first_name"
        }

        # Capture unknown fields (preserves beta data when running stable)
        unknown_fields = {
            k: v for k, v in data.items()
            if k not in KNOWN_FIELDS
        }

        # Deserialize migration metadata
        migration_data = data.get("_migration_metadata", {})
        migration_metadata = MigrationMetadata(
            last_migrated_at=migration_data.get("last_migrated_at"),
            migration_path=migration_data.get("migration_path", []),
            source_channel=migration_data.get("source_channel"),
            has_beta_data=migration_data.get("has_beta_data", False),
        )

        state = TrackerState(
            # Schema versioning
            schema_version=data.get("schema_version", "1.0"),
            schema_channel=data.get("schema_channel", "stable"),
            _migration_metadata=migration_metadata,
            _unknown_fields=unknown_fields,
            # Legacy version
            version=data.get("version", "1.0.0"),
            # Configuration
            target_group_id=data.get("target_group_id"),
            target_group_name=data.get("target_group_name"),
            last_sync=data.get("last_sync"),
            auto_sync_new=data.get("auto_sync_new", False),
            auto_track_threshold=data.get("auto_track_threshold"),
            auto_update_targets=data.get("auto_update_targets", False),
            enabled_items=set(data.get("enabled_items", [])),
            last_read_changelog_version=data.get("last_read_changelog_version"),
            user_first_name=data.get("user_first_name"),
        )

        for k, v in data.get("categories", {}).items():
            state.categories[k] = CategoryState(
                monarch_category_id=v["monarch_category_id"],
                name=v["name"],
                target_amount=v["target_amount"],
                over_contribution=v.get("over_contribution", 0.0),
                previous_due_date=v.get("previous_due_date"),
                is_active=v.get("is_active", True),
                created_at=v.get("created_at"),
                last_synced_at=v.get("last_synced_at"),
                emoji=v.get("emoji", "🔄"),
                frozen_monthly_target=v.get("frozen_monthly_target"),
                target_month=v.get("target_month"),
                balance_at_month_start=v.get("balance_at_month_start"),
                frozen_amount=v.get("frozen_amount"),
                frozen_frequency_months=v.get("frozen_frequency_months"),
                sync_name=v.get("sync_name", True),
                is_linked=v.get("is_linked", False),
            )

        # Deserialize rollup state
        rollup_data = data.get("rollup", {})
        if rollup_data:
            state.rollup = RollupState(
                enabled=rollup_data.get("enabled", False),
                monarch_category_id=rollup_data.get("monarch_category_id"),
                category_name=rollup_data.get("category_name", "Recurring Rollup"),
                item_ids=set(rollup_data.get("item_ids", [])),
                total_budgeted=rollup_data.get("total_budgeted", 0.0),
                created_at=rollup_data.get("created_at"),
                last_updated_at=rollup_data.get("last_updated_at"),
                emoji=rollup_data.get("emoji", "🔄"),
                is_linked=rollup_data.get("is_linked", False),
            )

        # Deserialize removed item notices
        for n in data.get("removed_item_notices", []):
            state.removed_item_notices.append(RemovedItemNotice(
                id=n["id"],
                recurring_id=n["recurring_id"],
                name=n["name"],
                category_name=n["category_name"],
                was_rollup=n["was_rollup"],
                removed_at=n["removed_at"],
                dismissed=n.get("dismissed", False),
            ))

        # Deserialize auto_sync state
        auto_sync_data = data.get("auto_sync", {})
        if auto_sync_data:
            state.auto_sync = AutoSyncState(
                enabled=auto_sync_data.get("enabled", False),
                interval_minutes=auto_sync_data.get("interval_minutes", 360),
                last_auto_sync=auto_sync_data.get("last_auto_sync"),
                last_auto_sync_success=auto_sync_data.get("last_auto_sync_success"),
                last_auto_sync_error=auto_sync_data.get("last_auto_sync_error"),
                consent_acknowledged=auto_sync_data.get("consent_acknowledged", False),
                consent_timestamp=auto_sync_data.get("consent_timestamp"),
            )

        return state

    def update_config(self, group_id: str, group_name: str) -> TrackerState:
        """Update configuration with target group."""
        state = self.load()
        state.target_group_id = group_id
        state.target_group_name = group_name
        self.save(state)
        return state

    def get_category(self, recurring_id: str) -> Optional[CategoryState]:
        """Get category state by recurring item ID."""
        state = self.load()
        return state.categories.get(recurring_id)

    def update_category(
        self,
        recurring_id: str,
        monarch_category_id: str,
        name: str,
        target_amount: float,
        due_date: str,
        over_contribution: float = 0.0,
    ) -> CategoryState:
        """Update or create category state."""
        state = self.load()
        now = datetime.now().isoformat()

        if recurring_id in state.categories:
            cat = state.categories[recurring_id]
            cat.monarch_category_id = monarch_category_id
            cat.name = name
            cat.target_amount = target_amount
            cat.over_contribution = over_contribution
            cat.previous_due_date = due_date
            cat.is_active = True
            cat.last_synced_at = now
        else:
            cat = CategoryState(
                monarch_category_id=monarch_category_id,
                name=name,
                target_amount=target_amount,
                over_contribution=over_contribution,
                previous_due_date=due_date,
                is_active=True,
                created_at=now,
                last_synced_at=now,
            )
            state.categories[recurring_id] = cat

        self.save(state)
        return cat

    def deactivate_category(self, recurring_id: str) -> None:
        """Mark a category as inactive."""
        state = self.load()
        if recurring_id in state.categories:
            state.categories[recurring_id].is_active = False
            state.categories[recurring_id].last_synced_at = datetime.now().isoformat()
            self.save(state)

    def update_category_emoji(self, recurring_id: str, emoji: str) -> Optional[CategoryState]:
        """Update the emoji for a category."""
        state = self.load()
        if recurring_id in state.categories:
            state.categories[recurring_id].emoji = emoji
            state.categories[recurring_id].last_synced_at = datetime.now().isoformat()
            self.save(state)
            return state.categories[recurring_id]
        return None

    def update_rollup_emoji(self, emoji: str) -> RollupState:
        """Update the emoji for the rollup category."""
        state = self.load()
        state.rollup.emoji = emoji
        state.rollup.last_updated_at = datetime.now().isoformat()
        self.save(state)
        return state.rollup

    def update_rollup_category_name(self, name: str) -> RollupState:
        """Update the name for the rollup category."""
        state = self.load()
        state.rollup.category_name = name
        state.rollup.last_updated_at = datetime.now().isoformat()
        self.save(state)
        return state.rollup

    def update_category_name(self, recurring_id: str, name: str) -> Optional[CategoryState]:
        """Update the name for a category."""
        state = self.load()
        if recurring_id in state.categories:
            state.categories[recurring_id].name = name
            state.categories[recurring_id].last_synced_at = datetime.now().isoformat()
            self.save(state)
            return state.categories[recurring_id]
        return None

    def mark_sync_complete(self) -> None:
        """Update last sync timestamp."""
        state = self.load()
        state.last_sync = datetime.now().isoformat()
        self.save(state)

    def set_user_first_name(self, first_name: str) -> None:
        """Update user's first name from Monarch profile."""
        state = self.load()
        state.user_first_name = first_name
        self.save(state)

    def get_user_first_name(self) -> Optional[str]:
        """Get user's first name."""
        state = self.load()
        return state.user_first_name

    def toggle_item_enabled(self, recurring_id: str, enabled: bool) -> bool:
        """Enable or disable tracking for a recurring item."""
        state = self.load()
        if enabled:
            state.enabled_items.add(recurring_id)
        else:
            state.enabled_items.discard(recurring_id)
        self.save(state)
        return enabled

    def set_auto_sync_new(self, auto_sync: bool) -> bool:
        """Set whether new recurring items should be auto-enabled."""
        state = self.load()
        state.auto_sync_new = auto_sync
        self.save(state)
        return auto_sync

    def set_auto_track_threshold(self, threshold: Optional[float]) -> Optional[float]:
        """Set the maximum monthly amount for auto-tracking (null = any amount)."""
        state = self.load()
        state.auto_track_threshold = threshold
        self.save(state)
        return threshold

    def set_auto_update_targets(self, auto_update: bool) -> bool:
        """Set whether to auto-update category targets when recurring amounts change."""
        state = self.load()
        state.auto_update_targets = auto_update
        self.save(state)
        return auto_update

    def get_settings(self) -> dict:
        """Get current settings."""
        state = self.load()
        return {
            "auto_sync_new": state.auto_sync_new,
            "rollup_enabled": state.rollup.enabled,
        }

    # Rollup methods

    def get_rollup_state(self) -> RollupState:
        """Get current rollup state."""
        state = self.load()
        return state.rollup

    def toggle_rollup_enabled(self, enabled: bool) -> RollupState:
        """Enable or disable the rollup feature."""
        state = self.load()
        state.rollup.enabled = enabled
        if enabled and not state.rollup.created_at:
            state.rollup.created_at = datetime.now().isoformat()
        state.rollup.last_updated_at = datetime.now().isoformat()
        self.save(state)
        return state.rollup

    def set_rollup_category_id(self, category_id: str) -> RollupState:
        """Set the Monarch category ID for the rollup."""
        state = self.load()
        state.rollup.monarch_category_id = category_id
        state.rollup.last_updated_at = datetime.now().isoformat()
        self.save(state)
        return state.rollup

    def add_to_rollup(self, recurring_id: str, monthly_rate: float) -> RollupState:
        """Add an item to the rollup and update total budget."""
        state = self.load()
        if recurring_id not in state.rollup.item_ids:
            state.rollup.item_ids.add(recurring_id)
            state.rollup.total_budgeted += monthly_rate
            state.rollup.last_updated_at = datetime.now().isoformat()
            self.save(state)
        return state.rollup

    def remove_from_rollup(self, recurring_id: str, monthly_rate: float) -> RollupState:
        """Remove an item from the rollup and update total budget."""
        state = self.load()
        if recurring_id in state.rollup.item_ids:
            state.rollup.item_ids.discard(recurring_id)
            state.rollup.total_budgeted = max(0, state.rollup.total_budgeted - monthly_rate)
            state.rollup.last_updated_at = datetime.now().isoformat()
            self.save(state)
        return state.rollup

    def set_rollup_budget(self, amount: float) -> RollupState:
        """Set the user-defined rollup budget amount."""
        state = self.load()
        state.rollup.total_budgeted = amount
        state.rollup.last_updated_at = datetime.now().isoformat()
        self.save(state)
        return state.rollup

    def is_in_rollup(self, recurring_id: str) -> bool:
        """Check if an item is in the rollup."""
        state = self.load()
        return recurring_id in state.rollup.item_ids

    # Frozen monthly target methods

    def get_frozen_target(self, recurring_id: str) -> Optional[Dict]:
        """Get frozen monthly target for an item."""
        state = self.load()
        cat = state.categories.get(recurring_id)
        if cat and cat.frozen_monthly_target is not None:
            return {
                "frozen_monthly_target": cat.frozen_monthly_target,
                "target_month": cat.target_month,
                "balance_at_month_start": cat.balance_at_month_start,
                "frozen_amount": cat.frozen_amount,
                "frozen_frequency_months": cat.frozen_frequency_months,
            }
        return None

    def set_frozen_target(
        self,
        recurring_id: str,
        frozen_target: float,
        target_month: str,
        balance_at_start: float,
        amount: float,
        frequency_months: float,
    ) -> None:
        """Set frozen monthly target for an item."""
        state = self.load()
        if recurring_id in state.categories:
            state.categories[recurring_id].frozen_monthly_target = frozen_target
            state.categories[recurring_id].target_month = target_month
            state.categories[recurring_id].balance_at_month_start = balance_at_start
            state.categories[recurring_id].frozen_amount = amount
            state.categories[recurring_id].frozen_frequency_months = frequency_months
            self.save(state)

    def clear_frozen_target(self, recurring_id: str) -> bool:
        """Clear frozen target for an item to force recalculation."""
        state = self.load()
        if recurring_id in state.categories:
            state.categories[recurring_id].frozen_monthly_target = None
            state.categories[recurring_id].target_month = None
            state.categories[recurring_id].balance_at_month_start = None
            state.categories[recurring_id].frozen_amount = None
            state.categories[recurring_id].frozen_frequency_months = None
            self.save(state)
            return True
        return False

    # Removed item notice methods

    def add_removed_notice(
        self,
        recurring_id: str,
        name: str,
        category_name: str,
        was_rollup: bool,
    ) -> RemovedItemNotice:
        """Add a notice for a removed recurring item."""
        state = self.load()
        notice = RemovedItemNotice(
            id=str(uuid.uuid4()),
            recurring_id=recurring_id,
            name=name,
            category_name=category_name,
            was_rollup=was_rollup,
            removed_at=datetime.now().isoformat(),
            dismissed=False,
        )
        state.removed_item_notices.append(notice)
        self.save(state)
        return notice

    def dismiss_notice(self, notice_id: str) -> bool:
        """Dismiss a notice by its ID."""
        state = self.load()
        for notice in state.removed_item_notices:
            if notice.id == notice_id:
                notice.dismissed = True
                self.save(state)
                return True
        return False

    def get_active_notices(self) -> List[RemovedItemNotice]:
        """Get all undismissed notices."""
        state = self.load()
        return [n for n in state.removed_item_notices if not n.dismissed]

    def remove_category_and_notify(
        self,
        recurring_id: str,
        was_in_rollup: bool,
    ) -> Optional[RemovedItemNotice]:
        """
        Remove a category from state and create a notice.
        Returns the created notice, or None if category wasn't tracked.
        """
        state = self.load()

        # Get category info before removing
        cat_state = state.categories.get(recurring_id)
        if not cat_state:
            return None

        # Create notice
        notice = RemovedItemNotice(
            id=str(uuid.uuid4()),
            recurring_id=recurring_id,
            name=cat_state.name,
            category_name=cat_state.name,
            was_rollup=was_in_rollup,
            removed_at=datetime.now().isoformat(),
            dismissed=False,
        )
        state.removed_item_notices.append(notice)

        # Remove from categories
        del state.categories[recurring_id]

        # Remove from enabled items
        state.enabled_items.discard(recurring_id)

        # Remove from rollup if present
        if recurring_id in state.rollup.item_ids:
            state.rollup.item_ids.discard(recurring_id)

        self.save(state)
        return notice

    # Feature reset methods

    def get_deletable_dedicated_categories(self) -> List[Dict]:
        """
        Get list of dedicated categories that can be deleted (not linked, not rollup).
        Returns list of dicts with recurring_id, category_id, name, is_linked.
        """
        state = self.load()
        deletable = []
        for recurring_id, cat in state.categories.items():
            # Skip items in rollup - they use the rollup category
            if recurring_id in state.rollup.item_ids:
                continue
            deletable.append({
                "recurring_id": recurring_id,
                "category_id": cat.monarch_category_id,
                "name": cat.name,
                "is_linked": cat.is_linked,
            })
        return deletable

    def reset_dedicated_categories(self) -> Dict:
        """
        Reset dedicated categories feature.
        Clears categories dict and removes non-rollup items from enabled_items.
        Returns dict with items_disabled count.
        """
        state = self.load()

        # Get items to disable (enabled items that are NOT in rollup)
        items_to_disable = state.enabled_items - state.rollup.item_ids
        disabled_count = len(items_to_disable)

        # Remove non-rollup items from enabled_items
        state.enabled_items = state.rollup.item_ids.copy()

        # Clear categories dict (but keep rollup items' category state if any)
        # Actually, rollup items don't have their own categories - they share rollup category
        state.categories = {}

        self.save(state)
        return {"items_disabled": disabled_count}

    def reset_rollup(self) -> Dict:
        """
        Reset rollup feature.
        Disables all items in rollup and resets rollup state.
        Returns dict with items_disabled count and whether category existed.
        """
        state = self.load()

        # Count and disable items in rollup
        items_to_disable = state.rollup.item_ids.copy()
        disabled_count = len(items_to_disable)

        # Remove rollup items from enabled_items
        for item_id in items_to_disable:
            state.enabled_items.discard(item_id)

        # Store whether there was a category to delete
        had_category = state.rollup.monarch_category_id is not None
        was_linked = state.rollup.is_linked

        # Reset rollup state to defaults
        state.rollup = RollupState()

        self.save(state)
        return {
            "items_disabled": disabled_count,
            "had_category": had_category,
            "was_linked": was_linked,
        }

    def reset_config(self) -> Dict:
        """
        Reset the configuration to take user back to setup wizard.
        Clears target_group_id and target_group_name.
        Preserves: credentials, auto_sync_new, auto_track_threshold.
        """
        state = self.load()

        # Clear the target group configuration
        state.target_group_id = None
        state.target_group_name = None

        self.save(state)
        return {"success": True}

    # Changelog tracking methods

    def get_last_read_changelog_version(self) -> Optional[str]:
        """Get the last changelog version the user has read."""
        state = self.load()
        return state.last_read_changelog_version

    def set_last_read_changelog_version(self, version: str) -> None:
        """Mark a changelog version as read."""
        state = self.load()
        state.last_read_changelog_version = version
        self.save(state)

    # Auto-sync methods

    def get_auto_sync_state(self) -> AutoSyncState:
        """Get current auto-sync state."""
        state = self.load()
        return state.auto_sync

    def update_auto_sync_state(
        self,
        enabled: Optional[bool] = None,
        interval_minutes: Optional[int] = None,
        consent_acknowledged: Optional[bool] = None,
    ) -> AutoSyncState:
        """Update auto-sync configuration."""
        state = self.load()

        if enabled is not None:
            state.auto_sync.enabled = enabled
        if interval_minutes is not None:
            state.auto_sync.interval_minutes = interval_minutes
        if consent_acknowledged is not None:
            state.auto_sync.consent_acknowledged = consent_acknowledged
            if consent_acknowledged:
                state.auto_sync.consent_timestamp = datetime.now().isoformat()

        self.save(state)
        return state.auto_sync

    def record_auto_sync_result(self, success: bool, error: Optional[str] = None) -> None:
        """Record the result of an automatic sync."""
        state = self.load()
        state.auto_sync.last_auto_sync = datetime.now().isoformat()
        state.auto_sync.last_auto_sync_success = success
        state.auto_sync.last_auto_sync_error = error
        self.save(state)

    def disable_auto_sync(self) -> None:
        """Disable auto-sync and clear related state."""
        state = self.load()
        state.auto_sync.enabled = False
        self.save(state)


class CredentialsManager:
    """
    Manages Monarch Money credentials with encryption at rest.

    Security Model:
    - User provides a passphrase that derives an encryption key via PBKDF2
    - Credentials (email, password, MFA secret) are encrypted before storage
    - Server cannot decrypt without the user's passphrase
    - Salt is stored with encrypted data (not secret, just ensures unique keys)
    """

    def __init__(self, creds_file: Optional[Path] = None):
        if creds_file is None:
            creds_file = config.CREDENTIALS_FILE
        self.creds_file = creds_file

    def exists(self) -> bool:
        """Check if encrypted credentials exist."""
        if not self.creds_file.exists():
            return False
        try:
            with open(self.creds_file, "r") as f:
                data = json.load(f)
            return data.get("encrypted", False) and data.get("salt") is not None
        except (json.JSONDecodeError, KeyError):
            return False

    def load(self, passphrase: str) -> Optional[Dict[str, str]]:
        """
        Load and decrypt credentials from file.

        Args:
            passphrase: User's encryption passphrase

        Returns:
            Dict with email, password, mfa_secret or None if file doesn't exist

        Raises:
            DecryptionError: If passphrase is wrong or data is corrupted
        """
        from core.encryption import CredentialEncryption, DecryptionError
        from cryptography.fernet import InvalidToken

        if not self.creds_file.exists():
            return None

        try:
            with open(self.creds_file, "r") as f:
                data = json.load(f)

            # Check if encrypted format
            if not data.get("encrypted"):
                # Legacy unencrypted format - should not happen in production
                if data.get("email") and data.get("password"):
                    return data
                return None

            # Decrypt credentials
            salt = CredentialEncryption.salt_from_b64(data["salt"])
            enc = CredentialEncryption(passphrase=passphrase, salt=salt)

            mfa_encrypted = data.get("mfa_secret", "")
            return {
                "email": enc.decrypt(data["email"]),
                "password": enc.decrypt(data["password"]),
                "mfa_secret": enc.decrypt(mfa_encrypted) if mfa_encrypted else "",
            }
        except InvalidToken:
            raise DecryptionError("Invalid passphrase or corrupted credentials")
        except (json.JSONDecodeError, KeyError) as e:
            raise DecryptionError(f"Failed to load credentials: {e}")

    def save(self, email: str, password: str, mfa_secret: str, passphrase: str) -> None:
        """
        Encrypt and save credentials to file atomically.

        Args:
            email: Monarch Money email
            password: Monarch Money password
            mfa_secret: Optional MFA secret key
            passphrase: User's encryption passphrase (used to derive key)
        """
        from core.encryption import CredentialEncryption

        # Create encryptor with new salt
        enc = CredentialEncryption(passphrase=passphrase)

        encrypted_data = {
            "encrypted": True,
            "version": "1.0",
            "salt": enc.get_salt_b64(),
            "email": enc.encrypt(email),
            "password": enc.encrypt(password),
            "mfa_secret": enc.encrypt(mfa_secret) if mfa_secret else "",
        }

        # Atomic write
        _atomic_write_json(self.creds_file, encrypted_data)

        # Restrict file permissions (owner read/write only)
        os.chmod(self.creds_file, 0o600)

    def verify_passphrase(self, passphrase: str) -> bool:
        """
        Verify if a passphrase can decrypt the stored credentials.

        Args:
            passphrase: Passphrase to verify

        Returns:
            True if passphrase is correct, False otherwise
        """
        from core.encryption import DecryptionError

        try:
            result = self.load(passphrase)
            return result is not None
        except DecryptionError:
            return False

    def clear(self) -> None:
        """Delete stored credentials."""
        if self.creds_file.exists():
            self.creds_file.unlink()
