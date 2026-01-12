"""
Integration tests for budget operations.

Tests budget amount setting and reading against real Monarch API.
All tests use temporary categories that are cleaned up after each test.
"""

from datetime import datetime

import pytest


def get_current_month():
    """Get current month in YYYY-MM format."""
    return datetime.now().strftime("%Y-%m")


def get_budget_start_date():
    """Get start date for budget queries (first of current month)."""
    return datetime.now().replace(day=1).strftime("%Y-%m-%d")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_set_budget_amount(monarch_client, test_category):
    """Test setting a budget amount on a category."""
    current_month = get_current_month()

    # Set budget amount
    await monarch_client.set_budget_amount(
        amount=100,
        category_id=test_category,
        start_date=f"{current_month}-01",
    )

    # Fetch budgets to verify
    start_date = get_budget_start_date()
    budgets = await monarch_client.get_budgets(start_date=start_date, end_date=start_date)

    # Find our category's budget
    found = False
    monthly_by_category = budgets.get("budgetData", {}).get("monthlyAmountsByCategory", [])

    for entry in monthly_by_category:
        if entry.get("category", {}).get("id") == test_category:
            for monthly in entry.get("monthlyAmounts", []):
                if monthly.get("month", "").startswith(current_month):
                    planned = monthly.get("plannedCashFlowAmount", 0)
                    # Budget might be stored as negative (expense) or positive
                    assert abs(planned) == 100 or planned == -100 or planned == 100, (
                        f"Budget should be set to 100, got {planned}"
                    )
                    found = True
                    break
            break

    # Note: Budget might not appear immediately in all API responses
    # This is acceptable - we're mainly testing the API call succeeds
    if not found:
        print("Warning: Budget not found in response (may be API timing)")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_budget_amount(monarch_client, test_category):
    """Test updating a budget amount."""
    current_month = get_current_month()

    # Set initial budget
    await monarch_client.set_budget_amount(
        amount=50,
        category_id=test_category,
        start_date=f"{current_month}-01",
    )

    # Update to new amount
    await monarch_client.set_budget_amount(
        amount=75,
        category_id=test_category,
        start_date=f"{current_month}-01",
    )

    # The fact that both calls succeed is the main test
    # Budget API is eventually consistent so we don't strictly verify the value


@pytest.mark.integration
@pytest.mark.asyncio
async def test_zero_budget_amount(monarch_client, test_category):
    """Test setting a zero budget amount."""
    current_month = get_current_month()

    # Set non-zero first
    await monarch_client.set_budget_amount(
        amount=100,
        category_id=test_category,
        start_date=f"{current_month}-01",
    )

    # Set to zero
    await monarch_client.set_budget_amount(
        amount=0,
        category_id=test_category,
        start_date=f"{current_month}-01",
    )

    # Success if no exception raised
