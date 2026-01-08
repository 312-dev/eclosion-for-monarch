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

from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from services.transaction_categorizer import TransactionCategorizerService
from state.state_manager import (
    CategoryState,
    RollupState,
    StateManager,
    TrackerState,
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


@pytest.fixture
def state_with_auto_categorize_enabled(state_manager: StateManager) -> TrackerState:
    """Provide a state with auto-categorize enabled and tracked items."""
    state = TrackerState(
        target_group_id="group-123",
        target_group_name="Subscriptions",
        auto_categorize_enabled=True,
    )

    # Add a tracked category
    state.categories["recurring-001"] = CategoryState(
        monarch_category_id="cat-001",
        name="Netflix",
        target_amount=15.99,
    )
    state.enabled_items.add("recurring-001")

    state_manager.save(state)
    return state


@pytest.fixture
def state_with_rollup(state_manager: StateManager) -> TrackerState:
    """Provide a state with rollup enabled and items in rollup."""
    state = TrackerState(
        target_group_id="group-123",
        target_group_name="Subscriptions",
        auto_categorize_enabled=True,
    )

    # Add rollup with items
    state.rollup = RollupState(
        enabled=True,
        monarch_category_id="rollup-cat-001",
        category_name="Small Subscriptions",
        item_ids={"rollup-item-001", "rollup-item-002"},
        total_budgeted=25.99,
    )

    state_manager.save(state)
    return state


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
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=False,
        )
        state_manager.save(state)

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
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=False,
        )
        state.categories["recurring-001"] = CategoryState(
            monarch_category_id="cat-001",
            name="Netflix",
            target_amount=15.99,
        )
        state_manager.save(state)

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
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=True,
        )
        # No categories or rollup items
        state_manager.save(state)

        service = TransactionCategorizerService(state_manager)

        result = await service.auto_categorize_new_transactions()

        assert result["success"] is True
        assert result["categorized_count"] == 0
        assert result["skipped_count"] == 0
        assert result["reason"] == "no_tracked_items"
        assert len(result["errors"]) == 0

    async def test_categories_without_monarch_id_returns_no_tracked_items(
        self, state_manager: StateManager
    ) -> None:
        """Categories without monarch_category_id should not count as tracked."""
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=True,
        )
        # Category exists but without monarch_category_id (None)
        state.categories["recurring-001"] = CategoryState(
            monarch_category_id=None,  # type: ignore[arg-type]
            name="Netflix",
            target_amount=15.99,
        )
        state_manager.save(state)

        service = TransactionCategorizerService(state_manager)

        result = await service.auto_categorize_new_transactions()

        assert result["reason"] == "no_tracked_items"

    async def test_rollup_disabled_with_items_returns_no_tracked_items(
        self, state_manager: StateManager
    ) -> None:
        """When rollup is disabled, its items should not be tracked."""
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=True,
        )
        # Rollup with items but disabled
        state.rollup = RollupState(
            enabled=False,
            monarch_category_id="rollup-cat-001",
            item_ids={"rollup-item-001"},
        )
        state_manager.save(state)

        service = TransactionCategorizerService(state_manager)

        result = await service.auto_categorize_new_transactions()

        assert result["reason"] == "no_tracked_items"


# ============================================================================
# Test: Successful Categorization
# ============================================================================


class TestSuccessfulCategorization:
    """Tests for successful transaction categorization."""

    async def test_categorizes_matching_transaction(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should categorize transaction matching a tracked stream."""
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
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=True,
        )
        state.categories["recurring-001"] = CategoryState(
            monarch_category_id="cat-001",
            name="Netflix",
            target_amount=15.99,
        )
        state.categories["recurring-002"] = CategoryState(
            monarch_category_id="cat-002",
            name="Spotify",
            target_amount=9.99,
        )
        state_manager.save(state)

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
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should skip transactions already in the target category."""
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

    async def test_mixed_correct_and_incorrect_categories(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should categorize incorrect and skip correct transactions."""
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    # Already correct
                    make_transaction("txn-001", "recurring-001", "cat-001"),
                    # Needs categorization
                    make_transaction("txn-002", "recurring-001", "other-cat"),
                    # Also already correct
                    make_transaction("txn-003", "recurring-001", "cat-001"),
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
        assert result["skipped_count"] == 2
        assert mock_mm.update_transaction.call_count == 1


# ============================================================================
# Test: Transaction with No Recurring Stream ID
# ============================================================================


class TestNoRecurringStreamId:
    """Tests for transactions without a recurring stream ID."""

    async def test_ignores_transaction_without_stream_id(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should ignore transactions without a recurring stream ID."""
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction("txn-001", stream_id=None, current_category_id="cat-001")
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
        assert result["skipped_count"] == 0
        mock_mm.update_transaction.assert_not_called()

    async def test_ignores_transaction_with_empty_merchant(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should handle transactions with empty merchant gracefully."""
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    {
                        "id": "txn-001",
                        "merchant": {},  # No recurringTransactionStream key
                        "category": {"id": "cat-001"},
                    }
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
        mock_mm.update_transaction.assert_not_called()


# ============================================================================
# Test: Transaction for Untracked Stream
# ============================================================================


class TestUntrackedStream:
    """Tests for transactions belonging to untracked streams."""

    async def test_ignores_transaction_for_untracked_stream(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should ignore transactions for streams we're not tracking."""
        # Transaction has a stream ID that's not in our tracked items
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction(
                        "txn-001",
                        stream_id="untracked-stream-999",
                        current_category_id="some-cat",
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
        assert result["skipped_count"] == 0
        mock_mm.update_transaction.assert_not_called()


# ============================================================================
# Test: Error Handling
# ============================================================================


class TestErrorHandling:
    """Tests for error handling during categorization."""

    async def test_handles_update_transaction_failure(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should handle update_transaction failures gracefully."""
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [make_transaction("txn-001", "recurring-001", "other-cat")]
            }
        }

        # Make update_transaction raise an exception
        mock_mm.update_transaction.side_effect = Exception("API error")

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions()

        assert result["success"] is False
        assert result["categorized_count"] == 0
        assert len(result["errors"]) == 1
        assert result["errors"][0]["transaction_id"] == "txn-001"
        assert result["errors"][0]["stream_id"] == "recurring-001"
        assert "API error" in result["errors"][0]["error"]

    async def test_continues_after_single_failure(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should continue categorizing other transactions after one fails."""
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction("txn-001", "recurring-001", "other-cat"),
                    make_transaction("txn-002", "recurring-001", "other-cat"),
                ]
            }
        }

        # First call fails, second succeeds
        mock_mm.update_transaction.side_effect = [
            Exception("First fails"),
            {"success": True},
        ]

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions()

        # One succeeded, one failed
        assert result["categorized_count"] == 1
        assert len(result["errors"]) == 1
        assert result["success"] is False  # Has errors

    async def test_handles_get_transactions_failure(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should handle get_transactions failure gracefully."""
        mock_mm.get_transactions.side_effect = Exception("Network error")

        service = TransactionCategorizerService(state_manager)

        with (
            patch("services.transaction_categorizer.get_mm", return_value=mock_mm),
            patch(
                "services.transaction_categorizer.retry_with_backoff",
                side_effect=mock_retry_with_backoff,
            ),
        ):
            result = await service.auto_categorize_new_transactions()

        assert result["success"] is False
        assert result["categorized_count"] == 0
        assert len(result["errors"]) == 1
        assert "Network error" in result["errors"][0]["error"]


# ============================================================================
# Test: Rollup Items Categorization
# ============================================================================


class TestRollupItemsCategorization:
    """Tests for categorizing rollup items."""

    async def test_rollup_items_map_to_rollup_category(
        self,
        state_manager: StateManager,
        state_with_rollup: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Rollup items should be categorized to the rollup category."""
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

    async def test_multiple_rollup_items_all_use_rollup_category(
        self,
        state_manager: StateManager,
        state_with_rollup: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Multiple rollup items should all categorize to the same rollup category."""
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction("txn-001", "rollup-item-001", "other-cat"),
                    make_transaction("txn-002", "rollup-item-002", "other-cat"),
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

        assert result["categorized_count"] == 2

        # Both should use rollup category
        for call in mock_mm.update_transaction.call_args_list:
            assert call[1]["category_id"] == "rollup-cat-001"

    async def test_mixed_rollup_and_dedicated_categories(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Should correctly route rollup items and dedicated items to their categories."""
        # Setup state with both dedicated category and rollup items
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=True,
        )
        state.categories["dedicated-001"] = CategoryState(
            monarch_category_id="dedicated-cat-001",
            name="Netflix",
            target_amount=15.99,
        )
        state.rollup = RollupState(
            enabled=True,
            monarch_category_id="rollup-cat-001",
            item_ids={"rollup-item-001"},
        )
        state_manager.save(state)

        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction("txn-001", "dedicated-001", "other-cat"),
                    make_transaction("txn-002", "rollup-item-001", "other-cat"),
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

        assert result["categorized_count"] == 2

        # Check each call used the correct category
        calls = mock_mm.update_transaction.call_args_list
        call_categories = {c[0][0]: c[1]["category_id"] for c in calls}

        assert call_categories["txn-001"] == "dedicated-cat-001"
        assert call_categories["txn-002"] == "rollup-cat-001"


# ============================================================================
# Test: State Update After Run
# ============================================================================


class TestStateUpdateAfterRun:
    """Tests for state updates after categorization run."""

    async def test_updates_last_auto_categorize_date(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should update last_auto_categorize_date after successful run."""
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

    async def test_uses_last_run_date_for_query(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Should use last_auto_categorize_date as start date for transaction query."""
        last_run = "2026-01-01"
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=True,
            last_auto_categorize_date=last_run,
        )
        state.categories["recurring-001"] = CategoryState(
            monarch_category_id="cat-001",
            name="Netflix",
            target_amount=15.99,
        )
        state_manager.save(state)

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

        # Check the call to get_transactions used the correct start_date
        call_kwargs = mock_mm.get_transactions.call_args[1]
        assert call_kwargs["start_date"] == last_run

    async def test_defaults_to_7_days_lookback(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Without a last run date, should look back 7 days."""
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=True,
            last_auto_categorize_date=None,  # No previous run
        )
        state.categories["recurring-001"] = CategoryState(
            monarch_category_id="cat-001",
            name="Netflix",
            target_amount=15.99,
        )
        state_manager.save(state)

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

        # Should use 7 days ago as start
        expected_start = (date.today() - timedelta(days=7)).isoformat()
        call_kwargs = mock_mm.get_transactions.call_args[1]
        assert call_kwargs["start_date"] == expected_start


# ============================================================================
# Test: Edge Cases
# ============================================================================


class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""

    async def test_transaction_without_id_is_skipped(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Transactions without an ID should be skipped."""
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    {
                        "id": None,  # No ID
                        "merchant": {"recurringTransactionStream": {"id": "recurring-001"}},
                        "category": {"id": "other-cat"},
                    }
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

        assert result["categorized_count"] == 0
        mock_mm.update_transaction.assert_not_called()

    async def test_transaction_with_null_category(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Transactions with null category should be categorized."""
        mock_mm.get_transactions.return_value = {
            "allTransactions": {
                "results": [
                    make_transaction(
                        "txn-001",
                        stream_id="recurring-001",
                        current_category_id=None,  # No current category
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

        assert result["categorized_count"] == 1
        mock_mm.update_transaction.assert_called_once()

    async def test_empty_transactions_result(
        self,
        state_manager: StateManager,
        state_with_auto_categorize_enabled: TrackerState,
        mock_mm: AsyncMock,
    ) -> None:
        """Should handle empty transaction results gracefully."""
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

    async def test_rollup_without_category_id_not_tracked(
        self,
        state_manager: StateManager,
        mock_mm: AsyncMock,
    ) -> None:
        """Rollup without monarch_category_id should not track items."""
        state = TrackerState(
            target_group_id="group-123",
            auto_categorize_enabled=True,
        )
        state.rollup = RollupState(
            enabled=True,
            monarch_category_id=None,  # No category ID
            item_ids={"rollup-item-001"},
        )
        state_manager.save(state)

        service = TransactionCategorizerService(state_manager)

        result = await service.auto_categorize_new_transactions()

        assert result["reason"] == "no_tracked_items"
