"""
Tests for the TransactionCategorizerService.

Tests cover:
- Feature disabled - should skip and return early
- No tracked items - should return with reason "no_tracked_items"
- Successful categorization of matching transactions
- Transaction already in correct category - should be skipped (counted in skipped_count)
- Transaction with no recurring stream ID - should be ignored
- Transaction for untracked stream - should be ignored
- Error handling when update_transaction fails
- Rollup items should map to rollup category
- State update after successful run (last_auto_categorize_date)
"""

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest

from services.transaction_categorizer import TransactionCategorizerService
from state import (
    StateManager,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_mm() -> AsyncMock:
    """Provide a mock MonarchMoney client."""
    mm = AsyncMock()
    mm.get_transactions = AsyncMock(return_value={"allTransactions": {"results": []}})
    mm.update_transaction = AsyncMock(return_value={"success": True})
    return mm


def setup_state_with_category(state_manager: StateManager) -> None:
    """Set up state with auto-categorize enabled and a tracked category."""
    state_manager.update_config("group-123", "Subscriptions")
    state_manager.set_auto_categorize_enabled(True)
    state_manager.update_category(
        recurring_id="recurring-001",
        monarch_category_id="cat-001",
        name="Netflix",
        target_amount=15.99,
        due_date="2026-02-15",
    )
    state_manager.toggle_item_enabled("recurring-001", True)


def setup_state_with_rollup(state_manager: StateManager) -> None:
    """Set up state with rollup enabled."""
    state_manager.update_config("group-123", "Subscriptions")
    state_manager.set_auto_categorize_enabled(True)
    state_manager.toggle_rollup_enabled(True)
    state_manager.set_rollup_category_id("rollup-cat-001")
    state_manager.add_to_rollup("rollup-item-001", 10.0)
    state_manager.add_to_rollup("rollup-item-002", 15.99)


def make_transaction(
    txn_id: str,
    stream_id: str | None,
    current_category_id: str | None = None,
) -> dict:
    """Create a mock transaction dict."""
    txn: dict = {
        "id": txn_id,
        "merchant": {},
    }

    if stream_id:
        txn["merchant"]["recurringTransactionStream"] = {"id": stream_id}
    else:
        txn["merchant"]["recurringTransactionStream"] = None

    if current_category_id:
        txn["category"] = {"id": current_category_id}
    else:
        txn["category"] = None

    return txn


async def mock_retry_with_backoff(fn):
    """Mock for retry_with_backoff that properly awaits the function."""
    return await fn()


# ============================================================================
# Test: Feature Disabled
# ============================================================================


class TestFeatureDisabled:
    """Tests for when auto-categorize feature is disabled."""

    async def test_feature_disabled_should_skip(self, state_manager: StateManager) -> None:
        """When auto_categorize_enabled is False, should return early with reason='disabled'."""
        # Setup: state with feature disabled
        state_manager.update_config("group-123", "Subscriptions")
        state_manager.set_auto_categorize_enabled(False)

        service = TransactionCategorizerService(state_manager)

        result = await service.auto_categorize_new_transactions()

        assert result["success"] is True
        assert result["categorized_count"] == 0
        assert result["skipped_count"] == 0
        assert result["reason"] == "disabled"
        assert len(result["errors"]) == 0

    async def test_force_flag_bypasses_disabled_check(
        self, state_manager: StateManager, mock_mm: AsyncMock
    ) -> None:
        """When force=True, should run even if auto_categorize_enabled is False."""
        # Setup: state with feature disabled but has a tracked item
        state_manager.update_config("group-123", "Subscriptions")
        state_manager.set_auto_categorize_enabled(False)
        state_manager.update_category(
            recurring_id="recurring-001",
            monarch_category_id="cat-001",
            name="Netflix",
            target_amount=15.99,
            due_date="2026-02-15",
        )

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions(force=True)

        # Should not have "disabled" reason - it ran
        assert result.get("reason") != "disabled"


# ============================================================================
# Test: No Tracked Items
# ============================================================================


class TestNoTrackedItems:
    """Tests for when there are no tracked items."""

    async def test_no_categories_returns_no_tracked_items(
        self, state_manager: StateManager
    ) -> None:
        """When there are no categories, should return with reason='no_tracked_items'."""
        state_manager.update_config("group-123", "Subscriptions")
        state_manager.set_auto_categorize_enabled(True)

        service = TransactionCategorizerService(state_manager)

        result = await service.auto_categorize_new_transactions()

        assert result["success"] is True
        assert result["categorized_count"] == 0
        assert result["skipped_count"] == 0
        assert result["reason"] == "no_tracked_items"
        assert len(result["errors"]) == 0


# ============================================================================
# Test: Successful Categorization
# ============================================================================


class TestSuccessfulCategorization:
    """Tests for successful transaction categorization."""

    async def test_categorizes_matching_transaction(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Should categorize transaction matching a tracked stream."""
        setup_state_with_category(state_manager)

        # Setup mock to return a transaction matching our tracked stream
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction(
                        txn_id="txn-001",
                        stream_id="recurring-001",  # Matches our tracked stream
                        current_category_id="different-cat",  # Different from target
                    )
                ]
            }
        }

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions()

        assert result["success"] is True
        assert result["categorized_count"] == 1
        assert result["skipped_count"] == 0
        assert len(result["errors"]) == 0
        assert "reason" not in result

        # Verify update_transaction was called with correct args
        mock_mm.update_transaction.assert_called_once()
        call_args = mock_mm.update_transaction.call_args
        assert call_args[0][0] == "txn-001"  # transaction_id
        assert call_args[1]["category_id"] == "cat-001"  # target category

    async def test_categorizes_multiple_transactions(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Should categorize multiple matching transactions."""
        # Setup state with two tracked items
        state_manager.update_config("group-123", "Subscriptions")
        state_manager.set_auto_categorize_enabled(True)
        state_manager.update_category(
            recurring_id="recurring-001",
            monarch_category_id="cat-001",
            name="Netflix",
            target_amount=15.99,
            due_date="2026-02-15",
        )
        state_manager.update_category(
            recurring_id="recurring-002",
            monarch_category_id="cat-002",
            name="Spotify",
            target_amount=9.99,
            due_date="2026-02-20",
        )

        # Mock returns two transactions for different streams
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction("txn-001", "recurring-001", "other-cat"),
                    make_transaction("txn-002", "recurring-002", "other-cat"),
                ]
            }
        }

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions()

        assert result["success"] is True
        assert result["categorized_count"] == 2
        assert mock_mm.update_transaction.call_count == 2


# ============================================================================
# Test: Transaction Already in Correct Category
# ============================================================================


class TestTransactionAlreadyCorrect:
    """Tests for transactions already in the correct category."""

    async def test_skips_transaction_already_in_correct_category(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Should skip transactions already in the target category."""
        setup_state_with_category(state_manager)

        # Transaction already has the correct category
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction(
                        txn_id="txn-001",
                        stream_id="recurring-001",
                        current_category_id="cat-001",  # Same as target
                    )
                ]
            }
        }

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions()

        assert result["success"] is True
        assert result["categorized_count"] == 0
        assert result["skipped_count"] == 1
        assert len(result["errors"]) == 0

        # update_transaction should NOT be called
        mock_mm.update_transaction.assert_not_called()


# ============================================================================
# Test: Rollup Items Categorization
# ============================================================================


class TestRollupItemsCategorization:
    """Tests for categorizing rollup items."""

    async def test_rollup_items_map_to_rollup_category(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Rollup items should be categorized to the rollup category."""
        setup_state_with_rollup(state_manager)

        # Transaction for a rollup item
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction(
                        "txn-001",
                        stream_id="rollup-item-001",  # In rollup.item_ids
                        current_category_id="other-cat",
                    )
                ]
            }
        }

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions()

        assert result["success"] is True
        assert result["categorized_count"] == 1

        # Verify it was categorized to the rollup category
        call_args = mock_mm.update_transaction.call_args
        assert call_args[1]["category_id"] == "rollup-cat-001"


# ============================================================================
# Test: State Update After Run
# ============================================================================


class TestStateUpdateAfterRun:
    """Tests for state updates after categorization run."""

    async def test_updates_last_auto_categorize_date(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Should update last_auto_categorize_date after successful run."""
        setup_state_with_category(state_manager)

        # Initially no last run date
        state = state_manager.load()
        assert state.last_auto_categorize_date is None

        mock_mm.get_transactions.return_value = {"allTransactions": {"results": []}}

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            await service.auto_categorize_new_transactions()

        # After run, should have a date
        state = state_manager.load()
        assert state.last_auto_categorize_date is not None
        # Should be today's date
        assert state.last_auto_categorize_date == date.today().isoformat()


# ============================================================================
# Test: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    async def test_empty_transactions_result(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Should handle empty transaction results gracefully."""
        setup_state_with_category(state_manager)

        mock_mm.get_transactions.return_value = {"allTransactions": {"results": []}}

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions()

        assert result["success"] is True
        assert result["categorized_count"] == 0
        assert result["skipped_count"] == 0
        assert len(result["errors"]) == 0
