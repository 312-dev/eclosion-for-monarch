"""
State Manager - SQLite-backed implementation.

Manages persistence of tracker state, credentials, and notes
using SQLite via SQLAlchemy.
"""

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal, cast

from state.db import db_session
from state.db.repositories import (
    CredentialsRepository,
    NotesRepository,
    TrackerRepository,
)

# ============================================================================
# Dataclasses for API compatibility
# These match the original state_manager.py dataclasses for drop-in replacement
# ============================================================================


@dataclass
class RemovedItemNotice:
    """Notice for a recurring item that was removed from Monarch."""

    id: str
    recurring_id: str
    name: str
    category_name: str
    was_rollup: bool
    removed_at: str
    dismissed: bool = False


@dataclass
class CategoryState:
    """State for a single tracked category."""

    monarch_category_id: str
    name: str
    target_amount: float
    over_contribution: float = 0.0
    previous_due_date: str | None = None
    is_active: bool = True
    created_at: str | None = None
    last_synced_at: str | None = None
    emoji: str = "🔄"
    frozen_monthly_target: float | None = None
    target_month: str | None = None
    balance_at_month_start: float | None = None
    frozen_amount: float | None = None
    frozen_frequency_months: float | None = None
    # New fields for improved frozen target calculation (v3)
    frozen_rollover_amount: float | None = None
    frozen_next_due_date: str | None = None
    sync_name: bool = True
    is_linked: bool = False


@dataclass
class RollupState:
    """State for the rollup category feature."""

    enabled: bool = False
    monarch_category_id: str | None = None
    category_name: str = "Recurring Rollup"
    item_ids: set = field(default_factory=set)
    total_budgeted: float = 0.0
    created_at: str | None = None
    last_updated_at: str | None = None
    emoji: str = "🔄"
    is_linked: bool = False


@dataclass
class TrackerState:
    """Full tracker state - reconstructed from database."""

    schema_version: str = "1.0"
    schema_channel: str = "stable"
    version: str = "1.0.0"
    target_group_id: str | None = None
    target_group_name: str | None = None
    last_sync: str | None = None
    auto_sync_new: bool = False
    auto_track_threshold: float | None = None
    auto_update_targets: bool = False
    auto_categorize_enabled: bool = False
    last_auto_categorize_date: str | None = None
    show_category_group: bool = True
    enabled_items: set = field(default_factory=set)
    categories: dict[str, CategoryState] = field(default_factory=dict)
    rollup: RollupState = field(default_factory=RollupState)
    removed_item_notices: list[RemovedItemNotice] = field(default_factory=list)
    last_read_changelog_version: str | None = None
    user_first_name: str | None = None
    mfa_mode: Literal["secret", "code"] = "secret"
    sync_blocked_reason: str | None = None

    # Acknowledgement state (migrated from localStorage)
    seen_stash_tour: bool = False
    seen_notes_tour: bool = False
    seen_recurring_tour: bool = False
    seen_stash_intro: bool = False
    read_update_ids: list[str] = field(default_factory=list)
    updates_install_date: str | None = None
    updates_last_viewed_at: str | None = None

    def is_configured(self) -> bool:
        """Check if the tracker has been configured with a target group."""
        return self.target_group_id is not None

    def is_item_enabled(self, recurring_id: str) -> bool:
        """Check if a recurring item is enabled for tracking."""
        return recurring_id in self.enabled_items


# ============================================================================
# State Manager - SQLite-backed
# ============================================================================


class StateManager:
    """Manages persistence of tracker state using SQLite."""

    def load(self) -> TrackerState:
        """Load state from database, or return default state."""
        with db_session() as session:
            repo = TrackerRepository(session)

            # Get or create config
            config = repo.get_config()
            rollup = repo.get_rollup()
            enabled_items = repo.get_enabled_items()
            categories = repo.get_all_categories()
            rollup_item_ids = repo.get_rollup_item_ids()
            notices = repo.get_active_notices()

            # Convert to dataclasses
            state = TrackerState(
                schema_version=config.schema_version,
                target_group_id=config.target_group_id,
                target_group_name=config.target_group_name,
                last_sync=f"{config.last_sync.isoformat()}Z" if config.last_sync else None,
                auto_sync_new=config.auto_sync_new,
                auto_track_threshold=config.auto_track_threshold,
                auto_update_targets=config.auto_update_targets,
                auto_categorize_enabled=config.auto_categorize_enabled,
                last_auto_categorize_date=config.last_auto_categorize_date,
                show_category_group=config.show_category_group,
                last_read_changelog_version=config.last_read_changelog_version,
                user_first_name=config.user_first_name,
                mfa_mode=cast(Literal["secret", "code"], config.mfa_mode),
                sync_blocked_reason=config.sync_blocked_reason,
                seen_stash_tour=config.seen_stash_tour,
                seen_notes_tour=config.seen_notes_tour,
                seen_recurring_tour=config.seen_recurring_tour,
                seen_stash_intro=config.seen_stash_intro,
                read_update_ids=(
                    json.loads(config.read_update_ids) if config.read_update_ids else []
                ),
                updates_install_date=config.updates_install_date,
                updates_last_viewed_at=config.updates_last_viewed_at,
                enabled_items=enabled_items,
            )

            # Convert categories
            for recurring_id, cat in categories.items():
                state.categories[recurring_id] = CategoryState(
                    monarch_category_id=cat.monarch_category_id,
                    name=cat.name,
                    target_amount=cat.target_amount,
                    over_contribution=cat.over_contribution,
                    previous_due_date=cat.previous_due_date,
                    is_active=cat.is_active,
                    created_at=cat.created_at.isoformat() if cat.created_at else None,
                    last_synced_at=(cat.last_synced_at.isoformat() if cat.last_synced_at else None),
                    emoji=cat.emoji,
                    frozen_monthly_target=cat.frozen_monthly_target,
                    target_month=cat.target_month,
                    balance_at_month_start=cat.balance_at_month_start,
                    frozen_amount=cat.frozen_amount,
                    frozen_frequency_months=cat.frozen_frequency_months,
                    sync_name=cat.sync_name,
                    is_linked=cat.is_linked,
                )

            # Convert rollup
            state.rollup = RollupState(
                enabled=rollup.enabled,
                monarch_category_id=rollup.monarch_category_id,
                category_name=rollup.category_name,
                item_ids=rollup_item_ids,
                total_budgeted=rollup.total_budgeted,
                created_at=rollup.created_at.isoformat() if rollup.created_at else None,
                last_updated_at=(
                    rollup.last_updated_at.isoformat() if rollup.last_updated_at else None
                ),
                emoji=rollup.emoji,
                is_linked=rollup.is_linked,
            )

            # Convert notices
            state.removed_item_notices = [
                RemovedItemNotice(
                    id=n.id,
                    recurring_id=n.recurring_id,
                    name=n.name,
                    category_name=n.category_name,
                    was_rollup=n.was_rollup,
                    removed_at=n.removed_at.isoformat() if n.removed_at else "",
                    dismissed=n.dismissed,
                )
                for n in notices
            ]

            return state

    def save(self, state: TrackerState) -> None:
        """
        Save the entire TrackerState to database.

        This method persists all aspects of the state object including:
        - Config (target group, auto settings)
        - Enabled items
        - Categories
        - Rollup state
        """
        with db_session() as session:
            repo = TrackerRepository(session)

            # Update config
            repo.update_config(
                target_group_id=state.target_group_id,
                target_group_name=state.target_group_name,
                auto_sync_new=state.auto_sync_new,
                auto_track_threshold=state.auto_track_threshold,
                auto_update_targets=state.auto_update_targets,
                auto_categorize_enabled=state.auto_categorize_enabled,
                show_category_group=state.show_category_group,
            )

            # Update enabled items - get current and diff
            current_enabled = repo.get_enabled_items()
            # Add new items
            for item_id in state.enabled_items - current_enabled:
                repo.toggle_item_enabled(item_id, True)
            # Remove items no longer enabled
            for item_id in current_enabled - state.enabled_items:
                repo.toggle_item_enabled(item_id, False)

            # Update categories
            for recurring_id, cat in state.categories.items():
                repo.upsert_category(
                    recurring_id=recurring_id,
                    monarch_category_id=cat.monarch_category_id,
                    name=cat.name,
                    target_amount=cat.target_amount,
                    over_contribution=cat.over_contribution,
                    previous_due_date=cat.previous_due_date,
                    is_active=cat.is_active,
                    emoji=cat.emoji,
                    sync_name=cat.sync_name,
                    is_linked=cat.is_linked,
                )

            # Update rollup state
            rollup = repo.get_rollup()
            rollup.enabled = state.rollup.enabled
            rollup.monarch_category_id = state.rollup.monarch_category_id
            rollup.category_name = state.rollup.category_name
            rollup.emoji = state.rollup.emoji
            rollup.total_budgeted = state.rollup.total_budgeted
            rollup.is_linked = state.rollup.is_linked

            # Update rollup items
            current_rollup_items = repo.get_rollup_item_ids()
            for item_id in state.rollup.item_ids - current_rollup_items:
                repo.add_to_rollup(item_id)
            for item_id in current_rollup_items - state.rollup.item_ids:
                repo.remove_from_rollup(item_id)

    def update_config(self, group_id: str, group_name: str) -> TrackerState:
        """Update configuration with target group."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(target_group_id=group_id, target_group_name=group_name)
        return self.load()

    def get_category(self, recurring_id: str) -> CategoryState | None:
        """Get category state by recurring item ID."""
        with db_session() as session:
            repo = TrackerRepository(session)
            cat = repo.get_category(recurring_id)
            if not cat:
                return None

            return CategoryState(
                monarch_category_id=cat.monarch_category_id,
                name=cat.name,
                target_amount=cat.target_amount,
                over_contribution=cat.over_contribution,
                previous_due_date=cat.previous_due_date,
                is_active=cat.is_active,
                created_at=cat.created_at.isoformat() if cat.created_at else None,
                last_synced_at=(cat.last_synced_at.isoformat() if cat.last_synced_at else None),
                emoji=cat.emoji,
                frozen_monthly_target=cat.frozen_monthly_target,
                target_month=cat.target_month,
                balance_at_month_start=cat.balance_at_month_start,
                frozen_amount=cat.frozen_amount,
                frozen_frequency_months=cat.frozen_frequency_months,
                sync_name=cat.sync_name,
                is_linked=cat.is_linked,
            )

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
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.upsert_category(
                recurring_id=recurring_id,
                monarch_category_id=monarch_category_id,
                name=name,
                target_amount=target_amount,
                over_contribution=over_contribution,
                previous_due_date=due_date,
                is_active=True,
            )
        # We just created/updated the category, so it must exist
        result = self.get_category(recurring_id)
        assert result is not None, f"Category {recurring_id} should exist after upsert"
        return result

    def deactivate_category(self, recurring_id: str) -> None:
        """Mark a category as inactive."""
        with db_session() as session:
            repo = TrackerRepository(session)
            cat = repo.get_category(recurring_id)
            if cat:
                cat.is_active = False
                cat.last_synced_at = datetime.now(UTC)

    def update_category_emoji(self, recurring_id: str, emoji: str) -> CategoryState | None:
        """Update the emoji for a category."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_category_emoji(recurring_id, emoji)
        return self.get_category(recurring_id)

    def update_rollup_emoji(self, emoji: str) -> RollupState:
        """Update the emoji for the rollup category."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_rollup_emoji(emoji)
        return self.load().rollup

    def update_rollup_category_name(self, name: str) -> RollupState:
        """Update the name for the rollup category."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_rollup_category_name(name)
        return self.load().rollup

    def update_category_name(self, recurring_id: str, name: str) -> CategoryState | None:
        """Update the name for a category."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_category_name(recurring_id, name)
        return self.get_category(recurring_id)

    def mark_sync_complete(self) -> None:
        """Update last sync timestamp."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.mark_sync_complete()

    def set_user_first_name(self, first_name: str) -> None:
        """Update user's first name from Monarch profile."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(user_first_name=first_name)

    def get_user_first_name(self) -> str | None:
        """Get user's first name."""
        return self.load().user_first_name

    def toggle_item_enabled(self, recurring_id: str, enabled: bool) -> bool:
        """Enable or disable tracking for a recurring item."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.toggle_item_enabled(recurring_id, enabled)

    def set_auto_sync_new(self, auto_sync: bool) -> bool:
        """Set whether new recurring items should be auto-enabled."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(auto_sync_new=auto_sync)
        return auto_sync

    def set_auto_track_threshold(self, threshold: float | None) -> float | None:
        """Set the maximum monthly amount for auto-tracking."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(auto_track_threshold=threshold)
        return threshold

    def set_auto_update_targets(self, auto_update: bool) -> bool:
        """Set whether to auto-update category targets."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(auto_update_targets=auto_update)
        return auto_update

    def set_auto_categorize_enabled(self, enabled: bool) -> bool:
        """Set whether to auto-categorize new transactions."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(auto_categorize_enabled=enabled)
        return enabled

    def set_show_category_group(self, show: bool) -> bool:
        """Set whether to show category group names."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(show_category_group=show)
        return show

    def record_auto_categorize_run(self, date: str) -> None:
        """Record the date of the last auto-categorization run."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(last_auto_categorize_date=date)

    def get_auto_categorize_settings(self) -> dict:
        """Get auto-categorize settings."""
        state = self.load()
        return {
            "auto_categorize_enabled": state.auto_categorize_enabled,
            "last_auto_categorize_date": state.last_auto_categorize_date,
        }

    def get_settings(self) -> dict:
        """Get current settings."""
        state = self.load()
        return {
            "auto_sync_new": state.auto_sync_new,
            "rollup_enabled": state.rollup.enabled,
            "show_category_group": state.show_category_group,
        }

    # === Rollup methods ===

    def get_rollup_state(self) -> RollupState:
        """Get current rollup state."""
        return self.load().rollup

    def toggle_rollup_enabled(self, enabled: bool) -> RollupState:
        """Enable or disable the rollup feature."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.toggle_rollup_enabled(enabled)
        return self.load().rollup

    def set_rollup_category_id(self, category_id: str) -> RollupState:
        """Set the Monarch category ID for the rollup."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.set_rollup_category_id(category_id)
        return self.load().rollup

    def add_to_rollup(self, recurring_id: str) -> RollupState:
        """Add an item to the rollup."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.add_to_rollup(recurring_id)
        return self.load().rollup

    def remove_from_rollup(self, recurring_id: str) -> RollupState:
        """Remove an item from the rollup."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.remove_from_rollup(recurring_id)
        return self.load().rollup

    def set_rollup_budget(self, amount: float) -> RollupState:
        """Set the user-defined rollup budget amount."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.set_rollup_budget(amount)
        return self.load().rollup

    def is_in_rollup(self, recurring_id: str) -> bool:
        """Check if an item is in the rollup."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.is_in_rollup(recurring_id)

    # === Frozen target methods ===

    def get_frozen_target(self, recurring_id: str) -> dict | None:
        """Get frozen monthly target for an item."""
        cat = self.get_category(recurring_id)
        if cat and cat.frozen_monthly_target is not None:
            return {
                "frozen_monthly_target": cat.frozen_monthly_target,
                "target_month": cat.target_month,
                "balance_at_month_start": cat.balance_at_month_start,
                "frozen_amount": cat.frozen_amount,
                "frozen_frequency_months": cat.frozen_frequency_months,
                "frozen_rollover_amount": cat.frozen_rollover_amount,
                "frozen_next_due_date": cat.frozen_next_due_date,
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
        rollover_amount: float | None = None,
        next_due_date: str | None = None,
    ) -> None:
        """Set frozen monthly target for an item."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.set_frozen_target(
                recurring_id,
                frozen_target,
                target_month,
                balance_at_start,
                amount,
                frequency_months,
                rollover_amount,
                next_due_date,
            )

    def clear_frozen_target(self, recurring_id: str) -> bool:
        """Clear frozen target for an item."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.clear_frozen_target(recurring_id)

    # === Removed item notice methods ===

    def add_removed_notice(
        self,
        recurring_id: str,
        name: str,
        category_name: str,
        was_rollup: bool,
    ) -> RemovedItemNotice:
        """Add a notice for a removed recurring item."""
        with db_session() as session:
            repo = TrackerRepository(session)
            notice = repo.add_removed_notice(recurring_id, name, category_name, was_rollup)
            return RemovedItemNotice(
                id=notice.id,
                recurring_id=notice.recurring_id,
                name=notice.name,
                category_name=notice.category_name,
                was_rollup=notice.was_rollup,
                removed_at=notice.removed_at.isoformat(),
                dismissed=notice.dismissed,
            )

    def dismiss_notice(self, notice_id: str) -> bool:
        """Dismiss a notice by its ID."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.dismiss_notice(notice_id)

    def get_active_notices(self) -> list[RemovedItemNotice]:
        """Get all undismissed notices."""
        return self.load().removed_item_notices

    def remove_category_and_notify(
        self,
        recurring_id: str,
        was_in_rollup: bool,
    ) -> RemovedItemNotice | None:
        """Remove a category and create a notice."""
        cat = self.get_category(recurring_id)
        if not cat:
            return None

        with db_session() as session:
            repo = TrackerRepository(session)

            # Create notice
            notice = repo.add_removed_notice(recurring_id, cat.name, cat.name, was_in_rollup)

            # Delete category
            repo.delete_category(recurring_id)

            # Remove from enabled items
            repo.toggle_item_enabled(recurring_id, False)

            # Remove from rollup if present
            if was_in_rollup:
                repo.remove_from_rollup(recurring_id, 0)

            return RemovedItemNotice(
                id=notice.id,
                recurring_id=notice.recurring_id,
                name=notice.name,
                category_name=notice.category_name,
                was_rollup=notice.was_rollup,
                removed_at=notice.removed_at.isoformat(),
                dismissed=notice.dismissed,
            )

    # === Feature reset methods ===

    def get_deletable_dedicated_categories(self) -> list[dict]:
        """Get list of dedicated categories that can be deleted."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.get_deletable_dedicated_categories()

    def reset_dedicated_categories(self) -> dict:
        """Reset dedicated categories feature."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.reset_dedicated_categories()

    def reset_rollup(self) -> dict:
        """Reset rollup feature."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.reset_rollup()

    def reset_config(self) -> dict:
        """Reset the configuration to take user back to setup wizard."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.reset_config()

    # === Changelog tracking methods ===

    def get_last_read_changelog_version(self) -> str | None:
        """Get the last changelog version the user has read."""
        return self.load().last_read_changelog_version

    def set_last_read_changelog_version(self, version: str) -> None:
        """Mark a changelog version as read."""
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_config(last_read_changelog_version=version)

    # === Acknowledgement methods ===

    def get_acknowledgements(self) -> dict:
        """Get all acknowledgement states (tours, intros, updates)."""
        state = self.load()
        return {
            "seen_stash_tour": state.seen_stash_tour,
            "seen_notes_tour": state.seen_notes_tour,
            "seen_recurring_tour": state.seen_recurring_tour,
            "seen_stash_intro": state.seen_stash_intro,
            "read_update_ids": state.read_update_ids,
            "updates_install_date": state.updates_install_date,
            "updates_last_viewed_at": state.updates_last_viewed_at,
        }

    def update_acknowledgements(self, **kwargs: object) -> None:
        """Update acknowledgement states. Accepts partial updates."""
        allowed_keys = {
            "seen_stash_tour",
            "seen_notes_tour",
            "seen_recurring_tour",
            "seen_stash_intro",
            "read_update_ids",
            "updates_install_date",
            "updates_last_viewed_at",
        }
        updates: dict[str, Any] = {}
        for key in allowed_keys:
            if key in kwargs:
                value = kwargs[key]
                if key == "read_update_ids":
                    # Serialize list to JSON string for storage
                    updates[key] = json.dumps(value) if isinstance(value, list) else value
                else:
                    updates[key] = value
        if updates:
            with db_session() as session:
                repo = TrackerRepository(session)
                repo.update_config(**updates)


# ============================================================================
# Credentials Manager - SQLite-backed
# ============================================================================


class CredentialsManager:
    """Manages Monarch Money credentials with encryption at rest using SQLite."""

    def exists(self) -> bool:
        """Check if encrypted credentials exist."""
        with db_session() as session:
            repo = CredentialsRepository(session)
            return repo.exists()

    def load(self, passphrase: str) -> dict[str, str] | None:
        """Load and decrypt credentials from database."""
        with db_session() as session:
            repo = CredentialsRepository(session)
            return repo.load(passphrase)

    def save(
        self,
        email: str,
        password: str,
        mfa_secret: str,
        passphrase: str,
        notes_key: str | None = None,
    ) -> None:
        """Encrypt and save credentials to database."""
        with db_session() as session:
            repo = CredentialsRepository(session)
            repo.save(email, password, mfa_secret, passphrase, notes_key)

    def verify_passphrase(self, passphrase: str) -> bool:
        """Verify if a passphrase can decrypt the stored credentials."""
        with db_session() as session:
            repo = CredentialsRepository(session)
            return repo.verify_passphrase(passphrase)

    def get_notes_key(self, passphrase: str) -> str | None:
        """Get the decrypted notes key for remote access."""
        with db_session() as session:
            repo = CredentialsRepository(session)
            return repo.get_notes_key(passphrase)

    def clear(self) -> None:
        """Delete stored credentials."""
        with db_session() as session:
            repo = CredentialsRepository(session)
            repo.delete()


# ============================================================================
# Notes State Manager - SQLite-backed with encryption
# ============================================================================


class NotesStateManager:
    """
    Manages persistence of monthly notes with encryption.

    Notes are encrypted with the user's passphrase.
    Requires passphrase for all content operations.
    """

    def save_note(
        self,
        passphrase: str,
        category_type: str,
        category_id: str,
        category_name: str,
        month_key: str,
        content: str,
        group_id: str | None = None,
        group_name: str | None = None,
    ) -> dict:
        """Save or update a note for a category or group."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.save_note(
                passphrase=passphrase,
                category_type=category_type,
                category_id=category_id,
                category_name=category_name,
                month_key=month_key,
                content=content,
                group_id=group_id,
                group_name=group_name,
            )

    def delete_note(self, note_id: str) -> bool:
        """Delete a note by ID."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.delete_note(note_id)

    def get_notes_for_category(
        self, category_type: str, category_id: str, passphrase: str
    ) -> list[dict]:
        """Get all notes for a category or group."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_notes_for_category(category_type, category_id, passphrase)

    def get_effective_note(
        self, category_type: str, category_id: str, target_month: str, passphrase: str
    ) -> dict | None:
        """Get the effective note for a category at a given month."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_effective_note(category_type, category_id, target_month, passphrase)

    def save_general_note(self, month_key: str, content: str, passphrase: str) -> dict:
        """Save or update a general note for a month."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.save_general_note(month_key, content, passphrase)

    def get_general_note(self, month_key: str, passphrase: str) -> dict | None:
        """Get general note for a month."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_general_note(month_key, passphrase)

    def delete_general_note(self, month_key: str) -> bool:
        """Delete general note for a month."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.delete_general_note(month_key)

    def get_archived_notes(self, passphrase: str) -> list[dict]:
        """Get all archived notes."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_archived_notes(passphrase)

    def delete_archived_note(self, note_id: str) -> bool:
        """Permanently delete an archived note."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.delete_archived_note(note_id)

    def archive_notes_for_category(self, category_id: str, passphrase: str) -> int:
        """Archive all notes for a deleted category."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.archive_notes_for_category(category_id, passphrase)

    def sync_categories(self, current_category_ids: set[str], passphrase: str) -> dict:
        """Sync known categories with current Monarch categories."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.sync_categories(current_category_ids, passphrase)

    def get_revision_history(
        self, category_type: str, category_id: str, passphrase: str
    ) -> list[dict]:
        """Get revision history for a category."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_revision_history(category_type, category_id, passphrase)

    def get_all_notes_for_month(self, month_key: str, passphrase: str) -> dict:
        """Get all notes effective for a given month."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_all_notes_for_month(month_key, passphrase)

    def get_all_notes(self, passphrase: str) -> dict:
        """Get all notes data for bulk loading."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_all_notes(passphrase)

    # === Checkbox State Methods ===

    def get_checkbox_states(self, note_id: str, viewing_month: str) -> list[bool]:
        """Get checkbox states for a category/group note."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_checkbox_states(note_id, viewing_month)

    def get_general_checkbox_states(self, source_month: str, viewing_month: str) -> list[bool]:
        """Get checkbox states for a general note."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_general_checkbox_states(source_month, viewing_month)

    def update_checkbox_state(
        self,
        viewing_month: str,
        checkbox_index: int,
        is_checked: bool,
        note_id: str | None = None,
        general_note_month_key: str | None = None,
    ) -> list[bool]:
        """Update a checkbox state."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.update_checkbox_state(
                viewing_month=viewing_month,
                checkbox_index=checkbox_index,
                is_checked=is_checked,
                note_id=note_id,
                general_note_month_key=general_note_month_key,
            )

    def get_all_checkbox_states_for_month(self, viewing_month: str) -> dict[str, list[bool]]:
        """Get all checkbox states for a viewing month (for export)."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_all_checkbox_states_for_month(viewing_month)

    def clear_checkbox_states_for_note(self, note_id: str) -> int:
        """Clear all checkbox states for a note."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.clear_checkbox_states_for_note(note_id)

    def clear_checkbox_states_for_viewing_months(
        self,
        viewing_months: list[str],
        note_id: str | None = None,
        general_note_month_key: str | None = None,
    ) -> int:
        """Clear checkbox states for specific viewing months."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.clear_checkbox_states_for_viewing_months(
                viewing_months, note_id, general_note_month_key
            )

    # === Inheritance Impact Methods ===

    def get_inheritance_impact(
        self,
        category_type: str,
        category_id: str,
        month_key: str,
        passphrase: str,
    ) -> dict:
        """Get the impact of creating a new note (breaking inheritance)."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_inheritance_impact(category_type, category_id, month_key, passphrase)

    def get_general_inheritance_impact(self, month_key: str, passphrase: str) -> dict:
        """Get the impact of creating a new general note."""
        with db_session() as session:
            repo = NotesRepository(session)
            return repo.get_general_inheritance_impact(month_key, passphrase)
