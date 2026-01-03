"""
Shared pytest fixtures for Eclosion tests.

Provides reusable fixtures including:
- Temporary state files
- Sample data generators
- StateManager instances
- SavingsCalculator instances
"""

from collections.abc import Generator
from pathlib import Path

import pytest

from services.savings_calculator import SavingsCalculator
from state.state_manager import (
    CategoryState,
    StateManager,
    TrackerState,
)

# ============================================================================
# Temporary File Fixtures
# ============================================================================


@pytest.fixture
def temp_state_dir(tmp_path: Path) -> Generator[Path, None, None]:
    """Provide a temporary directory for state files."""
    state_dir = tmp_path / "state"
    state_dir.mkdir()
    yield state_dir


@pytest.fixture
def temp_state_file(temp_state_dir: Path) -> Path:
    """Provide a path for a temporary state file."""
    return temp_state_dir / "tracker_state.json"


# ============================================================================
# State Manager Fixtures
# ============================================================================


@pytest.fixture
def state_manager(temp_state_file: Path) -> StateManager:
    """Provide a StateManager with a temporary state file."""
    return StateManager(state_file=temp_state_file)


@pytest.fixture
def empty_state() -> TrackerState:
    """Provide an empty/default TrackerState."""
    return TrackerState()


@pytest.fixture
def configured_state() -> TrackerState:
    """Provide a pre-configured TrackerState with sample data."""
    state = TrackerState(
        target_group_id="group-123",
        target_group_name="Subscriptions",
        auto_sync_new=False,
        auto_update_targets=True,
    )

    # Add a sample category
    state.categories["recurring-001"] = CategoryState(
        monarch_category_id="cat-001",
        name="Netflix",
        target_amount=15.99,
        over_contribution=0.0,
        previous_due_date="2025-02-15",
        is_active=True,
        emoji="🎬",
    )
    state.enabled_items.add("recurring-001")

    return state


# ============================================================================
# Calculator Fixtures
# ============================================================================


@pytest.fixture
def savings_calculator() -> SavingsCalculator:
    """Provide a SavingsCalculator instance."""
    return SavingsCalculator()
