"""
Transaction Categorizer Service

Automatically categorizes new transactions matching tracked recurring streams
to their corresponding Monarch categories.
"""

import logging
import os
import sys
from datetime import date, timedelta
from typing import Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from monarch_utils import get_mm, retry_with_backoff
from state.state_manager import StateManager, TrackerState

logger = logging.getLogger(__name__)

# Rate limit: max transactions to categorize per sync to avoid API limits
MAX_CATEGORIZATIONS_PER_SYNC = 50


class TransactionCategorizerService:
    """
    Auto-categorizes transactions matching tracked recurring streams.

    When enabled, this service:
    1. Fetches recent transactions that are part of recurring streams
    2. Matches them to tracked recurring items in state
    3. Updates their category to the corresponding tracking category
    """

    def __init__(self, state_manager: StateManager):
        self.state_manager = state_manager

    def _build_stream_to_category_mapping(self, state: TrackerState) -> dict[str, str]:
        """Build mapping from recurring stream ID to Monarch category ID."""
        stream_to_category: dict[str, str] = {}

        # Add dedicated category mappings
        for recurring_id, cat_state in state.categories.items():
            if cat_state.monarch_category_id:
                stream_to_category[recurring_id] = cat_state.monarch_category_id

        # Add rollup items - they all map to the rollup category
        if state.rollup.enabled and state.rollup.monarch_category_id:
            for item_id in state.rollup.item_ids:
                stream_to_category[item_id] = state.rollup.monarch_category_id

        return stream_to_category

    def _get_date_range(self, state: TrackerState) -> tuple[str, str]:
        """Determine date range for fetching transactions."""
        if state.last_auto_categorize_date:
            start_date = state.last_auto_categorize_date
        else:
            start_date = (date.today() - timedelta(days=7)).isoformat()

        end_date = date.today().isoformat()
        return start_date, end_date

    def _get_stream_id(self, txn: dict[str, Any]) -> str | None:
        """Extract recurring stream ID from transaction with defensive checks."""
        merchant = txn.get("merchant") or {}
        recurring_stream = merchant.get("recurringTransactionStream") or {}

        if isinstance(recurring_stream, dict):
            return recurring_stream.get("id")
        return None

    def _should_skip_transaction(self, txn: dict[str, Any]) -> tuple[bool, str]:
        """
        Check if transaction should be skipped.

        Returns:
            tuple of (should_skip, reason)
        """
        if not txn.get("id"):
            return True, "no_id"

        # Skip split transactions
        if txn.get("isSplitTransaction") or txn.get("splitTransactions"):
            return True, "split_transaction"

        return False, ""

    def _get_current_category_id(self, txn: dict[str, Any]) -> str | None:
        """Extract current category ID from transaction."""
        current_category = txn.get("category") or {}
        if isinstance(current_category, dict):
            return current_category.get("id")
        return None

    async def _categorize_transaction(
        self,
        mm: Any,
        txn_id: str,
        stream_id: str,
        target_category_id: str,
    ) -> dict[str, Any] | None:
        """
        Categorize a single transaction.

        Returns:
            Error dict if failed, None if successful
        """
        try:
            await retry_with_backoff(
                lambda tid=txn_id, cid=target_category_id: mm.update_transaction(
                    tid, category_id=cid
                )
            )
            logger.info(
                f"[AUTO-CATEGORIZE] Categorized transaction {txn_id} "
                f"(stream: {stream_id}) to category {target_category_id}"
            )
            return None
        except Exception as e:
            logger.warning(f"[AUTO-CATEGORIZE] Failed to categorize transaction {txn_id}: {e}")
            return {
                "transaction_id": txn_id,
                "stream_id": stream_id,
                "error": str(e),
            }

    def _get_categorization_target(
        self,
        txn: dict[str, Any],
        stream_to_category: dict[str, str],
    ) -> tuple[str, str, str] | None:
        """
        Determine if a transaction needs categorization.

        Returns:
            tuple of (txn_id, stream_id, target_category_id) if needs categorization,
            None if should be skipped
        """
        # Check if should skip
        should_skip, reason = self._should_skip_transaction(txn)
        if should_skip:
            if reason == "split_transaction":
                logger.debug(f"[AUTO-CATEGORIZE] Skipping split transaction {txn.get('id')}")
            return None

        txn_id = txn["id"]
        stream_id = self._get_stream_id(txn)

        if not stream_id:
            logger.debug(f"[AUTO-CATEGORIZE] Transaction {txn_id} has no recurring stream ID")
            return None

        # Check if this stream is tracked
        target_category_id = stream_to_category.get(stream_id)
        if not target_category_id:
            return None

        return txn_id, stream_id, target_category_id

    async def _process_transactions(
        self,
        mm: Any,
        transactions: list[dict[str, Any]],
        stream_to_category: dict[str, str],
    ) -> tuple[int, int, list[dict[str, Any]]]:
        """
        Process a batch of transactions for categorization.

        Returns:
            tuple of (categorized_count, skipped_count, errors)
        """
        categorized_count = 0
        skipped_count = 0
        errors: list[dict[str, Any]] = []

        for txn in transactions:
            # Enforce rate limit
            if categorized_count >= MAX_CATEGORIZATIONS_PER_SYNC:
                logger.info(
                    f"[AUTO-CATEGORIZE] Reached rate limit ({MAX_CATEGORIZATIONS_PER_SYNC}), "
                    "remaining transactions will be processed in next sync"
                )
                break

            # Get categorization target
            target = self._get_categorization_target(txn, stream_to_category)
            if not target:
                continue

            txn_id, stream_id, target_category_id = target

            # Check if already in correct category
            if self._get_current_category_id(txn) == target_category_id:
                skipped_count += 1
                continue

            # Categorize the transaction
            error = await self._categorize_transaction(mm, txn_id, stream_id, target_category_id)
            if error:
                errors.append(error)
            else:
                categorized_count += 1

        return categorized_count, skipped_count, errors

    def _make_result(
        self,
        success: bool,
        categorized_count: int = 0,
        skipped_count: int = 0,
        errors: list[dict[str, Any]] | None = None,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """Create a standardized result dict."""
        result: dict[str, Any] = {
            "success": success,
            "categorized_count": categorized_count,
            "skipped_count": skipped_count,
            "errors": errors or [],
        }
        if reason:
            result["reason"] = reason
        return result

    async def auto_categorize_new_transactions(
        self,
        force: bool = False,
    ) -> dict[str, Any]:
        """
        Find and categorize new transactions matching tracked recurring streams.

        Args:
            force: If True, run even if auto_categorize_enabled is False

        Returns:
            dict with:
                - success: bool
                - categorized_count: int
                - skipped_count: int (already in correct category)
                - errors: list of error dicts
                - reason: str (if skipped due to disabled)
        """
        state = self.state_manager.load()

        # Check if feature is enabled
        if not force and not state.auto_categorize_enabled:
            return self._make_result(success=True, reason="disabled")

        # Build stream to category mapping
        stream_to_category = self._build_stream_to_category_mapping(state)
        if not stream_to_category:
            return self._make_result(success=True, reason="no_tracked_items")

        # Get date range
        start_date, end_date = self._get_date_range(state)
        logger.info(
            f"[AUTO-CATEGORIZE] Fetching recurring transactions from {start_date} to {end_date}"
        )

        try:
            mm = await get_mm()

            # Fetch transactions that are part of recurring streams
            transactions_result = await retry_with_backoff(
                lambda: mm.get_transactions(
                    start_date=start_date,
                    end_date=end_date,
                    is_recurring=True,
                    limit=500,
                )
            )

            transactions = transactions_result.get("allTransactions", {}).get("results", [])
            logger.info(f"[AUTO-CATEGORIZE] Found {len(transactions)} recurring transactions")

            # Process transactions
            categorized_count, skipped_count, errors = await self._process_transactions(
                mm, transactions, stream_to_category
            )

            # Record the run date
            self.state_manager.record_auto_categorize_run(end_date)

            logger.info(
                f"[AUTO-CATEGORIZE] Complete: {categorized_count} categorized, "
                f"{skipped_count} skipped, {len(errors)} errors"
            )

            return self._make_result(
                success=len(errors) == 0,
                categorized_count=categorized_count,
                skipped_count=skipped_count,
                errors=errors,
            )

        except Exception as e:
            logger.error(f"[AUTO-CATEGORIZE] Failed to fetch transactions: {e}")
            return self._make_result(success=False, errors=[{"error": str(e)}])
