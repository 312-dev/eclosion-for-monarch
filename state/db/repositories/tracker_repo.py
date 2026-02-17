"""
Tracker state repository.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from state.db.models import (
    Category,
    EnabledItem,
    MonarchGoalLayout,
    PendingBookmark,
    RefundsConfig,
    RefundsMatch,
    RefundsSavedView,
    RemovedItemNotice,
    Rollup,
    RollupItem,
    StashHypothesis,
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
        config.last_sync = datetime.now(UTC)

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
        now = datetime.now(UTC)
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
            category.last_synced_at = datetime.now(UTC)
        return category

    def update_category_name(self, recurring_id: str, name: str) -> Category | None:
        """Update category name."""
        category = self.get_category(recurring_id)
        if category:
            category.name = name
            category.last_synced_at = datetime.now(UTC)
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
                created_at=datetime.now(UTC),
                last_synced_at=datetime.now(UTC),
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

    def add_to_rollup(self, recurring_id: str) -> Rollup:
        """Add item to rollup. Only tracks membership - does not auto-budget."""
        if not self.is_in_rollup(recurring_id):
            self.session.add(RollupItem(recurring_id=recurring_id, rollup_id=1))
            rollup = self.get_rollup()
            rollup.last_updated_at = datetime.now(UTC)
        return self.get_rollup()

    def remove_from_rollup(self, recurring_id: str) -> Rollup:
        """Remove item from rollup. Only tracks membership - does not auto-budget."""
        self.session.query(RollupItem).filter(RollupItem.recurring_id == recurring_id).delete()
        rollup = self.get_rollup()
        rollup.last_updated_at = datetime.now(UTC)
        return rollup

    def toggle_rollup_enabled(self, enabled: bool) -> Rollup:
        """Enable or disable rollup."""
        rollup = self.get_rollup()
        rollup.enabled = enabled
        if enabled and not rollup.created_at:
            rollup.created_at = datetime.now(UTC)
        rollup.last_updated_at = datetime.now(UTC)
        return rollup

    def set_rollup_category_id(self, category_id: str) -> Rollup:
        """Set Monarch category ID for rollup."""
        rollup = self.get_rollup()
        rollup.monarch_category_id = category_id
        rollup.last_updated_at = datetime.now(UTC)
        return rollup

    def set_rollup_budget(self, amount: float) -> Rollup:
        """Set rollup budget amount."""
        rollup = self.get_rollup()
        rollup.total_budgeted = amount
        rollup.last_updated_at = datetime.now(UTC)
        return rollup

    def update_rollup_emoji(self, emoji: str) -> Rollup:
        """Update rollup emoji."""
        rollup = self.get_rollup()
        rollup.emoji = emoji
        rollup.last_updated_at = datetime.now(UTC)
        return rollup

    def update_rollup_category_name(self, name: str) -> Rollup:
        """Update rollup category name."""
        rollup = self.get_rollup()
        rollup.category_name = name
        rollup.last_updated_at = datetime.now(UTC)
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
            removed_at=datetime.now(UTC),
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

    # === Stash ===

    def get_stash_item(self, item_id: str) -> WishlistItem | None:
        """Get stash item by ID."""
        return self.session.query(WishlistItem).filter(WishlistItem.id == item_id).first()

    def get_all_stash_items(self) -> list[WishlistItem]:
        """Get all stash items, ordered by sort_order then created_at."""
        return (
            self.session.query(WishlistItem)
            .order_by(WishlistItem.sort_order.asc(), WishlistItem.created_at.desc())
            .all()
        )

    def get_active_stash_items(self) -> list[WishlistItem]:
        """Get non-archived stash items, ordered by sort_order then created_at."""
        return (
            self.session.query(WishlistItem)
            .filter(WishlistItem.is_archived.is_(False))
            .order_by(WishlistItem.sort_order.asc(), WishlistItem.created_at.desc())
            .all()
        )

    def get_archived_stash_items(self) -> list[WishlistItem]:
        """Get archived stash items, ordered by archived_at."""
        return (
            self.session.query(WishlistItem)
            .filter(WishlistItem.is_archived.is_(True))
            .order_by(WishlistItem.archived_at.desc())
            .all()
        )

    def create_stash_item(
        self,
        item_id: str,
        name: str,
        amount: float | None,
        target_date: str | None,
        category_group_id: str | None = None,
        category_group_name: str | None = None,
        **kwargs,
    ) -> WishlistItem:
        """
        Create a new stash item.

        New items are automatically positioned at the end of the grid
        (after all existing items) to ensure they appear before the
        "New Stash" button in the UI.
        """
        # Calculate grid position: place at the end of existing items
        # Find the maximum grid_y + row_span across all active items
        existing_items = (
            self.session.query(WishlistItem).filter(WishlistItem.is_archived.is_(False)).all()
        )

        max_grid_y = 0
        for existing in existing_items:
            item_bottom = (existing.grid_y or 0) + (existing.row_span or 1)
            max_grid_y = max(max_grid_y, item_bottom)

        # Set default grid position if not provided in kwargs
        if "grid_x" not in kwargs:
            kwargs["grid_x"] = 0
        if "grid_y" not in kwargs:
            kwargs["grid_y"] = max_grid_y

        item = WishlistItem(
            id=item_id,
            name=name,
            amount=amount,
            target_date=target_date,
            category_group_id=category_group_id,
            category_group_name=category_group_name,
            created_at=datetime.now(UTC),
            **kwargs,
        )
        self.session.add(item)
        return item

    def update_stash_item(
        self,
        item_id: str,
        **kwargs,
    ) -> WishlistItem | None:
        """Update stash item fields."""
        item = self.get_stash_item(item_id)
        if not item:
            return None

        for key, value in kwargs.items():
            if hasattr(item, key):
                setattr(item, key, value)

        item.updated_at = datetime.now(UTC)
        return item

    def delete_stash_item(self, item_id: str) -> bool:
        """Delete a stash item."""
        result = self.session.query(WishlistItem).filter(WishlistItem.id == item_id).delete()
        return result > 0

    def archive_stash_item(self, item_id: str) -> WishlistItem | None:
        """Archive a stash item."""
        item = self.get_stash_item(item_id)
        if item:
            item.is_archived = True
            item.archived_at = datetime.now(UTC)
            item.updated_at = datetime.now(UTC)
        return item

    def unarchive_stash_item(self, item_id: str) -> WishlistItem | None:
        """Unarchive a stash item."""
        item = self.get_stash_item(item_id)
        if item:
            item.is_archived = False
            item.archived_at = None
            item.updated_at = datetime.now(UTC)
        return item

    def set_stash_category(
        self,
        item_id: str,
        monarch_category_id: str,
    ) -> WishlistItem | None:
        """Set the Monarch category ID for a stash item."""
        item = self.get_stash_item(item_id)
        if item:
            item.monarch_category_id = monarch_category_id
            item.updated_at = datetime.now(UTC)
        return item

    def update_stash_group(
        self,
        item_id: str,
        group_id: str,
        group_name: str,
    ) -> WishlistItem | None:
        """Update the category group for a stash item."""
        item = self.get_stash_item(item_id)
        if item:
            item.category_group_id = group_id
            item.category_group_name = group_name
            item.updated_at = datetime.now(UTC)
        return item

    def get_stash_items_by_category_id(self, category_id: str) -> list[WishlistItem]:
        """Get stash items by Monarch category ID."""
        return (
            self.session.query(WishlistItem)
            .filter(WishlistItem.monarch_category_id == category_id)
            .all()
        )

    def get_stash_items_by_bookmark_id(self, bookmark_id: str) -> list[WishlistItem]:
        """Get stash items by source bookmark ID."""
        return (
            self.session.query(WishlistItem)
            .filter(WishlistItem.source_bookmark_id == bookmark_id)
            .all()
        )

    def update_stash_layouts(self, layouts: list[dict]) -> int:
        """
        Update grid layout positions and sort order for multiple stash items.

        Args:
            layouts: List of dicts with id, grid_x, grid_y, col_span, row_span, sort_order

        Returns:
            Number of items updated
        """
        import logging

        logger = logging.getLogger(__name__)

        updated = 0
        for layout in layouts:
            item = self.get_stash_item(layout["id"])
            if item:
                item.grid_x = layout.get("grid_x", 0)
                item.grid_y = layout.get("grid_y", 0)
                item.col_span = layout.get("col_span", 1)
                item.row_span = layout.get("row_span", 1)
                item.sort_order = layout.get("sort_order", 0)
                item.updated_at = datetime.now(UTC)
                logger.debug(
                    "[TrackerRepo] update_stash_layouts: item %s updated",
                    item.id,
                )
                updated += 1
            else:
                logger.warning("[TrackerRepo] update_stash_layouts: item not found")
        return updated

    # === Monarch Goal Layouts ===

    def get_monarch_goal_layout(self, goal_id: str) -> MonarchGoalLayout | None:
        """
        Get layout for a specific Monarch goal.

        Args:
            goal_id: Monarch goal ID

        Returns:
            MonarchGoalLayout or None if not found
        """
        return self.session.query(MonarchGoalLayout).filter_by(goal_id=goal_id).first()

    def get_all_monarch_goal_layouts(self) -> list[MonarchGoalLayout]:
        """
        Get all Monarch goal layouts, ordered by sort_order.

        Returns:
            List of all goal layouts
        """
        return (
            self.session.query(MonarchGoalLayout).order_by(MonarchGoalLayout.sort_order.asc()).all()
        )

    def upsert_monarch_goal_layout(
        self,
        goal_id: str,
        grid_x: int,
        grid_y: int,
        col_span: int,
        row_span: int,
        sort_order: int = 0,
    ) -> MonarchGoalLayout:
        """
        Create or update layout for a Monarch goal.

        Args:
            goal_id: Monarch goal ID
            grid_x: Grid X position
            grid_y: Grid Y position
            col_span: Column span
            row_span: Row span
            sort_order: Sequential order for display

        Returns:
            Created or updated MonarchGoalLayout
        """
        layout = self.get_monarch_goal_layout(goal_id)
        if layout:
            layout.grid_x = grid_x
            layout.grid_y = grid_y
            layout.col_span = col_span
            layout.row_span = row_span
            layout.sort_order = sort_order
            layout.updated_at = datetime.now(UTC)
        else:
            layout = MonarchGoalLayout(
                goal_id=goal_id,
                grid_x=grid_x,
                grid_y=grid_y,
                col_span=col_span,
                row_span=row_span,
                sort_order=sort_order,
            )
            self.session.add(layout)
        return layout

    def update_monarch_goal_layouts(self, layouts: list[dict]) -> int:
        """
        Update grid layout positions and sort order for multiple Monarch goals.

        Args:
            layouts: List of dicts with goal_id, grid_x, grid_y, col_span, row_span, sort_order

        Returns:
            Number of layouts updated
        """
        updated = 0
        for layout_data in layouts:
            goal_id = layout_data["goal_id"]
            self.upsert_monarch_goal_layout(
                goal_id=goal_id,
                grid_x=layout_data.get("grid_x", 0),
                grid_y=layout_data.get("grid_y", 0),
                col_span=layout_data.get("col_span", 1),
                row_span=layout_data.get("row_span", 1),
                sort_order=layout_data.get("sort_order", 0),
            )
            updated += 1
        return updated

    # === Stash Config ===

    def get_stash_config(self) -> WishlistConfig:
        """Get or create stash configuration."""
        config = self.session.query(WishlistConfig).first()
        if not config:
            config = WishlistConfig(id=1)
            self.session.add(config)
            self.session.flush()
        return config

    def update_stash_config(self, **kwargs) -> WishlistConfig:
        """Update stash configuration fields."""
        config = self.get_stash_config()
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)
        return config

    def is_stash_configured(self) -> bool:
        """Check if stash has been configured."""
        config = self.session.query(WishlistConfig).first()
        return config is not None and config.is_configured

    def mark_stash_configured(self) -> WishlistConfig:
        """Mark stash as configured."""
        config = self.get_stash_config()
        config.is_configured = True
        return config

    def reset_stash_config(self) -> dict:
        """Reset stash configuration to defaults."""
        config = self.get_stash_config()
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
            created_at=datetime.now(UTC),
        )
        self.session.add(pending)
        return pending

    def skip_pending_bookmark(self, bookmark_id: str) -> PendingBookmark | None:
        """Mark a pending bookmark as skipped."""
        pending = self.get_pending_bookmark_by_id(bookmark_id)
        if pending:
            pending.status = "skipped"
            pending.skipped_at = datetime.now(UTC)
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
            pending.converted_at = datetime.now(UTC)
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

    def update_bookmark_favicons(self, updates: list[dict]) -> int:
        """
        Batch update favicons for pending bookmarks.

        Each update dict should have: id, logo_url
        Returns count of updated bookmarks.
        """
        updated = 0
        for update in updates:
            bookmark_id = update.get("id")
            logo_url = update.get("logo_url")
            if not bookmark_id or not logo_url:
                continue

            pending = self.get_pending_bookmark_by_id(bookmark_id)
            if pending and not pending.logo_url:
                pending.logo_url = logo_url
                updated += 1

        return updated

    # === Stash Hypotheses ===

    def get_all_hypotheses(self) -> list[StashHypothesis]:
        """Get all saved hypotheses, ordered by updated_at (most recent first)."""
        return self.session.query(StashHypothesis).order_by(StashHypothesis.updated_at.desc()).all()

    def get_hypothesis(self, hypothesis_id: str) -> StashHypothesis | None:
        """Get a hypothesis by ID."""
        return (
            self.session.query(StashHypothesis).filter(StashHypothesis.id == hypothesis_id).first()
        )

    def get_hypothesis_by_name(self, name: str) -> StashHypothesis | None:
        """Get a hypothesis by name (case-insensitive)."""
        return self.session.query(StashHypothesis).filter(StashHypothesis.name.ilike(name)).first()

    def count_hypotheses(self) -> int:
        """Get the total count of saved hypotheses."""
        return self.session.query(StashHypothesis).count()

    def create_hypothesis(
        self,
        hypothesis_id: str,
        name: str,
        savings_allocations: str,
        savings_total: float,
        monthly_allocations: str,
        monthly_total: float,
        events: str,
        custom_available_funds: float | None = None,
        custom_left_to_budget: float | None = None,
        item_apys: str = "{}",
    ) -> StashHypothesis:
        """Create a new hypothesis."""
        hypothesis = StashHypothesis(
            id=hypothesis_id,
            name=name,
            savings_allocations=savings_allocations,
            savings_total=savings_total,
            monthly_allocations=monthly_allocations,
            monthly_total=monthly_total,
            events=events,
            custom_available_funds=custom_available_funds,
            custom_left_to_budget=custom_left_to_budget,
            item_apys=item_apys,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.session.add(hypothesis)
        return hypothesis

    def update_hypothesis(
        self,
        hypothesis_id: str,
        **kwargs,
    ) -> StashHypothesis | None:
        """Update a hypothesis by ID."""
        hypothesis = self.get_hypothesis(hypothesis_id)
        if not hypothesis:
            return None

        for key, value in kwargs.items():
            if hasattr(hypothesis, key):
                setattr(hypothesis, key, value)

        hypothesis.updated_at = datetime.now(UTC)
        return hypothesis

    def delete_hypothesis(self, hypothesis_id: str) -> bool:
        """Delete a hypothesis by ID."""
        result = (
            self.session.query(StashHypothesis).filter(StashHypothesis.id == hypothesis_id).delete()
        )
        return result > 0

    def delete_all_hypotheses(self) -> int:
        """Delete all hypotheses. Returns number deleted."""
        result = self.session.query(StashHypothesis).delete()
        return result

    # === Refunds Config ===

    def get_refunds_config(self) -> RefundsConfig:
        """Get or create refunds configuration."""
        config = self.session.query(RefundsConfig).first()
        if not config:
            config = RefundsConfig(id=1)
            self.session.add(config)
            self.session.flush()
        return config

    def update_refunds_config(self, **kwargs: object) -> RefundsConfig:
        """Update refunds configuration fields."""
        config = self.get_refunds_config()
        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.updated_at = datetime.now(UTC)
        return config

    # === Refunds Saved Views ===

    def get_refunds_views(self) -> list[RefundsSavedView]:
        """Get all saved views ordered by sort_order."""
        return self.session.query(RefundsSavedView).order_by(RefundsSavedView.sort_order).all()

    def get_refunds_view(self, view_id: str) -> RefundsSavedView | None:
        """Get a saved view by ID."""
        return self.session.query(RefundsSavedView).filter(RefundsSavedView.id == view_id).first()

    def create_refunds_view(
        self,
        name: str,
        tag_ids: str,
        category_ids: str | None = None,
        exclude_from_all: bool = False,
    ) -> RefundsSavedView:
        """Create a new saved view. tag_ids/category_ids are JSON array strings."""
        # Get next sort order
        max_order = (
            self.session.query(RefundsSavedView.sort_order)
            .order_by(RefundsSavedView.sort_order.desc())
            .first()
        )
        next_order = (max_order[0] + 1) if max_order else 0

        view = RefundsSavedView(
            id=str(uuid.uuid4()),
            name=name,
            tag_ids=tag_ids,
            category_ids=category_ids,
            sort_order=next_order,
            exclude_from_all=exclude_from_all,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.session.add(view)
        return view

    def update_refunds_view(
        self,
        view_id: str,
        **kwargs: object,
    ) -> RefundsSavedView | None:
        """Update a saved view by ID."""
        view = self.get_refunds_view(view_id)
        if not view:
            return None
        for key, value in kwargs.items():
            if hasattr(view, key):
                setattr(view, key, value)
        view.updated_at = datetime.now(UTC)
        return view

    def delete_refunds_view(self, view_id: str) -> bool:
        """Delete a saved view by ID."""
        result = (
            self.session.query(RefundsSavedView).filter(RefundsSavedView.id == view_id).delete()
        )
        return result > 0

    def reorder_refunds_views(self, view_ids: list[str]) -> None:
        """Reorder saved views by setting sort_order based on list position."""
        for i, view_id in enumerate(view_ids):
            view = self.get_refunds_view(view_id)
            if view:
                view.sort_order = i
                view.updated_at = datetime.now(UTC)

    # === Refunds Matches ===

    def get_refunds_matches(self) -> list[RefundsMatch]:
        """Get all refund matches."""
        return self.session.query(RefundsMatch).order_by(RefundsMatch.created_at.desc()).all()

    def get_refunds_match_by_original(self, original_transaction_id: str) -> RefundsMatch | None:
        """Get a match by original transaction ID."""
        return (
            self.session.query(RefundsMatch)
            .filter(RefundsMatch.original_transaction_id == original_transaction_id)
            .first()
        )

    def create_refunds_match(
        self,
        original_transaction_id: str,
        refund_transaction_id: str | None = None,
        refund_amount: float | None = None,
        refund_merchant: str | None = None,
        refund_date: str | None = None,
        refund_account: str | None = None,
        skipped: bool = False,
        expected_refund: bool = False,
        expected_date: str | None = None,
        expected_account: str | None = None,
        expected_account_id: str | None = None,
        expected_note: str | None = None,
        expected_amount: float | None = None,
        transaction_data: str | None = None,
    ) -> RefundsMatch:
        """Create a new refund match."""
        match = RefundsMatch(
            id=str(uuid.uuid4()),
            original_transaction_id=original_transaction_id,
            refund_transaction_id=refund_transaction_id,
            refund_amount=refund_amount,
            refund_merchant=refund_merchant,
            refund_date=refund_date,
            refund_account=refund_account,
            skipped=skipped,
            expected_refund=expected_refund,
            expected_date=expected_date,
            expected_account=expected_account,
            expected_account_id=expected_account_id,
            expected_note=expected_note,
            expected_amount=expected_amount,
            transaction_data=transaction_data,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.session.add(match)
        return match

    def delete_refunds_match(self, match_id: str) -> bool:
        """Delete a refund match by ID."""
        result = self.session.query(RefundsMatch).filter(RefundsMatch.id == match_id).delete()
        return result > 0
