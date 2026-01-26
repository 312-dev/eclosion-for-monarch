"""
Category Manager

Creates and manages Monarch Money categories for recurring transactions.
"""

import os
import sys
from typing import Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from monarch_utils import (
    clear_cache,
    get_cache,
    get_mm,
    get_month_range,
    get_savings_goals,
    retry_with_backoff,
)


class CategoryManager:
    """Manages category creation and lifecycle in Monarch."""

    async def _get_budgets_cached(self, force_refresh: bool = False) -> dict[str, Any]:
        """
        Get budget data with caching.

        Budget data is cached for 5 minutes to avoid redundant API calls
        when multiple methods need budget info in the same operation.
        """
        cache = get_cache("budget")
        start, _ = get_month_range()
        cache_key = f"budgets_{start}"

        if not force_refresh and cache_key in cache:
            cached: dict[str, Any] = cache[cache_key]
            return cached

        mm = await get_mm()
        budgets: dict[str, Any] = await retry_with_backoff(lambda: mm.get_budgets(start, start))

        cache[cache_key] = budgets
        return budgets

    async def get_category_groups(self, force_refresh: bool = False) -> list[dict[str, str]]:
        """
        Get all category groups from Monarch (basic info only).

        Returns list of {id, name} dicts. Cached for 10 minutes.
        For full metadata including rollover/flexible settings, use get_category_groups_detailed().
        """
        cache = get_cache("category_groups")
        cache_key = "groups"

        if not force_refresh and cache_key in cache:
            cached: list[dict[str, str]] = cache[cache_key]
            return cached

        mm = await get_mm()
        groups = await retry_with_backoff(lambda: mm.get_transaction_category_groups())

        result = [{"id": g["id"], "name": g["name"]} for g in groups.get("categoryGroups", [])]

        cache[cache_key] = result
        return result

    async def get_category_groups_detailed(
        self, force_refresh: bool = False
    ) -> list[dict[str, Any]]:
        """
        Get all category groups from Monarch with full metadata.

        Uses the budget API which includes rollover and group-level budgeting settings.
        The get_transaction_category_groups() API doesn't include these fields.

        Returns list of dicts with:
        - id: group ID
        - name: group name
        - type: "expense", "income", etc.
        - budget_variability: "fixed" or "flexible"
        - group_level_budgeting_enabled: whether budgets are set at group level
        - rollover_enabled: whether rollover is enabled
        - rollover_period: dict with rollover config if enabled, else None
          - start_month: rollover start date (YYYY-MM-DD)
          - starting_balance: initial balance
          - type: rollover type (e.g., "monthly")
          - target_amount: target amount if set

        Cached for 10 minutes.
        """
        cache = get_cache("category_groups")
        cache_key = "groups_detailed"

        if not force_refresh and cache_key in cache:
            cached: list[dict[str, Any]] = cache[cache_key]
            return cached

        # Use budget API which includes rollover and group-level budgeting fields
        # (get_transaction_category_groups doesn't include these fields)
        budgets = await self._get_budgets_cached(force_refresh)

        result: list[dict[str, Any]] = []
        for g in budgets.get("categoryGroups", []):
            rollover_period = g.get("rolloverPeriod")
            result.append(
                {
                    "id": g["id"],
                    "name": g["name"],
                    "type": g.get("type"),
                    "order": g.get("order"),
                    "budget_variability": g.get("budgetVariability"),
                    "group_level_budgeting_enabled": g.get("groupLevelBudgetingEnabled", False),
                    "rollover_enabled": rollover_period is not None,
                    "rollover_period": (
                        {
                            "id": rollover_period.get("id"),
                            "start_month": rollover_period.get("startMonth"),
                            "end_month": rollover_period.get("endMonth"),
                            "starting_balance": rollover_period.get("startingBalance"),
                            "type": rollover_period.get("type"),
                            "frequency": rollover_period.get("frequency"),
                            "target_amount": rollover_period.get("targetAmount"),
                        }
                        if rollover_period
                        else None
                    ),
                }
            )

        cache[cache_key] = result
        return result

    async def get_flexible_rollover_groups(
        self, force_refresh: bool = False
    ) -> list[dict[str, Any]]:
        """
        Get category groups that have flexible budgeting with rollover enabled.

        Returns a filtered list of groups where:
        - group_level_budgeting_enabled is True
        - rollover is enabled (rolloverPeriod is not None)

        Useful for identifying groups that behave like "envelope" budgeting.
        """
        all_groups = await self.get_category_groups_detailed(force_refresh)
        return [
            g
            for g in all_groups
            if g.get("group_level_budgeting_enabled") and g.get("rollover_enabled")
        ]

    async def update_category_group_settings(
        self,
        group_id: str,
        name: str | None = None,
        budget_variability: str | None = None,
        group_level_budgeting_enabled: bool | None = None,
        rollover_enabled: bool | None = None,
        rollover_start_month: str | None = None,
        rollover_starting_balance: float | None = None,
        rollover_type: str | None = None,
    ) -> dict[str, Any]:
        """
        Update a category group's settings including rollover and flexible budget configuration.

        Args:
            group_id: The ID of the category group to update
            name: Optional new name for the group
            budget_variability: Optional budget type - "fixed" or "flexible"
            group_level_budgeting_enabled: Optional - whether budgets are set at group level
            rollover_enabled: Optional - whether to enable/disable rollover
            rollover_start_month: Optional rollover start month (YYYY-MM-DD format)
            rollover_starting_balance: Optional starting balance for rollover
            rollover_type: Optional rollover type (e.g., "monthly")

        Returns:
            The updated category group data with normalized field names
        """
        mm = await get_mm()

        result = await retry_with_backoff(
            lambda: mm.update_category_group_settings(
                group_id=group_id,
                name=name,
                budget_variability=budget_variability,
                group_level_budgeting_enabled=group_level_budgeting_enabled,
                rollover_enabled=rollover_enabled,
                rollover_start_month=rollover_start_month,
                rollover_starting_balance=rollover_starting_balance,
                rollover_type=rollover_type,
            )
        )

        # Clear caches after mutation
        clear_cache("category")
        clear_cache("category_groups")
        clear_cache("budget")

        # Normalize the response
        if isinstance(result, dict):
            group_data = result.get("updateCategoryGroup", {}).get("categoryGroup", {})
            if group_data:
                rollover_period = group_data.get("rolloverPeriod")
                return {
                    "id": group_data.get("id"),
                    "name": group_data.get("name"),
                    "type": group_data.get("type"),
                    "budget_variability": group_data.get("budgetVariability"),
                    "group_level_budgeting_enabled": group_data.get(
                        "groupLevelBudgetingEnabled", False
                    ),
                    "rollover_enabled": rollover_period is not None,
                    "rollover_period": (
                        {
                            "id": rollover_period.get("id"),
                            "start_month": rollover_period.get("startMonth"),
                            "end_month": rollover_period.get("endMonth"),
                            "starting_balance": rollover_period.get("startingBalance"),
                            "type": rollover_period.get("type"),
                            "frequency": rollover_period.get("frequency"),
                            "target_amount": rollover_period.get("targetAmount"),
                        }
                        if rollover_period
                        else None
                    ),
                }

        return result if isinstance(result, dict) else {}

    async def enable_category_group_rollover(
        self,
        group_id: str,
        start_month: str | None = None,
        starting_balance: float = 0.0,
        rollover_type: str = "monthly",
    ) -> dict[str, Any]:
        """
        Enable rollover on a category group.

        This is a convenience method that calls update_category_group_settings
        with rollover_enabled=True.

        Args:
            group_id: The ID of the category group
            start_month: Rollover start month (YYYY-MM-DD). Defaults to first of current month.
            starting_balance: Initial balance for rollover (default 0)
            rollover_type: Rollover frequency type (default "monthly")

        Returns:
            The updated category group data
        """
        if start_month is None:
            from datetime import datetime

            start_month = datetime.today().replace(day=1).strftime("%Y-%m-%d")

        return await self.update_category_group_settings(
            group_id=group_id,
            rollover_enabled=True,
            rollover_start_month=start_month,
            rollover_starting_balance=starting_balance,
            rollover_type=rollover_type,
        )

    async def disable_category_group_rollover(self, group_id: str) -> dict[str, Any]:
        """
        Disable rollover on a category group.

        Args:
            group_id: The ID of the category group

        Returns:
            The updated category group data
        """
        return await self.update_category_group_settings(
            group_id=group_id,
            rollover_enabled=False,
        )

    async def update_group_rollover_balance(
        self,
        group_id: str,
        amount_to_add: int,
    ) -> dict[str, Any]:
        """
        Add funds to a category group's rollover starting balance.

        This is the group-level equivalent of update_category_rollover_balance().
        Used by the Stash Distribute wizard for flexible category groups that have
        group-level rollover enabled.

        Args:
            group_id: The ID of the category group
            amount_to_add: Amount (in dollars) to add to the starting balance

        Returns:
            The updated category group data
        """
        # Get current group data to find existing rollover balance
        groups = await self.get_category_groups_detailed(force_refresh=True)
        group = next((g for g in groups if g["id"] == group_id), None)

        if not group:
            raise ValueError(f"Category group not found: {group_id}")

        if not group.get("rollover_enabled"):
            raise ValueError(f"Rollover is not enabled for group: {group_id}")

        # Get current rollover balance
        rollover_period = group.get("rollover_period") or {}
        current_balance = rollover_period.get("starting_balance", 0) or 0

        # Calculate new balance
        new_balance = current_balance + amount_to_add

        # Get rollover config from existing settings
        rollover_start_month = rollover_period.get("start_month")
        rollover_type = rollover_period.get("type", "monthly")

        # IMPORTANT: Monarch API requires ALL fields when updating a category group
        # Missing fields cause "Something went wrong" errors
        return await self.update_category_group_settings(
            group_id=group_id,
            name=group.get("name"),
            budget_variability=group.get("budget_variability"),
            group_level_budgeting_enabled=group.get("group_level_budgeting_enabled"),
            rollover_enabled=True,
            rollover_start_month=rollover_start_month,
            rollover_starting_balance=new_balance,
            rollover_type=rollover_type,
        )

    async def get_all_categories_grouped(self) -> list[dict[str, Any]]:
        """
        Get all categories from Monarch, organized by group.

        Returns a list of groups, each containing their categories:
        [
            {
                "id": "group-id",
                "name": "Group Name",
                "categories": [
                    {"id": "cat-id", "name": "Category Name", "icon": "emoji"},
                    ...
                ]
            },
            ...
        ]

        Used by the Notes feature to display all Monarch categories.
        Note: Uses budget API instead of get_transaction_categories because
        only the budget API returns the icon field for categories.
        """
        # Use budget data which includes icons (get_transaction_categories doesn't)
        budgets = await self._get_budgets_cached()

        result = []
        for group in budgets.get("categoryGroups", []):
            group_id = group.get("id")
            group_name = group.get("name")

            if not group_id:
                continue

            categories = []
            for cat in group.get("categories", []):
                cat_id = cat.get("id")
                if cat_id:
                    categories.append(
                        {
                            "id": cat_id,
                            "name": cat.get("name"),
                            "icon": cat.get("icon"),
                        }
                    )

            result.append(
                {
                    "id": group_id,
                    "name": group_name,
                    "categories": categories,
                }
            )

        return result

    async def create_category(
        self,
        group_id: str,
        name: str,
        icon: str = "piggy-bank",
    ) -> str:
        """
        Create a new category in Monarch.

        Args:
            group_id: Target category group ID
            name: Category name
            icon: Icon name (default: piggy-bank)

        Returns:
            New category ID
        """
        mm = await get_mm()

        result = await retry_with_backoff(
            lambda: mm.create_transaction_category(
                group_id=group_id,
                transaction_category_name=name,
                icon=icon,
                rollover_enabled=True,
                rollover_type="monthly",
            )
        )

        # Clear category cache after mutation
        clear_cache("category")

        # Extract category ID from response
        # Response structure may vary - handle common patterns
        if isinstance(result, dict):
            if "createCategory" in result:
                return str(result["createCategory"]["category"]["id"])
            elif "id" in result:
                return str(result["id"])
            elif "category" in result:
                return str(result["category"]["id"])

        raise ValueError(f"Unexpected response from create_transaction_category: {result}")

    async def enable_category_rollover(
        self,
        category_id: str,
    ) -> dict[str, Any]:
        """
        Enable rollover on an existing category.

        This ensures categories linked to Recurring or Stash items
        have rollover enabled for proper budget tracking.

        Args:
            category_id: Monarch category ID to enable rollover on

        Returns:
            Updated category data from Monarch API
        """
        mm = await get_mm()

        result = await retry_with_backoff(
            lambda: mm.enable_category_rollover(category_id=category_id)
        )

        # Clear caches after mutation
        clear_cache("category")
        clear_cache("budget")

        result_dict: dict[str, Any] = result if isinstance(result, dict) else {}
        return result_dict

    async def update_category_group(
        self,
        category_id: str,
        new_group_id: str,
    ) -> dict[str, Any]:
        """
        Move a category to a different category group.

        Args:
            category_id: Monarch category ID to move
            new_group_id: Target category group ID

        Returns:
            Updated category data
        """
        mm = await get_mm()

        # Use library method
        result = await retry_with_backoff(
            lambda: mm.update_transaction_category(
                category_id=category_id,
                group_id=new_group_id,
            )
        )

        # Clear caches after mutation
        clear_cache("category")
        clear_cache("budget")

        result_dict: dict[str, Any] = result if isinstance(result, dict) else {}
        return result_dict

    async def rename_category(
        self,
        category_id: str,
        new_name: str,
        icon: str | None = None,
    ) -> dict[str, Any]:
        """
        Rename a category in Monarch, optionally updating its icon.

        Args:
            category_id: Monarch category ID
            new_name: New category name
            icon: Optional icon (can be an emoji like "🔄" or predefined name like "piggy-bank")

        Returns:
            Updated category data
        """
        mm = await get_mm()

        # Use library method
        result = await retry_with_backoff(
            lambda: mm.update_transaction_category(
                category_id=category_id,
                name=new_name,
                icon=icon,
            )
        )

        # Clear caches after mutation
        clear_cache("category")

        result_dict: dict[str, Any] = result if isinstance(result, dict) else {}
        return result_dict

    async def update_category_icon(
        self,
        category_id: str,
        icon: str,
    ) -> dict[str, Any]:
        """
        Update just the icon for a category in Monarch.

        Args:
            category_id: Monarch category ID
            icon: Icon (can be an emoji like "🔄" or predefined name like "piggy-bank")

        Returns:
            Updated category data
        """
        mm = await get_mm()

        # Use library method
        result = await retry_with_backoff(
            lambda: mm.update_transaction_category(
                category_id=category_id,
                icon=icon,
            )
        )

        # Clear caches after mutation
        clear_cache("category")

        result_dict: dict[str, Any] = result if isinstance(result, dict) else {}
        return result_dict

    async def get_category_balance(self, category_id: str) -> float:
        """
        Get current remaining balance for a category.

        Args:
            category_id: Monarch category ID

        Returns:
            Remaining balance (remainingAmount from budget)
        """
        start, _ = get_month_range()
        budgets = await self._get_budgets_cached()

        for entry in budgets.get("budgetData", {}).get("monthlyAmountsByCategory", []):
            if entry.get("category", {}).get("id") == category_id:
                for month in entry.get("monthlyAmounts", []):
                    if month.get("month") == start:
                        return float(month.get("remainingAmount", 0))

        return 0.0

    async def set_category_budget(
        self,
        category_id: str,
        amount: float,
        apply_to_future: bool = False,
    ) -> None:
        """
        Set budget amount for a category.

        Args:
            category_id: Monarch category ID
            amount: Budget amount (rounded up to nearest dollar)
            apply_to_future: Whether to apply to future months
        """
        mm = await get_mm()
        start, _ = get_month_range()

        await retry_with_backoff(
            lambda: mm.set_budget_amount(
                int(amount),  # Monarch expects integer
                category_id=category_id,
                category_group_id=None,
                timeframe="month",
                start_date=start,
                apply_to_future=apply_to_future,
            )
        )

        # Clear budget cache after mutation
        clear_cache("budget")

    async def set_group_budget(
        self,
        group_id: str,
        amount: float,
        apply_to_future: bool = False,
    ) -> None:
        """
        Set budget amount for a category group (flexible budgeting).

        Used for groups with group_level_budgeting_enabled=True, where budgets
        are managed at the group level rather than individual categories.

        Args:
            group_id: Monarch category group ID
            amount: Budget amount (rounded to nearest dollar)
            apply_to_future: Whether to apply to future months
        """
        mm = await get_mm()
        start, _ = get_month_range()

        await retry_with_backoff(
            lambda: mm.set_budget_amount(
                int(amount),  # Monarch expects integer
                category_id=None,
                category_group_id=group_id,
                timeframe="month",
                start_date=start,
                apply_to_future=apply_to_future,
            )
        )

        # Clear budget cache after mutation
        clear_cache("budget")

    async def _get_categories_cached(self, force_refresh: bool = False) -> dict[str, Any]:
        """
        Get all categories with caching.

        Category data is cached for 5 minutes to avoid redundant API calls.
        """
        cache = get_cache("category")
        cache_key = "all_categories"

        if not force_refresh and cache_key in cache:
            cached: dict[str, Any] = cache[cache_key]
            return cached

        mm = await get_mm()
        categories: dict[str, Any] = await retry_with_backoff(
            lambda: mm.get_transaction_categories()
        )

        cache[cache_key] = categories
        return categories

    async def find_category_by_id(self, category_id: str) -> dict[str, Any] | None:
        """
        Check if a category exists by ID.

        Returns category info if found, None if not.
        Uses cached category data.
        """
        categories = await self._get_categories_cached()

        for cat in categories.get("categories", []):
            if cat.get("id") == category_id:
                group = cat.get("group", {})
                return {
                    "id": cat["id"],
                    "name": cat["name"],
                    "group_id": group.get("id"),
                    "group_name": group.get("name"),
                }

        return None

    async def get_all_category_balances(self) -> dict[str, float]:
        """
        Get remaining balances for all categories.

        Returns dict: category_id -> remainingAmount
        Uses cached budget data.
        """
        start, _ = get_month_range()
        budgets = await self._get_budgets_cached()

        balances = {}
        for entry in budgets.get("budgetData", {}).get("monthlyAmountsByCategory", []):
            cat_id = entry.get("category", {}).get("id")
            if cat_id:
                for month in entry.get("monthlyAmounts", []):
                    if month.get("month") == start:
                        balances[cat_id] = month.get("remainingAmount", 0)
                        break

        return balances

    async def get_all_planned_budgets(self) -> dict[str, int]:
        """
        Get planned budget amounts for all categories.

        Returns dict: category_id -> plannedCashFlowAmount (as int)
        Uses cached budget data.
        """
        start, _ = get_month_range()
        budgets = await self._get_budgets_cached()

        planned = {}
        for entry in budgets.get("budgetData", {}).get("monthlyAmountsByCategory", []):
            cat_id = entry.get("category", {}).get("id")
            if cat_id:
                for month in entry.get("monthlyAmounts", []):
                    if month.get("month") == start:
                        planned[cat_id] = int(month.get("plannedCashFlowAmount", 0))
                        break

        return planned

    async def get_last_month_planned_budgets(self) -> dict[str, int]:
        """
        Get planned budget amounts for all categories from the PREVIOUS month.

        Used by the Distribute wizard to calculate fallback ratios when
        Available to Stash is <= 0.

        Returns dict: category_id -> plannedCashFlowAmount (as int) for last month
        """
        from datetime import datetime, timedelta

        # Calculate previous month's date range
        now = datetime.now()
        first_of_this_month = now.replace(day=1)
        last_of_prev_month = first_of_this_month - timedelta(days=1)
        prev_month_start = last_of_prev_month.replace(day=1).strftime("%Y-%m-%d")

        mm = await get_mm()
        # Fetch budget data for previous month only
        budgets: dict[str, Any] = await retry_with_backoff(
            lambda: mm.get_budgets(prev_month_start, prev_month_start)
        )

        planned: dict[str, int] = {}
        for entry in budgets.get("budgetData", {}).get("monthlyAmountsByCategory", []):
            cat_id = entry.get("category", {}).get("id")
            if cat_id:
                for month in entry.get("monthlyAmounts", []):
                    if month.get("month") == prev_month_start:
                        planned[cat_id] = int(month.get("plannedCashFlowAmount", 0))
                        break

        return planned

    async def get_all_category_rollovers(self) -> dict[str, float]:
        """
        Get rollover amounts (start of month balance) for all categories.

        This is the amount that rolled over from the previous month,
        representing the starting balance before any budgeting this month.

        Returns dict: category_id -> previousMonthRolloverAmount
        Uses cached budget data.
        """
        start, _ = get_month_range()
        budgets = await self._get_budgets_cached()

        rollovers = {}
        for entry in budgets.get("budgetData", {}).get("monthlyAmountsByCategory", []):
            cat_id = entry.get("category", {}).get("id")
            if cat_id:
                for month in entry.get("monthlyAmounts", []):
                    if month.get("month") == start:
                        rollovers[cat_id] = float(month.get("previousMonthRolloverAmount", 0))
                        break

        return rollovers

    async def get_all_category_budget_data(self) -> dict[str, dict[str, float]]:
        """
        Get comprehensive budget data for all categories.

        Returns all budget fields needed for frozen target calculation:
        - rollover: previousMonthRolloverAmount (start of month balance)
        - budgeted: plannedCashFlowAmount (what was budgeted this month)
        - remaining: remainingAmount (current balance)
        - actual: actualAmount (spending this month)

        Returns dict: category_id -> {rollover, budgeted, remaining, actual}
        Uses cached budget data.
        """
        start, _ = get_month_range()
        budgets = await self._get_budgets_cached()

        data: dict[str, dict[str, float]] = {}
        for entry in budgets.get("budgetData", {}).get("monthlyAmountsByCategory", []):
            cat_id = entry.get("category", {}).get("id")
            if cat_id:
                for month in entry.get("monthlyAmounts", []):
                    if month.get("month") == start:
                        data[cat_id] = {
                            "rollover": float(month.get("previousMonthRolloverAmount") or 0),
                            "budgeted": float(month.get("plannedCashFlowAmount") or 0),
                            "remaining": float(month.get("remainingAmount") or 0),
                            "actual": float(month.get("actualAmount") or 0),
                        }
                        break

        return data

    async def get_all_category_group_budget_data(self) -> dict[str, dict[str, float]]:
        """
        Get comprehensive budget data for all category groups.

        This is used for groups with group_level_budgeting_enabled=True,
        where budgets are set at the group level rather than category level.

        Returns all budget fields:
        - rollover: previousMonthRolloverAmount (start of month balance)
        - budgeted: plannedCashFlowAmount (what was budgeted this month)
        - remaining: remainingAmount (current balance)
        - actual: actualAmount (spending this month)

        Returns dict: group_id -> {rollover, budgeted, remaining, actual}
        Uses cached budget data.
        """
        start, _ = get_month_range()
        budgets = await self._get_budgets_cached()

        data: dict[str, dict[str, float]] = {}
        for entry in budgets.get("budgetData", {}).get("monthlyAmountsByCategoryGroup", []):
            group_id = entry.get("categoryGroup", {}).get("id")
            if group_id:
                for month in entry.get("monthlyAmounts", []):
                    if month.get("month") == start:
                        data[group_id] = {
                            "rollover": float(month.get("previousMonthRolloverAmount") or 0),
                            "budgeted": float(month.get("plannedCashFlowAmount") or 0),
                            "remaining": float(month.get("remainingAmount") or 0),
                            "actual": float(month.get("actualAmount") or 0),
                        }
                        break

        return data

    async def get_all_category_info(self) -> dict[str, dict[str, str]]:
        """
        Get info for all categories including their group names.

        Uses cached category data.

        Returns dict: category_id -> {name, group_id, group_name}
        """
        categories = await self._get_categories_cached()

        info = {}
        for cat in categories.get("categories", []):
            cat_id = cat.get("id")
            if cat_id:
                group = cat.get("group", {})
                info[cat_id] = {
                    "name": cat.get("name"),
                    "group_id": group.get("id"),
                    "group_name": group.get("name"),
                }

        return info

    async def get_ready_to_assign(self) -> dict[str, Any]:
        """
        Get the "Ready to Assign" amount - unbudgeted funds available.

        This is calculated as:
        Total Income (planned) - Total Expenses (planned) - Total Savings Goals (planned)

        This matches Monarch's "Left to Budget" calculation.

        Returns dict with ready_to_assign amount and breakdown.
        Uses cached budget data.
        """
        start, _ = get_month_range()
        budgets = await self._get_budgets_cached()
        mm = await get_mm()

        # Fetch savings goals from the savingsGoalMonthlyBudgetAmounts API
        # This is separate from goalsV2 and contains the actual "Save Up Goals"
        savings_goals = await get_savings_goals(mm, start, start)

        # Calculate total planned savings for this month from active goals
        planned_savings = 0
        for goal_data in savings_goals:
            savings_goal = goal_data.get("savingsGoal", {})
            # Skip archived or completed goals
            if savings_goal.get("archivedAt") or savings_goal.get("completedAt"):
                continue
            for amount_data in goal_data.get("monthlyAmounts", []):
                if amount_data.get("month") == start:
                    planned_savings += amount_data.get("plannedAmount") or 0

        totals_by_month = budgets.get("budgetData", {}).get("totalsByMonth", [])
        for totals in totals_by_month:
            if totals.get("month") == start:
                income = totals.get("totalIncome", {})
                expenses = totals.get("totalExpenses", {})

                planned_income = income.get("plannedAmount", 0)
                planned_expenses = expenses.get("plannedAmount", 0)
                actual_income = income.get("actualAmount", 0)
                actual_expenses = expenses.get("actualAmount", 0)

                # Left to budget = planned income - planned expenses - planned savings
                ready_to_assign = planned_income - planned_expenses - planned_savings

                return {
                    "ready_to_assign": ready_to_assign,
                    "planned_income": planned_income,
                    "actual_income": actual_income,
                    "planned_expenses": planned_expenses,
                    "actual_expenses": actual_expenses,
                    "planned_savings": planned_savings,
                    "remaining_income": income.get("remainingAmount", 0),
                }

        return {
            "ready_to_assign": 0,
            "planned_income": 0,
            "actual_income": 0,
            "planned_expenses": 0,
            "actual_expenses": 0,
            "planned_savings": 0,
            "remaining_income": 0,
        }

    async def get_unmapped_categories(
        self,
        mapped_category_ids: list[str],
    ) -> list[dict[str, Any]]:
        """
        Get all categories that are NOT mapped to a recurring item.

        This is used when linking a disabled recurring item to an existing
        category instead of creating a new one.

        Args:
            mapped_category_ids: List of category IDs already mapped to recurring items

        Returns:
            List of unmapped categories with {id, name, group_id, group_name}
        """
        categories = await self._get_categories_cached()
        mapped_set = set(mapped_category_ids)

        # Note: We intentionally don't fetch planned_budgets here to avoid
        # an extra API call. The budget amount is not essential for category
        # selection in the rollup dropdown.

        unmapped = []
        # Track group order as they appear (preserves budget sheet order)
        group_order: dict[str, int] = {}
        group_index = 0

        for cat_index, cat in enumerate(categories.get("categories", [])):
            cat_id = cat.get("id")
            if cat_id and cat_id not in mapped_set:
                group = cat.get("group", {})
                group_id = group.get("id")

                # Track first occurrence of each group
                if group_id and group_id not in group_order:
                    group_order[group_id] = group_index
                    group_index += 1

                unmapped.append(
                    {
                        "id": cat_id,
                        "name": cat.get("name"),
                        "group_id": group_id,
                        "group_name": group.get("name"),
                        "icon": cat.get("icon"),
                        # Preserve original order from budget sheet
                        "group_order": group_order.get(group_id, 999),
                        "category_order": cat_index,
                    }
                )

        # Sort by group order then category order (preserves budget sheet order)
        unmapped.sort(key=lambda x: (x.get("group_order", 999), x.get("category_order", 999)))
        return unmapped

    async def delete_category(self, category_id: str) -> dict[str, Any]:
        """
        Delete a category from Monarch.

        Args:
            category_id: Monarch category ID to delete

        Returns:
            Dict with success status
        """
        mm = await get_mm()

        try:
            await retry_with_backoff(
                lambda: mm.delete_transaction_category(category_id=category_id)
            )

            # Clear caches after mutation
            clear_cache("category")
            clear_cache("budget")

            return {"success": True, "category_id": category_id}
        except Exception as e:
            return {"success": False, "category_id": category_id, "error": str(e)}

    async def allocate_to_category(
        self,
        category_id: str,
        amount: float,
    ) -> dict[str, Any]:
        """
        Allocate additional funds to a category by increasing its budget.

        This is used when a category is "at risk" and needs extra funds
        to get back on track with the ideal monthly rate.

        Args:
            category_id: Monarch category ID
            amount: Additional amount to allocate (added to current budget)

        Returns:
            Dict with success status and new budget amount
        """
        mm = await get_mm()
        start, _ = get_month_range()

        # Get current budget for this category (use cached data)
        budgets = await self._get_budgets_cached()
        current_budget = 0

        for entry in budgets.get("budgetData", {}).get("monthlyAmountsByCategory", []):
            if entry.get("category", {}).get("id") == category_id:
                for month in entry.get("monthlyAmounts", []):
                    if month.get("month") == start:
                        current_budget = month.get("plannedCashFlowAmount", 0)
                        break
                break

        # Set new budget (current + allocation)
        new_budget = current_budget + amount

        await retry_with_backoff(
            lambda: mm.set_budget_amount(
                int(new_budget),
                category_id=category_id,
                category_group_id=None,
                timeframe="month",
                start_date=start,
                apply_to_future=False,  # One-time allocation
            )
        )

        # Clear budget cache after mutation
        clear_cache("budget")

        return {
            "success": True,
            "previous_budget": current_budget,
            "allocated": amount,
            "new_budget": new_budget,
        }
