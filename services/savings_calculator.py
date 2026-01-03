"""
Savings Calculator

Calculates monthly contribution amounts for recurring transactions.
Handles over-contributions and edge cases.
"""

import math
from dataclasses import dataclass
from datetime import date
from enum import Enum


class SavingsStatus(Enum):
    """Status of savings progress."""

    ON_TRACK = "on_track"
    BEHIND = "behind"
    AHEAD = "ahead"
    FUNDED = "funded"
    DUE_NOW = "due_now"
    INACTIVE = "inactive"
    CRITICAL = "critical"  # At risk - current rate won't reach target by due date


@dataclass
class SavingsCalculation:
    """Result of savings calculation."""

    monthly_contribution: float
    months_remaining: int
    target_amount: float
    current_balance: float
    shortfall: float
    over_contribution: float
    progress_percent: float
    status: SavingsStatus
    ideal_monthly_rate: float = 0.0  # Ideal rate from renewal to next renewal
    amount_needed_now: float = 0.0  # Extra amount needed now to get back on track

    def to_dict(self) -> dict:
        return {
            "monthly_contribution": self.monthly_contribution,
            "months_remaining": self.months_remaining,
            "target_amount": self.target_amount,
            "current_balance": self.current_balance,
            "shortfall": self.shortfall,
            "over_contribution": self.over_contribution,
            "progress_percent": self.progress_percent,
            "status": self.status.value,
            "ideal_monthly_rate": self.ideal_monthly_rate,
            "amount_needed_now": self.amount_needed_now,
        }


class SavingsCalculator:
    """Calculates monthly savings amounts for recurring transactions."""

    def calculate(
        self,
        target_amount: float,
        current_balance: float,
        months_until_due: int,
        tracked_over_contribution: float = 0.0,
        frequency_months: int = 12,
    ) -> SavingsCalculation:
        """
        Calculate monthly savings needed to be ready by due date.

        Args:
            target_amount: Total amount needed (from recurring transaction)
            current_balance: Category's remainingAmount from Monarch
            months_until_due: Calendar months until next due date
            tracked_over_contribution: Previously tracked over-contribution from state
            frequency_months: Billing cycle length in months (1=monthly, 3=quarterly, 12=yearly)

        Returns:
            SavingsCalculation with all details
        """
        # Calculate ideal monthly rate (amount / frequency)
        # This is what you'd save each month from renewal to next renewal
        # Round up to nearest dollar (Monarch doesn't do cents)
        ideal_monthly_rate = (
            math.ceil(target_amount / frequency_months) if frequency_months > 0 else target_amount
        )

        # Calculate progress
        progress_percent = (current_balance / target_amount * 100) if target_amount > 0 else 0
        progress_percent = min(100, max(0, progress_percent))

        # Check if fully funded
        if current_balance >= target_amount:
            over_contribution = current_balance - target_amount
            return SavingsCalculation(
                monthly_contribution=0,
                months_remaining=months_until_due,
                target_amount=target_amount,
                current_balance=current_balance,
                shortfall=0,
                over_contribution=over_contribution,
                progress_percent=100,
                status=SavingsStatus.FUNDED,
                ideal_monthly_rate=ideal_monthly_rate,
                amount_needed_now=0,
            )

        # Calculate shortfall (account for tracked over-contribution)
        effective_balance = current_balance + tracked_over_contribution
        shortfall = target_amount - effective_balance

        if shortfall <= 0:
            # Over-contribution covers the rest
            return SavingsCalculation(
                monthly_contribution=0,
                months_remaining=months_until_due,
                target_amount=target_amount,
                current_balance=current_balance,
                shortfall=0,
                over_contribution=abs(shortfall),
                progress_percent=progress_percent,
                status=SavingsStatus.AHEAD,
                ideal_monthly_rate=ideal_monthly_rate,
                amount_needed_now=0,
            )

        # For sub-monthly frequencies (weekly, bi-weekly, twice a month),
        # always use the ideal monthly rate since we're continuously saving
        if frequency_months < 1:
            # Sub-monthly: use ideal rate, status based on progress
            amount_needed_now = max(0, shortfall - (ideal_monthly_rate * max(1, months_until_due)))
            if months_until_due <= 0:
                status = SavingsStatus.DUE_NOW
                amount_needed_now = shortfall
            elif amount_needed_now > 0:
                status = SavingsStatus.CRITICAL
            else:
                status = SavingsStatus.ON_TRACK
            return SavingsCalculation(
                monthly_contribution=math.ceil(ideal_monthly_rate),
                months_remaining=months_until_due,
                target_amount=target_amount,
                current_balance=current_balance,
                shortfall=shortfall,
                over_contribution=0,
                progress_percent=progress_percent,
                status=status,
                ideal_monthly_rate=ideal_monthly_rate,
                amount_needed_now=amount_needed_now,
            )

        # Due this month or past due
        if months_until_due <= 0:
            return SavingsCalculation(
                monthly_contribution=math.ceil(shortfall),
                months_remaining=0,
                target_amount=target_amount,
                current_balance=current_balance,
                shortfall=shortfall,
                over_contribution=0,
                progress_percent=progress_percent,
                status=SavingsStatus.DUE_NOW,
                ideal_monthly_rate=ideal_monthly_rate,
                amount_needed_now=shortfall,
            )

        # Normal calculation: spread shortfall over remaining months
        monthly = shortfall / months_until_due
        monthly_rounded = math.ceil(monthly)  # Round up to nearest dollar

        # Determine status based on whether you're ahead, on track, or behind:
        # - AHEAD: Need to pay less than 90% of ideal rate (ahead of schedule)
        # - ON_TRACK: Need to pay about the ideal rate (within 10%)
        # - BEHIND: Need to pay more than ideal rate (behind schedule, catching up)
        amount_needed_now = 0
        if monthly_rounded <= ideal_monthly_rate * 0.9:
            status = SavingsStatus.AHEAD
        elif monthly_rounded <= ideal_monthly_rate * 1.1:
            status = SavingsStatus.ON_TRACK
        else:
            # Behind schedule - need to pay more than ideal to catch up
            status = SavingsStatus.BEHIND

        return SavingsCalculation(
            monthly_contribution=monthly_rounded,
            months_remaining=months_until_due,
            target_amount=target_amount,
            current_balance=current_balance,
            shortfall=shortfall,
            over_contribution=0,
            progress_percent=progress_percent,
            status=status,
            ideal_monthly_rate=ideal_monthly_rate,
            amount_needed_now=amount_needed_now,
        )

    def detect_over_contribution(
        self,
        current_balance: float,
        expected_balance: float,
        target_amount: float,
    ) -> float:
        """
        Detect if user has over-contributed beyond expected amount.

        Args:
            current_balance: Actual balance from Monarch
            expected_balance: What we expected based on previous balance + contributions
            target_amount: Total amount needed

        Returns:
            Over-contribution amount (0 if none)
        """
        if current_balance > expected_balance:
            excess = current_balance - expected_balance
            # Cap at remaining needed to avoid negative contributions
            remaining = target_amount - current_balance
            if remaining < 0:
                # Already fully funded
                return current_balance - target_amount
            return min(excess, remaining)
        return 0

    def detect_new_cycle(
        self,
        previous_due_date: str | None,
        current_due_date: str,
        frequency_months: int,
    ) -> bool:
        """
        Detect if a new billing cycle has started.

        This happens when the due date jumps forward significantly,
        indicating the previous transaction was paid.

        Args:
            previous_due_date: Previously tracked due date (ISO format)
            current_due_date: Current due date from API (ISO format)
            frequency_months: Expected frequency in months

        Returns:
            True if new cycle detected
        """
        if previous_due_date is None:
            return False

        try:
            prev = date.fromisoformat(previous_due_date)
            curr = date.fromisoformat(current_due_date)
        except ValueError:
            return False

        # Calculate days between dates
        days_diff = (curr - prev).days

        # If due date jumped forward by more than half the frequency period,
        # it's likely a new cycle
        threshold_days = (frequency_months * 30) // 2  # Half the cycle
        return days_diff > threshold_days
