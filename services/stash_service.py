"""
Stash Service

Manages stash savings goals - one-time purchase items that users save towards.
Each stash item is linked to a Monarch category for budget tracking.

Goal types:
- one_time: Save up to buy something. Progress = total ever budgeted (immune to spending).
            When completed, archived with completion timestamp.
- savings_buffer: Ongoing fund to dip into and refill. Progress = current balance.
                  Spending immediately reduces progress.
"""

import json
import logging
import uuid
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any, TypedDict

from monarch_utils import (
    clear_cache,
    get_category_aggregates,
    get_category_transactions,
    get_goal_balances,
    get_mm,
    get_month_range,
    get_savings_goals_full,
)
from services.category_manager import CategoryManager
from state.db import db_session
from state.db.repositories import TrackerRepository


class StashItemDict(TypedDict):
    """Type definition for stash item dictionaries."""

    id: str
    name: str
    amount: float
    target_date: str
    emoji: str | None
    monarch_category_id: str | None
    category_group_id: str | None
    category_group_name: str | None
    source_url: str | None
    source_bookmark_id: str | None
    logo_url: str | None
    custom_image_path: str | None
    image_attribution: str | None
    is_archived: bool
    archived_at: datetime | None
    created_at: datetime | None
    grid_x: int | None
    grid_y: int | None
    col_span: int | None
    row_span: int | None
    sort_order: int | None
    # Goal type: 'one_time' (default) or 'savings_buffer'
    goal_type: str
    # Completion timestamp for one_time goals
    completed_at: datetime | None
    # Custom tracking start date for one_time goals (aggregate query filter)
    tracking_start_date: date | None


logger = logging.getLogger(__name__)

# Debug: Add file handler for dev.log
_dev_log_path = Path(__file__).parent.parent / "dev.log"
_dev_handler = logging.FileHandler(str(_dev_log_path))
_dev_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(_dev_handler)
logger.setLevel(logging.DEBUG)


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


def calculate_stash_monthly_target(
    amount: float,
    current_balance: float,
    target_date: str,
    current_month: str | None = None,
) -> int:
    """
    Calculate monthly savings target for a stash item.

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
    # Ensure it's a full date string
    elif len(current_month) == 7:
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
    Calculate display status for a stash item.

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


def get_tracking_start_date(item: StashItemDict) -> str:
    """
    Get the tracking start date for aggregate queries.

    Returns the custom tracking_start_date if set,
    otherwise defaults to 1st of the month when item was created.
    """
    tracking_date = item.get("tracking_start_date")
    if tracking_date is not None:
        if isinstance(tracking_date, str):
            return tracking_date
        return tracking_date.isoformat()

    created_at = item.get("created_at")
    if created_at:
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        return created_at.replace(day=1).date().isoformat()

    # Fallback: start of current month
    return date.today().replace(day=1).isoformat()


async def calculate_total_budgeted(
    category_id: str,
    start_date: str,
    remaining: float,
) -> float:
    """
    Calculate total ever budgeted using Monarch aggregate query.

    Formula: total_budgeted = remaining + net_spending
    Where: net_spending = abs(sumExpense) - sumIncome

    This accounts for refunds/income reducing net spending.

    Args:
        category_id: The Monarch category ID
        start_date: Start date for tracking (YYYY-MM-DD)
        remaining: Current remaining balance in the category

    Returns:
        Total amount ever budgeted to this category
    """
    try:
        mm = await get_mm()
        aggregates = await get_category_aggregates(
            mm,
            category_id=category_id,
            start_date=start_date,
            end_date=date.today().isoformat(),
        )

        # sumExpense is negative in Monarch API, so we use abs()
        sum_expense = abs(float(aggregates.get("sumExpense", 0.0)))
        sum_income = float(aggregates.get("sumIncome", 0.0))
        net_spending = sum_expense - sum_income

        total_budgeted: float = remaining + net_spending
        logger.info(
            f"[Stash] calculate_total_budgeted for {category_id}: "
            f"sumExpense={sum_expense}, sumIncome={sum_income}, "
            f"net_spending={net_spending}, remaining={remaining}, "
            f"total_budgeted={total_budgeted}, start_date={start_date}"
        )
        return total_budgeted
    except Exception as e:
        # If aggregate query fails, fall back to remaining balance
        logger.warning(f"Failed to get aggregates for {category_id}: {e}")
        return remaining


async def get_category_rollover_starting_balances(
    category_ids: list[str],
) -> dict[str, float]:
    """
    Fetch rollover starting balances for a list of categories.

    This is used to capture manual distributions made via the Distribute wizard
    to category-level rollover (for items not in flexible groups).

    Args:
        category_ids: List of Monarch category IDs to fetch

    Returns:
        Dict mapping category_id -> starting_balance (0 if no rollover)
    """
    if not category_ids:
        return {}

    mm = await get_mm()
    result: dict[str, float] = {}

    for cat_id in category_ids:
        try:
            rollover_data = await mm.get_category_rollover(cat_id)
            category_data = rollover_data.get("category", {})
            rollover_period = category_data.get("rolloverPeriod")
            if rollover_period:
                starting_balance = float(rollover_period.get("startingBalance", 0) or 0)
                if starting_balance > 0:
                    result[cat_id] = starting_balance
                    logger.debug(
                        f"[Stash] Category {cat_id} has rollover "
                        f"starting_balance={starting_balance}"
                    )
        except Exception as e:
            logger.warning(f"Failed to get rollover for category {cat_id}: {e}")

    return result


class StashService:
    """Service for managing stash savings goals."""

    def __init__(self):
        self.category_manager = CategoryManager()

    async def get_dashboard_data(self) -> dict[str, Any]:
        """
        Get all stash items with computed fields.

        Returns items with:
        - Monthly target calculated from shortfall and months remaining
        - Current balance and budget from Monarch
        - Progress percentage
        - Status (funded, on_track, ahead, behind)
        """
        # Extract item data inside session to avoid DetachedInstanceError
        with db_session() as session:
            repo = TrackerRepository(session)
            db_items = repo.get_all_stash_items()
            # Convert to dicts while session is still open
            items: list[StashItemDict] = [
                StashItemDict(
                    id=item.id,
                    name=item.name,
                    amount=item.amount,
                    target_date=item.target_date,
                    emoji=item.emoji,
                    monarch_category_id=item.monarch_category_id,
                    category_group_id=item.category_group_id,
                    category_group_name=item.category_group_name,
                    source_url=item.source_url,
                    source_bookmark_id=item.source_bookmark_id,
                    logo_url=item.logo_url,
                    custom_image_path=item.custom_image_path,
                    image_attribution=getattr(item, "image_attribution", None),
                    is_archived=item.is_archived,
                    archived_at=item.archived_at,
                    created_at=item.created_at,
                    grid_x=item.grid_x,
                    grid_y=item.grid_y,
                    col_span=item.col_span,
                    row_span=item.row_span,
                    sort_order=getattr(item, "sort_order", 0),
                    goal_type=getattr(item, "goal_type", "one_time"),
                    completed_at=getattr(item, "completed_at", None),
                    tracking_start_date=getattr(item, "tracking_start_date", None),
                )
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

        # Get budget data for all categories and groups (current and previous month)
        budget_data = await self.category_manager.get_all_category_budget_data()
        group_budget_data = await self.category_manager.get_all_category_group_budget_data()
        last_month_budgets = await self.category_manager.get_last_month_planned_budgets()
        current_month = datetime.now().strftime("%Y-%m-01")

        # Get flexible group IDs (groups with flexible budget and rollover enabled)
        groups_detailed = await self.category_manager.get_category_groups_detailed()
        flexible_group_ids = {
            g["id"]
            for g in groups_detailed
            if g.get("budget_variability") == "flexible" and g.get("rollover_enabled")
        }

        # Build lookup for group rollover starting balances
        # This captures manual adjustments made via the Distribute wizard
        group_rollover_starting_balances: dict[str, float] = {}
        for g in groups_detailed:
            rollover_period = g.get("rollover_period")
            if rollover_period and rollover_period.get("starting_balance"):
                group_rollover_starting_balances[g["id"]] = float(
                    rollover_period.get("starting_balance", 0) or 0
                )

        # Fetch category-level rollover starting balances for items NOT in flexible groups
        # These are items that use category-level rollover instead of group-level
        non_flexible_category_ids: list[str] = [
            cat_id
            for item in items
            if (cat_id := item.get("monarch_category_id"))
            and item.get("category_group_id") not in flexible_group_ids
        ]
        category_rollover_starting_balances = await get_category_rollover_starting_balances(
            non_flexible_category_ids
        )

        active_items = []
        archived_items = []
        total_monthly_target = 0
        total_target = 0.0
        total_saved = 0.0

        for item in items:
            # Get balance and budget from Monarch if category exists
            current_balance = 0.0
            rollover_balance = 0.0
            remaining_balance = 0.0
            planned_budget = 0
            last_month_planned_budget = 0
            credits_this_month = 0.0
            available_to_spend: float | None = None
            goal_type = item.get("goal_type", "one_time")
            is_completed = item.get("completed_at") is not None

            # Look up last month's planned budget for this category
            if item["monarch_category_id"]:
                last_month_planned_budget = last_month_budgets.get(item["monarch_category_id"], 0)

            # Determine if this item uses group-level or category-level budget data
            group_id = item.get("category_group_id")
            is_flexible_group = group_id and group_id in flexible_group_ids

            # For flexible groups, use group-level budget data; otherwise use category-level
            if is_flexible_group and group_id in group_budget_data:
                # Group-level budgeting: budget and remaining are at the group level
                budget_source = group_budget_data[group_id]
                budget_source_type = "group"
            elif item["monarch_category_id"] and item["monarch_category_id"] in budget_data:
                # Category-level budgeting: budget and remaining are at the category level
                budget_source = budget_data[item["monarch_category_id"]]
                budget_source_type = "category"
            else:
                budget_source = None
                budget_source_type = None

            if budget_source:
                # Debug logging for Testing category
                if item["name"] == "Testing":
                    logger.info(
                        f"[Stash] Testing {budget_source_type} budget data: {budget_source}"
                    )

                rollover_balance = budget_source.get("rollover", 0)
                remaining_balance = budget_source.get("remaining", 0)
                planned_budget = int(budget_source.get("budgeted", 0))

                # Get credits (positive transactions) for current month
                # Only fetch if we have a category ID (not just group-level data)
                category_id = item.get("monarch_category_id")
                if category_id:
                    try:
                        mm = await get_mm()
                        month_start, month_end = get_month_range()

                        # Fetch transactions for this category this month
                        transactions = await get_category_transactions(
                            mm,
                            category_id=category_id,
                            start_date=month_start,
                            end_date=month_end,
                        )

                        # Sum up positive amounts (credits/income)
                        credits_this_month = sum(
                            txn.get("amount", 0) for txn in transactions if txn.get("amount", 0) > 0
                        )

                        logger.info(
                            f"[Stash] {item['name']}: {len(transactions)} transactions, "
                            f"credits_this_month={credits_this_month}"
                        )
                    except Exception as e:
                        logger.warning(f"Failed to get credits for {item['name']}: {e}")
                        credits_this_month = 0.0

                # Calculate current_balance based on goal_type
                if is_completed:
                    # Completed one-time goals: lock at 100% (goal amount)
                    current_balance = item["amount"]
                    available_to_spend = remaining_balance
                elif goal_type == "savings_buffer":
                    # Savings buffer: progress = remaining (spending reduces progress)
                    current_balance = remaining_balance
                # One-time purchase: progress = total ever budgeted (immune to spending)
                # Special case: if no budgeting ever happened (just income/credits),
                # use total credits as progress (immune to spending)
                elif rollover_balance == 0 and planned_budget == 0 and credits_this_month > 0:
                    current_balance = credits_this_month
                    available_to_spend = remaining_balance
                elif category_id:
                    # Use aggregate query to calculate total budgeted (requires category)
                    tracking_start = get_tracking_start_date(item)
                    current_balance = await calculate_total_budgeted(
                        category_id=category_id,
                        start_date=tracking_start,
                        remaining=remaining_balance,
                    )
                    # Available to spend is the actual remaining balance
                    available_to_spend = remaining_balance
                else:
                    # Flexible group without category - use remaining as balance
                    current_balance = remaining_balance
                    available_to_spend = remaining_balance

                # Add category-level rollover starting balance (NOT for flexible groups)
                # For flexible groups: Monarch's remainingAmount already includes the
                # starting balance via "Rollover from last month", so we don't add it again.
                # For category-level rollover: the starting balance may not be reflected
                # in the current month's remainingAmount, so we add it here.
                rollover_starting_balance = 0.0
                if not is_completed and not is_flexible_group:
                    cat_id = item.get("monarch_category_id")
                    if cat_id:
                        rollover_starting_balance = category_rollover_starting_balances.get(
                            cat_id, 0.0
                        )
                        if rollover_starting_balance > 0:
                            current_balance += rollover_starting_balance

                # Log balance retrieval for all items
                logger.info(
                    f"[Stash] {item['name']}: goal_type={goal_type}, "
                    f"budget_source={budget_source_type}, "
                    f"current_balance={current_balance}, remaining={remaining_balance}, "
                    f"rollover={rollover_balance}, budgeted={planned_budget}, "
                    f"credits_this_month={credits_this_month}, "
                    f"rollover_starting_balance={rollover_starting_balance}"
                )
            elif is_flexible_group and group_id:
                # Flexible group but no group budget data found
                logger.warning(
                    f"[Stash] {item['name']}: flexible group {group_id} "
                    f"NOT in group_budget_data (has {len(group_budget_data)} groups)"
                )
            elif item["monarch_category_id"]:
                # Category ID exists but not found in budget data
                logger.warning(
                    f"[Stash] {item['name']}: monarch_category_id {item['monarch_category_id']} "
                    f"NOT in budget_data (budget_data has {len(budget_data)} categories)"
                )
            else:
                # No category linked
                logger.debug(f"[Stash] {item['name']}: no monarch_category_id linked")

            # Calculate monthly target using current_balance minus planned_budget
            # This way:
            # - Transaction inflows (credits, refunds) reduce the target
            # - Budget allocations don't affect the target (only status)
            effective_balance_for_target = current_balance - planned_budget
            monthly_target = calculate_stash_monthly_target(
                amount=item["amount"],
                current_balance=effective_balance_for_target,
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
            status = get_item_status(
                current_balance, item["amount"], planned_budget, monthly_target
            )

            # Format tracking_start_date for response
            tracking_start_date_str = None
            tsd = item.get("tracking_start_date")
            if tsd is not None:
                tracking_start_date_str = tsd.isoformat() if hasattr(tsd, "isoformat") else str(tsd)

            # Log grid positions being returned from API
            logger.info(
                f"[Stash] Dashboard returning {item['name']}: "
                f"grid_x={item['grid_x']}, grid_y={item['grid_y']}, "
                f"col_span={item['col_span']}, row_span={item['row_span']}"
            )

            result_item = {
                "type": "stash",
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
                "image_attribution": item.get("image_attribution"),
                "is_archived": item["is_archived"],
                "archived_at": item["archived_at"].isoformat() if item["archived_at"] else None,
                "created_at": item["created_at"].isoformat() if item["created_at"] else None,
                # Goal type fields
                "goal_type": goal_type,
                "completed_at": item["completed_at"].isoformat() if item["completed_at"] else None,
                "tracking_start_date": tracking_start_date_str,
                # Computed fields
                "current_balance": current_balance,
                "planned_budget": planned_budget,
                "last_month_planned_budget": last_month_planned_budget,
                "monthly_target": monthly_target,
                "progress_percent": progress_percent,
                "shortfall": shortfall,
                "months_remaining": months_remaining,
                "status": status,
                "is_enabled": item["monarch_category_id"] is not None,
                # Available to spend (for one_time goals, shows actual remaining balance)
                "available_to_spend": available_to_spend,
                # Balance breakdown for tooltip
                "rollover_amount": rollover_balance,
                "credits_this_month": credits_this_month,
                # Grid layout fields
                "sort_order": item.get("sort_order", 0),
                "grid_x": item["grid_x"],
                "grid_y": item["grid_y"],
                "col_span": item["col_span"],
                "row_span": item["row_span"],
                # Flexible group flag (for Distribute wizard to know which API to call)
                "is_flexible_group": item["category_group_id"] in flexible_group_ids,
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
        flexible_group_id: str | None = None,
        emoji: str = "🎯",
        source_url: str | None = None,
        source_bookmark_id: str | None = None,
        logo_url: str | None = None,
        custom_image_path: str | None = None,
        image_attribution: str | None = None,
        goal_type: str = "one_time",
        tracking_start_date: str | None = None,
        starting_balance: int | None = None,
    ) -> dict[str, Any]:
        """
        Create a new stash item with a Monarch category.

        Three modes:
        1. Create new category: Provide category_group_id
        2. Link to existing: Provide existing_category_id
        3. Create in flexible group: Provide flexible_group_id (group with group-level rollover)

        Args:
            goal_type: 'one_time' (default), 'debt', or 'savings_buffer'
            tracking_start_date: Custom start date for aggregate queries (YYYY-MM-DD).
                               Only used for one_time/debt goals when linking existing category.

        Steps:
        1. Generate unique ID
        2. Create or link Monarch category
        3. Set initial budget based on monthly target
        4. Store item in database
        """
        item_id = str(uuid.uuid4())

        # Treat flexible_group_id same as category_group_id for category creation
        # The group already has group-level rollover enabled
        effective_group_id = flexible_group_id or category_group_id

        if existing_category_id:
            # Link to existing category
            cat_info = await self.category_manager.find_category_by_id(existing_category_id)
            if not cat_info:
                return {"success": False, "error": "Category not found in Monarch"}

            # Check if category is already used by another stash item
            with db_session() as session:
                repo = TrackerRepository(session)
                existing_items = repo.get_all_stash_items()
                for item in existing_items:
                    if item.monarch_category_id == existing_category_id:
                        return {
                            "success": False,
                            "error": f"Category already used by stash '{item.name}'",
                        }

            # Use the existing category
            category_id = existing_category_id
            group_id = cat_info.get("group_id")
            group_name = cat_info.get("group_name")

            # Get current balance from existing category
            budget_data = await self.category_manager.get_all_category_budget_data()
            current_balance = budget_data.get(category_id, {}).get("remaining", 0.0)
        else:
            # Create new category mode (either category_group_id or flexible_group_id)
            if not effective_group_id:
                return {"success": False, "error": "Missing category_group_id or flexible_group_id"}

            # Get category group name for storage
            groups = await self.category_manager.get_category_groups()
            group_name = None
            for g in groups:
                if g["id"] == effective_group_id:
                    group_name = g["name"]
                    break

            # Create Monarch category
            category_id = await self.category_manager.create_category(
                group_id=effective_group_id,
                name=name,
                icon=emoji,
            )
            group_id = effective_group_id
            current_balance = 0.0

        # Calculate initial monthly target
        current_month = datetime.now().strftime("%Y-%m-01")
        monthly_target = calculate_stash_monthly_target(
            amount=amount,
            current_balance=current_balance,
            target_date=target_date,
            current_month=current_month,
        )

        # Set initial budget only for existing categories
        # New categories start with $0 budgeted so users can decide when to fund
        if existing_category_id and monthly_target > 0:
            await self.category_manager.set_category_budget(category_id, monthly_target)

        # Store in database
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.create_stash_item(
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
                image_attribution=image_attribution,
                goal_type=goal_type,
                tracking_start_date=tracking_start_date,
            )

        # Set initial rollover starting balance if provided
        if starting_balance and starting_balance > 0:
            if flexible_group_id:
                # Group-level rollover for flexible groups
                await self.category_manager.update_group_rollover_balance(
                    flexible_group_id, starting_balance
                )
            else:
                # Category-level rollover
                from monarch_utils import update_category_rollover_balance

                await update_category_rollover_balance(category_id, starting_balance)

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
        Update a stash item.

        Supports updating: name, amount, target_date, emoji, source_url,
        custom_image_path, image_attribution.
        If name or emoji changes, also updates the Monarch category.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_stash_item(item_id)

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
            repo.update_stash_item(item_id, **updates)

        return {"success": True, "id": item_id}

    async def delete_item(
        self,
        item_id: str,
        delete_category: bool = False,
    ) -> dict[str, Any]:
        """
        Delete a stash item.

        Optionally deletes the Monarch category as well.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_stash_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            category_id = item.monarch_category_id

            # Delete from database
            repo.delete_stash_item(item_id)

        # Optionally delete Monarch category
        if delete_category and category_id:
            await self.category_manager.delete_category(category_id)

        return {"success": True, "id": item_id}

    async def archive_item(self, item_id: str) -> dict[str, Any]:
        """
        Archive a stash item.

        The item and its Monarch category are kept, but marked as archived.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.archive_stash_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

        return {"success": True, "id": item_id}

    async def unarchive_item(self, item_id: str) -> dict[str, Any]:
        """
        Unarchive a stash item.

        If the linked Monarch category no longer exists, returns category_missing=True
        so the frontend can prompt the user to select a new category.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_stash_item(item_id)

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
                    repo.update_stash_item(
                        item_id,
                        monarch_category_id=None,
                        category_group_id=None,
                        category_group_name=None,
                    )

            # Unarchive the item
            repo.unarchive_stash_item(item_id)

        return {
            "success": True,
            "id": item_id,
            "category_missing": category_missing,
        }

    async def mark_complete(self, item_id: str, release_funds: bool = False) -> dict[str, Any]:
        """
        Mark a one-time purchase or debt goal as completed (archived).

        Args:
            item_id: The stash item ID
            release_funds: If True, set category budget to $0, releasing funds to Left to Budget.
                          If False, keep funds assigned to the category.

        Sets completed_at to current timestamp and is_archived to True.
        Only valid for goal_type='one_time' or 'debt'.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_stash_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            goal_type = getattr(item, "goal_type", "one_time")
            if goal_type not in ("one_time", "debt"):
                return {
                    "success": False,
                    "error": "Only one-time and debt goals can be marked complete",
                }

            category_id = item.monarch_category_id

            # Set completed_at and archive the item
            now = datetime.now(UTC)
            repo.update_stash_item(
                item_id,
                completed_at=now,
                is_archived=True,
                archived_at=now,
            )

        # If release_funds is True, set category budget to $0
        if release_funds and category_id:
            await self.category_manager.set_category_budget(category_id, 0)

        return {"success": True, "id": item_id, "funds_released": release_funds}

    def unmark_complete(self, item_id: str) -> dict[str, Any]:
        """
        Unmark a completed one-time purchase or debt goal.

        Clears completed_at timestamp and is_archived flag.
        Note: If funds were released, they cannot be automatically restored.
        User will need to manually re-budget.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_stash_item(item_id)

            if not item:
                return {"success": False, "error": "Item not found"}

            if not getattr(item, "completed_at", None):
                return {"success": False, "error": "Item is not marked as complete"}

            # Clear completed_at and unarchive
            repo.update_stash_item(
                item_id,
                completed_at=None,
                is_archived=False,
                archived_at=None,
            )

        return {"success": True, "id": item_id}

    async def allocate_funds(
        self,
        item_id: str,
        amount: int,
    ) -> dict[str, Any]:
        """
        Set the budget amount for a stash item's category.

        This directly sets the budget (not an incremental change).
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_stash_item(item_id)

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

    async def allocate_funds_batch(
        self,
        allocations: list[dict],
    ) -> dict[str, Any]:
        """
        Set budget amounts for multiple stash items in a single operation.

        Used by the Distribute feature to update all stash budgets at once.
        Handles both category-level and group-level budgeting (flexible groups).

        Args:
            allocations: List of dicts with 'id' and 'budget' keys

        Returns:
            Success status with count of updated items
        """
        # Get flexible group IDs (groups with flexible budget and rollover enabled)
        groups_detailed = await self.category_manager.get_category_groups_detailed()
        flexible_group_ids = {
            g["id"]
            for g in groups_detailed
            if g.get("budget_variability") == "flexible" and g.get("rollover_enabled")
        }

        # Build mappings of item_id -> category_id and item_id -> group_id
        # Also track which items are in flexible groups
        category_mapping: dict[str, str] = {}
        group_mapping: dict[str, str] = {}
        flexible_items: set[str] = set()

        with db_session() as session:
            repo = TrackerRepository(session)
            for allocation in allocations:
                item = repo.get_stash_item(allocation["id"])
                if item:
                    if item.monarch_category_id:
                        category_mapping[allocation["id"]] = item.monarch_category_id
                    if item.category_group_id:
                        group_mapping[allocation["id"]] = item.category_group_id
                        if item.category_group_id in flexible_group_ids:
                            flexible_items.add(allocation["id"])

        # Set budgets in Monarch for each item
        # Use group-level budget for flexible groups, category-level for others
        updated_count = 0
        errors = []
        for allocation in allocations:
            item_id = allocation["id"]
            budget = allocation["budget"]

            try:
                if item_id in flexible_items:
                    # Flexible group: set budget at group level
                    group_id = group_mapping.get(item_id)
                    if not group_id:
                        errors.append(f"Item {item_id}: no linked group")
                        continue
                    await self.category_manager.set_group_budget(group_id, budget)
                    updated_count += 1
                else:
                    # Regular category: set budget at category level
                    category_id = category_mapping.get(item_id)
                    if not category_id:
                        errors.append(f"Item {item_id}: no linked category")
                        continue
                    await self.category_manager.set_category_budget(category_id, budget)
                    updated_count += 1
            except Exception as e:
                errors.append(f"Item {item_id}: {e!s}")

        # Clear caches
        clear_cache("budget")

        if errors:
            return {
                "success": updated_count > 0,
                "updated": updated_count,
                "errors": errors,
            }

        return {"success": True, "updated": updated_count}

    async def change_category_group(
        self,
        item_id: str,
        new_group_id: str,
        new_group_name: str,
    ) -> dict[str, Any]:
        """
        Move a stash item's category to a different group.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_stash_item(item_id)

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
            repo.update_stash_group(item_id, new_group_id, new_group_name)

        return {"success": True, "id": item_id}

    async def link_category(
        self,
        item_id: str,
        category_group_id: str | None = None,
        existing_category_id: str | None = None,
        flexible_group_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Link a category to an existing stash item.

        Used when restoring an archived item whose category was deleted,
        or when the user wants to change the linked category.

        Three modes:
        1. Create new category in group: Provide category_group_id
        2. Link to existing category: Provide existing_category_id
        3. Create in flexible group: Provide flexible_group_id (group with group-level rollover)

        Args:
            item_id: Stash item ID
            category_group_id: Category group to create new category in
            existing_category_id: Existing category ID to link to
            flexible_group_id: Flexible category group ID (has group-level rollover)

        Returns:
            Success status with category info
        """
        # Treat flexible_group_id same as category_group_id for category creation
        effective_group_id = flexible_group_id or category_group_id

        options_provided = sum(1 for opt in [effective_group_id, existing_category_id] if opt)
        if options_provided == 0:
            return {
                "success": False,
                "error": (
                    "Must provide category_group_id, existing_category_id, or flexible_group_id"
                ),
            }
        if options_provided > 1 and existing_category_id and effective_group_id:
            return {
                "success": False,
                "error": "Cannot provide both a group ID and existing_category_id",
            }

        with db_session() as session:
            repo = TrackerRepository(session)
            item = repo.get_stash_item(item_id)

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
                repo.update_stash_item(
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
            # Create new category in specified group (or flexible group)
            groups = await self.category_manager.get_category_groups()
            group_name = None
            for g in groups:
                if g["id"] == effective_group_id:
                    group_name = g["name"]
                    break

            if not group_name:
                return {"success": False, "error": "Category group not found"}

            # At this point effective_group_id is guaranteed to be a string
            assert effective_group_id is not None

            # Create Monarch category
            category_id = await self.category_manager.create_category(
                group_id=effective_group_id,
                name=item_name,
                icon=item_emoji,
            )

            # Calculate monthly target for return value (but don't set budget)
            # New categories start with $0 budgeted so users can decide when to fund
            current_month = datetime.now().strftime("%Y-%m-01")
            monthly_target = calculate_stash_monthly_target(
                amount=item_amount,
                current_balance=0,  # New category starts with 0 balance
                target_date=item_target_date,
                current_month=current_month,
            )

            # Update database with category info
            with db_session() as session:
                repo = TrackerRepository(session)
                repo.update_stash_item(
                    item_id,
                    monarch_category_id=category_id,
                    category_group_id=effective_group_id,
                    category_group_name=group_name,
                )

            return {
                "success": True,
                "id": item_id,
                "category_id": category_id,
                "category_name": item_name,
                "category_group_id": effective_group_id,
                "category_group_name": group_name,
                "monthly_target": monthly_target,
            }

    async def update_layouts(self, layouts: list[dict]) -> dict[str, Any]:
        """
        Update grid layout positions for multiple stash items.

        Args:
            layouts: List of dicts with id, grid_x, grid_y, col_span, row_span

        Returns:
            Success status and count of updated items
        """
        logger.info("[Stash] update_layouts called with %d layouts", len(layouts))
        with db_session() as session:
            repo = TrackerRepository(session)
            updated = repo.update_stash_layouts(layouts)
            logger.info(f"[Stash] update_layouts updated {updated} items")

        return {"success": True, "updated": updated}

    async def get_monarch_goals(self) -> dict[str, Any]:
        """
        Get Monarch savings goals with grid layout data.

        Fetches full goal data from Monarch API (including status) and merges with
        stored grid positions. Status values come directly from Monarch, which uses
        time-based forecasting to determine ahead/on_track/at_risk/completed.

        Returns:
            Dict with 'goals' list containing enriched goal data
        """
        mm = await get_mm()
        raw_goals = await get_savings_goals_full(mm)
        logger.info(f"[Stash] Fetched {len(raw_goals)} goals from Monarch API")

        # Get layout data (extract values while in session to avoid DetachedInstanceError)
        with db_session() as session:
            # DIAGNOSTIC: Raw SQL query to bypass SQLAlchemy cache
            from sqlalchemy import text

            raw_result = session.execute(
                text("SELECT goal_id, grid_x, grid_y FROM monarch_goal_layout")
            ).fetchall()
            logger.info(f"[Stash] RAW SQL layouts: {[(r[0], r[1], r[2]) for r in raw_result]}")

            repo = TrackerRepository(session)
            layouts = {
                layout.goal_id: {
                    "grid_x": layout.grid_x,
                    "grid_y": layout.grid_y,
                    "col_span": layout.col_span,
                    "row_span": layout.row_span,
                    "sort_order": layout.sort_order,
                }
                for layout in repo.get_all_monarch_goal_layouts()
            }
        logger.info(f"[Stash] Loaded {len(layouts)} goal layouts from DB: {list(layouts.keys())}")
        # Log ALL layout data for debugging
        for goal_id, layout_data in layouts.items():
            logger.info(
                f"[Stash] Layout from DB - goal {goal_id}: "
                f"x={layout_data['grid_x']}, y={layout_data['grid_y']}"
            )

        # Track occupied positions to avoid collisions for goals without layouts
        # Only track positions for ACTIVE (non-completed) goals since completed goals
        # are shown in a separate "Past" section and don't affect the grid layout.
        # Position is (x, y, col_span, row_span)
        occupied_positions: list[tuple[int, int, int, int]] = []
        # Build a set of active goal IDs to check against
        active_goal_ids = {str(g["id"]) for g in raw_goals if not g["is_completed"]}
        for goal_id, layout_data in layouts.items():
            # Only track positions for active goals
            if goal_id in active_goal_ids:
                occupied_positions.append(
                    (
                        layout_data["grid_x"],
                        layout_data["grid_y"],
                        layout_data["col_span"],
                        layout_data["row_span"],
                    )
                )

        def find_next_available_position(
            col_span: int = 1, row_span: int = 1, cols: int = 3
        ) -> tuple[int, int]:
            """Find first available grid position without collisions."""

            def collides(x: int, y: int, w: int, h: int) -> bool:
                for ox, oy, ow, oh in occupied_positions:
                    # Check if rectangles overlap
                    if not (x + w <= ox or ox + ow <= x or y + h <= oy or oy + oh <= y):
                        return True
                return False

            # Scan row by row, left to right
            for y in range(100):  # Reasonable max rows
                for x in range(cols - col_span + 1):
                    if not collides(x, y, col_span, row_span):
                        return (x, y)
            return (0, len(occupied_positions))  # Fallback

        # Enrich goals with layout and computed fields
        enriched_goals = []
        for goal in raw_goals:
            # Ensure goal_id is a string to match DB storage (Monarch API returns int)
            goal_id = str(goal["id"])
            layout = layouts.get(goal_id)
            logger.info(
                f"[Stash] Goal {goal_id}: layout found = {layout is not None}, layout = {layout}"
            )

            # Use status from Monarch API, map null to 'no_target'
            status = goal["status"] if goal["status"] is not None else "no_target"

            # Determine grid position and sort order
            is_completed = goal["is_completed"]
            if layout:
                grid_x = layout["grid_x"]
                grid_y = layout["grid_y"]
                col_span = layout["col_span"]
                row_span = layout["row_span"]
                sort_order = layout.get("sort_order", 0)
            elif is_completed:
                # Completed goals are shown in "Past" section, not the grid
                # Default position doesn't matter
                grid_x, grid_y = 0, 0
                col_span, row_span = 1, 1
                sort_order = 0
            else:
                # Active goal without layout - find a non-colliding position
                col_span = 1
                row_span = 1
                grid_x, grid_y = find_next_available_position(col_span, row_span)
                sort_order = 0
                # Track this position so subsequent goals don't collide
                occupied_positions.append((grid_x, grid_y, col_span, row_span))
                logger.info(
                    f"[Stash] Assigned new position for goal {goal_id}: x={grid_x}, y={grid_y}"
                )

            enriched_goal = {
                "type": "monarch_goal",
                "id": goal_id,  # Already converted to string above
                "name": goal["name"],
                # Financial data
                "current_balance": goal["current_balance"],
                "net_contribution": goal["net_contribution"],
                "target_amount": goal["target_amount"],
                "target_date": goal["target_date"],
                "progress": goal["progress"],
                # Time-based forecasting
                "estimated_months_until_completion": goal["estimated_months_until_completion"],
                "forecasted_completion_date": goal["forecasted_completion_date"],
                "planned_monthly_contribution": goal["planned_monthly_contribution"],
                # Status from Monarch API
                "status": status,
                "months_ahead_behind": None,  # Derive from forecasted date if needed
                # Grid layout
                "grid_x": grid_x,
                "grid_y": grid_y,
                "col_span": col_span,
                "row_span": row_span,
                "sort_order": sort_order,
                # State
                "is_archived": False,  # Already filtered by get_savings_goals_full
                "is_completed": goal["is_completed"],
                # Image data
                "image_storage_provider": goal["image_storage_provider"],
                "image_storage_provider_id": goal["image_storage_provider_id"],
            }

            enriched_goals.append(enriched_goal)
            # Log each goal's final position with its name for tracing
            logger.info(
                f"[Stash] Enriched goal '{enriched_goal['name']}' (id={goal_id}): "
                f"x={enriched_goal['grid_x']}, y={enriched_goal['grid_y']}"
            )

        logger.info(f"[Stash] Returning {len(enriched_goals)} enriched goals")
        return {"goals": enriched_goals}

    async def update_monarch_goal_layouts(self, layouts: list[dict]) -> dict[str, Any]:
        """
        Update grid layout positions for multiple Monarch goals.

        Args:
            layouts: List of dicts with goal_id, grid_x, grid_y, col_span, row_span

        Returns:
            Success status and count of updated layouts
        """
        logger.info("[Stash] update_monarch_goal_layouts called with %d layouts", len(layouts))
        with db_session() as session:
            repo = TrackerRepository(session)
            updated = repo.update_monarch_goal_layouts(layouts)

            # DIAGNOSTIC: Verify what was written using raw SQL
            from sqlalchemy import text

            raw_result = session.execute(
                text("SELECT goal_id, grid_x, grid_y FROM monarch_goal_layout")
            ).fetchall()
            logger.info(
                f"[Stash] After update, RAW SQL layouts: {[(r[0], r[1], r[2]) for r in raw_result]}"
            )

        logger.info(f"[Stash] update_monarch_goal_layouts updated {updated} layouts")

        return {"success": True, "updated": updated}

    async def sync_from_monarch(self) -> dict[str, Any]:
        """
        Sync stash items with Monarch to update balances and budgets.

        This pulls the latest balance and budget data for all stash categories.
        """
        # Get fresh budget data
        clear_cache("budget")
        budget_data = await self.category_manager.get_all_category_budget_data()

        with db_session() as session:
            repo = TrackerRepository(session)
            db_items = repo.get_all_stash_items()
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
        Get stash configuration.

        Returns config with parsed folder_ids as array.
        Infers is_configured if browser and folder are set (handles pre-fix data).
        """
        import json

        with db_session() as session:
            repo = TrackerRepository(session)
            config = repo.get_stash_config()

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

            # Parse selected_cash_account_ids from JSON string
            account_ids = None
            if config.selected_cash_account_ids:
                try:
                    account_ids = json.loads(config.selected_cash_account_ids)
                except json.JSONDecodeError:
                    account_ids = None

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
                "include_expected_income": config.include_expected_income,
                "selected_cash_account_ids": account_ids,
                "show_monarch_goals": config.show_monarch_goals,
                "buffer_amount": config.buffer_amount,
            }

    async def update_config(self, **updates) -> dict[str, Any]:
        """
        Update stash configuration.

        Accepts any combination of config fields.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            repo.update_stash_config(**updates)

        return {"success": True}

    async def reset_config(self) -> dict[str, Any]:
        """Reset stash configuration to defaults."""
        with db_session() as session:
            repo = TrackerRepository(session)
            return repo.reset_stash_config()

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
        stash_item_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Mark a pending bookmark as converted to a stash item.

        Optionally links the pending bookmark to the created stash item.
        """
        with db_session() as session:
            repo = TrackerRepository(session)
            pending = repo.convert_pending_bookmark(bookmark_id, stash_item_id)

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

        Preserves converted bookmarks since they're linked to stash items.
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

    async def get_available_to_stash_data(self) -> dict[str, Any]:
        """
        Get data needed for Available Funds calculation.

        Returns aggregated data from Monarch:
        - accounts: Account balances with type info
        - categoryBudgets: Current month's budgets and spending
        - goals: Monarch savings goal balances
        - plannedIncome: Planned income for the month
        - actualIncome: Actual income received
        - stashBalances: Total balance in stash items

        Applies cash account filtering based on user selection in stash config.

        See .claude/rules/available-to-stash.md for the calculation formula.
        """
        mm = await get_mm()
        start, _ = get_month_range()
        # Monarch returns months in YYYY-MM-DD format (e.g., "2026-01-01")
        month_key = start  # Full date for matching

        # Get stash config to check account selection
        with db_session() as session:
            repo = TrackerRepository(session)
            config = repo.get_stash_config()
            selected_account_ids = None
            if config and config.selected_cash_account_ids:
                try:
                    selected_account_ids = json.loads(config.selected_cash_account_ids)
                except json.JSONDecodeError:
                    selected_account_ids = None

        # Fetch all required data in parallel
        import asyncio

        accounts_task = asyncio.create_task(mm.get_accounts())
        budgets_task = asyncio.create_task(mm.get_budgets(start, start))
        goals_task = asyncio.create_task(get_goal_balances(mm))
        stash_task = asyncio.create_task(self.get_dashboard_data())

        accounts_result, budgets_result, goals_result, stash_data = await asyncio.gather(
            accounts_task, budgets_task, goals_task, stash_task
        )

        # Process accounts - filter based on selection
        accounts_list = []
        for account in accounts_result.get("accounts", []):
            # Only include accounts that are not hidden
            if account.get("isHidden"):
                continue

            account_id = account.get("id")
            account_type = account.get("type", {}).get("name", "unknown")

            # Apply filtering only to cash accounts
            # Credit cards are ALWAYS included (they're always debt to account for)
            # If specific accounts are selected, filter out non-selected cash accounts
            if (
                self._is_cash_account(account_type)
                and selected_account_ids is not None
                and account_id not in selected_account_ids
            ):
                continue

            accounts_list.append(
                {
                    "id": account_id,
                    "name": account.get("displayName") or account.get("name"),
                    "balance": account.get("currentBalance", 0),
                    "accountType": account_type,
                    "isEnabled": not account.get("isHidden", False),
                }
            )

        # Build lookups for category info from categoryGroups
        category_group_types: dict[str, str] = {}
        category_names: dict[str, str] = {}
        for group in budgets_result.get("categoryGroups", []):
            group_id = group.get("id")
            group_type = group.get("type", "")
            if group_id:
                category_group_types[group_id] = group_type
            # Map category IDs to their group type and name
            for cat in group.get("categories", []):
                cat_id = cat.get("id")
                if cat_id:
                    category_group_types[cat_id] = group_type
                    category_names[cat_id] = cat.get("name", "")

        # Get stash-linked category IDs to exclude from unspent budgets
        # (they're already counted in stash balances)
        stash_category_ids = {
            item.get("category_id")
            for item in stash_data.get("items", [])
            if item.get("category_id")
        }

        # Process category budgets from monthlyAmountsByCategory
        category_budgets = []
        monthly_by_category = budgets_result.get("budgetData", {}).get(
            "monthlyAmountsByCategory", []
        )
        for entry in monthly_by_category:
            category = entry.get("category", {})
            cat_id = category.get("id")
            cat_name = category_names.get(cat_id, "")
            group_type = category_group_types.get(cat_id, "expense")

            # Skip income categories
            if group_type == "income":
                continue

            # Skip stash-linked categories (already counted in stash balances)
            if cat_id in stash_category_ids:
                continue

            # Find the current month's amounts
            budgeted = 0
            spent = 0
            remaining = 0
            for month_data in entry.get("monthlyAmounts", []):
                if month_data.get("month") == month_key:
                    budgeted = month_data.get("plannedCashFlowAmount", 0) or 0
                    actual = month_data.get("actualAmount", 0) or 0
                    # remainingAmount already includes rollover:
                    # remaining = previousMonthRollover + budgeted - spent
                    remaining = month_data.get("remainingAmount", 0) or 0
                    spent = abs(actual)
                    break

            category_budgets.append(
                {
                    "id": cat_id,
                    "name": cat_name,
                    "budgeted": budgeted,
                    "spent": spent,
                    "remaining": remaining,  # Use this for unspent calculation (includes rollover)
                    "isExpense": True,
                }
            )

        # Get income data from budget totals
        planned_income = 0
        actual_income = 0
        totals_by_month = budgets_result.get("budgetData", {}).get("totalsByMonth", [])
        for totals in totals_by_month:
            if totals.get("month") == month_key:
                income_data = totals.get("totalIncome", {})
                planned_income = income_data.get("plannedAmount", 0)
                actual_income = income_data.get("actualAmount", 0)
                break

        # Get stash items with balances
        stash_items = [
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "balance": item.get("current_balance", 0),
            }
            for item in stash_data.get("items", [])
            if item.get("current_balance", 0) > 0
        ]
        stash_balances = stash_data.get("total_saved", 0)

        return {
            "accounts": accounts_list,
            "categoryBudgets": category_budgets,
            "goals": goals_result,
            "plannedIncome": planned_income,
            "actualIncome": actual_income,
            "stashBalances": stash_balances,
            "stashItems": stash_items,
        }

    def _is_cash_account(self, account_type: str) -> bool:
        """
        Check if account type is a cash account.

        Matches the frontend isCashAccount() logic.
        Cash accounts include: checking, savings, cash, PayPal/Venmo, prepaid, money market.
        Credit cards are NOT cash accounts.
        """
        cash_types = [
            "checking",
            "savings",
            "cash",
            "paypal",
            "venmo",
            "prepaid",
            "money_market",
            "depository",
        ]
        return account_type.lower() in cash_types

    def _get_active_stash_items_for_history(self) -> list[dict[str, Any]]:
        """Get active stash items with their category IDs for history queries."""
        with db_session() as session:
            repo = TrackerRepository(session)
            db_items = repo.get_all_stash_items()
            return [
                {
                    "id": item.id,
                    "name": item.name,
                    "amount": item.amount,
                    "monarch_category_id": item.monarch_category_id,
                    "goal_type": getattr(item, "goal_type", "one_time"),
                    "tracking_start_date": getattr(item, "tracking_start_date", None),
                    "created_at": item.created_at,
                }
                for item in db_items
                if not item.is_archived and item.monarch_category_id
            ]

    def _build_monthly_lookup(
        self, budgets_result: dict[str, Any]
    ) -> tuple[dict[tuple[str, str], dict], list[str]]:
        """Build lookup dict from budget data and return sorted months list."""
        monthly_by_category = budgets_result.get("budgetData", {}).get(
            "monthlyAmountsByCategory", []
        )
        monthly_lookup: dict[tuple[str, str], dict] = {}
        all_months: set[str] = set()

        for entry in monthly_by_category:
            cat_id = entry.get("category", {}).get("id")
            if not cat_id:
                continue
            for month_data in entry.get("monthlyAmounts", []):
                month_str = month_data.get("month", "")[:7]  # "2025-01-01" -> "2025-01"
                if month_str:
                    monthly_lookup[(cat_id, month_str)] = month_data
                    all_months.add(month_str)

        return monthly_lookup, sorted(all_months)

    async def _build_item_history(
        self,
        item: dict[str, Any],
        sorted_months: list[str],
        monthly_lookup: dict[tuple[str, str], dict],
    ) -> dict[str, Any]:
        """
        Build history data for a single stash item.

        For one_time goals: uses total budgeted (immune to spending)
        For savings_buffer goals: uses remaining balance (affected by spending)
        """
        cat_id = item["monarch_category_id"]
        goal_type = item.get("goal_type", "one_time")
        item_months = []
        prev_balance = 0.0

        if goal_type == "savings_buffer":
            # Savings buffer: use remaining balance directly
            for month in sorted_months:
                month_data = monthly_lookup.get((cat_id, month))
                balance = (month_data.get("remainingAmount", 0) or 0) if month_data else 0
                contribution = balance - prev_balance

                item_months.append(
                    {
                        "month": month,
                        "balance": balance,
                        "contribution": contribution,
                    }
                )
                prev_balance = balance
        else:
            # One-time purchase: calculate total budgeted (immune to spending)
            # Get tracking start date
            tracking_start = None
            if item.get("tracking_start_date"):
                tsd = item["tracking_start_date"]
                tracking_start = tsd.isoformat() if hasattr(tsd, "isoformat") else str(tsd)
            elif item.get("created_at"):
                created = item["created_at"]
                if hasattr(created, "replace"):
                    tracking_start = created.replace(day=1).date().isoformat()
                else:
                    # Already a date string
                    tracking_start = created[:7] + "-01"

            if not tracking_start:
                # Fallback: use first month in sorted_months
                tracking_start = (
                    sorted_months[0] + "-01"
                    if sorted_months
                    else date.today().replace(day=1).isoformat()
                )

            # Fetch transactions for the entire period
            mm = await get_mm()
            end_date = sorted_months[-1] + "-28" if sorted_months else date.today().isoformat()
            transactions = await get_category_transactions(
                mm,
                category_id=cat_id,
                start_date=tracking_start,
                end_date=end_date,
            )

            # Group transactions by month (YYYY-MM)
            transactions_by_month: dict[str, list] = {}
            for txn in transactions:
                txn_date = txn.get("date", "")
                if txn_date:
                    month_key = txn_date[:7]  # "2025-01-15" -> "2025-01"
                    if month_key not in transactions_by_month:
                        transactions_by_month[month_key] = []
                    transactions_by_month[month_key].append(txn)

            # Calculate cumulative spending
            # For one_time goals: progress = remaining + spending
            # Income is already in remaining, so we only add back spending to show total progress
            cumulative_spending = 0.0
            for month in sorted_months:
                month_data = monthly_lookup.get((cat_id, month))
                remaining = (month_data.get("remainingAmount", 0) or 0) if month_data else 0

                # Calculate spending for this month (income already in remaining)
                month_txns = transactions_by_month.get(month, [])
                spending_this_month = sum(
                    abs(t.get("amount", 0)) for t in month_txns if t.get("amount", 0) < 0
                )
                cumulative_spending += spending_this_month

                # For one_time goals: balance = remaining + cumulative_spending
                # This makes income add to progress (it's in remaining) and spending not reduce it
                balance = remaining + cumulative_spending
                contribution = balance - prev_balance

                item_months.append(
                    {
                        "month": month,
                        "balance": balance,
                        "contribution": contribution,
                    }
                )
                prev_balance = balance

        return {
            "id": item["id"],
            "name": item["name"],
            "target_amount": item["amount"],
            "months": item_months,
        }

    async def get_stash_history(self, months: int = 12) -> dict[str, Any]:
        """
        Get monthly history for all stash items.

        Returns balance and contribution data for each stash item over the
        requested number of months.

        Args:
            months: Number of months of history to return (default 12)

        Returns:
            Dictionary with:
            - items: List of stash items with monthly history
            - months: List of month strings in the response (e.g., ["2025-01", "2025-02", ...])
        """
        from calendar import monthrange

        from dateutil.relativedelta import relativedelta  # type: ignore[import-untyped]

        items_data = self._get_active_stash_items_for_history()
        if not items_data:
            return {"items": [], "months": []}

        # Calculate date range
        today = date.today()
        start_date = (today.replace(day=1) - relativedelta(months=months - 1)).isoformat()
        _, last_day = monthrange(today.year, today.month)
        end_date = today.replace(day=last_day).isoformat()

        # Get budget data for the full date range
        mm = await get_mm()
        budgets_result = await mm.get_budgets(start_date, end_date)

        # Build lookup and get sorted months
        monthly_lookup, sorted_months = self._build_monthly_lookup(budgets_result)

        # Build history for each stash item (async operations for one_time goals)
        import asyncio

        result_items = await asyncio.gather(
            *[self._build_item_history(item, sorted_months, monthly_lookup) for item in items_data]
        )

        return {
            "items": list(result_items),
            "months": sorted_months,
        }

    # === Stash Hypotheses ===

    MAX_HYPOTHESES = 10

    def get_hypotheses(self) -> dict[str, Any]:
        """Get all saved hypotheses."""
        import json

        with db_session() as session:
            repo = TrackerRepository(session)
            hypotheses = repo.get_all_hypotheses()

            return {
                "success": True,
                "hypotheses": [
                    {
                        "id": h.id,
                        "name": h.name,
                        "savings_allocations": json.loads(h.savings_allocations),
                        "savings_total": h.savings_total,
                        "monthly_allocations": json.loads(h.monthly_allocations),
                        "monthly_total": h.monthly_total,
                        "events": json.loads(h.events),
                        "created_at": h.created_at.isoformat() if h.created_at else None,
                        "updated_at": h.updated_at.isoformat() if h.updated_at else None,
                    }
                    for h in hypotheses
                ],
            }

    def save_hypothesis(
        self,
        name: str,
        savings_allocations: dict[str, float],
        savings_total: float,
        monthly_allocations: dict[str, float],
        monthly_total: float,
        events: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Save a hypothesis.

        If a hypothesis with the same name exists, it will be updated (override).
        Otherwise creates a new one if under the max limit.
        """
        import json

        with db_session() as session:
            repo = TrackerRepository(session)

            # Check if name already exists
            existing = repo.get_hypothesis_by_name(name)

            if existing:
                # Update existing hypothesis
                repo.update_hypothesis(
                    existing.id,
                    name=name,  # Keep name (may differ in case)
                    savings_allocations=json.dumps(savings_allocations),
                    savings_total=savings_total,
                    monthly_allocations=json.dumps(monthly_allocations),
                    monthly_total=monthly_total,
                    events=json.dumps(events),
                )
                return {
                    "success": True,
                    "id": existing.id,
                    "created": False,
                    "message": f"Updated hypothesis '{name}'",
                }

            # Check max limit
            count = repo.count_hypotheses()
            if count >= self.MAX_HYPOTHESES:
                return {
                    "success": False,
                    "error": (
                        f"Maximum of {self.MAX_HYPOTHESES} hypotheses reached. "
                        "Delete one to save a new one."
                    ),
                }

            # Create new hypothesis
            hypothesis_id = str(uuid.uuid4())
            repo.create_hypothesis(
                hypothesis_id=hypothesis_id,
                name=name,
                savings_allocations=json.dumps(savings_allocations),
                savings_total=savings_total,
                monthly_allocations=json.dumps(monthly_allocations),
                monthly_total=monthly_total,
                events=json.dumps(events),
            )

            return {
                "success": True,
                "id": hypothesis_id,
                "created": True,
                "message": f"Saved hypothesis '{name}'",
            }

    def delete_hypothesis(self, hypothesis_id: str) -> dict[str, Any]:
        """Delete a hypothesis by ID."""
        with db_session() as session:
            repo = TrackerRepository(session)
            deleted = repo.delete_hypothesis(hypothesis_id)

            if deleted:
                return {"success": True, "message": "Hypothesis deleted"}
            return {"success": False, "error": "Hypothesis not found"}
