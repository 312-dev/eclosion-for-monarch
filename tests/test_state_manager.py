"""
Tests for the StateManager service.

Tests cover:
- State loading and saving
- Configuration management
- Default state behavior
"""

from state import (
    CategoryState,
    RollupState,
    StateManager,
    TrackerState,
)


class TestStateManagerBasics:
    """Basic StateManager operations."""

    def test_load_empty_state(self, state_manager: StateManager) -> None:
        """Loading empty database should return default state."""
        state = state_manager.load()

        assert state.target_group_id is None
        assert state.target_group_name is None
        assert not state.is_configured()
        assert len(state.categories) == 0

    def test_update_config_and_load(self, state_manager: StateManager) -> None:
        """Should update config and load state correctly."""
        state_manager.update_config("group-123", "Test Group")
        loaded = state_manager.load()

        assert loaded.target_group_id == "group-123"
        assert loaded.target_group_name == "Test Group"
        assert loaded.is_configured()


class TestTrackerStateConfiguration:
    """Configuration-related operations."""

    def test_is_configured_false(self, empty_state: TrackerState) -> None:
        """Empty state should not be configured."""
        assert not empty_state.is_configured()

    def test_is_configured_true(self, configured_state: TrackerState) -> None:
        """State with group_id should be configured."""
        assert configured_state.is_configured()

    def test_is_item_enabled(self, configured_state: TrackerState) -> None:
        """Should correctly report enabled items."""
        assert configured_state.is_item_enabled("recurring-001")
        assert not configured_state.is_item_enabled("recurring-999")


class TestCategoryState:
    """CategoryState dataclass tests."""

    def test_category_state_defaults(self) -> None:
        """CategoryState should have sensible defaults."""
        cat = CategoryState(
            monarch_category_id="cat-001",
            name="Test",
            target_amount=10.0,
        )

        assert cat.over_contribution == 0.0
        assert cat.previous_due_date is None
        assert cat.is_active is True
        assert cat.emoji == "🔄"
        assert cat.sync_name is True
        assert cat.is_linked is False


class TestRollupState:
    """RollupState dataclass tests."""

    def test_rollup_state_defaults(self) -> None:
        """RollupState should have sensible defaults."""
        rollup = RollupState()

        assert rollup.enabled is False
        assert rollup.monarch_category_id is None
        assert rollup.category_name == "Recurring Rollup"
        assert rollup.total_budgeted == 0.0
        assert rollup.emoji == "🔄"
        assert len(rollup.item_ids) == 0


class TestStateManagerOperations:
    """StateManager operations tests."""

    def test_categories_dict_operations(self, configured_state: TrackerState) -> None:
        """Categories dict should support standard operations."""
        # Get existing
        cat = configured_state.categories.get("recurring-001")
        assert cat is not None
        assert cat.name == "Netflix"

        # Get non-existing
        assert configured_state.categories.get("non-existent") is None

        # Add new
        configured_state.categories["recurring-002"] = CategoryState(
            monarch_category_id="cat-002",
            name="Spotify",
            target_amount=9.99,
        )
        assert len(configured_state.categories) == 2

    def test_enabled_items_set_operations(self, configured_state: TrackerState) -> None:
        """Enabled items set should support standard operations."""
        # Check membership
        assert "recurring-001" in configured_state.enabled_items

        # Add new
        configured_state.enabled_items.add("recurring-002")
        assert "recurring-002" in configured_state.enabled_items

        # Remove
        configured_state.enabled_items.discard("recurring-001")
        assert "recurring-001" not in configured_state.enabled_items

    def test_toggle_item_enabled(self, state_manager: StateManager) -> None:
        """Should enable and disable items correctly."""
        # Enable an item
        state_manager.toggle_item_enabled("test-item", True)
        state = state_manager.load()
        assert "test-item" in state.enabled_items

        # Disable the item
        state_manager.toggle_item_enabled("test-item", False)
        state = state_manager.load()
        assert "test-item" not in state.enabled_items


class TestFrozenTargetPersistence:
    """Tests for frozen target persistence, including rollup items."""

    def test_set_frozen_target_creates_category_for_rollup_items(
        self, state_manager: StateManager
    ) -> None:
        """set_frozen_target should create category entry for rollup items.

        Rollup items use keys like 'rollup_item-123' which don't exist in
        state.categories. The fix ensures these are created automatically
        so frozen targets persist across fetches.
        """
        rollup_key = "rollup_item-netflix"

        # Set frozen target for rollup item (key doesn't exist yet)
        state_manager.set_frozen_target(
            recurring_id=rollup_key,
            frozen_target=50.0,
            target_month="2026-01",
            balance_at_start=100.0,
            amount=600.0,
            frequency_months=12.0,
        )

        # Verify we can retrieve the frozen target
        result = state_manager.get_frozen_target(rollup_key)
        assert result is not None
        assert result["frozen_monthly_target"] == 50.0
        assert result["target_month"] == "2026-01"
        assert result["balance_at_month_start"] == 100.0
        assert result["frozen_amount"] == 600.0
        assert result["frozen_frequency_months"] == 12.0

    def test_frozen_target_persists_across_loads(self, state_manager: StateManager) -> None:
        """Frozen target should persist when state is saved and reloaded."""
        rollup_key = "rollup_item-spotify"

        # Set frozen target
        state_manager.set_frozen_target(
            recurring_id=rollup_key,
            frozen_target=10.0,
            target_month="2026-01",
            balance_at_start=0.0,
            amount=120.0,
            frequency_months=12.0,
        )

        # Create new state manager to simulate app restart (uses same DB)
        new_manager = StateManager()

        # Verify frozen target persisted
        result = new_manager.get_frozen_target(rollup_key)
        assert result is not None
        assert result["frozen_monthly_target"] == 10.0

    def test_set_frozen_target_for_existing_category(self, state_manager: StateManager) -> None:
        """set_frozen_target should work for existing categories."""
        # First create the category via update_category
        state_manager.update_category(
            recurring_id="recurring-001",
            monarch_category_id="cat-001",
            name="Netflix",
            target_amount=15.99,
            due_date="2025-02-15",
        )

        # Set frozen target for existing category
        state_manager.set_frozen_target(
            recurring_id="recurring-001",
            frozen_target=16.0,
            target_month="2026-01",
            balance_at_start=0.0,
            amount=15.99,
            frequency_months=1.0,
        )

        result = state_manager.get_frozen_target("recurring-001")
        assert result is not None
        assert result["frozen_monthly_target"] == 16.0
