"""
Tests for the SavingsCalculator service.

Tests cover:
- Monthly contribution calculations
- Progress tracking
- Status determination
- Edge cases (funded, due now, over-contribution)
"""

from services.savings_calculator import (
    SavingsCalculator,
    SavingsStatus,
)


class TestSavingsCalculatorBasics:
    """Basic calculation tests."""

    def test_calculate_monthly_subscription(self, savings_calculator: SavingsCalculator) -> None:
        """Monthly subscription should have monthly contribution equal to amount."""
        result = savings_calculator.calculate(
            target_amount=15.99,
            current_balance=0,
            months_until_due=1,
            frequency_months=1,
        )

        assert result.monthly_contribution == 16  # Rounded up
        assert result.status == SavingsStatus.ON_TRACK

    def test_calculate_yearly_subscription_new(self, savings_calculator: SavingsCalculator) -> None:
        """New yearly subscription should spread amount over 12 months."""
        result = savings_calculator.calculate(
            target_amount=120.00,
            current_balance=0,
            months_until_due=12,
            frequency_months=12,
        )

        assert result.monthly_contribution == 10  # 120 / 12
        assert result.ideal_monthly_rate == 10
        assert result.status == SavingsStatus.ON_TRACK

    def test_calculate_quarterly_subscription(self, savings_calculator: SavingsCalculator) -> None:
        """Quarterly subscription should calculate correctly."""
        result = savings_calculator.calculate(
            target_amount=30.00,
            current_balance=0,
            months_until_due=3,
            frequency_months=3,
        )

        assert result.monthly_contribution == 10  # 30 / 3
        assert result.ideal_monthly_rate == 10


class TestFundedStatus:
    """Tests for funded status calculations."""

    def test_calculate_funded(self, savings_calculator: SavingsCalculator) -> None:
        """Fully funded category should have zero contribution."""
        result = savings_calculator.calculate(
            target_amount=100.00,
            current_balance=100.00,
            months_until_due=6,
            frequency_months=12,
        )

        assert result.monthly_contribution == 0
        assert result.status == SavingsStatus.FUNDED
        assert result.progress_percent == 100

    def test_calculate_over_funded(self, savings_calculator: SavingsCalculator) -> None:
        """Over-funded category should track over-contribution."""
        result = savings_calculator.calculate(
            target_amount=100.00,
            current_balance=120.00,
            months_until_due=6,
            frequency_months=12,
        )

        assert result.monthly_contribution == 0
        assert result.status == SavingsStatus.FUNDED
        assert result.over_contribution == 20.00


class TestDueNowStatus:
    """Tests for due now status calculations."""

    def test_calculate_due_now(self, savings_calculator: SavingsCalculator) -> None:
        """Due now should require full shortfall immediately."""
        result = savings_calculator.calculate(
            target_amount=50.00,
            current_balance=20.00,
            months_until_due=0,
            frequency_months=1,
        )

        assert result.monthly_contribution == 30  # Full shortfall
        assert result.status == SavingsStatus.DUE_NOW
        assert result.amount_needed_now == 30


class TestProgressStatus:
    """Tests for ahead/behind status calculations."""

    def test_calculate_behind_schedule(self, savings_calculator: SavingsCalculator) -> None:
        """Behind schedule should show BEHIND status."""
        # Need $100 in 2 months but have $0 - requires $50/month
        # Ideal rate is $100/12 = ~$9/month
        # $50 >> $9 * 1.1, so status should be BEHIND
        result = savings_calculator.calculate(
            target_amount=100.00,
            current_balance=0,
            months_until_due=2,
            frequency_months=12,
        )

        assert result.monthly_contribution == 50
        assert result.status == SavingsStatus.BEHIND
        assert result.ideal_monthly_rate == 9  # ceil(100/12)

    def test_calculate_ahead_schedule(self, savings_calculator: SavingsCalculator) -> None:
        """Ahead of schedule should show AHEAD status."""
        # Need $100 in 12 months, already have $90
        # Only need $10 / 12 = ~$1/month
        # Ideal rate is $9/month, $1 < $9 * 0.9
        result = savings_calculator.calculate(
            target_amount=100.00,
            current_balance=90.00,
            months_until_due=12,
            frequency_months=12,
        )

        assert result.monthly_contribution == 1
        assert result.status == SavingsStatus.AHEAD


class TestOverContribution:
    """Tests for over-contribution handling."""

    def test_calculate_with_tracked_over_contribution(
        self, savings_calculator: SavingsCalculator
    ) -> None:
        """Should account for tracked over-contribution."""
        result = savings_calculator.calculate(
            target_amount=100.00,
            current_balance=50.00,
            months_until_due=5,
            tracked_over_contribution=25.00,  # Extra from previous cycle
            frequency_months=12,
        )

        # Effective balance is 50 + 25 = 75
        # Shortfall is 100 - 75 = 25
        # Monthly is 25 / 5 = 5
        assert result.monthly_contribution == 5

    def test_detect_over_contribution(self, savings_calculator: SavingsCalculator) -> None:
        """Should detect over-contribution amount."""
        over = savings_calculator.detect_over_contribution(
            current_balance=150,
            expected_balance=100,
            target_amount=200,
        )

        assert over == 50  # 150 - 100


class TestProgressPercent:
    """Tests for progress percentage calculation."""

    def test_progress_percent_calculation(self, savings_calculator: SavingsCalculator) -> None:
        """Progress percentage should be calculated correctly."""
        result = savings_calculator.calculate(
            target_amount=100.00,
            current_balance=75.00,
            months_until_due=3,
            frequency_months=12,
        )

        assert result.progress_percent == 75.0

    def test_progress_percent_capped_at_100(self, savings_calculator: SavingsCalculator) -> None:
        """Progress percentage should be capped at 100."""
        result = savings_calculator.calculate(
            target_amount=100.00,
            current_balance=150.00,
            months_until_due=3,
            frequency_months=12,
        )

        assert result.progress_percent == 100


class TestNewCycleDetection:
    """Tests for billing cycle detection."""

    def test_detect_new_cycle_yearly(self, savings_calculator: SavingsCalculator) -> None:
        """Should detect yearly cycle rollover."""
        result = savings_calculator.detect_new_cycle(
            previous_due_date="2024-01-15",
            current_due_date="2025-01-15",
            frequency_months=12,
        )

        assert result is True

    def test_detect_no_new_cycle(self, savings_calculator: SavingsCalculator) -> None:
        """Should not detect cycle when dates are close."""
        result = savings_calculator.detect_new_cycle(
            previous_due_date="2025-01-15",
            current_due_date="2025-01-20",
            frequency_months=12,
        )

        assert result is False

    def test_detect_new_cycle_monthly(self, savings_calculator: SavingsCalculator) -> None:
        """Should detect monthly cycle rollover."""
        result = savings_calculator.detect_new_cycle(
            previous_due_date="2025-01-15",
            current_due_date="2025-02-15",
            frequency_months=1,
        )

        assert result is True

    def test_detect_cycle_none_previous(self, savings_calculator: SavingsCalculator) -> None:
        """Should return False when no previous date."""
        result = savings_calculator.detect_new_cycle(
            previous_due_date=None,
            current_due_date="2025-01-15",
            frequency_months=12,
        )

        assert result is False


class TestSavingsCalculationDataclass:
    """Tests for SavingsCalculation dataclass."""

    def test_to_dict(self, savings_calculator: SavingsCalculator) -> None:
        """to_dict should return JSON-serializable dict."""
        result = savings_calculator.calculate(
            target_amount=100.00,
            current_balance=50.00,
            months_until_due=5,
            frequency_months=12,
        )

        data = result.to_dict()

        assert isinstance(data, dict)
        assert data["target_amount"] == 100.00
        assert data["current_balance"] == 50.00
        assert data["status"] == "on_track"  # String value, not enum
