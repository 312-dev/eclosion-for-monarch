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

    async def _get_budgets_cached(self, force_refresh: bool = False) -> dict:
        """
        Get budget data with caching.

        Budget data is cached for 5 minutes to avoid redundant API calls
        when multiple methods need budget info in the same operation.
        """
        cache = get_cache("budget")
        start, _ = get_month_range()
        cache_key = f"budgets_{start}"

        if not force_refresh and cache_key in cache:
            return cache[cache_key]

        mm = await get_mm()
        budgets = await retry_with_backoff(lambda: mm.get_budgets(start, start))

        cache[cache_key] = budgets
        return budgets

    async def get_category_groups(self, force_refresh: bool = False) -> list[dict[str, str]]:
        """
        Get all category groups from Monarch.

        Returns list of {id, name} dicts. Cached for 10 minutes.
        """
        cache = get_cache("category_groups")
        cache_key = "groups"

        if not force_refresh and cache_key in cache:
            return cache[cache_key]

        mm = await get_mm()
        groups = await retry_with_backoff(lambda: mm.get_transaction_category_groups())

        result = [{"id": g["id"], "name": g["name"]} for g in groups.get("categoryGroups", [])]

        cache[cache_key] = result
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
                return result["createCategory"]["category"]["id"]
            elif "id" in result:
                return result["id"]
            elif "category" in result:
                return result["category"]["id"]

        raise ValueError(f"Unexpected response from create_transaction_category: {result}")

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
        from gql import gql

        mm = await get_mm()

        mutation = gql(
            """
            mutation UpdateCategory($input: UpdateCategoryInput!) {
                updateCategory(input: $input) {
                    category {
                        id
                        name
                        group {
                            id
                            name
                        }
                    }
                    errors {
                        message
                    }
                }
            }
        """
        )

        variables = {
            "input": {
                "id": category_id,
                "groupId": new_group_id,
            }
        }

        result = await retry_with_backoff(
            lambda: mm.gql_call(
                operation="UpdateCategory",
                graphql_query=mutation,
                variables=variables,
            )
        )

        # Clear caches after mutation
        clear_cache("category")
        clear_cache("budget")

        return result

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
        from gql import gql

        mm = await get_mm()

        mutation = gql(
            """
            mutation UpdateCategory($input: UpdateCategoryInput!) {
                updateCategory(input: $input) {
                    category {
                        id
                        name
                        icon
                    }
                    errors {
                        message
                    }
                }
            }
        """
        )

        variables: dict[str, Any] = {
            "input": {
                "id": category_id,
                "name": new_name,
            }
        }

        if icon is not None:
            variables["input"]["icon"] = icon

        result = await retry_with_backoff(
            lambda: mm.gql_call(
                operation="UpdateCategory",
                graphql_query=mutation,
                variables=variables,
            )
        )

        # Clear caches after mutation
        clear_cache("category")

        return result

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
        from gql import gql

        mm = await get_mm()

        mutation = gql(
            """
            mutation UpdateCategory($input: UpdateCategoryInput!) {
                updateCategory(input: $input) {
                    category {
                        id
                        name
                        icon
                    }
                    errors {
                        message
                    }
                }
            }
        """
        )

        variables = {
            "input": {
                "id": category_id,
                "icon": icon,
            }
        }

        result = await retry_with_backoff(
            lambda: mm.gql_call(
                operation="UpdateCategory",
                graphql_query=mutation,
                variables=variables,
            )
        )

        # Clear caches after mutation
        clear_cache("category")

        return result

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
                        return month.get("remainingAmount", 0)

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

    async def _get_categories_cached(self, force_refresh: bool = False) -> dict:
        """
        Get all categories with caching.

        Category data is cached for 5 minutes to avoid redundant API calls.
        """
        cache = get_cache("category")
        cache_key = "all_categories"

        if not force_refresh and cache_key in cache:
            return cache[cache_key]

        mm = await get_mm()
        categories = await retry_with_backoff(lambda: mm.get_transaction_categories())

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
                    planned_savings += amount_data.get("plannedAmount", 0)

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
            List of unmapped categories with {id, name, group_id, group_name, planned_budget}
        """
        categories = await self._get_categories_cached()
        mapped_set = set(mapped_category_ids)

        # Get planned budgets for all categories
        planned_budgets = await self.get_all_planned_budgets()

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
                        # Include planned budget amount
                        "planned_budget": planned_budgets.get(cat_id, 0),
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
