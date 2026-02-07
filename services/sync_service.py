"""
Sync Service

Orchestrates the full synchronization process:
1. Fetch recurring transactions from Monarch
2. Create/update categories for each transaction
3. Calculate monthly contributions
4. Update budgets in Monarch
5. Track state and over-contributions
"""

import os
import sys
from datetime import UTC, datetime
from typing import Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging

from core.automation_credentials import AutomationCredentialsManager
from core.scheduler import SyncScheduler
from monarch_utils import (
    clear_all_caches,
    clear_cache,
    get_mm,
    get_user_first_name,
    get_user_profile,
)
from state import RollupState, StateManager, TrackerState

from .category_manager import CategoryManager
from .credentials_service import CredentialsService
from .recurring_service import RecurringItem, RecurringService
from .rollup_service import RollupService

logger = logging.getLogger(__name__)


class SyncService:
    """Orchestrates the full sync process."""

    def __init__(self, state_manager: StateManager | None = None):
        self.state_manager = state_manager or StateManager()
        self.credentials_service = CredentialsService()
        self.automation_creds = AutomationCredentialsManager()
        self.scheduler = SyncScheduler.get_instance()
        self.recurring_service = RecurringService()
        self.category_manager = CategoryManager()
        self.rollup_service = RollupService(
            state_manager=self.state_manager,
            category_manager=self.category_manager,
            recurring_service=self.recurring_service,
        )
        # Set up scheduler callback
        self.scheduler.set_sync_callback(self._automated_sync)

    # Credential management - delegated to CredentialsService
    def has_stored_credentials(self) -> bool:
        """Check if encrypted credentials exist on disk."""
        return self.credentials_service.has_stored_credentials()

    async def check_auth(self) -> bool:
        """Check if session has active credentials (unlocked)."""
        return await self.credentials_service.check_auth()

    async def validate_auth(self) -> bool:
        """Validate that session credentials are still valid with the Monarch API."""
        return await self.credentials_service.validate_auth()

    async def login(
        self, email: str, password: str, mfa_secret: str = "", mfa_mode: str = "secret"
    ) -> dict[str, Any]:
        """Validate credentials by attempting to login to Monarch."""
        return await self.credentials_service.login(email, password, mfa_secret, mfa_mode)

    def set_passphrase(self, passphrase: str) -> dict[str, Any]:
        """Set the encryption passphrase and save credentials."""
        return self.credentials_service.set_passphrase(passphrase)

    def unlock(self, passphrase: str) -> dict[str, Any]:
        """Unlock stored credentials with the passphrase."""
        return self.credentials_service.unlock(passphrase)

    def logout(self) -> None:
        """Clear stored credentials and session."""
        self.credentials_service.logout()

    def lock(self) -> None:
        """Lock the session without clearing stored credentials."""
        self.credentials_service.lock()

    async def unlock_and_validate(self, passphrase: str) -> dict[str, Any]:
        """Unlock stored credentials AND validate them against Monarch API."""
        return await self.credentials_service.unlock_and_validate(passphrase)

    async def update_credentials(
        self, email: str, password: str, mfa_secret: str, passphrase: str
    ) -> dict[str, Any]:
        """Validate new Monarch credentials and save them encrypted."""
        return await self.credentials_service.update_credentials(
            email, password, mfa_secret, passphrase
        )

    def reset_credentials_only(self) -> None:
        """Clear only credentials, preserving preferences."""
        self.credentials_service.reset_credentials_only()

    async def reauthenticate(self, mfa_code: str) -> dict[str, Any]:
        """Re-authenticate with a one-time MFA code."""
        return await self.credentials_service.reauthenticate(mfa_code)

    async def get_category_groups(self) -> list[dict[str, str]]:
        """Get available category groups for configuration."""
        return await self.category_manager.get_category_groups()

    async def get_all_categories_grouped(self) -> list[dict[str, Any]]:
        """Get all categories from Monarch, organized by group."""
        return await self.category_manager.get_all_categories_grouped()

    async def configure(self, group_id: str, group_name: str) -> dict[str, Any]:
        """Configure the tracker with a target category group."""
        self.state_manager.update_config(group_id, group_name)
        return {
            "success": True,
            "message": f"Configured to use group '{group_name}'",
            "group_id": group_id,
            "group_name": group_name,
        }

    async def get_config(self) -> dict[str, Any]:
        """Get current configuration."""
        state = self.state_manager.load()
        return {
            "target_group_id": state.target_group_id,
            "target_group_name": state.target_group_name,
            "is_configured": state.is_configured(),
            "last_sync": state.last_sync,
            "auto_sync_new": state.auto_sync_new,
            "auto_track_threshold": state.auto_track_threshold,
            "auto_update_targets": state.auto_update_targets,
            "auto_categorize_enabled": state.auto_categorize_enabled,
        }

    async def toggle_item(
        self,
        recurring_id: str,
        enabled: bool,
        item_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Enable or disable tracking for a recurring item.

        Args:
            recurring_id: ID of the recurring item
            enabled: Whether to enable or disable tracking
            item_data: Optional pre-fetched item data to avoid API call.
                       Should contain: name, category_name, amount, months_until_due,
                       next_due_date, frequency_months
        """
        state = self.state_manager.load()

        if enabled and state.is_configured() and state.target_group_id:
            # Get item data - use provided data or fetch from cache
            if item_data:
                # Use provided data directly
                item_name = str(
                    item_data.get("category_name") or item_data.get("name") or "Unknown"
                )
                item_amount = float(item_data.get("amount", 0))
                next_due_date = str(item_data.get("next_due_date") or "")
            else:
                # Fetch from cache (won't make API call if recently fetched)
                recurring_items = await self.recurring_service.get_all_recurring()
                item = next((i for i in recurring_items if i.id == recurring_id), None)
                if not item:
                    return {"success": False, "error": "Recurring item not found"}
                item_name = item.category_name
                item_amount = item.amount
                next_due_date = item.next_due_date.isoformat()

            # Get or create category
            cat_state = state.categories.get(recurring_id)
            if not cat_state:
                # Create new category with default emoji as icon
                emoji = "🔄"
                category_id = await self.category_manager.create_category(
                    group_id=state.target_group_id,
                    name=item_name,
                    icon=emoji,
                )
            else:
                emoji = cat_state.emoji
                # Verify category still exists in Monarch
                existing_cat = await self.category_manager.find_category_by_id(
                    cat_state.monarch_category_id
                )
                if existing_cat:
                    category_id = cat_state.monarch_category_id
                else:
                    # Category was deleted - recreate it with emoji as icon
                    category_id = await self.category_manager.create_category(
                        group_id=state.target_group_id,
                        name=item_name,
                        icon=emoji,
                    )

            # Update state
            self.state_manager.update_category(
                recurring_id=recurring_id,
                monarch_category_id=category_id,
                name=item_name,
                target_amount=item_amount,
                due_date=next_due_date,
            )

        self.state_manager.toggle_item_enabled(recurring_id, enabled)
        return {"success": True, "enabled": enabled}

    def set_auto_sync(self, auto_sync: bool) -> dict[str, Any]:
        """Set auto-sync setting for new items."""
        self.state_manager.set_auto_sync_new(auto_sync)
        return {"success": True, "auto_sync_new": auto_sync}

    def set_auto_track_threshold(self, threshold: float | None) -> dict[str, Any]:
        """Set the maximum monthly amount for auto-tracking."""
        self.state_manager.set_auto_track_threshold(threshold)
        return {"success": True, "auto_track_threshold": threshold}

    def set_auto_update_targets(self, auto_update: bool) -> dict[str, Any]:
        """Set whether to auto-update category targets when recurring amounts change."""
        self.state_manager.set_auto_update_targets(auto_update)
        return {"success": True, "auto_update_targets": auto_update}

    def set_auto_categorize(self, enabled: bool) -> dict[str, Any]:
        """Set whether to auto-categorize new transactions to tracking categories."""
        self.state_manager.set_auto_categorize_enabled(enabled)
        return {"success": True, "auto_categorize_enabled": enabled}

    def set_show_category_group(self, show: bool) -> dict[str, Any]:
        """Set whether to show category group names under item names."""
        self.state_manager.set_show_category_group(show)
        return {"success": True, "show_category_group": show}

    async def get_ready_to_assign(self) -> dict[str, Any]:
        """Get ready to assign (unbudgeted) amount."""
        return await self.category_manager.get_ready_to_assign()

    async def change_category_group(
        self, recurring_id: str, new_group_id: str, new_group_name: str
    ) -> dict[str, Any]:
        """
        Move a subscription's linked category to a different category group.

        Args:
            recurring_id: The recurring item ID
            new_group_id: Target category group ID
            new_group_name: Target category group name (for state update)
        """
        state = self.state_manager.load()
        cat_state = state.categories.get(recurring_id)

        if not cat_state:
            return {
                "success": False,
                "error": "No category found for this recurring item",
            }

        if not state.is_item_enabled(recurring_id):
            return {"success": False, "error": "Recurring item is not enabled"}

        # Move the category in Monarch
        await self.category_manager.update_category_group(
            category_id=cat_state.monarch_category_id,
            new_group_id=new_group_id,
        )

        return {
            "success": True,
            "category_id": cat_state.monarch_category_id,
            "new_group_id": new_group_id,
            "new_group_name": new_group_name,
        }

    async def recreate_category(self, recurring_id: str) -> dict[str, Any]:
        """
        Recreate a missing category for a recurring item.

        This is used when a category was deleted in Monarch but the item
        is still enabled in the tracker.
        """
        state = self.state_manager.load()
        cat_state = state.categories.get(recurring_id)

        if not cat_state:
            return {"success": False, "error": "No category state found for this item"}

        if not state.is_configured() or not state.target_group_id:
            return {"success": False, "error": "Tracker not configured"}

        # Fetch the recurring item to get current details
        recurring_items = await self.recurring_service.get_all_recurring()
        item = next((i for i in recurring_items if i.id == recurring_id), None)

        if not item:
            return {"success": False, "error": "Recurring item not found"}

        # Get emoji from existing state or use default
        emoji = cat_state.emoji if cat_state else "🔄"

        # Create new category with emoji as icon
        category_id = await self.category_manager.create_category(
            group_id=state.target_group_id,
            name=item.category_name,
            icon=emoji,
        )

        # Update state with new category ID
        self.state_manager.update_category(
            recurring_id=recurring_id,
            monarch_category_id=category_id,
            name=item.category_name,
            target_amount=item.amount,
            due_date=item.next_due_date.isoformat(),
        )

        return {
            "success": True,
            "category_id": category_id,
            "name": item.category_name,
        }

    async def get_unmapped_categories(self) -> list[dict[str, Any]]:
        """
        Get all categories that are not mapped to any recurring or stash item.

        Used when linking a disabled recurring item to an existing category,
        or when linking a stash item to an existing category.
        """
        state = self.state_manager.load()

        # Get all category IDs that are currently mapped to recurring items
        mapped_ids = [cat_state.monarch_category_id for cat_state in state.categories.values()]

        # Also exclude rollup category if it exists
        if state.rollup.monarch_category_id:
            mapped_ids.append(state.rollup.monarch_category_id)

        # Also exclude stash item categories
        from state.db import db_session
        from state.db.repositories import TrackerRepository

        with db_session() as session:
            repo = TrackerRepository(session)
            stash_items = repo.get_all_stash_items()
            for item in stash_items:
                if item.monarch_category_id:
                    mapped_ids.append(item.monarch_category_id)

        return await self.category_manager.get_unmapped_categories(mapped_ids)

    async def link_to_category(
        self,
        recurring_id: str,
        category_id: str,
        sync_name: bool,
    ) -> dict[str, Any]:
        """
        Link a recurring item to an existing category.

        Args:
            recurring_id: ID of the recurring item to link
            category_id: ID of the existing Monarch category to link to
            sync_name: If True, rename the category to match transaction name/emoji.
                       If False, keep the category name as-is.

        Returns:
            Result with success status and category info
        """
        state = self.state_manager.load()

        # Verify the category exists in Monarch
        cat_info = await self.category_manager.find_category_by_id(category_id)
        if not cat_info:
            return {"success": False, "error": "Category not found in Monarch"}

        # Get the recurring item details
        recurring_items = await self.recurring_service.get_all_recurring()
        item = next((i for i in recurring_items if i.id == recurring_id), None)

        if not item:
            return {"success": False, "error": "Recurring item not found"}

        # Determine name and emoji to use
        if sync_name:
            # Use transaction name with default emoji
            emoji = "🔄"
            display_name = item.category_name
            # Rename the category in Monarch (icon set separately from name)
            await self.category_manager.rename_category(category_id, display_name, icon=emoji)
        else:
            # Keep category as-is, import its name and emoji into our state
            existing_name = cat_info.get("name", "")
            # Try to extract emoji from existing name
            # This regex handles:
            # - Basic emoji (single codepoint)
            # - Emoji with variation selector (❤️)
            # - Emoji with skin tone modifier (👋🏽)
            # - ZWJ sequences for compound emoji (👨‍👩‍👧, 👩‍💻)
            # - Flag emoji (regional indicators 🇺🇸) - two consecutive regional indicator symbols
            import re

            # Base emoji ranges (excluding regional indicators which need special handling)
            emoji_base = (
                r"[\U0001F300-\U0001FAFF"  # Misc symbols, pictographs, emoticons
                r"\U00002700-\U000027BF"  # Dingbats
                r"\U0001F900-\U0001F9FF"  # Supplemental symbols
                r"\U0001F600-\U0001F64F"  # Emoticons
                r"\U0001F680-\U0001F6FF"  # Transport/map symbols
                r"\u2600-\u26FF"  # Misc symbols
                r"\u2700-\u27BF]"  # Dingbats
            )
            # Variation selector and skin tone modifiers
            modifiers = r"[\uFE0F\U0001F3FB-\U0001F3FF]?"
            # ZWJ (zero-width joiner) followed by another emoji
            zwj_sequence = rf"(?:\u200D{emoji_base}{modifiers})*"
            # Flag emoji: two consecutive regional indicator symbols (U+1F1E0 - U+1F1FF)
            flag_emoji = r"[\U0001F1E0-\U0001F1FF]{2}"
            # Full pattern: either a flag emoji OR regular emoji with modifiers/ZWJ
            emoji_pattern = rf"^({flag_emoji}|{emoji_base}{modifiers}{zwj_sequence})"

            emoji_match = re.match(emoji_pattern, existing_name)
            emoji = emoji_match.group(1) if emoji_match else "🔄"
            # Import the category's existing name (strip emoji prefix if present)
            if emoji_match:
                display_name = existing_name[len(emoji) :].strip()
            else:
                display_name = existing_name

        # Update state with the linked category
        self.state_manager.update_category(
            recurring_id=recurring_id,
            monarch_category_id=category_id,
            name=str(display_name),
            target_amount=item.amount,
            due_date=item.next_due_date.isoformat(),
        )

        # Update the sync_name and is_linked flags
        state = self.state_manager.load()
        if recurring_id in state.categories:
            state.categories[recurring_id].sync_name = sync_name
            state.categories[recurring_id].is_linked = True
            state.categories[recurring_id].emoji = emoji
            self.state_manager.save(state)

        # Enable rollover on the linked category (ensure budget tracking works correctly)
        await self.category_manager.enable_category_rollover(category_id)

        # Note: No need to initialize frozen target - we now calculate stateless on demand

        # Enable tracking for this item
        self.state_manager.toggle_item_enabled(recurring_id, True)

        return {
            "success": True,
            "category_id": category_id,
            "category_name": cat_info.get("name") if not sync_name else display_name,
            "sync_name": sync_name,
            "enabled": True,
        }

    def clear_category_cache(self) -> dict[str, Any]:
        """
        Clear the category cache to force a fresh fetch from Monarch.

        This is useful after linking/unlinking categories to ensure
        the unmapped categories list is up to date.
        """
        clear_cache("category")
        clear_cache("category_groups")
        clear_cache("budget")
        return {"success": True, "message": "Category cache cleared"}

    async def allocate_funds(self, recurring_id: str, amount: float) -> dict[str, Any]:
        """
        Allocate funds to a recurring item's category.

        Args:
            recurring_id: The recurring item ID
            amount: Amount to allocate

        Returns:
            Result with success status and updated balances
        """
        state = self.state_manager.load()
        cat_state = state.categories.get(recurring_id)

        if not cat_state:
            return {
                "success": False,
                "error": "Category not found for this recurring item",
            }

        result = await self.category_manager.allocate_to_category(
            cat_state.monarch_category_id,
            amount,
        )

        return result

    # Rollup methods - delegated to RollupService

    async def toggle_rollup(self, enabled: bool) -> dict[str, Any]:
        """Enable or disable the rollup feature."""
        return await self.rollup_service.toggle_rollup(enabled)

    async def add_to_rollup(self, recurring_id: str) -> dict[str, Any]:
        """Add a subscription to the rollup."""
        return await self.rollup_service.add_to_rollup(recurring_id)

    async def remove_from_rollup(self, recurring_id: str) -> dict[str, Any]:
        """Remove a subscription from the rollup."""
        return await self.rollup_service.remove_from_rollup(recurring_id)

    async def set_rollup_budget(self, amount: float) -> dict[str, Any]:
        """Set the user-defined rollup budget amount."""
        return await self.rollup_service.set_rollup_budget(amount)

    async def update_category_emoji(self, recurring_id: str, emoji: str) -> dict[str, Any]:
        """
        Update the emoji/icon for a category in Monarch.
        Sets the emoji via the icon field, not as part of the name.
        """
        state = self.state_manager.load()
        cat_state = state.categories.get(recurring_id)

        if not cat_state:
            return {
                "success": False,
                "error": "Category not found for this recurring item",
            }

        # Update state
        updated_cat = self.state_manager.update_category_emoji(recurring_id, emoji)
        if not updated_cat:
            return {"success": False, "error": "Failed to update emoji in state"}

        # Update category icon in Monarch (emoji is set via icon field, not in name)
        await self.category_manager.update_category_icon(cat_state.monarch_category_id, emoji)

        return {
            "success": True,
            "emoji": emoji,
        }

    async def update_rollup_emoji(self, emoji: str) -> dict[str, Any]:
        """Update the emoji/icon for the rollup category."""
        return await self.rollup_service.update_rollup_emoji(emoji)

    async def update_rollup_category_name(self, name: str) -> dict[str, Any]:
        """Update the name for the rollup category."""
        return await self.rollup_service.update_rollup_category_name(name)

    async def update_category_name(self, recurring_id: str, name: str) -> dict[str, Any]:
        """
        Update the name for a category and rename it in Monarch.
        Does NOT include emoji in the name - emoji is set separately via the icon field.
        """
        cat_state = self.state_manager.get_category(recurring_id)
        if not cat_state:
            return {"success": False, "error": "Category not found"}

        # Update state
        updated_cat = self.state_manager.update_category_name(recurring_id, name)
        if not updated_cat:
            return {"success": False, "error": "Failed to update name in state"}

        # Update category name in Monarch (without emoji - emoji is set via icon field)
        await self.category_manager.rename_category(cat_state.monarch_category_id, name)

        return {
            "success": True,
            "category_name": name,
        }

    async def get_rollup_data(self) -> dict[str, Any]:
        """Get rollup state with computed data."""
        return await self.rollup_service.get_rollup_data()

    async def full_sync(self) -> dict[str, Any]:
        """
        Run full synchronization.

        Steps:
        1. Fetch all recurring transactions
        2. Create categories for new items
        3. Deactivate categories for removed items
        4. Calculate and set monthly contributions
        5. Detect and track over-contributions
        6. Save state
        """
        # Clear all caches to ensure fresh data
        clear_all_caches()

        state = self.state_manager.load()

        # Rate limit: prevent syncing more than once every 1 minute
        if state.last_sync:
            from datetime import datetime

            # Handle Z suffix for timezone-aware parsing
            last_sync_str = state.last_sync.replace("Z", "+00:00")
            last_sync_time = datetime.fromisoformat(last_sync_str)
            now = datetime.now(UTC)
            diff_seconds = (now - last_sync_time).total_seconds()
            min_interval = 60  # 1 minute in seconds
            if diff_seconds < min_interval:
                remaining = int(min_interval - diff_seconds)
                from core.exceptions import RateLimitError

                raise RateLimitError(
                    f"Eclosion limits syncs to once every minute. "
                    f"Please wait {remaining} more second(s).",
                    retry_after=remaining,
                    source="eclosion_sync_cooldown",
                )

        if not state.is_configured():
            # Even without Recurring configured, verify connection to Monarch
            # and update last_sync to show the app is working
            try:
                await self.recurring_service.get_all_recurring()
                self.state_manager.mark_sync_complete()
                return {
                    "success": True,
                    "message": "Connected to Monarch. Configure Recurring to start syncing.",
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to connect to Monarch: {e}",
                }

        # Step 1: Fetch recurring items
        recurring_items = await self.recurring_service.get_all_recurring()
        active_ids = {item.id for item in recurring_items}

        # Filter to only enabled items
        enabled_items = [item for item in recurring_items if state.is_item_enabled(item.id)]

        # Get all current balances, planned budgets, and category info
        # (bulk fetch to avoid per-item API calls)
        all_balances = await self.category_manager.get_all_category_balances()
        all_planned_budgets = await self.category_manager.get_all_planned_budgets()
        all_category_info = await self.category_manager.get_all_category_info()

        created: list[str] = []
        updated: list[dict[str, Any]] = []
        deactivated: list[str] = []
        errors: list[dict[str, str]] = []
        removed_notices: list[dict[str, Any]] = []
        total_monthly = 0.0

        # Step 2: Process each enabled recurring item
        for item in enabled_items:
            try:
                result = await self._process_recurring_item(
                    item, state, all_balances, all_planned_budgets, all_category_info
                )
                if result.get("created"):
                    created.append(str(result["name"]))
                updated.append(
                    {
                        "name": result["name"],
                        "monthly_contribution": result["monthly_contribution"],
                    }
                )
                total_monthly += result["monthly_contribution"]
            except Exception as e:
                errors.append(
                    {
                        "name": item.name,
                        "error": str(e),
                    }
                )

        # Step 3: Handle removed items - create notices and fully decouple
        # Collect IDs first to avoid modifying dict during iteration
        # Skip rollup_ prefixed entries - these are frozen target storage, not real items
        removed_ids = [
            (recurring_id, cat_state)
            for recurring_id, cat_state in state.categories.items()
            if recurring_id not in active_ids
            and cat_state.is_active
            and not recurring_id.startswith("rollup_")
        ]

        for recurring_id, cat_state in removed_ids:
            try:
                # Check if this item was in the rollup
                was_in_rollup = recurring_id in state.rollup.item_ids

                # Remove from state and create notice
                notice = self.state_manager.remove_category_and_notify(recurring_id, was_in_rollup)

                if notice:
                    deactivated.append(cat_state.name)
                    removed_notices.append(
                        {
                            "id": notice.id,
                            "recurring_id": notice.recurring_id,
                            "name": notice.name,
                            "category_name": notice.category_name,
                            "was_rollup": notice.was_rollup,
                            "removed_at": notice.removed_at,
                        }
                    )
            except Exception as e:
                errors.append(
                    {
                        "name": cat_state.name,
                        "error": f"Failed to remove: {e}",
                    }
                )

        # Step 4: Fetch and update user profile
        try:
            mm = await get_mm()
            profile = await get_user_profile(mm)
            first_name = get_user_first_name(profile)
            if first_name:
                self.state_manager.set_user_first_name(first_name)
        except Exception as e:
            logger.warning(f"[SYNC] Failed to fetch user profile: {e}")

        # Step 5: Auto-categorize new transactions (if enabled)
        auto_categorize_result = None
        if state.auto_categorize_enabled:
            try:
                from services.transaction_categorizer import TransactionCategorizerService

                categorizer = TransactionCategorizerService(self.state_manager)
                auto_categorize_result = await categorizer.auto_categorize_new_transactions()
                logger.info(
                    "[SYNC] Auto-categorized %d transactions",
                    auto_categorize_result.get("categorized_count", 0),
                )
            except Exception as e:
                logger.warning(f"[SYNC] Auto-categorize failed: {e}")
                auto_categorize_result = {"error": str(e)}

        # Step 6: Mark sync complete
        self.state_manager.mark_sync_complete()

        results: dict[str, Any] = {
            "success": True,
            "created": created,
            "updated": updated,
            "deactivated": deactivated,
            "errors": errors,
            "total_monthly": total_monthly,
            "removed_notices": removed_notices,
            "recurring_count": len(recurring_items),
            "sync_time": datetime.now().isoformat(),
        }

        # Include auto-categorize results if the feature ran
        if auto_categorize_result:
            results["auto_categorize"] = auto_categorize_result

        # Check for IFTTT trigger events (non-blocking)
        try:
            await self._check_ifttt_events()
        except Exception as e:
            logger.warning(f"[SYNC] IFTTT event check failed (non-fatal): {e}")

        return results

    async def _check_ifttt_events(self) -> None:
        """
        Check for IFTTT trigger events and push to broker.
        Handles goal achievements, budget triggers, and field option caching.
        Non-critical — failures are logged only.
        """
        logger.info("[SYNC] Running IFTTT event check...")
        from services.ifttt_service import IftttService
        from services.stash_service import StashService

        ifttt = IftttService.from_tunnel_creds()
        logger.info(f"[SYNC] IFTTT configured: {ifttt.is_configured}, subdomain: {ifttt.subdomain}")
        if not ifttt.is_configured:
            logger.info("[SYNC] IFTTT not configured, skipping event check")
            return

        # 1. Check goal achievements (existing)
        stash_service = StashService()
        dashboard = await stash_service.get_dashboard_data()
        items = dashboard.get("items", [])

        stash_items = []
        for item in items:
            target = item.get("amount")
            balance = item.get("current_balance", 0)
            if target and target > 0:
                stash_items.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "balance": balance,
                        "target_amount": target,
                    }
                )

        if stash_items:
            pushed = await ifttt.check_goal_achievements(stash_items)
            if pushed:
                logger.info(f"[IFTTT] Pushed {len(pushed)} goal achievement events")

        # 2. Check budget-based triggers
        try:
            budget_data = await self.category_manager.get_all_category_budget_data()
            category_info = await self.category_manager.get_all_category_info()

            # Fetch active subscriptions to only push events for triggers user cares about
            subscriptions = await ifttt.get_active_subscriptions()

            pushed = await ifttt.check_under_budget(budget_data, category_info, subscriptions)
            if pushed:
                logger.info(f"[IFTTT] Pushed {len(pushed)} under-budget events")

            pushed = await ifttt.check_budget_surplus(self.category_manager)
            if pushed:
                logger.info(f"[IFTTT] Pushed {len(pushed)} budget surplus events")

            pushed = await ifttt.check_balance_thresholds(budget_data, category_info, subscriptions)
            if pushed:
                logger.info(f"[IFTTT] Pushed {len(pushed)} balance threshold events")

            pushed = await ifttt.check_spending_streaks(budget_data, category_info, subscriptions)
            if pushed:
                logger.info(f"[IFTTT] Pushed {len(pushed)} spending streak events")

            pushed = await ifttt.check_new_charges(category_info, subscriptions)
            if pushed:
                logger.info(f"[IFTTT] Pushed {len(pushed)} new charge events")
        except Exception as e:
            logger.warning(f"[IFTTT] Budget trigger check failed (non-fatal): {e}")

        # 3. Push field options cache for offline dropdown population
        try:
            # Get detailed group info to check group_level_budgeting_enabled
            detailed_groups = await self.category_manager.get_category_groups_detailed()
            group_level_enabled = {
                g["id"]: g.get("group_level_budgeting_enabled", False) for g in detailed_groups
            }

            # Build category/group options with proper prefixes
            category_options = []
            flexible_group_options = []

            groups = await self.category_manager.get_all_categories_grouped()
            for group in groups:
                group_id = group.get("id")
                group_name = group.get("name", "")
                is_group_level = group_level_enabled.get(group_id, False)

                if is_group_level:
                    # Flexible group: add group itself, not its categories
                    if group_id:
                        flexible_group_options.append(
                            {
                                "label": f"{group_name} (Flexible)",
                                "value": f"group:{group_id}",
                            }
                        )
                else:
                    # Regular group: add individual categories
                    for cat in group.get("categories", []):
                        if cat.get("id"):
                            category_options.append(
                                {
                                    "label": cat["name"],
                                    "value": f"cat:{cat['id']}",
                                }
                            )

            # Combine: categories first, then flexible groups
            all_options = category_options + flexible_group_options

            goals = [
                {"label": item["name"], "value": item["id"]} for item in items if item.get("id")
            ]

            await ifttt.push_field_options(categories=all_options, goals=goals)
        except Exception as e:
            logger.warning(f"[IFTTT] Failed to push field options (non-fatal): {e}")

    async def _process_recurring_item(
        self,
        item: RecurringItem,
        state: TrackerState,
        all_balances: dict[str, float],
        all_planned_budgets: dict[str, int],
        all_category_info: dict[str, dict[str, str]],
    ) -> dict[str, Any]:
        """Process a single recurring item."""
        created = False
        cat_state = state.categories.get(item.id)

        # Check if we need to create a new category
        if cat_state is None:
            # Create new category with emoji as icon
            emoji = "🔄"  # Default emoji for new categories
            assert state.target_group_id is not None
            category_id = await self.category_manager.create_category(
                group_id=state.target_group_id,
                name=item.category_name,
                icon=emoji,
            )
            created = True
            current_balance = 0.0
        else:
            category_id = cat_state.monarch_category_id
            emoji = cat_state.emoji

            # Check if category still exists (using cached data instead of API call)
            cat_info = all_category_info.get(category_id)
            if cat_info is None:
                # Category was deleted - recreate it with emoji as icon
                assert state.target_group_id is not None
                category_id = await self.category_manager.create_category(
                    group_id=state.target_group_id,
                    name=item.category_name,
                    icon=emoji,
                )
                created = True
            # Check if merchant/category name changed - auto-rename if so
            elif cat_state.name != item.category_name:
                await self.category_manager.rename_category(
                    category_id, item.category_name, icon=emoji
                )

            # Get current balance
            current_balance = all_balances.get(category_id, 0.0)

        # Calculate over-contribution (frontend will recalculate, but we track for state)
        over_contribution = max(0.0, current_balance - item.amount)

        # Update state
        self.state_manager.update_category(
            recurring_id=item.id,
            monarch_category_id=category_id,
            name=item.category_name,
            target_amount=item.amount,
            due_date=item.next_due_date.isoformat(),
            over_contribution=over_contribution,
        )

        return {
            "name": item.name,
            "category_name": item.category_name,
            "created": created,
            "current_balance": current_balance,
            "target_amount": item.amount,
        }

    async def get_deletable_categories(self) -> dict[str, Any]:
        """
        Get categories that can be deleted (created by this tool, not linked).

        Returns categories that:
        - Were created by this tool (is_linked = False)
        - Still exist in Monarch

        Also includes the rollup category if it exists.
        """
        state = self.state_manager.load()
        all_category_info = await self.category_manager.get_all_category_info()
        all_planned_budgets = await self.category_manager.get_all_planned_budgets()

        deletable: list[dict[str, Any]] = []

        # Check each category in state
        for recurring_id, cat_state in state.categories.items():
            # Skip rollup_ prefixed entries - these are frozen target storage, not real categories
            if recurring_id.startswith("rollup_"):
                continue
            # Only include categories that were created (not linked to existing)
            if cat_state.is_linked:
                continue

            # Check if category still exists in Monarch
            cat_info = all_category_info.get(cat_state.monarch_category_id)
            if cat_info:
                deletable.append(
                    {
                        "recurring_id": recurring_id,
                        "category_id": cat_state.monarch_category_id,
                        "name": cat_info.get("name", cat_state.name),
                        "group_name": cat_info.get("group_name"),
                        "planned_budget": all_planned_budgets.get(cat_state.monarch_category_id, 0),
                    }
                )

        # Include rollup category if it exists and was created (not linked)
        if state.rollup.monarch_category_id and not state.rollup.is_linked:
            rollup_info = all_category_info.get(state.rollup.monarch_category_id)
            if rollup_info:
                deletable.append(
                    {
                        "recurring_id": "__rollup__",
                        "category_id": state.rollup.monarch_category_id,
                        "name": rollup_info.get("name", state.rollup.category_name),
                        "group_name": rollup_info.get("group_name"),
                        "is_rollup": True,
                        "planned_budget": all_planned_budgets.get(
                            state.rollup.monarch_category_id, 0
                        ),
                    }
                )

        return {
            "categories": deletable,
            "count": len(deletable),
        }

    async def delete_all_categories(self) -> dict[str, Any]:
        """
        Delete all categories created by this tool and reset state.

        Returns results with success/failure for each category.
        """
        deletable_result = await self.get_deletable_categories()
        categories: list[dict[str, Any]] = deletable_result.get("categories", [])

        deleted: list[dict[str, Any]] = []
        failed: list[dict[str, Any]] = []

        for cat in categories:
            category_id = str(cat.get("category_id", ""))
            result = await self.category_manager.delete_category(category_id)

            if result.get("success"):
                deleted.append(
                    {
                        "category_id": category_id,
                        "name": cat.get("name"),
                    }
                )
            else:
                failed.append(
                    {
                        "category_id": category_id,
                        "name": cat.get("name"),
                        "error": result.get("error"),
                    }
                )

        results: dict[str, Any] = {
            "deleted": deleted,
            "failed": failed,
            "total_attempted": len(categories),
        }

        # Reset state if all deletions succeeded
        if len(results["failed"]) == 0:
            # Clear all state
            state = self.state_manager.load()
            state.categories = {}
            state.enabled_items = set()
            state.rollup = RollupState()
            state.last_sync = None
            state.target_group_id = None
            state.target_group_name = None
            state.auto_sync_new = False
            state.auto_track_threshold = None
            self.state_manager.save(state)
            results["state_reset"] = True
        else:
            # Partial failure - remove only successfully deleted categories from state
            state = self.state_manager.load()
            deleted_category_ids = {d["category_id"] for d in results["deleted"]}

            # Remove deleted categories from state
            for recurring_id in state.categories.copy():
                if state.categories[recurring_id].monarch_category_id in deleted_category_ids:
                    del state.categories[recurring_id]
                    state.enabled_items.discard(recurring_id)

            # Check if rollup was deleted
            if state.rollup.monarch_category_id in deleted_category_ids:
                state.rollup = RollupState()

            self.state_manager.save(state)
            results["state_reset"] = False

        results["success"] = len(results["failed"]) == 0
        results["deleted_count"] = len(results["deleted"])
        results["failed_count"] = len(results["failed"])

        return results

    async def reset_dedicated_categories(self) -> dict[str, Any]:
        """
        Reset the dedicated categories feature.

        - Deletes all app-created dedicated categories from Monarch (not linked)
        - Disables all non-rollup items
        - Clears the categories dict
        - Preserves: rollup, config, credentials

        Returns results with deleted/failed counts.
        """
        # Get dedicated categories to delete (not rollup, not linked)
        deletable = self.state_manager.get_deletable_dedicated_categories()

        deleted: list[dict[str, Any]] = []
        failed: list[dict[str, Any]] = []

        # Filter to only categories that are not linked
        categories_to_delete = [c for c in deletable if not c.get("is_linked")]

        # Delete each category from Monarch
        for cat in categories_to_delete:
            category_id = str(cat.get("category_id", ""))
            result = await self.category_manager.delete_category(category_id)

            if result.get("success"):
                deleted.append(
                    {
                        "category_id": category_id,
                        "name": cat.get("name"),
                    }
                )
            else:
                failed.append(
                    {
                        "category_id": category_id,
                        "name": cat.get("name"),
                        "error": result.get("error"),
                    }
                )

        # Reset state (clears categories, disables non-rollup items)
        state_result = self.state_manager.reset_dedicated_categories()

        results: dict[str, Any] = {
            "deleted": deleted,
            "failed": failed,
            "total_attempted": len(categories_to_delete),
            "items_disabled": state_result.get("items_disabled", 0),
            "success": len(failed) == 0,
            "deleted_count": len(deleted),
            "failed_count": len(failed),
        }

        return results

    async def reset_rollup(self) -> dict[str, Any]:
        """
        Reset the rollup feature.

        - Deletes the rollup category from Monarch (if app-created)
        - Disables all items that were in rollup
        - Resets rollup state to defaults
        - Preserves: dedicated categories, config, credentials

        Returns results with deleted category and disabled items count.
        """
        state = self.state_manager.load()

        results = {
            "success": True,
            "deleted_category": False,
            "items_disabled": 0,
            "error": None,
        }

        # Check if there's a rollup category to delete
        if state.rollup.monarch_category_id and not state.rollup.is_linked:
            delete_result = await self.category_manager.delete_category(
                state.rollup.monarch_category_id
            )

            if delete_result.get("success"):
                results["deleted_category"] = True
            else:
                results["success"] = False
                results["error"] = delete_result.get("error")
                # Still proceed with state reset even if delete failed

        # Reset state (disables rollup items, clears rollup state)
        state_result = self.state_manager.reset_rollup()
        results["items_disabled"] = state_result.get("items_disabled", 0)

        return results

    async def reset_recurring_tool(self) -> dict[str, Any]:
        """
        Full reset of the Recurring tool.

        - Deletes all categories created by this tool (dedicated + rollup)
        - Disables all items
        - Resets the setup wizard (clears target_group_id)
        - Preserves: credentials, app settings

        This is equivalent to uninstall for the Recurring feature specifically.
        """
        errors: list[str] = []
        dedicated_deleted = 0
        dedicated_failed = 0
        rollup_deleted = False
        items_disabled = 0

        # Step 1: Reset dedicated categories
        try:
            dedicated_result = await self.reset_dedicated_categories()
            dedicated_deleted = dedicated_result.get("deleted_count", 0)
            dedicated_failed = dedicated_result.get("failed_count", 0)
            items_disabled += dedicated_result.get("items_disabled", 0)
            if not dedicated_result.get("success"):
                for fail in dedicated_result.get("failed", []):
                    errors.append(f"Failed to delete {fail.get('name')}: {fail.get('error')}")
        except Exception as e:
            errors.append(f"Dedicated reset error: {e!s}")

        # Step 2: Reset rollup
        try:
            rollup_result = await self.reset_rollup()
            rollup_deleted = rollup_result.get("deleted_category", False)
            items_disabled += rollup_result.get("items_disabled", 0)
            if rollup_result.get("error"):
                errors.append(f"Rollup reset error: {rollup_result.get('error')}")
        except Exception as e:
            errors.append(f"Rollup reset error: {e!s}")

        # Step 3: Reset the setup wizard (clear target_group_id)
        try:
            self.state_manager.reset_config()
        except Exception as e:
            errors.append(f"Config reset error: {e!s}")

        results: dict[str, Any] = {
            "success": len(errors) == 0,
            "dedicated_deleted": dedicated_deleted,
            "dedicated_failed": dedicated_failed,
            "rollup_deleted": rollup_deleted,
            "items_disabled": items_disabled,
            "errors": errors,
        }

        return results

    async def sync_stash_data(self) -> dict[str, Any]:
        """
        Sync only stash-related data from Monarch.

        This is a lighter-weight sync that only fetches:
        - Account data (for available-to-stash calculation)
        - Budget data (for stash item balances)
        - Savings goals (for monarch goals display)

        Does NOT sync:
        - Recurring transactions
        - Category creation/updates
        - Auto-categorization

        Used by the Stash tab's sync button for faster refreshes.
        """
        from datetime import datetime

        from core.exceptions import RateLimitError
        from monarch_utils import clear_cache

        state = self.state_manager.load()

        # Rate limit: prevent syncing more than once every 1 minute
        if state.last_sync:
            last_sync_str = state.last_sync.replace("Z", "+00:00")
            last_sync_time = datetime.fromisoformat(last_sync_str)
            now = datetime.now(UTC)
            diff_seconds = (now - last_sync_time).total_seconds()
            min_interval = 60  # 1 minute in seconds
            if diff_seconds < min_interval:
                remaining = int(min_interval - diff_seconds)
                raise RateLimitError(
                    f"Eclosion limits syncs to once every minute. "
                    f"Please wait {remaining} more second(s).",
                    retry_after=remaining,
                    source="eclosion_sync_cooldown",
                )

        # Clear only stash-related caches
        clear_cache("budget_data")
        clear_cache("accounts_data")
        clear_cache("savings_goals")

        try:
            # Fetch fresh data from Monarch (triggers cache refresh)
            # These calls populate the cache with fresh data
            await self.category_manager.get_all_category_balances()

            # Mark sync complete
            self.state_manager.mark_sync_complete()

            # Check for goal achievements and push IFTTT trigger events (non-blocking)
            try:
                await self._check_ifttt_events()
            except Exception as e:
                logger.warning(f"[STASH_SYNC] IFTTT event check failed (non-fatal): {e}")

            return {
                "success": True,
                "sync_time": datetime.now().isoformat(),
                "message": "Stash data refreshed",
            }
        except Exception as e:
            logger.warning(f"[STASH_SYNC] Failed to sync stash data: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    async def get_dashboard_data(self) -> dict[str, Any]:
        """Get all data needed for the frontend dashboard."""
        state = self.state_manager.load()

        if not state.is_configured():
            # Still fetch recurring items from Monarch for setup wizard
            data_fetched = False
            try:
                recurring_items = await self.recurring_service.get_all_recurring()
                data_fetched = True
                unconfigured_items_data: list[dict[str, Any]] = []
                for item in recurring_items:
                    # Return raw data - frontend computes derived values
                    unconfigured_items_data.append(
                        {
                            "id": item.id,
                            "name": item.category_name,
                            "merchant_name": item.name,  # Merchant name only
                            "logo_url": item.logo_url,
                            "amount": item.amount,
                            "frequency": (item.frequency.value if item.frequency else "monthly"),
                            "frequency_label": item.frequency_label,
                            "frequency_months": item.frequency_months,
                            "next_due_date": (
                                item.next_due_date.isoformat() if item.next_due_date else None
                            ),
                            "months_until_due": item.months_until_due,
                            "current_balance": 0,
                            "planned_budget": 0,
                            "is_enabled": False,
                            "is_in_rollup": False,
                        }
                    )
            except Exception as e:
                logger.warning(f"Failed to fetch recurring items during setup: {e}")
                unconfigured_items_data = []

            # Get any active notices (even when not configured)
            active_notices = self.state_manager.get_active_notices()

            # Always fetch ready to assign - this should show regardless of tool setup
            try:
                ready_to_assign_data = await self.category_manager.get_ready_to_assign()
                data_fetched = True
            except Exception as e:
                logger.warning(f"Failed to fetch ready to assign during setup: {e}")
                ready_to_assign_data = None

            # Update last_sync if we successfully fetched data from Monarch AND
            # this is the first time (last_sync is null). This ensures the user
            # doesn't see "Never synced" after their first login, while not
            # interfering with the rate limit check in full_sync().
            if data_fetched and state.last_sync is None:
                self.state_manager.mark_sync_complete()
                state = self.state_manager.load()  # Reload to get updated last_sync

            return {
                "is_configured": False,
                "items": unconfigured_items_data,
                "summary": {},
                "config": {
                    "target_group_id": None,
                    "target_group_name": None,
                    "is_configured": False,
                    "user_first_name": state.user_first_name,
                },
                "last_sync": state.last_sync,
                "data_month": datetime.now().strftime("%Y-%m"),
                "ready_to_assign": ready_to_assign_data,
                "rollup": {
                    "enabled": False,
                    "items": [],
                    "total_monthly_rate": 0,
                    "budgeted": 0,
                    "current_balance": 0,
                    "progress_percent": 0,
                    "category_id": None,
                },
                "notices": [
                    {
                        "id": n.id,
                        "recurring_id": n.recurring_id,
                        "name": n.name,
                        "category_name": n.category_name,
                        "was_rollup": n.was_rollup,
                        "removed_at": n.removed_at,
                    }
                    for n in active_notices
                ],
            }

        # Fetch recurring items
        recurring_items = await self.recurring_service.get_all_recurring()

        # Get all budget data (rollover, budgeted, remaining, actual) and category info
        # Using new balance model: progress = rollover + budgeted this month
        all_budget_data = await self.category_manager.get_all_category_budget_data()
        all_category_info = await self.category_manager.get_all_category_info()

        # Debug logging for balance retrieval
        logger.info(f"[Dashboard] Fetched {len(all_budget_data)} category budget data")

        # Fetch rollup data early to get correct values for rollup items
        # Rollup items in the main items list would otherwise have wrong frozen_monthly_target
        # (calculated with balance=0 instead of proportional share of rollup balance)
        rollup_data = await self.get_rollup_data()
        rollup_items_map: dict[str, dict[str, Any]] = {}
        if rollup_data.get("enabled") and rollup_data.get("items"):
            rollup_items_map = {item["id"]: item for item in rollup_data["items"]}

        items_data: list[dict[str, Any]] = []
        total_monthly = 0.0
        total_saved = 0.0
        total_target = 0.0
        active_count = 0
        inactive_count = 0

        for item in recurring_items:
            cat_state = state.categories.get(item.id)
            is_enabled = state.is_item_enabled(item.id)
            is_in_rollup = item.id in state.rollup.item_ids

            # Check if this item is in the rollup and has pre-calculated values
            rollup_item_data = rollup_items_map.get(item.id) if is_in_rollup else None

            if cat_state and is_enabled:
                budget_data = all_budget_data.get(cat_state.monarch_category_id, {})
                rollover_amount = budget_data.get("rollover", 0.0)
                budgeted_this_month = budget_data.get("budgeted", 0.0)
                current_balance = budget_data.get("remaining", 0.0)
                cat_info = all_category_info.get(cat_state.monarch_category_id)
                # Debug: log balance lookup
                if current_balance == 0 and cat_state.monarch_category_id in all_budget_data:
                    logger.warning(f"[Dashboard] {item.name}: balance is 0 but key exists")
                elif cat_state.monarch_category_id not in all_budget_data:
                    logger.warning(
                        f"[Dashboard] {item.name}: monarch_category_id "
                        f"{cat_state.monarch_category_id} NOT in all_budget_data"
                    )
                # Use cached info - no individual lookups to avoid extra API calls
                category_group_name = cat_info.get("group_name") if cat_info else None
                # Check if category still exists in Monarch
                category_missing = cat_info is None
            elif rollup_item_data:
                # Rollup item: use pre-calculated values from rollup data
                # These have correct proportional balance/rollover, not 0
                # CRITICAL: Must use same rollover_amount as rollup.items to ensure
                # frozen_monthly_target calculations match between items[] and rollup.items[]
                rollover_amount = rollup_item_data.get("rollover_amount", 0.0)
                budgeted_this_month = 0.0  # Budget is on rollup category
                current_balance = rollup_item_data.get("current_balance", 0.0)
                category_group_name = None
                category_missing = False
            else:
                rollover_amount = 0.0
                budgeted_this_month = 0.0
                current_balance = 0
                category_group_name = None
                category_missing = False

            # Frontend computes all derived values (frozen_target, ideal_rate, status, etc.)
            # Backend returns raw data only
            is_active = cat_state.is_active if cat_state else True

            items_data.append(
                {
                    "id": item.id,
                    "merchant_id": item.merchant_id,
                    "logo_url": item.logo_url,
                    # Use stored name if enabled (allows renames), else stream name
                    "name": cat_state.name if cat_state and is_enabled else item.name,
                    "category_name": item.category_name,
                    "category_id": cat_state.monarch_category_id if cat_state else None,
                    "category_group_name": category_group_name,
                    "category_missing": category_missing,
                    "amount": item.amount,
                    "frequency": item.frequency.value,
                    "frequency_months": item.frequency_months,
                    "next_due_date": item.next_due_date.isoformat(),
                    "base_date": item.base_date.isoformat() if item.base_date else None,
                    "months_until_due": item.months_until_due,
                    "current_balance": rollover_amount + budgeted_this_month,
                    "planned_budget": int(budgeted_this_month) if cat_state else 0,
                    "rollover_amount": rollover_amount,  # From Monarch API
                    "is_active": is_active,
                    "is_enabled": is_enabled,
                    "is_stale": item.is_stale,
                    "is_in_rollup": is_in_rollup,
                    "emoji": cat_state.emoji if cat_state else "🔄",
                }
            )

            if is_enabled and is_active:
                # Use ideal rate for summary - frontend recomputes actual totals
                ideal_rate = (
                    item.amount / item.frequency_months
                    if item.frequency_months > 0
                    else item.amount
                )
                total_monthly += ideal_rate
                # Progress = rollover + budgeted (what's been allocated toward the goal)
                total_saved += rollover_amount + budgeted_this_month
                total_target += item.amount
                active_count += 1
            elif not is_enabled:
                inactive_count += 1

        # Add inactive categories not in recurring items
        # Skip rollup_ prefixed entries - these are frozen target storage
        for recurring_id, cat_state in state.categories.items():
            if recurring_id.startswith("rollup_"):
                continue
            if not cat_state.is_active and recurring_id not in {i.id for i in recurring_items}:
                inactive_count += 1

        overall_progress = (total_saved / total_target * 100) if total_target > 0 else 0

        # Get ready to assign amount
        ready_to_assign_data = await self.category_manager.get_ready_to_assign()

        # rollup_data already fetched at the start of this method

        # Get active notices
        active_notices = self.state_manager.get_active_notices()

        return {
            "is_configured": True,
            "items": items_data,
            "summary": {
                "total_monthly_contribution": total_monthly,
                "total_saved": total_saved,
                "total_target": total_target,
                "overall_progress": round(overall_progress, 1),
                "active_count": active_count,
                "inactive_count": inactive_count,
            },
            "config": {
                "target_group_id": state.target_group_id,
                "target_group_name": state.target_group_name,
                "is_configured": True,
                "auto_sync_new": state.auto_sync_new,
                "auto_track_threshold": state.auto_track_threshold,
                "auto_update_targets": state.auto_update_targets,
                "auto_categorize_enabled": state.auto_categorize_enabled,
                "show_category_group": state.show_category_group,
                "user_first_name": state.user_first_name,
            },
            "last_sync": state.last_sync,
            "data_month": datetime.now().strftime("%Y-%m"),
            "ready_to_assign": ready_to_assign_data,
            "rollup": rollup_data,
            "notices": [
                {
                    "id": n.id,
                    "recurring_id": n.recurring_id,
                    "name": n.name,
                    "category_name": n.category_name,
                    "was_rollup": n.was_rollup,
                    "removed_at": n.removed_at,
                }
                for n in active_notices
            ],
        }

    # Auto-sync methods

    async def enable_auto_sync(
        self,
        interval_minutes: int,
        passphrase: str,
        consent_acknowledged: bool,
    ) -> dict[str, Any]:
        """
        Enable automatic background sync.

        This creates a server-encrypted copy of credentials for automation.
        The user must explicitly consent to this security trade-off.

        Args:
            interval_minutes: Minutes between sync runs
            passphrase: User's passphrase to decrypt current credentials
            consent_acknowledged: User has acknowledged the security implications

        Returns:
            Result with success status and schedule info
        """
        if not consent_acknowledged:
            return {"success": False, "error": "Security consent required"}

        # Load credentials with user's passphrase
        try:
            creds = self.credentials_service.credentials_manager.load(passphrase)
            if not creds:
                return {"success": False, "error": "Failed to load credentials"}
        except Exception as e:
            return {"success": False, "error": f"Invalid passphrase: {e}"}

        # Save copy encrypted with server key
        try:
            self.automation_creds.save(
                email=creds["email"],
                password=creds["password"],
                mfa_secret=creds.get("mfa_secret", ""),
            )
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to save automation credentials: {e}",
            }

        # Update state
        self.state_manager.update_auto_sync_state(
            enabled=True,
            interval_minutes=interval_minutes,
            consent_acknowledged=True,
        )

        # Start scheduler
        actual_interval = self.scheduler.enable_auto_sync(interval_minutes)
        scheduler_status = self.scheduler.get_status()

        logger.info(f"Auto-sync enabled: every {actual_interval} minutes")

        return {
            "success": True,
            "interval_minutes": actual_interval,
            "next_run": scheduler_status.get("next_run"),
        }

    def disable_auto_sync(self) -> dict[str, Any]:
        """
        Disable automatic background sync.

        Stops the scheduler and disables automation credentials.
        """
        self.scheduler.disable_auto_sync()
        self.automation_creds.disable()
        self.state_manager.disable_auto_sync()

        logger.info("Auto-sync disabled")

        return {"success": True}

    def set_visibility(self, is_foreground: bool) -> dict[str, Any]:
        """
        Update auto-sync interval based on app visibility.

        When app is in foreground, uses 5-minute interval.
        When app is in background, uses 60-minute interval.

        Args:
            is_foreground: True if app is visible/active

        Returns:
            Result with new interval if changed
        """
        new_interval = self.scheduler.set_foreground(is_foreground)

        if new_interval is not None:
            mode = "foreground" if is_foreground else "background"
            logger.info(f"Auto-sync interval changed to {new_interval} minutes ({mode})")
            return {
                "success": True,
                "interval_minutes": new_interval,
                "is_foreground": is_foreground,
            }

        return {"success": True, "changed": False, "is_foreground": is_foreground}

    def get_auto_sync_status(self) -> dict[str, Any]:
        """
        Get current auto-sync status and configuration.

        Returns:
            Status dict with enabled, interval, next run, last sync info, and visibility
        """
        auto_sync_state = self.state_manager.get_auto_sync_state()
        scheduler_status = self.scheduler.get_status()

        return {
            "enabled": auto_sync_state.enabled,
            "interval_minutes": scheduler_status.get("interval_minutes"),
            "next_run": scheduler_status.get("next_run"),
            "last_sync": auto_sync_state.last_auto_sync,
            "last_sync_success": auto_sync_state.last_auto_sync_success,
            "last_sync_error": auto_sync_state.last_auto_sync_error,
            "consent_acknowledged": auto_sync_state.consent_acknowledged,
            "is_foreground": scheduler_status.get("is_foreground", True),
        }

    def restore_auto_sync(self) -> bool:
        """
        Restore auto-sync from saved state on startup.

        Called during app initialization to resume scheduled syncs
        if they were previously enabled.

        Returns:
            True if auto-sync was restored, False otherwise
        """
        auto_sync_state = self.state_manager.get_auto_sync_state()

        if auto_sync_state.enabled and self.automation_creds.is_enabled():
            self.scheduler.enable_auto_sync(auto_sync_state.interval_minutes)
            logger.info(f"Auto-sync restored: every {auto_sync_state.interval_minutes} minutes")
            return True

        return False

    async def _automated_sync(self) -> None:
        """
        Run sync using automation credentials.

        This is the callback invoked by the scheduler.
        Uses server-encrypted credentials, not session credentials.
        """
        creds = self.automation_creds.load()
        if not creds:
            logger.error("Automated sync failed: no automation credentials available")
            self.state_manager.record_auto_sync_result(
                success=False, error="No automation credentials available"
            )
            return

        # Store original session credentials
        original_creds = CredentialsService._session_credentials

        try:
            # Temporarily use automation credentials
            CredentialsService._session_credentials = creds

            # Run the sync
            result = await self.full_sync()

            # Record result
            success = result.get("success", False)
            error = None if success else str(result.get("errors", []))

            self.state_manager.record_auto_sync_result(success=success, error=error)

            if success:
                logger.info("Automated sync completed successfully")
            else:
                logger.warning(f"Automated sync completed with errors: {error}")

        except Exception as e:
            logger.error(f"Automated sync failed: {e}")
            self.state_manager.record_auto_sync_result(success=False, error=str(e))
        finally:
            # Restore original session credentials
            CredentialsService._session_credentials = original_creds
