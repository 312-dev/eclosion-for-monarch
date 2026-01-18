"""
Shared pytest fixtures for Eclosion tests.

Provides reusable fixtures including:
- Temporary SQLite database
- Sample data generators
- StateManager instances
"""

from collections.abc import Generator
from pathlib import Path

import pytest

from state import (
    CategoryState,
    StateManager,
    TrackerState,
)

# ============================================================================
# Database Fixtures
# ============================================================================


@pytest.fixture(autouse=True)
def use_test_database(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> Generator[Path, None, None]:
    """
    Use a temporary SQLite database for each test.

    This fixture runs automatically for all tests and:
    1. Points DATABASE_PATH to a temp directory
    2. Resets the database engine singleton
    3. Initializes the database schema
    """
    import state.db.database as db_module

    # Point to temp database
    test_db = tmp_path / "test.db"
    monkeypatch.setattr(db_module, "DATABASE_PATH", test_db)

    # Reset engine singleton so it picks up new path
    db_module._engine = None
    db_module._SessionLocal = None

    # Initialize database schema
    from state.db.models import Base

    engine = db_module.get_engine()
    Base.metadata.create_all(bind=engine)

    yield test_db

    # Cleanup: dispose engine to release file handles
    if db_module._engine:
        db_module._engine.dispose()
        db_module._engine = None
        db_module._SessionLocal = None


@pytest.fixture
def temp_state_dir(tmp_path: Path) -> Generator[Path, None, None]:
    """Provide a temporary directory for state files."""
    state_dir = tmp_path / "state"
    state_dir.mkdir()
    yield state_dir


# ============================================================================
# State Manager Fixtures
# ============================================================================


@pytest.fixture
def state_manager() -> StateManager:
    """Provide a StateManager that uses the test database."""
    return StateManager()


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
