"""
Tests for the Rollup Service.

Tests cover:
- Rollup enable/disable
- Adding/removing items from rollup
- Budget management
- Category creation and linking
- Rollup data aggregation
"""

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.recurring_service import Frequency, RecurringItem


class MockStateManager:
    """Mock state manager for rollup tests."""

    def __init__(self):
        self.state = MagicMock()
        self.state.rollup = MagicMock()
        self.state.rollup.enabled = False
        self.state.rollup.monarch_category_id = None
        self.state.rollup.item_ids = set()
        self.state.rollup.total_budgeted = 0
        self.state.rollup.emoji = "📦"
        self.state.rollup.category_name = "Rollup Category"
        self.state.rollup.is_linked = False
        self.state.target_group_id = "group-123"
        self.state.categories = {}
        self.frozen_targets = {}

    def load(self):
        return self.state

    def save(self, state):
        self.state = state

    def toggle_rollup_enabled(self, enabled):
        self.state.rollup.enabled = enabled
        return self.state.rollup

    def set_rollup_category_id(self, category_id):
        self.state.rollup.monarch_category_id = category_id

    def add_to_rollup(self, recurring_id, monthly_rate):
        self.state.rollup.item_ids.add(recurring_id)
        self.state.rollup.total_budgeted += monthly_rate
        return self.state.rollup

    def remove_from_rollup(self, recurring_id, monthly_rate):
        self.state.rollup.item_ids.discard(recurring_id)
        self.state.rollup.total_budgeted = max(0, self.state.rollup.total_budgeted - monthly_rate)
        return self.state.rollup

    def set_rollup_budget(self, amount):
        self.state.rollup.total_budgeted = amount
        return self.state.rollup

    def update_rollup_emoji(self, emoji):
        self.state.rollup.emoji = emoji
        return self.state.rollup

    def update_rollup_category_name(self, name):
        self.state.rollup.category_name = name
        return self.state.rollup

    def get_frozen_target(self, recurring_id):
        return self.frozen_targets.get(recurring_id)

    def set_frozen_target(self, recurring_id, frozen_target, target_month, balance_at_start, amount, frequency_months):
        self.frozen_targets[recurring_id] = {
            "frozen_monthly_target": frozen_target,
            "target_month": target_month,
            "balance_at_month_start": balance_at_start,
            "frozen_amount": amount,
            "frozen_frequency_months": frequency_months,
        }


class MockCategoryManager:
    """Mock category manager for rollup tests."""

    def __init__(self):
        self.categories = {}
        self.budgets = {}
        self.balances = {}

    async def create_category(self, group_id, name, icon=None):
        cat_id = f"cat-{len(self.categories)}"
        self.categories[cat_id] = {"id": cat_id, "name": name, "icon": icon}
        return cat_id

    async def find_category_by_id(self, category_id):
        return self.categories.get(category_id)

    async def get_all_planned_budgets(self):
        return self.budgets

    async def get_all_category_balances(self):
        return self.balances

    async def set_category_budget(self, category_id, amount, apply_to_future=False):
        self.budgets[category_id] = amount

    async def rename_category(self, category_id, name, icon=None):
        if category_id in self.categories:
            self.categories[category_id]["name"] = name

    async def update_category_icon(self, category_id, icon):
        if category_id in self.categories:
            self.categories[category_id]["icon"] = icon


class MockRecurringService:
    """Mock recurring service for rollup tests."""

    def __init__(self):
        self.items = []

    async def get_all_recurring(self):
        return self.items


class MockSavingsCalculator:
    """Mock savings calculator for rollup tests."""

    def calculate(self, target_amount, current_balance, months_until_due, tracked_over_contribution=0, frequency_months=1):
        result = MagicMock()
        result.ideal_monthly_rate = target_amount / frequency_months if frequency_months > 0 else target_amount
        result.monthly_contribution = max(0, target_amount - current_balance) / max(1, months_until_due)
        result.status = MagicMock()
        result.status.value = "on_track"
        result.amount_needed_now = max(0, target_amount - current_balance)
        return result


@pytest.fixture
def rollup_service():
    """Create a RollupService with mocked dependencies."""
    from services.rollup_service import RollupService

    state_manager = MockStateManager()
    category_manager = MockCategoryManager()
    recurring_service = MockRecurringService()
    savings_calculator = MockSavingsCalculator()

    # Make state.is_configured return True
    state_manager.state.is_configured = MagicMock(return_value=True)
    state_manager.state.is_item_enabled = MagicMock(return_value=True)

    service = RollupService(
        state_manager=state_manager,
        category_manager=category_manager,
        recurring_service=recurring_service,
        savings_calculator=savings_calculator,
    )

    return service


class TestToggleRollup:
    """Tests for rollup enable/disable."""

    @pytest.mark.asyncio
    async def test_enable_rollup_creates_category(self, rollup_service) -> None:
        """Enabling rollup should create category if needed."""
        result = await rollup_service.toggle_rollup(enabled=True)

        assert result["success"] is True
        assert result["enabled"] is True
        assert result["category_id"] is not None

    @pytest.mark.asyncio
    async def test_disable_rollup(self, rollup_service) -> None:
        """Disabling rollup should work."""
        # First enable
        await rollup_service.toggle_rollup(enabled=True)

        # Then disable
        result = await rollup_service.toggle_rollup(enabled=False)

        assert result["success"] is True
        assert result["enabled"] is False

    @pytest.mark.asyncio
    async def test_enable_rollup_unconfigured_fails(self, rollup_service) -> None:
        """Enabling rollup without configuration should fail."""
        rollup_service.state_manager.state.is_configured = MagicMock(return_value=False)

        result = await rollup_service.toggle_rollup(enabled=True)

        assert result["success"] is False
        assert "not configured" in result["error"].lower()


class TestAddToRollup:
    """Tests for adding items to rollup."""

    @pytest.mark.asyncio
    async def test_add_item_to_rollup(self, rollup_service) -> None:
        """Should add item to rollup."""
        # Setup recurring item
        test_item = RecurringItem(
            id="item-1",
            name="Netflix",
            merchant_id=None,
            logo_url=None,
            amount=15.99,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )
        rollup_service.recurring_service.items = [test_item]

        result = await rollup_service.add_to_rollup("item-1")

        assert result["success"] is True
        assert result["item_id"] == "item-1"
        assert "item-1" in rollup_service.state_manager.state.rollup.item_ids

    @pytest.mark.asyncio
    async def test_add_nonexistent_item_fails(self, rollup_service) -> None:
        """Adding nonexistent item should fail."""
        rollup_service.recurring_service.items = []

        result = await rollup_service.add_to_rollup("nonexistent")

        assert result["success"] is False
        assert "not found" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_add_duplicate_item_succeeds(self, rollup_service) -> None:
        """Adding already-added item should succeed gracefully."""
        test_item = RecurringItem(
            id="item-1",
            name="Netflix",
            merchant_id=None,
            logo_url=None,
            amount=15.99,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )
        rollup_service.recurring_service.items = [test_item]

        # Add once
        await rollup_service.add_to_rollup("item-1")

        # Add again
        result = await rollup_service.add_to_rollup("item-1")

        assert result["success"] is True
        assert "already in rollup" in result.get("message", "").lower()


class TestRemoveFromRollup:
    """Tests for removing items from rollup."""

    @pytest.mark.asyncio
    async def test_remove_item_from_rollup(self, rollup_service) -> None:
        """Should remove item from rollup."""
        test_item = RecurringItem(
            id="item-1",
            name="Netflix",
            merchant_id=None,
            logo_url=None,
            amount=15.99,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )
        rollup_service.recurring_service.items = [test_item]

        # First add
        await rollup_service.add_to_rollup("item-1")

        # Then remove
        result = await rollup_service.remove_from_rollup("item-1")

        assert result["success"] is True
        assert "item-1" not in rollup_service.state_manager.state.rollup.item_ids

    @pytest.mark.asyncio
    async def test_remove_nonexistent_item_succeeds(self, rollup_service) -> None:
        """Removing non-rollup item should succeed gracefully."""
        result = await rollup_service.remove_from_rollup("nonexistent")

        assert result["success"] is True


class TestSetRollupBudget:
    """Tests for setting rollup budget."""

    @pytest.mark.asyncio
    async def test_set_rollup_budget(self, rollup_service) -> None:
        """Should set rollup budget amount."""
        # Enable rollup first
        rollup_service.state_manager.state.rollup.enabled = True
        rollup_service.state_manager.state.rollup.monarch_category_id = "cat-1"
        rollup_service.category_manager.categories["cat-1"] = {"id": "cat-1", "name": "Rollup"}

        result = await rollup_service.set_rollup_budget(100.0)

        assert result["success"] is True
        assert result["total_budgeted"] == 100.0

    @pytest.mark.asyncio
    async def test_set_budget_disabled_fails(self, rollup_service) -> None:
        """Setting budget when rollup disabled should fail."""
        rollup_service.state_manager.state.rollup.enabled = False

        result = await rollup_service.set_rollup_budget(100.0)

        assert result["success"] is False


class TestUpdateRollupEmoji:
    """Tests for updating rollup emoji."""

    @pytest.mark.asyncio
    async def test_update_rollup_emoji(self, rollup_service) -> None:
        """Should update rollup emoji."""
        rollup_service.state_manager.state.rollup.monarch_category_id = "cat-1"
        rollup_service.category_manager.categories["cat-1"] = {"id": "cat-1", "name": "Rollup"}

        result = await rollup_service.update_rollup_emoji("🎉")

        assert result["success"] is True
        assert result["emoji"] == "🎉"

    @pytest.mark.asyncio
    async def test_update_emoji_no_category_fails(self, rollup_service) -> None:
        """Updating emoji without category should fail."""
        rollup_service.state_manager.state.rollup.monarch_category_id = None

        result = await rollup_service.update_rollup_emoji("🎉")

        assert result["success"] is False


class TestUpdateRollupName:
    """Tests for updating rollup category name."""

    @pytest.mark.asyncio
    async def test_update_rollup_name(self, rollup_service) -> None:
        """Should update rollup category name."""
        rollup_service.state_manager.state.rollup.monarch_category_id = "cat-1"
        rollup_service.category_manager.categories["cat-1"] = {"id": "cat-1", "name": "Old Name"}

        result = await rollup_service.update_rollup_category_name("New Rollup Name")

        assert result["success"] is True
        assert result["category_name"] == "New Rollup Name"


class TestLinkRollupToCategory:
    """Tests for linking rollup to existing category."""

    @pytest.mark.asyncio
    async def test_link_to_existing_category(self, rollup_service) -> None:
        """Should link rollup to existing category."""
        # Setup existing category
        rollup_service.category_manager.categories["existing-cat"] = {
            "id": "existing-cat",
            "name": "Existing Category",
        }
        rollup_service.category_manager.budgets["existing-cat"] = 50.0

        result = await rollup_service.link_rollup_to_category("existing-cat")

        assert result["success"] is True
        assert result["category_id"] == "existing-cat"
        assert result["is_linked"] is True
        assert result["planned_budget"] == 50.0

    @pytest.mark.asyncio
    async def test_link_to_nonexistent_fails(self, rollup_service) -> None:
        """Linking to nonexistent category should fail."""
        result = await rollup_service.link_rollup_to_category("nonexistent")

        assert result["success"] is False
        assert "not found" in result["error"].lower()


class TestCreateRollupCategory:
    """Tests for explicitly creating rollup category."""

    @pytest.mark.asyncio
    async def test_create_rollup_category(self, rollup_service) -> None:
        """Should create rollup category."""
        result = await rollup_service.create_rollup_category(budget=75)

        assert result["success"] is True
        assert result["category_id"] is not None
        assert result["budget"] == 75

    @pytest.mark.asyncio
    async def test_create_category_unconfigured_fails(self, rollup_service) -> None:
        """Creating category without configuration should fail."""
        rollup_service.state_manager.state.is_configured = MagicMock(return_value=False)

        result = await rollup_service.create_rollup_category()

        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_create_category_already_exists(self, rollup_service) -> None:
        """Should succeed if category already exists."""
        rollup_service.state_manager.state.rollup.monarch_category_id = "existing-cat"

        result = await rollup_service.create_rollup_category()

        assert result["success"] is True
        assert "already exists" in result.get("message", "").lower()


class TestGetRollupData:
    """Tests for getting rollup data."""

    @pytest.mark.asyncio
    async def test_get_rollup_data_empty(self, rollup_service) -> None:
        """Should return empty rollup data."""
        result = await rollup_service.get_rollup_data()

        assert result["enabled"] is True
        assert result["items"] == []
        assert result["total_ideal_rate"] == 0
        assert result["total_target"] == 0

    @pytest.mark.asyncio
    async def test_get_rollup_data_with_items(self, rollup_service) -> None:
        """Should aggregate data for rollup items."""
        # Setup items
        item1 = RecurringItem(
            id="item-1",
            name="Netflix",
            merchant_id=None,
            logo_url=None,
            amount=15.99,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )
        item2 = RecurringItem(
            id="item-2",
            name="Spotify",
            merchant_id=None,
            logo_url=None,
            amount=9.99,
            frequency=Frequency.MONTHLY,
            next_due_date=date.today(),
        )
        rollup_service.recurring_service.items = [item1, item2]
        rollup_service.state_manager.state.rollup.item_ids = {"item-1", "item-2"}
        rollup_service.state_manager.state.rollup.enabled = True
        rollup_service.state_manager.state.rollup.monarch_category_id = "cat-1"
        rollup_service.category_manager.categories["cat-1"] = {"id": "cat-1", "name": "Rollup"}
        rollup_service.category_manager.balances["cat-1"] = 25.0

        result = await rollup_service.get_rollup_data()

        assert result["enabled"] is True
        assert len(result["items"]) == 2
        assert result["total_target"] == pytest.approx(25.98, rel=0.01)  # 15.99 + 9.99
        assert result["total_saved"] == 25.0
