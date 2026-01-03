"""
Recurring Service

Fetches and parses recurring transactions from Monarch Money API.
"""

import os
import sys
from dataclasses import dataclass
from datetime import date
from enum import Enum

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from monarch_utils import get_cache, get_mm, retry_with_backoff


class Frequency(Enum):
    """Recurring transaction frequency."""
    WEEKLY = "weekly"
    EVERY_TWO_WEEKS = "every_two_weeks"
    TWICE_A_MONTH = "twice_a_month"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMIYEARLY = "semiyearly"
    YEARLY = "yearly"

    @property
    def months(self) -> float:
        """Return approximate frequency in months (time between occurrences)."""
        # For sub-monthly frequencies, use accurate weeks-per-month (4.33)
        return {
            Frequency.WEEKLY: 7 / 30.44,           # ~0.23 months
            Frequency.EVERY_TWO_WEEKS: 14 / 30.44, # ~0.46 months
            Frequency.TWICE_A_MONTH: 0.5,          # exactly 2x per month
            Frequency.MONTHLY: 1,
            Frequency.QUARTERLY: 3,
            Frequency.SEMIYEARLY: 6,
            Frequency.YEARLY: 12,
        }[self]

    @property
    def label(self) -> str:
        """Return human-readable frequency label."""
        return {
            Frequency.WEEKLY: "Weekly",
            Frequency.EVERY_TWO_WEEKS: "Bi-weekly",
            Frequency.TWICE_A_MONTH: "2x/month",
            Frequency.MONTHLY: "Monthly",
            Frequency.QUARTERLY: "Quarterly",
            Frequency.SEMIYEARLY: "6 months",
            Frequency.YEARLY: "Yearly",
        }[self]


@dataclass
class RecurringItem:
    """Represents a recurring transaction from Monarch."""
    id: str
    name: str
    merchant_id: str | None
    logo_url: str | None
    amount: float  # Positive value
    frequency: Frequency
    next_due_date: date
    is_stale: bool = False  # True if last expected charge was missed or >7 days off
    is_liability: bool = False
    is_active: bool = True

    @property
    def months_until_due(self) -> int:
        """Calculate months remaining until next due date."""
        today = date.today()
        if self.next_due_date <= today:
            return 0
        # Count calendar months
        return (
            (self.next_due_date.year - today.year) * 12
            + (self.next_due_date.month - today.month)
        )

    @property
    def frequency_months(self) -> float:
        """Return frequency in months (time between occurrences)."""
        return self.frequency.months

    @property
    def frequency_label(self) -> str:
        """Return human-readable frequency label."""
        return self.frequency.label

    @property
    def formatted_date(self) -> str:
        """Return formatted date string (e.g., 'Jun 15, 2025')."""
        return self.next_due_date.strftime("%b %-d, %Y")

    @property
    def category_name(self) -> str:
        """Generate category name in format: {name} ({date}, {frequency})."""
        return f"{self.name} ({self.formatted_date}, {self.frequency_label})"


class RecurringService:
    """Service for fetching and processing recurring transactions."""

    async def get_all_recurring(self, force_refresh: bool = False) -> list[RecurringItem]:
        """
        Fetch all recurring transactions from Monarch.
        Returns list of RecurringItem objects.

        Uses caching to avoid redundant API calls. Results cached for 15 minutes.

        Args:
            force_refresh: If True, bypass cache and fetch fresh data
        """
        cache = get_cache("recurring")
        cache_key = "all_recurring"

        # Check cache first (unless force refresh)
        if not force_refresh and cache_key in cache:
            return cache[cache_key]

        mm = await get_mm()

        # Fetch with retry/backoff
        raw_data = await retry_with_backoff(
            lambda: mm.get_all_recurring_transaction_items(include_liabilities=True)
        )
        items = self._parse_recurring_items(raw_data)

        # Cache the results
        cache[cache_key] = items
        return items

    def _parse_recurring_items(self, raw_data: dict) -> list[RecurringItem]:
        """Parse Monarch API response into RecurringItem objects."""
        items = []
        for item in raw_data.get("recurringTransactionStreams", []):
            # The actual stream data is nested under "stream" key
            stream = item.get("stream", {})
            next_txn = item.get("nextForecastedTransaction", {})

            if not stream or not next_txn:
                continue

            # Extract date and amount
            date_str = next_txn.get("date")
            amount = next_txn.get("amount", 0)

            if not date_str or amount == 0:
                continue

            # Get stream ID - skip if missing
            stream_id = stream.get("id")
            if not stream_id:
                continue

            # Parse frequency
            freq_str = stream.get("frequency", "").lower().replace(" ", "_")
            if not freq_str:
                continue
            try:
                frequency = Frequency(freq_str)
            except ValueError:
                # Log unknown frequencies for debugging
                import logging
                logging.getLogger(__name__).warning(f"Unknown frequency '{freq_str}' for recurring item '{stream.get('name', 'Unknown')}'")
                continue

            merchant = stream.get("merchant", {})
            items.append(
                RecurringItem(
                    id=stream_id,
                    name=self._extract_name(stream),
                    merchant_id=merchant.get("id"),
                    logo_url=stream.get("logoUrl"),
                    amount=abs(amount),  # Make positive
                    frequency=frequency,
                    next_due_date=date.fromisoformat(date_str),
                    is_stale=False,  # Will be set later by stale check
                    is_liability=stream.get("creditReportLiabilityAccount") is not None,
                    is_active=stream.get("isActive", True),
                )
            )

        # Sort by next due date
        items.sort(key=lambda x: x.next_due_date)
        return items

    def _extract_name(self, stream: dict) -> str:
        """Extract display name from recurring stream."""
        # Use stream name directly (it already has the merchant name or description)
        return stream.get("name", "Unknown")

    async def get_recurring_by_id(self, recurring_id: str) -> RecurringItem | None:
        """Get a specific recurring item by ID."""
        items = await self.get_all_recurring()
        for item in items:
            if item.id == recurring_id:
                return item
        return None
