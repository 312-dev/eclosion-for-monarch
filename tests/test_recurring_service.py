"""
Tests for the Recurring Service.

Tests cover:
- Frequency enum properties
- RecurringItem dataclass properties
- Data parsing from Monarch API responses
"""

from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.recurring_service import Frequency, RecurringItem, RecurringService


class TestFrequencyEnum:
    """Tests for the Frequency enum."""

    def test_weekly_months(self) -> None:
        """Weekly frequency should be approximately 0.23 months."""
        assert abs(Frequency.WEEKLY.months - (7 / 30.44)) < 0.01

    def test_biweekly_months(self) -> None:
        """Bi-weekly frequency should be approximately 0.46 months."""
        assert abs(Frequency.EVERY_TWO_WEEKS.months - (14 / 30.44)) < 0.01

    def test_twice_monthly_months(self) -> None:
        """Twice monthly frequency should be 0.5 months."""
        assert Frequency.TWICE_A_MONTH.months == 0.5

    def test_monthly_months(self) -> None:
        """Monthly frequency should be 1 month."""
        assert Frequency.MONTHLY.months == 1

    def test_quarterly_months(self) -> None:
        """Quarterly frequency should be 3 months."""
        assert Frequency.QUARTERLY.months == 3

    def test_semiyearly_months(self) -> None:
        """Semi-yearly frequency should be 6 months."""
        assert Frequency.SEMIYEARLY.months == 6

    def test_yearly_months(self) -> None:
        """Yearly frequency should be 12 months."""
        assert Frequency.YEARLY.months == 12

    def test_weekly_label(self) -> None:
        """Weekly label should be 'Weekly'."""
        assert Frequency.WEEKLY.label == "Weekly"

    def test_biweekly_label(self) -> None:
        """Bi-weekly label should be 'Bi-weekly'."""
        assert Frequency.EVERY_TWO_WEEKS.label == "Bi-weekly"

    def test_twice_monthly_label(self) -> None:
        """Twice monthly label should be '2x/month'."""
        assert Frequency.TWICE_A_MONTH.label == "2x/month"

    def test_monthly_label(self) -> None:
        """Monthly label should be 'Monthly'."""
        assert Frequency.MONTHLY.label == "Monthly"

    def test_quarterly_label(self) -> None:
        """Quarterly label should be 'Quarterly'."""
        assert Frequency.QUARTERLY.label == "Quarterly"

    def test_semiyearly_label(self) -> None:
        """Semi-yearly label should be '6 months'."""
        assert Frequency.SEMIYEARLY.label == "6 months"

    def test_yearly_label(self) -> None:
        """Yearly label should be 'Yearly'."""
        assert Frequency.YEARLY.label == "Yearly"


class TestRecurringItem:
    """Tests for the RecurringItem dataclass."""

    def test_months_until_due_future(self) -> None:
        """Should calculate months until future due date."""
        today = date.today()
        future_date = date(today.year + 1, today.month, 15)

        item = RecurringItem(
            id="test-1",
            name="Test Subscription",
            merchant_id=None,
            logo_url=None,
            amount=100.0,
            frequency=Frequency.YEARLY,
            next_due_date=future_date,
        )

        assert item.months_until_due == 12

    def test_months_until_due_past(self) -> None:
        """Should return 0 for past due date."""
        past_date = date.today() - timedelta(days=30)

        item = RecurringItem(
            id="test-2",
            name="Test Subscription",
            merchant_id=None,
            logo_url=None,
            amount=100.0,
            frequency=Frequency.MONTHLY,
            next_due_date=past_date,
        )

        assert item.months_until_due == 0

    def test_months_until_due_today(self) -> None:
        """Should return 0 for today's due date."""
        item = RecurringItem(
            id="test-3",
            name="Test Subscription",
            merchant_id=None,
            logo_url=None,
            amount=100.0,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )

        assert item.months_until_due == 0

    def test_frequency_months_property(self) -> None:
        """Should return frequency in months."""
        item = RecurringItem(
            id="test-4",
            name="Test Subscription",
            merchant_id=None,
            logo_url=None,
            amount=100.0,
            frequency=Frequency.QUARTERLY,
            next_due_date=date.today(),
        )

        assert item.frequency_months == 3

    def test_frequency_label_property(self) -> None:
        """Should return human-readable frequency label."""
        item = RecurringItem(
            id="test-5",
            name="Test Subscription",
            merchant_id=None,
            logo_url=None,
            amount=100.0,
            frequency=Frequency.YEARLY,
            next_due_date=date.today(),
        )

        assert item.frequency_label == "Yearly"

    def test_formatted_date(self) -> None:
        """Should format date correctly."""
        item = RecurringItem(
            id="test-6",
            name="Test Subscription",
            merchant_id=None,
            logo_url=None,
            amount=100.0,
            frequency=Frequency.MONTHLY,
            next_due_date=date(2025, 6, 15),
        )

        assert item.formatted_date == "Jun 15, 2025"

    def test_category_name(self) -> None:
        """Should generate category name with date and frequency."""
        item = RecurringItem(
            id="test-7",
            name="Netflix",
            merchant_id=None,
            logo_url=None,
            amount=15.99,
            frequency=Frequency.MONTHLY,
            next_due_date=date(2025, 6, 15),
        )

        assert item.category_name == "Netflix (Jun 15, 2025, Monthly)"

    def test_default_values(self) -> None:
        """Should have correct default values."""
        item = RecurringItem(
            id="test-8",
            name="Test",
            merchant_id=None,
            logo_url=None,
            amount=10.0,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )

        assert item.is_stale is False
        assert item.is_liability is False
        assert item.is_active is True


class TestRecurringServiceParsing:
    """Tests for RecurringService parsing methods."""

    def test_parse_recurring_items_empty(self) -> None:
        """Should handle empty response."""
        service = RecurringService()
        result = service._parse_recurring_items({})

        assert result == []

    def test_parse_recurring_items_missing_stream(self) -> None:
        """Should skip items without stream data."""
        service = RecurringService()
        raw_data = {
            "recurringTransactionStreams": [
                {"nextForecastedTransaction": {"date": "2025-06-15", "amount": -100}},
            ]
        }
        result = service._parse_recurring_items(raw_data)

        assert result == []

    def test_parse_recurring_items_missing_forecast(self) -> None:
        """Should skip items without forecast data."""
        service = RecurringService()
        raw_data = {
            "recurringTransactionStreams": [
                {"stream": {"id": "123", "name": "Netflix", "frequency": "monthly"}},
            ]
        }
        result = service._parse_recurring_items(raw_data)

        assert result == []

    def test_parse_recurring_items_zero_amount(self) -> None:
        """Should skip items with zero amount."""
        service = RecurringService()
        raw_data = {
            "recurringTransactionStreams": [
                {
                    "stream": {"id": "123", "name": "Netflix", "frequency": "monthly"},
                    "nextForecastedTransaction": {"date": "2025-06-15", "amount": 0},
                },
            ]
        }
        result = service._parse_recurring_items(raw_data)

        assert result == []

    def test_parse_recurring_items_valid(self) -> None:
        """Should correctly parse valid recurring items."""
        service = RecurringService()
        raw_data = {
            "recurringTransactionStreams": [
                {
                    "stream": {
                        "id": "123",
                        "name": "Netflix",
                        "frequency": "monthly",
                        "merchant": {"id": "merchant-1"},
                        "logoUrl": "https://example.com/logo.png",
                        "isActive": True,
                    },
                    "nextForecastedTransaction": {"date": "2025-06-15", "amount": -15.99},
                },
            ]
        }
        result = service._parse_recurring_items(raw_data)

        assert len(result) == 1
        item = result[0]
        assert item.id == "123"
        assert item.name == "Netflix"
        assert item.amount == 15.99  # Should be positive
        assert item.frequency == Frequency.MONTHLY
        assert item.next_due_date == date(2025, 6, 15)
        assert item.merchant_id == "merchant-1"
        assert item.logo_url == "https://example.com/logo.png"

    def test_parse_recurring_items_sorted_by_date(self) -> None:
        """Should sort items by next due date."""
        service = RecurringService()
        raw_data = {
            "recurringTransactionStreams": [
                {
                    "stream": {"id": "2", "name": "Later", "frequency": "monthly"},
                    "nextForecastedTransaction": {"date": "2025-08-15", "amount": -20},
                },
                {
                    "stream": {"id": "1", "name": "Earlier", "frequency": "monthly"},
                    "nextForecastedTransaction": {"date": "2025-06-15", "amount": -10},
                },
            ]
        }
        result = service._parse_recurring_items(raw_data)

        assert len(result) == 2
        assert result[0].name == "Earlier"
        assert result[1].name == "Later"

    def test_parse_recurring_items_html_entities(self) -> None:
        """Should decode HTML entities in names."""
        service = RecurringService()
        raw_data = {
            "recurringTransactionStreams": [
                {
                    "stream": {"id": "123", "name": "AT&amp;T", "frequency": "monthly"},
                    "nextForecastedTransaction": {"date": "2025-06-15", "amount": -100},
                },
            ]
        }
        result = service._parse_recurring_items(raw_data)

        assert len(result) == 1
        assert result[0].name == "AT&T"

    def test_parse_recurring_items_unknown_frequency(self) -> None:
        """Should skip items with unknown frequency."""
        service = RecurringService()
        raw_data = {
            "recurringTransactionStreams": [
                {
                    "stream": {"id": "123", "name": "Test", "frequency": "unknown_freq"},
                    "nextForecastedTransaction": {"date": "2025-06-15", "amount": -100},
                },
            ]
        }
        result = service._parse_recurring_items(raw_data)

        assert result == []

    def test_parse_recurring_items_liability(self) -> None:
        """Should detect liability accounts."""
        service = RecurringService()
        raw_data = {
            "recurringTransactionStreams": [
                {
                    "stream": {
                        "id": "123",
                        "name": "Credit Card",
                        "frequency": "monthly",
                        "creditReportLiabilityAccount": {"id": "liability-1"},
                    },
                    "nextForecastedTransaction": {"date": "2025-06-15", "amount": -500},
                },
            ]
        }
        result = service._parse_recurring_items(raw_data)

        assert len(result) == 1
        assert result[0].is_liability is True

    def test_parse_recurring_items_all_frequencies(self) -> None:
        """Should parse all supported frequencies."""
        service = RecurringService()
        frequencies = [
            ("weekly", Frequency.WEEKLY),
            ("every_two_weeks", Frequency.EVERY_TWO_WEEKS),
            ("twice_a_month", Frequency.TWICE_A_MONTH),
            ("monthly", Frequency.MONTHLY),
            ("quarterly", Frequency.QUARTERLY),
            ("semiyearly", Frequency.SEMIYEARLY),
            ("yearly", Frequency.YEARLY),
        ]

        for freq_str, expected_freq in frequencies:
            raw_data = {
                "recurringTransactionStreams": [
                    {
                        "stream": {"id": f"test-{freq_str}", "name": "Test", "frequency": freq_str},
                        "nextForecastedTransaction": {"date": "2025-06-15", "amount": -100},
                    },
                ]
            }
            result = service._parse_recurring_items(raw_data)

            assert len(result) == 1, f"Failed for frequency: {freq_str}"
            assert result[0].frequency == expected_freq, f"Failed for frequency: {freq_str}"


class TestRecurringServiceAsync:
    """Tests for async methods of RecurringService."""

    @pytest.mark.asyncio
    async def test_get_recurring_by_id_found(self) -> None:
        """Should find recurring item by ID."""
        service = RecurringService()

        # Mock get_all_recurring to return test data
        test_item = RecurringItem(
            id="target-id",
            name="Target Item",
            merchant_id=None,
            logo_url=None,
            amount=50.0,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )

        with patch.object(service, "get_all_recurring", return_value=[test_item]):
            result = await service.get_recurring_by_id("target-id")

        assert result is not None
        assert result.id == "target-id"
        assert result.name == "Target Item"

    @pytest.mark.asyncio
    async def test_get_recurring_by_id_not_found(self) -> None:
        """Should return None when item not found."""
        service = RecurringService()

        test_item = RecurringItem(
            id="other-id",
            name="Other Item",
            merchant_id=None,
            logo_url=None,
            amount=50.0,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )

        with patch.object(service, "get_all_recurring", return_value=[test_item]):
            result = await service.get_recurring_by_id("nonexistent-id")

        assert result is None
