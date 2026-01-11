"""
Tests for the Frozen Target Calculator service.

Tests cover:
- Frozen target calculation and caching
- Monthly vs infrequent subscription handling
- Progress percentage calculations
- State persistence interactions
- Rate after catch-up calculations
"""

import math
from dataclasses import dataclass
from datetime import datetime
from unittest.mock import MagicMock

import pytest

from services.frozen_target_calculator import (
    FrozenTargetResult,
    calculate_frozen_target,
    calculate_rate_after_catchup,
)


@dataclass
class MockStateManager:
    """Mock state manager for testing."""

    frozen_targets: dict

    def __init__(self):
        self.frozen_targets = {}

    def get_frozen_target(self, recurring_id: str) -> dict | None:
        return self.frozen_targets.get(recurring_id)

    def set_frozen_target(
        self,
        recurring_id: str,
        frozen_target: float,
        target_month: str,
        balance_at_start: float,
        amount: float,
        frequency_months: float,
    ) -> None:
        self.frozen_targets[recurring_id] = {
            "frozen_monthly_target": frozen_target,
            "target_month": target_month,
            "balance_at_month_start": balance_at_start,
            "frozen_amount": amount,
            "frozen_frequency_months": frequency_months,
        }


class TestFrozenTargetCalculationMonthly:
    """Tests for monthly subscription frozen targets."""

    def test_monthly_subscription_new_calculation(self) -> None:
        """Monthly subscription should calculate shortfall as target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-monthly",
            amount=80.0,
            frequency_months=1,
            months_until_due=1,
            current_balance=30.0,
            ideal_monthly_rate=80.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Monthly: target is shortfall = ceil(80 - 30) = 50
        assert result.frozen_target == 50
        assert result.was_recalculated is True
        assert result.balance_at_start == 30.0

    def test_monthly_subscription_fully_funded(self) -> None:
        """Fully funded monthly subscription should have zero target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-monthly-funded",
            amount=80.0,
            frequency_months=1,
            months_until_due=1,
            current_balance=80.0,
            ideal_monthly_rate=80.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Fully funded: target is 0
        assert result.frozen_target == 0
        assert result.was_recalculated is True

    def test_monthly_subscription_overfunded(self) -> None:
        """Overfunded monthly subscription should have zero target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-monthly-over",
            amount=80.0,
            frequency_months=1,
            months_until_due=1,
            current_balance=100.0,
            ideal_monthly_rate=80.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Overfunded: target is max(0, ...) = 0
        assert result.frozen_target == 0


class TestFrozenTargetCalculationInfrequent:
    """Tests for infrequent (quarterly, yearly) subscription frozen targets."""

    def test_yearly_subscription_new(self) -> None:
        """New yearly subscription should spread shortfall over months."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-yearly",
            amount=600.0,
            frequency_months=12,
            months_until_due=12,
            current_balance=0.0,
            ideal_monthly_rate=50.0,  # 600/12
            state_manager=state_manager,
            current_month=current_month,
        )

        # Yearly new: shortfall = 600, months = 12, target = ceil(600/12) = 50
        assert result.frozen_target == 50
        assert result.was_recalculated is True

    def test_yearly_subscription_catching_up(self) -> None:
        """Behind-schedule yearly should have higher catch-up target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-yearly-catch",
            amount=600.0,
            frequency_months=12,
            months_until_due=3,  # Only 3 months left
            current_balance=300.0,  # Only half saved
            ideal_monthly_rate=50.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Catch-up: shortfall = 300, months = 3, target = ceil(300/3) = 100
        assert result.frozen_target == 100

    def test_yearly_subscription_fully_funded(self) -> None:
        """Fully funded yearly subscription should have zero target."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-yearly-funded",
            amount=600.0,
            frequency_months=12,
            months_until_due=3,
            current_balance=600.0,
            ideal_monthly_rate=50.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Fully funded: shortfall = 0, target = 0
        assert result.frozen_target == 0

    def test_quarterly_subscription(self) -> None:
        """Quarterly subscription should calculate correctly."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-quarterly",
            amount=90.0,
            frequency_months=3,
            months_until_due=3,
            current_balance=0.0,
            ideal_monthly_rate=30.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Quarterly: shortfall = 90, months = 3, target = ceil(90/3) = 30
        assert result.frozen_target == 30


class TestFrozenTargetCaching:
    """Tests for frozen target caching behavior."""

    def test_uses_cached_target_same_month(self) -> None:
        """Should use cached target within the same month."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Pre-populate cache
        state_manager.frozen_targets["test-cached"] = {
            "frozen_monthly_target": 42.0,
            "target_month": current_month,
            "balance_at_month_start": 10.0,
            "frozen_amount": 100.0,
            "frozen_frequency_months": 12,
        }

        result = calculate_frozen_target(
            recurring_id="test-cached",
            amount=100.0,
            frequency_months=12,
            months_until_due=6,
            current_balance=50.0,  # Balance changed but target should not
            ideal_monthly_rate=9.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Should use cached value, not recalculate
        assert result.frozen_target == 42.0
        assert result.was_recalculated is False
        assert result.balance_at_start == 10.0

    def test_recalculates_on_new_month(self) -> None:
        """Should recalculate target when month changes."""
        state_manager = MockStateManager()

        # Cache from previous month
        state_manager.frozen_targets["test-new-month"] = {
            "frozen_monthly_target": 42.0,
            "target_month": "2024-01",  # Old month
            "balance_at_month_start": 10.0,
            "frozen_amount": 100.0,
            "frozen_frequency_months": 12,
        }

        result = calculate_frozen_target(
            recurring_id="test-new-month",
            amount=100.0,
            frequency_months=12,
            months_until_due=6,
            current_balance=50.0,
            ideal_monthly_rate=9.0,
            state_manager=state_manager,
            current_month="2024-02",  # New month
        )

        # Should recalculate
        assert result.was_recalculated is True
        # Shortfall = 50, months = 6, target = ceil(50/6) = 9
        assert result.frozen_target == 9

    def test_recalculates_on_amount_change(self) -> None:
        """Should recalculate target when subscription amount changes."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Cache with old amount
        state_manager.frozen_targets["test-amount-change"] = {
            "frozen_monthly_target": 42.0,
            "target_month": current_month,
            "balance_at_month_start": 10.0,
            "frozen_amount": 100.0,  # Old amount
            "frozen_frequency_months": 12,
        }

        result = calculate_frozen_target(
            recurring_id="test-amount-change",
            amount=200.0,  # Amount changed!
            frequency_months=12,
            months_until_due=6,
            current_balance=50.0,
            ideal_monthly_rate=17.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Should recalculate due to amount change
        assert result.was_recalculated is True
        # Shortfall = 150, months = 6, target = ceil(150/6) = 25
        assert result.frozen_target == 25

    def test_recalculates_on_frequency_change(self) -> None:
        """Should recalculate target when frequency changes."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Cache with old frequency
        state_manager.frozen_targets["test-freq-change"] = {
            "frozen_monthly_target": 42.0,
            "target_month": current_month,
            "balance_at_month_start": 10.0,
            "frozen_amount": 120.0,
            "frozen_frequency_months": 12,  # Was yearly
        }

        result = calculate_frozen_target(
            recurring_id="test-freq-change",
            amount=120.0,
            frequency_months=3,  # Now quarterly
            months_until_due=3,
            current_balance=0.0,
            ideal_monthly_rate=40.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Should recalculate due to frequency change
        assert result.was_recalculated is True
        # Shortfall = 120, months = 3, target = ceil(120/3) = 40
        assert result.frozen_target == 40


class TestMonthlyProgressCalculation:
    """Tests for monthly progress percentage calculations."""

    def test_progress_zero_start(self) -> None:
        """Progress should calculate from balance at start of month."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-progress",
            amount=100.0,
            frequency_months=12,
            months_until_due=10,
            current_balance=25.0,
            ideal_monthly_rate=10.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Balance at start = 25, current = 25, contributed = 0
        # Target = ceil(75/10) = 8, progress = 0%
        assert result.contributed_this_month == 0
        assert result.monthly_progress_percent == 0

    def test_progress_with_contributions(self) -> None:
        """Progress should reflect contributions during the month."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Pre-populate with balance at start
        state_manager.frozen_targets["test-progress-contrib"] = {
            "frozen_monthly_target": 50.0,
            "target_month": current_month,
            "balance_at_month_start": 100.0,
            "frozen_amount": 600.0,
            "frozen_frequency_months": 12,
        }

        result = calculate_frozen_target(
            recurring_id="test-progress-contrib",
            amount=600.0,
            frequency_months=12,
            months_until_due=10,
            current_balance=125.0,  # Contributed 25 since start
            ideal_monthly_rate=50.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Contributed = 125 - 100 = 25, target = 50, progress = 50%
        assert result.contributed_this_month == 25.0
        assert result.monthly_progress_percent == 50.0

    def test_progress_complete(self) -> None:
        """Progress should show 100% when target is met."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Pre-populate with balance at start
        state_manager.frozen_targets["test-progress-complete"] = {
            "frozen_monthly_target": 50.0,
            "target_month": current_month,
            "balance_at_month_start": 100.0,
            "frozen_amount": 600.0,
            "frozen_frequency_months": 12,
        }

        result = calculate_frozen_target(
            recurring_id="test-progress-complete",
            amount=600.0,
            frequency_months=12,
            months_until_due=10,
            current_balance=150.0,  # Contributed full 50
            ideal_monthly_rate=50.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Contributed = 50, target = 50, progress = 100%
        assert result.contributed_this_month == 50.0
        assert result.monthly_progress_percent == 100.0

    def test_progress_zero_target(self) -> None:
        """Progress should be 100% when target is zero (fully funded)."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-progress-funded",
            amount=600.0,
            frequency_months=12,
            months_until_due=10,
            current_balance=600.0,  # Fully funded
            ideal_monthly_rate=50.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Target = 0, progress should be 100%
        assert result.frozen_target == 0
        assert result.monthly_progress_percent == 100.0


class TestRateAfterCatchup:
    """Tests for rate after catch-up calculation."""

    def test_catching_up_returns_ideal(self) -> None:
        """Catching up items should return ideal rate after payment."""
        result = calculate_rate_after_catchup(
            frozen_target=100.0,  # Higher than ideal
            ideal_monthly_rate=50.0,
        )

        # Will drop to ideal rate after catching up
        assert result == 50.0

    def test_not_catching_up_returns_frozen(self) -> None:
        """Non-catching up items should stay at frozen rate."""
        result = calculate_rate_after_catchup(
            frozen_target=50.0,  # Same as ideal
            ideal_monthly_rate=50.0,
        )

        assert result == 50.0

    def test_ahead_of_schedule_returns_frozen(self) -> None:
        """Ahead of schedule items should stay at lower frozen rate."""
        result = calculate_rate_after_catchup(
            frozen_target=25.0,  # Lower than ideal
            ideal_monthly_rate=50.0,
        )

        # Stays at frozen rate (not catching up)
        assert result == 25.0

    def test_zero_rates(self) -> None:
        """Zero rates should be handled correctly."""
        result = calculate_rate_after_catchup(
            frozen_target=0.0,
            ideal_monthly_rate=0.0,
        )

        assert result == 0.0


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_zero_months_until_due(self) -> None:
        """Should handle zero months until due (due now)."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-due-now",
            amount=100.0,
            frequency_months=12,
            months_until_due=0,  # Due now
            current_balance=50.0,
            ideal_monthly_rate=9.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Due now: shortfall = 50, months = max(1, 0) = 1, target = 50
        assert result.frozen_target == 50

    def test_negative_balance(self) -> None:
        """Should handle negative balance (shouldn't happen but be safe)."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-negative",
            amount=100.0,
            frequency_months=12,
            months_until_due=10,
            current_balance=-10.0,  # Negative balance
            ideal_monthly_rate=9.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Shortfall = 100 - (-10) = 110, but we use max(0, amount - balance)
        # Actually the code does: shortfall = max(0, amount - current_balance)
        # = max(0, 100 - (-10)) = max(0, 110) = 110
        # target = ceil(110/10) = 11
        assert result.frozen_target == 11

    def test_very_small_amounts(self) -> None:
        """Should handle very small amounts with proper rounding."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-small",
            amount=1.0,
            frequency_months=12,
            months_until_due=12,
            current_balance=0.0,
            ideal_monthly_rate=0.09,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Shortfall = 1, months = 12, target = ceil(1/12) = 1
        assert result.frozen_target == 1

    def test_large_amounts(self) -> None:
        """Should handle large amounts correctly."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        result = calculate_frozen_target(
            recurring_id="test-large",
            amount=10000.0,
            frequency_months=12,
            months_until_due=12,
            current_balance=0.0,
            ideal_monthly_rate=834.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Shortfall = 10000, months = 12, target = ceil(10000/12) = 834
        assert result.frozen_target == 834

    def test_fractional_balance_contribution(self) -> None:
        """Should correctly calculate contribution with fractional balances."""
        state_manager = MockStateManager()
        current_month = datetime.now().strftime("%Y-%m")

        # Pre-populate with fractional balance at start
        state_manager.frozen_targets["test-fractional"] = {
            "frozen_monthly_target": 50.0,
            "target_month": current_month,
            "balance_at_month_start": 100.50,
            "frozen_amount": 600.0,
            "frozen_frequency_months": 12,
        }

        result = calculate_frozen_target(
            recurring_id="test-fractional",
            amount=600.0,
            frequency_months=12,
            months_until_due=10,
            current_balance=125.75,
            ideal_monthly_rate=50.0,
            state_manager=state_manager,
            current_month=current_month,
        )

        # Contributed = 125.75 - 100.50 = 25.25
        assert result.contributed_this_month == 25.25


class TestDefaultCurrentMonth:
    """Tests for default current month behavior."""

    def test_uses_current_month_when_not_specified(self) -> None:
        """Should use current month when not explicitly provided."""
        state_manager = MockStateManager()

        result = calculate_frozen_target(
            recurring_id="test-default-month",
            amount=100.0,
            frequency_months=12,
            months_until_due=6,
            current_balance=50.0,
            ideal_monthly_rate=9.0,
            state_manager=state_manager,
            # current_month not specified
        )

        # Should use current month and persist it
        expected_month = datetime.now().strftime("%Y-%m")
        stored = state_manager.frozen_targets.get("test-default-month")
        assert stored is not None
        assert stored["target_month"] == expected_month
