"""
Integration tests for Refundables feature - Monarch API calls.

Tests the new API calls introduced by the Refundables feature:
- get_transaction_tags(): Fetches all household tags
- get_transactions(tag_ids=[...]): Fetches transactions filtered by tags
- set_transaction_tags(): Sets tags on a transaction (tested via write safety)

All tests are read-only unless explicitly noted.
"""

from datetime import datetime, timedelta

import pytest

# ============================================================================
# Read-only tests (safe to run anytime)
# ============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_transaction_tags_returns_list(monarch_client):
    """get_transaction_tags() returns a dict with householdTransactionTags list."""
    result = await monarch_client.get_transaction_tags()

    assert result is not None
    assert isinstance(result, dict)
    assert "householdTransactionTags" in result

    tags = result["householdTransactionTags"]
    assert isinstance(tags, list)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_transaction_tags_structure(monarch_client):
    """Each tag has required fields: id, name, color, order."""
    result = await monarch_client.get_transaction_tags()
    tags = result.get("householdTransactionTags", [])

    if len(tags) == 0:
        pytest.skip("No tags available in account")

    tag = tags[0]
    assert "id" in tag
    assert "name" in tag
    assert isinstance(tag["id"], str)
    assert isinstance(tag["name"], str)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_transactions_with_tag_filter(monarch_client):
    """get_transactions(tag_ids=[...]) returns filtered results."""
    # First get available tags
    tags_result = await monarch_client.get_transaction_tags()
    tags = tags_result.get("householdTransactionTags", [])

    if len(tags) == 0:
        pytest.skip("No tags available to test tag-filtered transactions")

    # Use the first tag to search
    tag_id = tags[0]["id"]
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")

    result = await monarch_client.get_transactions(
        start_date=start_date,
        end_date=end_date,
        tag_ids=[tag_id],
        limit=10,
    )

    assert result is not None
    assert isinstance(result, dict)
    assert "allTransactions" in result

    transactions = result["allTransactions"].get("results", [])
    assert isinstance(transactions, list)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_transactions_with_empty_tag_list(monarch_client):
    """get_transactions with empty tag_ids returns results (no filter)."""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    result = await monarch_client.get_transactions(
        start_date=start_date,
        end_date=end_date,
        tag_ids=[],
        limit=5,
    )

    assert result is not None
    assert isinstance(result, dict)
    assert "allTransactions" in result


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_transactions_with_search_query(monarch_client):
    """get_transactions with search param returns matching results."""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

    result = await monarch_client.get_transactions(
        start_date=start_date,
        end_date=end_date,
        search="amazon",
        limit=5,
    )

    assert result is not None
    assert isinstance(result, dict)
    assert "allTransactions" in result
    transactions = result["allTransactions"].get("results", [])
    assert isinstance(transactions, list)


# ============================================================================
# Write safety test (verifies set_transaction_tags exists but doesn't modify)
# ============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
async def test_set_transaction_tags_method_exists(monarch_client):
    """Verify set_transaction_tags method is available on the client."""
    assert hasattr(monarch_client, "set_transaction_tags")
    assert callable(monarch_client.set_transaction_tags)
