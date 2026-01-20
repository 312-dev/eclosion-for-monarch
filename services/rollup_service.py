"""
Rollup Service for Recurring Savings Tracker

Handles the rollup feature which allows multiple small recurring expenses
to be bundled into a single shared category in Monarch Money.
"""

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from state import StateManager

    from .category_manager import CategoryManager
    from .recurring_service import RecurringService


class RollupService:
    """
    Manages the rollup feature for bundling small recurring expenses.

    The rollup allows multiple small subscriptions to share a single
    Monarch category, simplifying budget management for items that
    don't need individual tracking.
    """

    def __init__(
        self,
        state_manager: "StateManager",
        category_manager: "CategoryManager",
        recurring_service: "RecurringService",
    ):
        self.state_manager = state_manager
        self.category_manager = category_manager
        self.recurring_service = recurring_service

    def _clear_all_rollup_frozen_targets(self) -> None:
        """
        Clear frozen targets for all rollup items.

        Called when items are added/removed from rollup to ensure all items
        recalculate with correct proportions on next get_rollup_data() call.
        """
        state = self.state_manager.load()
        for item_id in state.rollup.item_ids:
            self.state_manager.clear_frozen_target(f"rollup_{item_id}")

    async def toggle_rollup(self, enabled: bool) -> dict[str, Any]:
        """
        Enable or disable the rollup feature.
        When enabling, creates the rollup category in Monarch if needed.
        """
        state = self.state_manager.load()

        if enabled and not state.rollup.monarch_category_id:
            # Create the rollup category in Monarch
            if not state.is_configured() or not state.target_group_id:
                return {"success": False, "error": "Tracker not configured"}

            # Create with emoji as icon
            emoji = state.rollup.emoji
            category_id = await self.category_manager.create_category(
                group_id=state.target_group_id,
                name=state.rollup.category_name,
                icon=emoji,
            )
            self.state_manager.set_rollup_category_id(category_id)

        rollup = self.state_manager.toggle_rollup_enabled(enabled)
        return {
            "success": True,
            "enabled": rollup.enabled,
            "category_id": rollup.monarch_category_id,
        }

    async def link_rollup_to_category(
        self,
        category_id: str,
        sync_name: bool = True,
    ) -> dict[str, Any]:
        """
        Link the rollup to an existing Monarch category instead of creating new.

        Args:
            category_id: Existing Monarch category ID
            sync_name: If True, rename category to rollup default name

        Returns:
            Result with category info and current budget
        """
        state = self.state_manager.load()

        # Verify category exists
        cat_info = await self.category_manager.find_category_by_id(category_id)
        if not cat_info:
            return {"success": False, "error": "Category not found"}

        # Get current planned budget for this category
        all_planned = await self.category_manager.get_all_planned_budgets()
        planned_budget = all_planned.get(category_id, 0)

        # Optionally rename category to match rollup name
        if sync_name:
            rollup_name = state.rollup.category_name or "Recurring Rollup"
            emoji = state.rollup.emoji
            await self.category_manager.rename_category(category_id, rollup_name, icon=emoji)

        # Update state: set category ID, mark as linked, set budget, enable
        self.state_manager.set_rollup_category_id(category_id)
        state = self.state_manager.load()
        state.rollup.is_linked = True
        state.rollup.total_budgeted = planned_budget
        state.rollup.enabled = True
        self.state_manager.save(state)

        # Enable rollover on the linked category (ensure budget tracking works correctly)
        await self.category_manager.enable_category_rollover(category_id)

        return {
            "success": True,
            "category_id": category_id,
            "category_name": cat_info.get("name"),
            "planned_budget": planned_budget,
            "is_linked": True,
        }

    async def create_rollup_category(self, budget: int = 0) -> dict[str, Any]:
        """
        Explicitly create the rollup category in Monarch.

        Used during setup wizard when user chooses to create a new category.

        Args:
            budget: Initial budget amount (default $0)

        Returns:
            Result with created category info
        """
        state = self.state_manager.load()

        if not state.is_configured() or not state.target_group_id:
            return {"success": False, "error": "Tracker not configured"}

        if state.rollup.monarch_category_id:
            return {
                "success": True,
                "category_id": state.rollup.monarch_category_id,
                "message": "Rollup category already exists",
            }

        # Create the rollup category in Monarch
        emoji = state.rollup.emoji
        category_id = await self.category_manager.create_category(
            group_id=state.target_group_id,
            name=state.rollup.category_name,
            icon=emoji,
        )

        # Update state
        self.state_manager.set_rollup_category_id(category_id)
        state = self.state_manager.load()
        state.rollup.total_budgeted = budget
        state.rollup.enabled = True
        state.rollup.is_linked = False
        self.state_manager.save(state)

        return {
            "success": True,
            "category_id": category_id,
            "category_name": state.rollup.category_name,
            "budget": budget,
        }

    async def add_to_rollup(self, recurring_id: str) -> dict[str, Any]:
        """
        Add a subscription to the rollup.
        Sets the individual category budget to $0 and adds to rollup total.
        Auto-enables rollup and creates the category if needed.
        """
        state = self.state_manager.load()

        # Auto-enable and create rollup category if needed
        if not state.rollup.enabled or not state.rollup.monarch_category_id:
            if not state.is_configured() or not state.target_group_id:
                return {"success": False, "error": "Tracker not configured"}

            # Create the rollup category in Monarch if it doesn't exist
            if not state.rollup.monarch_category_id:
                emoji = state.rollup.emoji
                category_id = await self.category_manager.create_category(
                    group_id=state.target_group_id,
                    name=state.rollup.category_name,
                    icon=emoji,
                )
                self.state_manager.set_rollup_category_id(category_id)

            # Enable rollup
            self.state_manager.toggle_rollup_enabled(True)
            state = self.state_manager.load()

        if recurring_id in state.rollup.item_ids:
            return {"success": True, "message": "Item already in rollup"}

        # Get item details
        recurring_items = await self.recurring_service.get_all_recurring()
        item = next((i for i in recurring_items if i.id == recurring_id), None)

        if not item:
            return {"success": False, "error": "Recurring item not found"}

        # Calculate ideal monthly rate (simple: amount / frequency_months)
        monthly_rate = (
            round(item.amount / item.frequency_months) if item.frequency_months > 0 else item.amount
        )

        # Add to rollup (local state only - user controls Monarch budget via input)
        rollup = self.state_manager.add_to_rollup(recurring_id, monthly_rate)

        # Clear all rollup frozen targets so they recalculate with correct proportions
        self._clear_all_rollup_frozen_targets()

        return {
            "success": True,
            "item_id": recurring_id,
            "monthly_rate": monthly_rate,
            "total_budgeted": rollup.total_budgeted,
        }

    async def remove_from_rollup(self, recurring_id: str) -> dict[str, Any]:
        """
        Remove a subscription from the rollup.
        Restores the individual category budget.
        """
        state = self.state_manager.load()

        if recurring_id not in state.rollup.item_ids:
            return {"success": True, "message": "Item not in rollup"}

        # Get item details
        recurring_items = await self.recurring_service.get_all_recurring()
        item = next((i for i in recurring_items if i.id == recurring_id), None)

        if not item:
            return {"success": False, "error": "Recurring item not found"}

        # Calculate ideal monthly rate (simple: amount / frequency_months)
        monthly_rate = (
            round(item.amount / item.frequency_months) if item.frequency_months > 0 else item.amount
        )

        # Remove from rollup (local state only - user controls Monarch budget via input)
        rollup = self.state_manager.remove_from_rollup(recurring_id, monthly_rate)

        # Clear all rollup frozen targets so remaining items recalculate with correct proportions
        self._clear_all_rollup_frozen_targets()

        # Also clear the removed item's frozen target
        self.state_manager.clear_frozen_target(f"rollup_{recurring_id}")

        return {
            "success": True,
            "item_id": recurring_id,
            "monthly_rate": monthly_rate,
            "total_budgeted": rollup.total_budgeted,
        }

    async def set_rollup_budget(self, amount: float) -> dict[str, Any]:
        """Set the user-defined rollup budget amount."""
        state = self.state_manager.load()

        if not state.rollup.enabled:
            return {"success": False, "error": "Rollup feature is not enabled"}

        rollup = self.state_manager.set_rollup_budget(amount)

        # Update Monarch category budget
        if rollup.monarch_category_id:
            await self.category_manager.set_category_budget(
                rollup.monarch_category_id,
                amount,
                apply_to_future=True,
            )

        return {
            "success": True,
            "total_budgeted": rollup.total_budgeted,
        }

    async def update_rollup_emoji(self, emoji: str) -> dict[str, Any]:
        """
        Update the emoji/icon for the rollup category in Monarch.
        Sets the emoji via the icon field, not as part of the name.
        """
        state = self.state_manager.load()

        if not state.rollup.monarch_category_id:
            return {"success": False, "error": "Rollup category does not exist"}

        # Update state
        rollup = self.state_manager.update_rollup_emoji(emoji)

        # Update category icon in Monarch (emoji is set via icon field, not in name)
        assert rollup.monarch_category_id is not None
        await self.category_manager.update_category_icon(rollup.monarch_category_id, emoji)

        return {
            "success": True,
            "emoji": emoji,
        }

    async def update_rollup_category_name(self, name: str) -> dict[str, Any]:
        """
        Update the name for the rollup category and rename it in Monarch.
        Does NOT include emoji in the name - emoji is set separately via the icon field.
        """
        state = self.state_manager.load()

        if not state.rollup.monarch_category_id:
            return {"success": False, "error": "Rollup category does not exist"}

        # Update state
        rollup = self.state_manager.update_rollup_category_name(name)

        # Update category name in Monarch (without emoji - emoji is set via icon field)
        assert rollup.monarch_category_id is not None
        await self.category_manager.rename_category(rollup.monarch_category_id, name)

        return {
            "success": True,
            "category_name": name,
        }

    async def get_rollup_data(self) -> dict[str, Any]:
        """Get rollup state with raw data - frontend computes derived values."""
        state = self.state_manager.load()
        rollup = state.rollup

        # Fetch actual category name from Monarch if linked
        category_name = rollup.category_name
        if rollup.monarch_category_id:
            cat_info = await self.category_manager.find_category_by_id(rollup.monarch_category_id)
            if cat_info:
                category_name = cat_info.get("name", rollup.category_name)

        # Rollup is always available - return empty items if none added yet
        if not rollup.item_ids:
            return {
                "enabled": True,
                "items": [],
                "total_target": 0,
                "budgeted": rollup.total_budgeted,
                "current_balance": 0,
                "category_id": rollup.monarch_category_id,
                "emoji": rollup.emoji,
                "category_name": category_name,
            }

        # Get items in rollup
        recurring_items = await self.recurring_service.get_all_recurring()
        rollup_items = [i for i in recurring_items if i.id in rollup.item_ids]

        # Get budget data from Monarch (shared rollup category)
        rollover_amount = 0.0
        current_balance = 0.0

        if rollup.monarch_category_id:
            all_budget_data = await self.category_manager.get_all_category_budget_data()
            cat_data = all_budget_data.get(rollup.monarch_category_id, {})
            rollover_amount = cat_data.get("rollover", 0.0)
            current_balance = cat_data.get("remaining", 0.0)

        # Calculate total target (sum of all item amounts)
        total_target = sum(item.amount for item in rollup_items)

        # Build raw item data - frontend computes frozen_target, ideal_rate, status, etc.
        items_data: list[dict[str, Any]] = []

        for item in rollup_items:
            # Calculate proportional share of budget data for this item
            # All items share the single rollup category, so we split proportionally
            if total_target > 0:
                proportion = item.amount / total_target
                item_rollover = rollover_amount * proportion
            else:
                item_rollover = 0

            items_data.append(
                {
                    "id": item.id,
                    "name": item.name,
                    "merchant_id": item.merchant_id,
                    "logo_url": item.logo_url,
                    "amount": item.amount,
                    "frequency": item.frequency.value,
                    "frequency_months": item.frequency_months,
                    "next_due_date": item.next_due_date.isoformat(),
                    "base_date": item.base_date.isoformat() if item.base_date else None,
                    "months_until_due": item.months_until_due,
                    # Proportional rollover for frontend to compute frozen_target
                    "rollover_amount": item_rollover,
                }
            )

        return {
            "enabled": True,
            "items": items_data,
            "total_target": total_target,
            "budgeted": rollup.total_budgeted,
            "current_balance": current_balance,
            "category_id": rollup.monarch_category_id,
            "emoji": rollup.emoji,
            "category_name": rollup.category_name,
        }
