"""
Frozen Target Calculator

Manages frozen monthly savings targets that don't change mid-month.
Eliminates duplicated calculation logic between dashboard and rollup data.

The frozen target is calculated at the start of each month and stays fixed
to prevent confusing fluctuations as category balances change throughout the month.
"""

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


class StateManagerProtocol(Protocol):
    """Protocol for state manager dependency injection."""

    def get_frozen_target(self, recurring_id: str) -> dict | None: ...
    def set_frozen_target(
        self,
        recurring_id: str,
        frozen_target: float,
        target_month: str,
        balance_at_start: float,
        amount: float,
        frequency_months: float,
    ) -> None: ...


@dataclass
class FrozenTargetResult:
    """Result of frozen target calculation."""

    frozen_target: float
    balance_at_start: float
    contributed_this_month: float
    monthly_progress_percent: float
    was_recalculated: bool


def calculate_frozen_target(
    *,
    recurring_id: str,
    amount: float,
    frequency_months: float,
    months_until_due: float,
    current_balance: float,
    ideal_monthly_rate: float,
    state_manager: StateManagerProtocol,
    current_month: str | None = None,
) -> FrozenTargetResult:
    """
    Calculate or retrieve the frozen monthly target for a recurring item.

    The frozen target is locked at the start of each month to prevent
    mid-month fluctuations. It's recalculated when:
    - It's a new month
    - The subscription amount changes
    - The frequency changes

    Args:
        recurring_id: Unique identifier for the item (may include prefix like "rollup_")
        amount: Total subscription amount
        frequency_months: How many months between charges
        months_until_due: Months remaining until next payment
        current_balance: Current saved balance
        ideal_monthly_rate: The steady-state monthly rate (amount / frequency_months)
        state_manager: State manager for persistence
        current_month: Current month string (YYYY-MM), defaults to now

    Returns:
        FrozenTargetResult with target and progress data
    """
    if current_month is None:
        current_month = datetime.now().strftime("%Y-%m")

    stored_target = state_manager.get_frozen_target(recurring_id)

    needs_recalc = (
        stored_target is None
        or stored_target.get("target_month") != current_month
        or stored_target.get("frozen_amount") != amount
        or stored_target.get("frozen_frequency_months") != frequency_months
    )

    if needs_recalc:
        # New month or inputs changed - calculate and freeze
        frozen_target = _calculate_target(
            amount=amount,
            frequency_months=frequency_months,
            months_until_due=months_until_due,
            current_balance=current_balance,
            ideal_monthly_rate=ideal_monthly_rate,
        )

        state_manager.set_frozen_target(
            recurring_id=recurring_id,
            frozen_target=frozen_target,
            target_month=current_month,
            balance_at_start=current_balance,
            amount=amount,
            frequency_months=frequency_months,
        )
        balance_at_start = current_balance
        was_recalculated = True
    else:
        # stored_target is guaranteed non-None here since needs_recalc is False
        assert stored_target is not None
        frozen_target = stored_target["frozen_monthly_target"]
        balance_at_start = stored_target.get("balance_at_month_start") or 0
        was_recalculated = False

    # Calculate monthly progress
    contributed_this_month = max(0, current_balance - balance_at_start)
    monthly_progress_percent = (
        (contributed_this_month / frozen_target * 100) if frozen_target > 0 else 100
    )

    return FrozenTargetResult(
        frozen_target=frozen_target,
        balance_at_start=balance_at_start,
        contributed_this_month=contributed_this_month,
        monthly_progress_percent=monthly_progress_percent,
        was_recalculated=was_recalculated,
    )


def _calculate_target(
    *,
    amount: float,
    frequency_months: float,
    months_until_due: float,
    current_balance: float,
    ideal_monthly_rate: float,
) -> float:
    """
    Calculate the monthly savings target based on subscription frequency.

    For frequent subscriptions (monthly or more often):
        Use the ideal monthly rate - no "saving up" needed.

    For infrequent subscriptions (quarterly, yearly, etc.):
        Calculate catch-up rate based on shortfall and months remaining.
        If already fully funded, target is 0.
    """
    if frequency_months <= 1:
        # Frequent subscriptions - use ideal rate (rounded up)
        return math.ceil(ideal_monthly_rate)
    else:
        # Infrequent subscriptions - calculate catch-up rate
        shortfall = max(0, amount - current_balance)
        months_remaining = max(1, months_until_due)
        if shortfall > 0:
            return math.ceil(shortfall / months_remaining)
        return 0


def calculate_rate_after_catchup(
    frozen_target: float,
    ideal_monthly_rate: float,
) -> float:
    """
    Calculate what the rate will be after catching-up items finish.

    Catching up items (frozen > ideal): will drop to ideal after payment.
    Non-catching up items: stay at their current frozen rate.
    """
    if frozen_target > ideal_monthly_rate:
        return ideal_monthly_rate
    return frozen_target
