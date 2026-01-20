"""
Wishlist Service

Manages wishlist savings goals - one-time purchase items that users save towards.
Each wishlist item is linked to a Monarch category for budget tracking.
"""

import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Debug: Add file handler for dev.log
_dev_log_path = Path(__file__).parent.parent / "dev.log"
_dev_handler = logging.FileHandler(str(_dev_log_path))
_dev_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(_dev_handler)
logger.setLevel(logging.DEBUG)

from monarch_utils import clear_cache, get_mm, get_month_range, retry_with_backoff
from services.category_manager import CategoryManager
from state.db import db_session
from state.db.repositories import TrackerRepository


def round_monthly_rate(rate: float) -> int:
    """
    Round monthly rate using standard rounding with minimum of $1.

    This matches the frontend calculation logic exactly.
    """
    if rate <= 0:
        return 0
    return max(1, round(rate))


def months_between(start_date: str, end_date: str) -> int:
    """
    Calculate months between two date strings (YYYY-MM-DD format).

    Returns 0 if end_date is in the same month or earlier than start_date.
    """
    start = datetime.strptime(start_date[:7], "%Y-%m")
    end = datetime.strptime(end_date[:7], "%Y-%m")

    months = (end.year - start.year) * 12 + (end.month - start.month)
    return max(0, months)


def calculate_wishlist_monthly_target(
    amount: float,
    current_balance: float,
    target_date: str,
    current_month: str | None = None,
) -> int:
    """
    Calculate monthly savings target for a wishlist item.

    Logic:
    - If already funded (balance >= amount), return 0
    - If target is this month, return full shortfall
    - Otherwise spread over remaining months + 1 (includes this month)
    """
    shortfall = max(0, amount - current_balance)
    if shortfall <= 0:
        return 0

    # Use current month if not provided
    if current_month is None:
        current_month = datetime.now().strftime("%Y-%m-01")
    else:
        # Ensure it's a full date string
        if len(current_month) == 7:
            current_month = f"{current_month}-01"

    months_remaining = months_between(current_month, target_date)

    # This month = full amount
    if months_remaining <= 0:
        return round_monthly_rate(shortfall)

    # Spread over remaining months + this month
    return round_monthly_rate(shortfall / (months_remaining + 1))


def get_item_status(
    current_balance: float,
    amount: float,
    planned_budget: int,
    monthly_target: int,
) -> str:
    """
    Calculate display status for a wishlist item.

    Priority:
    1. Funded if balance >= amount
    2. Ahead if budget > target
    3. On track if budget >= target
    4. Behind otherwise
    """
    if current_balance >= amount:
        return "funded"
    if planned_budget > monthly_target:
        return "ahead"
    if planned_budget >= monthly_target:
        return "on_track"
    return "behind"


class WishlistService:
    """Service for managing wishlist savings goals."""

    def __init__(self):
        self.category_manager = CategoryManager()

    async def get_dashboard_data(self) -> dict[str, Any]:
        """
        Get all wishlist items with computed fields.

        Returns items with:
        - Monthly target calculated from shortfall and months remaining
        - Current balance and budget from Monarch
        - Progress percentage
        - Status (funded, on_track, ahead, behind)
        """
        # Extract item data inside session to avoid DetachedInstanceError
        with db_session() as session:
            repo = TrackerRepository(session)
            db_items = repo.get_all_wishlist_items()
            # Convert to dicts while session is still open
            items = [
                {
                    "id": item.id,
                    "name": item.name,
                    "amount": item.amount,
                    "target_date": item.target_date,
                    "emoji": item.emoji,
                    "monarch_category_id": item.monarch_category_id,
                    "category_group_id": item.category_group_id,
                    "category_group_name": item.category_group_name,
                    "source_url": item.source_url,
                    "source_bookmark_id": item.source_bookmark_id,
                    "logo_url": item.logo_url,
                    "custom_image_path": item.custom_image_path,
                    "is_archived": item.is_archived,
                    "archived_at": item.archived_at,
                    "created_at": item.created_at,
                    # Grid layout fields
                    "grid_x": item.grid_x,
                    "grid_y": item.grid_y,
                    "col_span": item.col_span,
                    "row_span": item.row_span,
                }
                for item in db_items
            ]

        if not items:
            return {
                "items": [],
                "archived_items": [],
                "total_target": 0,
                "total_saved": 0,
                "total_monthly_target": 0,
            }

        # Get budget data for all categories
        budget_data = await self.category_manager.get_all_category_budget_data()
        current_month = datetime.now().strftime("%Y-%m-01")

        active_items = []
        archived_items = []
        total_monthly_target = 0
        total_target = 0
        total_saved = 0

        for item in items:
            # Get balance and budget from Monarch if category exists
            current_balance = 0.0
            rollover_balance = 0.0
            planned_budget = 0

            if item["monarch_category_id"] and item["monarch_category_id"] in budget_data:
                cat_data = budget_data[item["monarch_category_id"]]
                current_balance = cat_data.get("remaining", 0)
                rollover_balance = cat_data.get("rollover", 0)
                planned_budget = int(cat_data.get("budgeted", 0))
                # Debug: log balance retrieval for all items
                logger.info(
                    f"[Wishlist] {item['name']}: remaining={current_balance}, "
                    f"rollover={rollover_balance}, budgeted={planned_budget}"
                )
            elif item["monarch_category_id"]:
                # Category ID exists but not found in budget data
                logger.warning(
                    f"[Wishlist] {item['name']}: monarch_category_id {item['monarch_category_id']} "
                    f"NOT in budget_data (budget_data has {len(budget_data)} categories)"
                )
            else:
                # No category linked
                logger.debug(f"[Wishlist] {item['name']}: no monarch_category_id linked")

            # Calculate monthly target using rollover (start of month balance)
            # This ensures the target doesn't change when you budget
            monthly_target = calculate_wishlist_monthly_target(
                amount=item["amount"],
                current_balance=rollover_balance,
                target_date=item["target_date"],
                current_month=current_month,
            )

            # Calculate progress
            progress_percent = 0.0
            if item["amount"] > 0:
                progress_percent = min(100.0, (current_balance / item["amount"]) * 100)

            # Calculate shortfall
            shortfall = max(0, monthly_target - planned_budget)

            # Calculate months remaining
            months_remaining = months_between(current_month, item["target_date"])

            # Calculate status
            status = get_item_status(current_balance, item["amount"], planned_budget, monthly_target)

            result_item = {
                "type": "wishlist",
                "id": item["id"],
                "name": item["name"],
                "amount": item["amount"],
                "target_date": item["target_date"],
                "emoji": item["emoji"],
                "category_id": item["monarch_category_id"],
                "category_name": item["name"],  # Category name matches item name
                "category_group_id": item["category_group_id"],
                "category_group_name": item["category_group_name"],
                "source_url": item["source_url"],
                "source_bookmark_id": item["source_bookmark_id"],
                "logo_url": item["logo_url"],
                "custom_image_path": item["custom_image_path"],
                "is_archived": item["is_archived"],
                "archived_at": item["archived_at"].isoformat() if item["archived_at"] else None,
                "created_at": item["created_at"].isoformat() if item["created_at"] else None,
                # Computed fields
                "current_balance": current_balance,
                "planned_budget": planned_budget,
                "monthly_target": monthly_target,
                "progress_percent": progress_percent,
                "shortfall": shortfall,
                "months_remaining": months_remaining,
                "status": status,
                "is_enabled": item["monarch_category_id"] is not None,
                # Grid layout fields (sort_order is legacy, grid fields are primary)
                "sort_order": 0,
                "grid_x": item["grid_x"],
                "grid_y": item["grid_y"],
                "col_span": item["col_span"],
                "row_span": item["row_span"],
            }

            if item["is_archived"]:
                archived_items.append(result_item)
            else:
                active_items.append(result_item)
                total_monthly_target += monthly_target
                total_target += item["amount"]
                total_saved += current_balance

        return {
            "items": active_items,
            "archived_items": archived_items,
            "total_target": total_target,
            "total_saved": total_saved,
            "total_monthly_target": total_monthly_target,
        }

    async def create_item(
        self,
        name: str,
        amount: float,
        target_date: str,
        category_group_id: str | None = None,
        existing_category_id: str | None = None,
        emoji: str = "🎯",
        source_url: str | None = None,
        source_bookmark_id: str | None = None,
        logo_url: str | None = None,
        custom_image_path: str | None = None,
    ) -> dict[str, Any]:
        """
        Create a new wishlist item with a Monarch category.

        Two modes:
        1. Create new category: Provide category_group_id
        2. Link to existing: Provide existing_category_id

        Steps:
        1. Generate unique ID
        2. Create or link Monarch category
        3. Set initial budget based on monthly target
        4. Store item in database
        """
        item_id = str(uuid.uuid4())

        if existing_category_id:
            # Link to existing category
            cat_info = await self.category_manager.find_category_by_id(existing_category_id)
            if not cat_info:
                return {"success": False, "error": "Category not found in Monarch"}

            # Check if category is already used by another wishlist item
            with db_session() as session:
                repo = TrackerRepository(session)
                existing_items = repo.get_all_wishlist_items()
                for item in existing_items:
                    if item.monarch_category_id == existing_category_id:
                        return {
                            "success": False,
                            "error": f"Category already used by wishlist item '{item.name}'",
                        }

            # Use the existing category
            category_id = existing_category_id
            group_id = cat_info.get("group_id")
            group_name = cat_info.get("group_name")

            # Get current balance from existing category
            budget_data = await self.category_manager.get_all_category_budget_data()
            current_balance = budget_data.get(category_id, {}).get("remaining", 0.0)
        else:
            # Create new category mode
            if not category_group_id:
                return {"success": False, "error": "Missing category_group_id"}

            # Get category group name for storage
            groups = await self.category_manager.get_category_groups()
            group_name = None
            for g in groups:
                if g["id"] == category_group_id:
                    group_name = g["name"]
                    break

            # Create Monarch category
            category_id = await self.category_manager.create_category(
                group_id=category_group_id,
                name=name,
                icon=emoji,
            )
            group_id = category_group_id
            current_balance = 0.0

        # Calculate initial monthly target and set budget
        current_month = datetime.now().strftime("%Y-%m-01")
        monthly_target = calculate_wishlist_monthly_target(
            amount=amount,
            current_balance=current_balance,
            target_date=target_date,
            current_month=current_month,
        )

        # Set initial budget (only if creating new or target > 0)
        if monthly_target > 0:
            await self.category_manager.set_category_budget(category_id, monthly_target)

        # Store in database
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.create_wishlist_item(
                item_id=item_id,
                name=name,
                amount=amount,
                target_date=target_date,
                category_group_id=group_id,
                category_group_name=group_name,
                emoji=emoji,
                monarch_category_id=category_id,
                source_url=source_url,
                source_bookmark_id=source_bookmark_id,
                logo_url=logo_url,
                custom_image_path=custom_image_path,
            )

        return {
            "success": True,
            "id": item_id,
            "category_id": category_id,
            "monthly_target": monthly_target,
            "linked_existing": existing_category_id is not None,
        }

    async def update_item(
        self,
        item_id: str,
        **updates,
    ) -> dict[str, Any]:
        """
        Update a wishlist item.

        Supports updating: name, amount, target_date, emoji, source_url, custom_image_path
        If name or emoji changes, also updates the Monarch category.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_wishlist_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            # Update Monarch category if name or emoji changed
            if item.monarch_category_id:
                new_name = updates.get("name")
                new_emoji = updates.get("emoji")

                if new_name and new_name != item.name:
                    await self.category_manager.rename_category(
                        category_id=item.monarch_category_id,
                        new_name=new_name,
                        icon=new_emoji or item.emoji,
                    )
                elif new_emoji and new_emoji != item.emoji:
                    await self.category_manager.update_category_icon(
                        category_id=item.monarch_category_id,
                        icon=new_emoji,
                    )

            # Update database record
            repo.update_wishlist_item(item_id, **updates)

        return {"success": True, "id": item_id}

    async def delete_item(
        self,
        item_id: str,
        delete_category: bool = False,
    ) -> dict[str, Any]:
        """
        Delete a wishlist item.

        Optionally deletes the Monarch category as well.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_wishlist_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            category_id = item.monarch_category_id

            # Delete from database
            repo.delete_wishlist_item(item_id)

        # Optionally delete Monarch category
        if delete_category and category_id:
            await self.category_manager.delete_category(category_id)

        return {"success": True, "id": item_id}

    async def archive_item(self, item_id: str) -> dict[str, Any]:
        """
        Archive a wishlist item.

        The item and its Monarch category are kept, but marked as archived.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.archive_wishlist_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

        return {"success": True, "id": item_id}

    async def unarchive_item(self, item_id: str) -> dict[str, Any]:
        """
        Unarchive a wishlist item.

        If the linked Monarch category no longer exists, returns category_missing=True
        so the frontend can prompt the user to select a new category.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_wishlist_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            # Check if the Monarch category still exists
            category_missing = False
            if item.monarch_category_id:
                category_info = await self.category_manager.find_category_by_id(
                    item.monarch_category_id
                )
                if category_info is None:
                    category_missing = True
                    # Clear the invalid category reference
                    repo.update_wishlist_item(
                        item_id,
                        monarch_category_id=None,
                        category_group_id=None,
                        category_group_name=None,
                    )

            # Unarchive the item
            repo.unarchive_wishlist_item(item_id)

        return {
            "success": True,
            "id": item_id,
            "category_missing": category_missing,
        }

    async def allocate_funds(
        self,
        item_id: str,
        amount: int,
    ) -> dict[str, Any]:
        """
        Set the budget amount for a wishlist item's category.

        This directly sets the budget (not an incremental change).
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_wishlist_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            if not item.monarch_category_id:
                return {"success": False, "error": "Item has no linked category"}

            # Extract category ID while session is open
            category_id = item.monarch_category_id

        # Set budget in Monarch
        await self.category_manager.set_category_budget(category_id, amount)

        # Clear caches
        clear_cache("budget")

        return {"success": True, "id": item_id, "new_budget": amount}

    async def change_category_group(
        self,
        item_id: str,
        new_group_id: str,
        new_group_name: str,
    ) -> dict[str, Any]:
        """
        Move a wishlist item's category to a different group.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_wishlist_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            if not item.monarch_category_id:
                return {"success": False, "error": "Item has no linked category"}

            # Extract category ID while session is open
            category_id = item.monarch_category_id

        # Move category in Monarch (outside session to avoid blocking DB)
        await self.category_manager.update_category_group(
            category_id=category_id,
            new_group_id=new_group_id,
        )

        # Update database in separate session
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_wishlist_group(item_id, new_group_id, new_group_name)

        return {"success": True, "id": item_id}

    async def link_category(
        self,
        item_id: str,
        category_group_id: str | None = None,
        existing_category_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Link a category to an existing wishlist item.

        Used when restoring an archived item whose category was deleted,
        or when the user wants to change the linked category.

        Either creates a new category in the specified group, or links
        to an existing category.

        Args:
            item_id: Wishlist item ID
            category_group_id: Category group to create new category in
            existing_category_id: Existing category ID to link to

        Returns:
            Success status with category info
        """
        if not category_group_id and not existing_category_id:
            return {"success": False, "error": "Must provide category_group_id or existing_category_id"}
        if category_group_id and existing_category_id:
            return {"success": False, "error": "Cannot provide both category_group_id and existing_category_id"}

        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_wishlist_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            # Get item data while session is open
            item_name = item.name
            item_emoji = item.emoji or "🎯"
            item_amount = item.amount
            item_target_date = item.target_date

        if existing_category_id:
            # Link to existing category
            category_info = await self.category_manager.find_category_by_id(existing_category_id)
            if not category_info:
                return {"success": False, "error": "Category not found"}

            # Enable rollover on the category
            await self.category_manager.enable_category_rollover(existing_category_id)

            # Update database with category info
            with db_session() as session:
                repo = TrackerRepository(session)
                repo.update_wishlist_item(
                    item_id,
                    monarch_category_id=existing_category_id,
                    category_group_id=category_info["group_id"],
                    category_group_name=category_info["group_name"],
                )

            return {
                "success": True,
                "id": item_id,
                "category_id": existing_category_id,
                "category_name": category_info["name"],
                "category_group_id": category_info["group_id"],
                "category_group_name": category_info["group_name"],
            }
        else:
            # Create new category in specified group
            groups = await self.category_manager.get_category_groups()
            group_name = None
            for g in groups:
                if g["id"] == category_group_id:
                    group_name = g["name"]
                    break

            if not group_name:
                return {"success": False, "error": "Category group not found"}

            # Create Monarch category
            category_id = await self.category_manager.create_category(
                group_id=category_group_id,
                name=item_name,
                icon=item_emoji,
            )

            # Calculate and set initial budget
            current_month = datetime.now().strftime("%Y-%m-01")
            monthly_target = calculate_wishlist_monthly_target(
                amount=item_amount,
                current_balance=0,  # New category starts with 0 balance
                target_date=item_target_date,
                current_month=current_month,
            )

            if monthly_target > 0:
                await self.category_manager.set_category_budget(category_id, monthly_target)

            # Update database with category info
            with db_session() as session:
                repo = TrackerRepository(session)
                repo.update_wishlist_item(
                    item_id,
                    monarch_category_id=category_id,
                    category_group_id=category_group_id,
                    category_group_name=group_name,
                )

            return {
                "success": True,
                "id": item_id,
                "category_id": category_id,
                "category_name": item_name,
                "category_group_id": category_group_id,
                "category_group_name": group_name,
                "monthly_target": monthly_target,
            }

    async def update_layouts(self, layouts: list[dict]) -> dict[str, Any]:
        """
        Update grid layout positions for multiple wishlist items.

        Args:
            layouts: List of dicts with id, grid_x, grid_y, col_span, row_span

        Returns:
            Success status and count of updated items
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            updated = repo.update_wishlist_layouts(layouts)

        return {"success": True, "updated": updated}

    async def sync_from_monarch(self) -> dict[str, Any]:
        """
        Sync wishlist items with Monarch to update balances and budgets.

        This pulls the latest balance and budget data for all wishlist categories.
        """
        # Get fresh budget data
        clear_cache("budget")
        budget_data = await self.category_manager.get_all_category_budget_data()

        with db_session() as session:
            repo = TrackerRepository(session)
            db_items = repo.get_all_wishlist_items()
            # Extract category IDs while session is open
            category_ids = [item.monarch_category_id for item in db_items]

        items_updated = 0
        for cat_id in category_ids:
            if cat_id and cat_id in budget_data:
                items_updated += 1

        return {
            "success": True,
            "items_updated": items_updated,
            "synced_at": datetime.now().isoformat(),
        }

    async def get_category_groups(self, force_refresh: bool = False) -> list[dict[str, str]]:
        """Get available category groups from Monarch."""
        return await self.category_manager.get_category_groups(force_refresh)

    async def get_config(self) -> dict[str, Any]:
        """
        Get wishlist configuration.

        Returns config with parsed folder_ids as array.
        Infers is_configured if browser and folder are set (handles pre-fix data).
        """
        import json

        with db_session() as session:
            repo = TrackerRepository(session)
            config = repo.get_wishlist_config()

            # Parse folder_ids from JSON string
            folder_ids = []
            if config.selected_folder_ids:
                try:
                    folder_ids = json.loads(config.selected_folder_ids)
                except json.JSONDecodeError:
                    folder_ids = []

            # Parse folder_names from JSON string
            folder_names = []
            if config.selected_folder_names:
                try:
                    folder_names = json.loads(config.selected_folder_names)
                except json.JSONDecodeError:
                    folder_names = []

            # Infer is_configured if browser and folder are set but flag wasn't
            # This handles configs created before the bug fix
            is_configured = config.is_configured
            if not is_configured and config.selected_browser and folder_ids:
                is_configured = True
                # Also update the database to fix the flag
                config.is_configured = True

            return {
                "is_configured": is_configured,
                "default_category_group_id": config.default_category_group_id,
                "default_category_group_name": config.default_category_group_name,
                "selected_browser": config.selected_browser,
                "selected_folder_ids": folder_ids,
                "selected_folder_names": folder_names,
                "auto_archive_on_bookmark_delete": config.auto_archive_on_bookmark_delete,
                "auto_archive_on_goal_met": config.auto_archive_on_goal_met,
            }

    async def update_config(self, **updates) -> dict[str, Any]:
        """
        Update wishlist configuration.

        Accepts any combination of config fields.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_wishlist_config(**updates)

        return {"success": True}

    async def reset_config(self) -> dict[str, Any]:
        """Reset wishlist configuration to defaults."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.reset_wishlist_config()

    # === Pending Bookmarks ===

    async def get_pending_bookmarks(self) -> dict[str, Any]:
        """
        Get all pending bookmarks awaiting review.

        Returns bookmarks that haven't been skipped or converted yet.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            pending = repo.get_pending_bookmarks()

            return {
                "bookmarks": [
                    {
                        "id": bm.id,
                        "url": bm.url,
                        "name": bm.name,
                        "bookmark_id": bm.bookmark_id,
                        "browser_type": bm.browser_type,
                        "logo_url": bm.logo_url,
                        "status": bm.status,
                        "created_at": bm.created_at.isoformat() if bm.created_at else None,
                    }
                    for bm in pending
                ]
            }

    async def get_pending_count(self) -> dict[str, int]:
        """Get count of pending bookmarks (for banner display)."""
        with db_session() as session:
            repo = TrackerRepository(session)
            count = repo.get_pending_bookmarks_count()
            return {"count": count}

    async def skip_pending_bookmark(self, bookmark_id: str) -> dict[str, Any]:
        """
        Skip a pending bookmark.

        The URL is remembered so it won't re-appear in pending review.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            pending = repo.skip_pending_bookmark(bookmark_id)

            if not pending:
                return {"success": False, "error": "Bookmark not found"}

            return {"success": True, "id": bookmark_id}

    async def convert_pending_bookmark(
        self,
        bookmark_id: str,
        wishlist_item_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Mark a pending bookmark as converted to a wishlist item.

        Optionally links the pending bookmark to the created wishlist item.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            pending = repo.convert_pending_bookmark(bookmark_id, wishlist_item_id)

            if not pending:
                return {"success": False, "error": "Bookmark not found"}

            return {"success": True, "id": bookmark_id}

    async def import_bookmarks(self, bookmarks: list[dict]) -> dict[str, Any]:
        """
        Import a batch of bookmarks for review.

        Bookmarks with URLs that already exist (pending, skipped, or converted)
        are skipped. Returns count of imported and skipped bookmarks.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            result = repo.import_bookmarks_batch(bookmarks)
            return result

    async def clear_unconverted_bookmarks(self) -> dict[str, Any]:
        """
        Clear all pending and skipped bookmarks.

        Preserves converted bookmarks since they're linked to wishlist items.
        Used when re-running the wizard to change bookmark source.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            deleted_count = repo.clear_unconverted_bookmarks()
            return {"success": True, "deleted_count": deleted_count}

    async def get_skipped_bookmarks(self) -> dict[str, Any]:
        """
        Get all skipped/ignored bookmarks.

        Returns bookmarks that have been skipped by the user.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            skipped = repo.get_skipped_bookmarks()

            return {
                "bookmarks": [
                    {
                        "id": bm.id,
                        "url": bm.url,
                        "name": bm.name,
                        "bookmark_id": bm.bookmark_id,
                        "browser_type": bm.browser_type,
                        "logo_url": bm.logo_url,
                        "status": bm.status,
                        "created_at": bm.created_at.isoformat() if bm.created_at else None,
                    }
                    for bm in skipped
                ]
            }
