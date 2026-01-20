"""
Tracker state repository.
"""

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from state.db.models import (
    AutoSyncState,
    Category,
    EnabledItem,
    PendingBookmark,
    RemovedItemNotice,
    Rollup,
    RollupItem,
    TrackerConfig,
    WishlistConfig,
    WishlistItem,
)


class TrackerRepository:
    """Repository for tracker configuration and state."""

    def __init__(self, session: Session):
        self.session = session

    # === Config ===

    def get_config(self) -> TrackerConfig:
        """Get or create tracker config."""
        config = self.session.query(TrackerConfig).first()
        if not config:
            config = TrackerConfig(id=1)
            self.session.add(config)
            self.session.flush()
        return config

    def update_config(
        self,
        target_group_id: str | None = None,
        target_group_name: str | None = None,
        **kwargs,
    ) -> TrackerConfig:
        """Update tracker config fields."""
        config = self.get_config()
        if target_group_id is not None:
            config.target_group_id = target_group_id
        if target_group_name is not None:
            config.target_group_name = target_group_name
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)
        return config

    def is_configured(self) -> bool:
        """Check if tracker has been configured."""
        config = self.session.query(TrackerConfig).first()
        return config is not None and config.target_group_id is not None

    def mark_sync_complete(self) -> None:
        """Update last sync timestamp."""
        config = self.get_config()
        config.last_sync = datetime.utcnow()

    # === Enabled Items ===

    def get_enabled_items(self) -> set[str]:
        """Get all enabled recurring item IDs."""
        items = self.session.query(EnabledItem.recurring_id).all()
        return {item[0] for item in items}

    def is_item_enabled(self, recurring_id: str) -> bool:
        """Check if item is enabled."""
        return (
            self.session.query(EnabledItem).filter(EnabledItem.recurring_id == recurring_id).first()
            is not None
        )

    def toggle_item_enabled(self, recurring_id: str, enabled: bool) -> bool:
        """Enable or disable tracking for an item."""
        if enabled:
            if not self.is_item_enabled(recurring_id):
                self.session.add(EnabledItem(recurring_id=recurring_id))
        else:
            self.session.query(EnabledItem).filter(
                EnabledItem.recurring_id == recurring_id
            ).delete()
        return enabled

    # === Categories ===

    def get_category(self, recurring_id: str) -> Category | None:
        """Get category by recurring item ID."""
        return self.session.query(Category).filter(Category.recurring_id == recurring_id).first()

    def get_all_categories(self) -> dict[str, Category]:
        """Get all categories as dict keyed by recurring_id."""
        categories = self.session.query(Category).all()
        return {cat.recurring_id: cat for cat in categories}

    def upsert_category(
        self,
        recurring_id: str,
        monarch_category_id: str,
        name: str,
        target_amount: float,
        **kwargs,
    ) -> Category:
        """Create or update a category."""
        now = datetime.utcnow()
        category = self.get_category(recurring_id)

        if category:
            category.monarch_category_id = monarch_category_id
            category.name = name
            category.target_amount = target_amount
            category.last_synced_at = now
            for key, value in kwargs.items():
                if hasattr(category, key):
                    setattr(category, key, value)
        else:
            category = Category(
                recurring_id=recurring_id,
                monarch_category_id=monarch_category_id,
                name=name,
                target_amount=target_amount,
                created_at=now,
                last_synced_at=now,
                **kwargs,
            )
            self.session.add(category)

        return category

    def delete_category(self, recurring_id: str) -> bool:
        """Delete a category."""
        result = self.session.query(Category).filter(Category.recurring_id == recurring_id).delete()
        return result > 0

    def update_category_emoji(self, recurring_id: str, emoji: str) -> Category | None:
        """Update category emoji."""
        category = self.get_category(recurring_id)
        if category:
            category.emoji = emoji
            category.last_synced_at = datetime.utcnow()
        return category

    def update_category_name(self, recurring_id: str, name: str) -> Category | None:
        """Update category name."""
        category = self.get_category(recurring_id)
        if category:
            category.name = name
            category.last_synced_at = datetime.utcnow()
        return category

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
    ) -> bool:
        """Set frozen monthly target for a category."""
        category = self.get_category(recurring_id)

        # Create entry if it doesn't exist (needed for rollup items which use
        # keys like "rollup_{item_id}" that aren't tracked as regular categories)
        if not category:
            category = Category(
                recurring_id=recurring_id,
                monarch_category_id="",  # Rollup items don't have individual Monarch categories
                name=recurring_id,
                target_amount=amount,
                is_active=True,
                created_at=datetime.utcnow(),
                last_synced_at=datetime.utcnow(),
            )
            self.session.add(category)

        category.frozen_monthly_target = frozen_target
        category.target_month = target_month
        category.balance_at_month_start = balance_at_start
        category.frozen_amount = amount
        category.frozen_frequency_months = frequency_months
        category.frozen_rollover_amount = rollover_amount
        category.frozen_next_due_date = next_due_date
        return True

    def clear_frozen_target(self, recurring_id: str) -> bool:
        """Clear frozen target for a category."""
        category = self.get_category(recurring_id)
        if category:
            category.frozen_monthly_target = None
            category.target_month = None
            category.balance_at_month_start = None
            category.frozen_amount = None
            category.frozen_frequency_months = None
            category.frozen_rollover_amount = None
            category.frozen_next_due_date = None
            return True
        return False

    # === Rollup ===

    def get_rollup(self) -> Rollup:
        """Get or create rollup config."""
        rollup = self.session.query(Rollup).first()
        if not rollup:
            rollup = Rollup(id=1)
            self.session.add(rollup)
            self.session.flush()
        return rollup

    def get_rollup_item_ids(self) -> set[str]:
        """Get IDs of items in rollup."""
        items = self.session.query(RollupItem.recurring_id).all()
        return {item[0] for item in items}

    def is_in_rollup(self, recurring_id: str) -> bool:
        """Check if item is in rollup."""
        return (
            self.session.query(RollupItem).filter(RollupItem.recurring_id == recurring_id).first()
            is not None
        )

    def add_to_rollup(self, recurring_id: str, monthly_rate: float) -> Rollup:
        """Add item to rollup."""
        if not self.is_in_rollup(recurring_id):
            self.session.add(RollupItem(recurring_id=recurring_id, rollup_id=1))
            rollup = self.get_rollup()
            rollup.total_budgeted += monthly_rate
            rollup.last_updated_at = datetime.utcnow()
        return self.get_rollup()

    def remove_from_rollup(self, recurring_id: str, monthly_rate: float) -> Rollup:
        """Remove item from rollup."""
        self.session.query(RollupItem).filter(RollupItem.recurring_id == recurring_id).delete()
        rollup = self.get_rollup()
        rollup.total_budgeted = max(0, rollup.total_budgeted - monthly_rate)
        rollup.last_updated_at = datetime.utcnow()
        return rollup

    def toggle_rollup_enabled(self, enabled: bool) -> Rollup:
        """Enable or disable rollup."""
        rollup = self.get_rollup()
        rollup.enabled = enabled
        if enabled and not rollup.created_at:
            rollup.created_at = datetime.utcnow()
        rollup.last_updated_at = datetime.utcnow()
        return rollup

    def set_rollup_category_id(self, category_id: str) -> Rollup:
        """Set Monarch category ID for rollup."""
        rollup = self.get_rollup()
        rollup.monarch_category_id = category_id
        rollup.last_updated_at = datetime.utcnow()
        return rollup

    def set_rollup_budget(self, amount: float) -> Rollup:
        """Set rollup budget amount."""
        rollup = self.get_rollup()
        rollup.total_budgeted = amount
        rollup.last_updated_at = datetime.utcnow()
        return rollup

    def update_rollup_emoji(self, emoji: str) -> Rollup:
        """Update rollup emoji."""
        rollup = self.get_rollup()
        rollup.emoji = emoji
        rollup.last_updated_at = datetime.utcnow()
        return rollup

    def update_rollup_category_name(self, name: str) -> Rollup:
        """Update rollup category name."""
        rollup = self.get_rollup()
        rollup.category_name = name
        rollup.last_updated_at = datetime.utcnow()
        return rollup

    # === Removed Item Notices ===

    def add_removed_notice(
        self,
        recurring_id: str,
        name: str,
        category_name: str,
        was_rollup: bool,
    ) -> RemovedItemNotice:
        """Add notice for removed recurring item."""
        notice = RemovedItemNotice(
            id=str(uuid.uuid4()),
            recurring_id=recurring_id,
            name=name,
            category_name=category_name,
            was_rollup=was_rollup,
            removed_at=datetime.utcnow(),
            dismissed=False,
        )
        self.session.add(notice)
        return notice

    def get_active_notices(self) -> list[RemovedItemNotice]:
        """Get all undismissed notices."""
        return (
            self.session.query(RemovedItemNotice)
            .filter(RemovedItemNotice.dismissed.is_(False))
            .all()
        )

    def dismiss_notice(self, notice_id: str) -> bool:
        """Dismiss a notice."""
        notice = (
            self.session.query(RemovedItemNotice).filter(RemovedItemNotice.id == notice_id).first()
        )
        if notice:
            notice.dismissed = True
            return True
        return False

    # === Auto Sync ===

    def get_auto_sync_state(self) -> AutoSyncState:
        """Get or create auto sync state."""
        state = self.session.query(AutoSyncState).first()
        if not state:
            state = AutoSyncState(id=1)
            self.session.add(state)
            self.session.flush()
        return state

    def update_auto_sync_state(
        self,
        enabled: bool | None = None,
        interval_minutes: int | None = None,
        consent_acknowledged: bool | None = None,
    ) -> AutoSyncState:
        """Update auto sync settings."""
        state = self.get_auto_sync_state()
        if enabled is not None:
            state.enabled = enabled
        if interval_minutes is not None:
            state.interval_minutes = interval_minutes
        if consent_acknowledged is not None:
            state.consent_acknowledged = consent_acknowledged
            if consent_acknowledged:
                state.consent_timestamp = datetime.utcnow()
        return state

    def record_auto_sync_result(self, success: bool, error: str | None = None) -> None:
        """Record result of automatic sync."""
        state = self.get_auto_sync_state()
        state.last_auto_sync = datetime.utcnow()
        state.last_auto_sync_success = success
        state.last_auto_sync_error = error

    # === Reset Operations ===

    def reset_config(self) -> dict:
        """Reset configuration to default."""
        config = self.get_config()
        config.target_group_id = None
        config.target_group_name = None
        return {"success": True}

    def reset_dedicated_categories(self) -> dict:
        """Reset dedicated categories (non-rollup)."""
        rollup_item_ids = self.get_rollup_item_ids()
        enabled_items = self.get_enabled_items()

        # Items to disable are enabled items NOT in rollup
        items_to_disable = enabled_items - rollup_item_ids
        disabled_count = len(items_to_disable)

        # Remove non-rollup items from enabled
        for item_id in items_to_disable:
            self.toggle_item_enabled(item_id, False)

        # Clear categories
        self.session.query(Category).delete()

        return {"items_disabled": disabled_count}

    def reset_rollup(self) -> dict:
        """Reset rollup feature."""
        rollup = self.get_rollup()
        rollup_item_ids = self.get_rollup_item_ids()
        disabled_count = len(rollup_item_ids)

        # Disable rollup items
        for item_id in rollup_item_ids:
            self.toggle_item_enabled(item_id, False)

        # Store info before reset
        had_category = rollup.monarch_category_id is not None
        was_linked = rollup.is_linked

        # Clear rollup items
        self.session.query(RollupItem).delete()

        # Reset rollup to defaults
        rollup.enabled = False
        rollup.monarch_category_id = None
        rollup.category_name = "Recurring Rollup"
        rollup.emoji = "🔄"
        rollup.total_budgeted = 0.0
        rollup.is_linked = False
        rollup.created_at = None
        rollup.last_updated_at = None

        return {
            "items_disabled": disabled_count,
            "had_category": had_category,
            "was_linked": was_linked,
        }

    def get_deletable_dedicated_categories(self) -> list[dict]:
        """Get list of dedicated categories that can be deleted."""
        rollup_item_ids = self.get_rollup_item_ids()
        categories = self.get_all_categories()

        deletable = []
        for recurring_id, cat in categories.items():
            if recurring_id not in rollup_item_ids:
                deletable.append(
                    {
                        "recurring_id": recurring_id,
                        "category_id": cat.monarch_category_id,
                        "name": cat.name,
                        "is_linked": cat.is_linked,
                    }
                )
        return deletable

    # === Wishlist ===

    def get_wishlist_item(self, item_id: str) -> WishlistItem | None:
        """Get wishlist item by ID."""
        return self.session.query(WishlistItem).filter(WishlistItem.id == item_id).first()

    def get_all_wishlist_items(self) -> list[WishlistItem]:
        """Get all wishlist items."""
        return self.session.query(WishlistItem).order_by(WishlistItem.created_at.desc()).all()

    def get_active_wishlist_items(self) -> list[WishlistItem]:
        """Get non-archived wishlist items."""
        return (
            self.session.query(WishlistItem)
            .filter(WishlistItem.is_archived.is_(False))
            .order_by(WishlistItem.created_at.desc())
            .all()
        )

    def get_archived_wishlist_items(self) -> list[WishlistItem]:
        """Get archived wishlist items."""
        return (
            self.session.query(WishlistItem)
            .filter(WishlistItem.is_archived.is_(True))
            .order_by(WishlistItem.archived_at.desc())
            .all()
        )

    def create_wishlist_item(
        self,
        item_id: str,
        name: str,
        amount: float,
        target_date: str,
        category_group_id: str | None = None,
        category_group_name: str | None = None,
        **kwargs,
    ) -> WishlistItem:
        """Create a new wishlist item."""
        item = WishlistItem(
            id=item_id,
            name=name,
            amount=amount,
            target_date=target_date,
            category_group_id=category_group_id,
            category_group_name=category_group_name,
            created_at=datetime.utcnow(),
            **kwargs,
        )
        self.session.add(item)
        return item

    def update_wishlist_item(
        self,
        item_id: str,
        **kwargs,
    ) -> WishlistItem | None:
        """Update wishlist item fields."""
        item = self.get_wishlist_item(item_id)
        if not item:
            return None

        for key, value in kwargs.items():
            if hasattr(item, key):
                setattr(item, key, value)

        item.updated_at = datetime.utcnow()
        return item

    def delete_wishlist_item(self, item_id: str) -> bool:
        """Delete a wishlist item."""
        result = self.session.query(WishlistItem).filter(WishlistItem.id == item_id).delete()
        return result > 0

    def archive_wishlist_item(self, item_id: str) -> WishlistItem | None:
        """Archive a wishlist item."""
        item = self.get_wishlist_item(item_id)
        if item:
            item.is_archived = True
            item.archived_at = datetime.utcnow()
            item.updated_at = datetime.utcnow()
        return item

    def unarchive_wishlist_item(self, item_id: str) -> WishlistItem | None:
        """Unarchive a wishlist item."""
        item = self.get_wishlist_item(item_id)
        if item:
            item.is_archived = False
            item.archived_at = None
            item.updated_at = datetime.utcnow()
        return item

    def set_wishlist_category(
        self,
        item_id: str,
        monarch_category_id: str,
    ) -> WishlistItem | None:
        """Set the Monarch category ID for a wishlist item."""
        item = self.get_wishlist_item(item_id)
        if item:
            item.monarch_category_id = monarch_category_id
            item.updated_at = datetime.utcnow()
        return item

    def update_wishlist_group(
        self,
        item_id: str,
        group_id: str,
        group_name: str,
    ) -> WishlistItem | None:
        """Update the category group for a wishlist item."""
        item = self.get_wishlist_item(item_id)
        if item:
            item.category_group_id = group_id
            item.category_group_name = group_name
            item.updated_at = datetime.utcnow()
        return item

    def get_wishlist_items_by_category_id(self, category_id: str) -> list[WishlistItem]:
        """Get wishlist items by Monarch category ID."""
        return (
            self.session.query(WishlistItem)
            .filter(WishlistItem.monarch_category_id == category_id)
            .all()
        )

    def get_wishlist_items_by_bookmark_id(self, bookmark_id: str) -> list[WishlistItem]:
        """Get wishlist items by source bookmark ID."""
        return (
            self.session.query(WishlistItem)
            .filter(WishlistItem.source_bookmark_id == bookmark_id)
            .all()
        )

    def update_wishlist_layouts(self, layouts: list[dict]) -> int:
        """
        Update grid layout positions for multiple wishlist items.

        Args:
            layouts: List of dicts with id, grid_x, grid_y, col_span, row_span

        Returns:
            Number of items updated
        """
        updated = 0
        for layout in layouts:
            item = self.get_wishlist_item(layout["id"])
            if item:
                item.grid_x = layout.get("grid_x", 0)
                item.grid_y = layout.get("grid_y", 0)
                item.col_span = layout.get("col_span", 1)
                item.row_span = layout.get("row_span", 1)
                item.updated_at = datetime.utcnow()
                updated += 1
        return updated

    # === Wishlist Config ===

    def get_wishlist_config(self) -> WishlistConfig:
        """Get or create wishlist configuration."""
        config = self.session.query(WishlistConfig).first()
        if not config:
            config = WishlistConfig(id=1)
            self.session.add(config)
            self.session.flush()
        return config

    def update_wishlist_config(self, **kwargs) -> WishlistConfig:
        """Update wishlist configuration fields."""
        config = self.get_wishlist_config()
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)
        return config

    def is_wishlist_configured(self) -> bool:
        """Check if wishlist has been configured."""
        config = self.session.query(WishlistConfig).first()
        return config is not None and config.is_configured

    def mark_wishlist_configured(self) -> WishlistConfig:
        """Mark wishlist as configured."""
        config = self.get_wishlist_config()
        config.is_configured = True
        return config

    def reset_wishlist_config(self) -> dict:
        """Reset wishlist configuration to defaults."""
        config = self.get_wishlist_config()
        config.default_category_group_id = None
        config.default_category_group_name = None
        config.selected_browser = None
        config.selected_folder_ids = None
        config.auto_archive_on_bookmark_delete = True
        config.auto_archive_on_goal_met = True
        config.is_configured = False
        return {"success": True}

    # === Pending Bookmarks ===

    def get_pending_bookmarks(self) -> list[PendingBookmark]:
        """Get all pending bookmarks (status='pending')."""
        return (
            self.session.query(PendingBookmark)
            .filter(PendingBookmark.status == "pending")
            .order_by(PendingBookmark.created_at.desc())
            .all()
        )

    def get_pending_bookmarks_count(self) -> int:
        """Get count of pending bookmarks."""
        return (
            self.session.query(PendingBookmark).filter(PendingBookmark.status == "pending").count()
        )

    def get_pending_bookmark_by_id(self, bookmark_id: str) -> PendingBookmark | None:
        """Get pending bookmark by ID."""
        return self.session.query(PendingBookmark).filter(PendingBookmark.id == bookmark_id).first()

    def get_pending_bookmark_by_url(self, url: str) -> PendingBookmark | None:
        """Get pending bookmark by URL (for deduplication)."""
        return self.session.query(PendingBookmark).filter(PendingBookmark.url == url).first()

    def create_pending_bookmark(
        self,
        url: str,
        name: str,
        bookmark_id: str,
        browser_type: str,
        logo_url: str | None = None,
    ) -> PendingBookmark:
        """Create a new pending bookmark."""
        pending = PendingBookmark(
            id=str(uuid.uuid4()),
            url=url,
            name=name,
            bookmark_id=bookmark_id,
            browser_type=browser_type,
            logo_url=logo_url,
            status="pending",
            created_at=datetime.utcnow(),
        )
        self.session.add(pending)
        return pending

    def skip_pending_bookmark(self, bookmark_id: str) -> PendingBookmark | None:
        """Mark a pending bookmark as skipped."""
        pending = self.get_pending_bookmark_by_id(bookmark_id)
        if pending:
            pending.status = "skipped"
            pending.skipped_at = datetime.utcnow()
        return pending

    def convert_pending_bookmark(
        self,
        bookmark_id: str,
        wishlist_item_id: str | None = None,
    ) -> PendingBookmark | None:
        """Mark a pending bookmark as converted to wishlist item."""
        pending = self.get_pending_bookmark_by_id(bookmark_id)
        if pending:
            pending.status = "converted"
            if wishlist_item_id:
                pending.wishlist_item_id = wishlist_item_id
            pending.converted_at = datetime.utcnow()
        return pending

    def import_bookmarks_batch(self, bookmarks: list[dict]) -> dict:
        """
        Import a batch of bookmarks, skipping duplicates.

        Each bookmark dict should have: url, name, bookmark_id, browser_type, logo_url (optional)
        Returns count of imported and skipped.
        """
        imported = 0
        skipped = 0

        for bm in bookmarks:
            url = bm.get("url")
            if not url:
                continue

            # Check if URL already exists (any status)
            existing = self.get_pending_bookmark_by_url(url)
            if existing:
                skipped += 1
                continue

            self.create_pending_bookmark(
                url=url,
                name=bm.get("name", "Untitled"),
                bookmark_id=bm.get("bookmark_id", ""),
                browser_type=bm.get("browser_type", "unknown"),
                logo_url=bm.get("logo_url"),
            )
            imported += 1

        return {"imported": imported, "skipped_existing": skipped}

    def is_url_skipped(self, url: str) -> bool:
        """Check if a URL has been skipped."""
        pending = self.get_pending_bookmark_by_url(url)
        return pending is not None and pending.status == "skipped"

    def get_skipped_bookmarks(self) -> list[PendingBookmark]:
        """Get all skipped bookmarks."""
        return (
            self.session.query(PendingBookmark)
            .filter(PendingBookmark.status == "skipped")
            .order_by(PendingBookmark.skipped_at.desc())
            .all()
        )

    def delete_pending_bookmark(self, bookmark_id: str) -> bool:
        """Delete a pending bookmark."""
        result = (
            self.session.query(PendingBookmark).filter(PendingBookmark.id == bookmark_id).delete()
        )
        return result > 0

    def clear_unconverted_bookmarks(self) -> int:
        """
        Delete all pending and skipped bookmarks.

        Preserves converted bookmarks since they're linked to wishlist items.
        Returns the number of deleted bookmarks.
        """
        result = (
            self.session.query(PendingBookmark)
            .filter(PendingBookmark.status.in_(["pending", "skipped"]))
            .delete(synchronize_session="fetch")
        )
        return result
