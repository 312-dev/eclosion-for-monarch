"""
Integration tests for read-only sync operations.

These tests only READ data from Monarch - they make no modifications.
Safe to run at any time without affecting budget data.
"""

from datetime import datetime

import pytest


@pytest.mark.integration
@pytest.mark.asyncio
async def test_can_fetch_budgets(monarch_client):
    """Test that budget fetching works."""
    start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")

    budgets = await monarch_client.get_budgets(start_date=start_date, end_date=start_date)

    assert budgets is not None, "Budgets response should not be None"
    assert isinstance(budgets, dict), "Budgets should be a dictionary"
    assert "budgetData" in budgets or "categoryGroups" in budgets, (
        "Budget response should have expected structure"
    )


@pytest.mark.integration
@pytest.mark.asyncio
async def test_can_fetch_categories(monarch_client):
    """Test that category fetching works."""
    categories = await monarch_client.get_transaction_categories()

    assert categories is not None, "Categories response should not be None"
    assert isinstance(categories, list), "Categories should be a list"
    # Most accounts will have at least some default categories
    assert len(categories) > 0, "Should have at least one category"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_can_fetch_recurring(monarch_client):
    """Test that recurring item fetching works."""
    recurring = await monarch_client.get_recurring_transactions()

    assert recurring is not None, "Recurring response should not be None"
    # Response structure may vary, just verify we got something back


@pytest.mark.integration
@pytest.mark.asyncio
async def test_can_fetch_accounts(monarch_client):
    """Test that account fetching works."""
    accounts = await monarch_client.get_accounts()

    assert accounts is not None, "Accounts response should not be None"
    # Most users will have at least one account linked


@pytest.mark.integration
@pytest.mark.asyncio
async def test_budget_data_structure(monarch_client):
    """Test that budget data has expected structure for our app."""
    start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
    budgets = await monarch_client.get_budgets(start_date=start_date, end_date=start_date)

    # Verify structure matches what our app expects
    if "categoryGroups" in budgets:
        groups = budgets["categoryGroups"]
        assert isinstance(groups, list), "categoryGroups should be a list"

        if len(groups) > 0:
            group = groups[0]
            assert "id" in group, "Category group should have id"
            assert "name" in group, "Category group should have name"

    if "budgetData" in budgets:
        budget_data = budgets["budgetData"]
        assert isinstance(budget_data, dict), "budgetData should be a dict"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_category_data_structure(monarch_client):
    """Test that category data has expected structure for our app."""
    categories = await monarch_client.get_transaction_categories()

    if len(categories) > 0:
        cat = categories[0]
        assert "id" in cat, "Category should have id"
        assert "name" in cat, "Category should have name"
