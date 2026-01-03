"""
Tests for the StateManager service.

Tests cover:
- State loading and saving
- Configuration management
- Default state behavior
"""

import json
from pathlib import Path

from state.state_manager import (
    CategoryState,
    RollupState,
    StateManager,
    TrackerState,
)


class TestStateManagerBasics:
    """Basic StateManager operations."""

    def test_load_empty_state(
        self, state_manager: StateManager, temp_state_file: Path
    ) -> None:
        """Loading non-existent file should return default state."""
        state = state_manager.load()

        assert state.target_group_id is None
        assert state.target_group_name is None
        assert not state.is_configured()
        assert len(state.categories) == 0

    def test_save_and_load_state(
        self, state_manager: StateManager, configured_state: TrackerState
    ) -> None:
        """Should save and load state correctly."""
        state_manager.save(configured_state)
        loaded = state_manager.load()

        assert loaded.target_group_id == configured_state.target_group_id
        assert loaded.target_group_name == configured_state.target_group_name
        assert loaded.is_configured()

    def test_atomic_write(
        self, state_manager: StateManager, configured_state: TrackerState
    ) -> None:
        """Save should be atomic (file exists after save)."""
        state_manager.save(configured_state)

        assert state_manager.state_file.exists()
        # Verify it's valid JSON
        with open(state_manager.state_file) as f:
            data = json.load(f)
        assert data["target_group_id"] == configured_state.target_group_id


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


class TestStateManagerEdgeCases:
    """Edge cases and error handling."""

    def test_load_corrupted_file(
        self, state_manager: StateManager, temp_state_file: Path
    ) -> None:
        """Loading corrupted file should return default state."""
        # Write invalid JSON
        temp_state_file.parent.mkdir(parents=True, exist_ok=True)
        with open(temp_state_file, "w") as f:
            f.write("{ invalid json }")

        state = state_manager.load()

        # Should return default state
        assert not state.is_configured()
        # Backup should be created
        backup = temp_state_file.with_suffix(".json.bak")
        assert backup.exists()

    def test_categories_dict_operations(
        self, configured_state: TrackerState
    ) -> None:
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

    def test_enabled_items_set_operations(
        self, configured_state: TrackerState
    ) -> None:
        """Enabled items set should support standard operations."""
        # Check membership
        assert "recurring-001" in configured_state.enabled_items

        # Add new
        configured_state.enabled_items.add("recurring-002")
        assert "recurring-002" in configured_state.enabled_items

        # Remove
        configured_state.enabled_items.discard("recurring-001")
        assert "recurring-001" not in configured_state.enabled_items
