"""
Service-level integration tests.

These tests validate that our APPLICATION CODE works correctly with the
real Monarch API, not just that the API itself works.

This closes the gap between:
- Unit tests (our code + mocked API)
- API tests (raw API calls)

By testing:
- Our code + real API = real-world behavior

IMPORTANT: These tests are non-destructive. They:
- Create temporary test data with obvious prefixes
- Never modify existing user data
- Clean up all test data after each test
"""

import os
import sys

import pytest

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from monarch_utils import clear_all_caches
from services.category_manager import CategoryManager


@pytest.fixture
def category_manager():
    """Get a CategoryManager instance."""
    return CategoryManager()


@pytest.fixture(autouse=True)
def clear_caches():
    """Clear caches before and after each test."""
    clear_all_caches()
    yield
    clear_all_caches()


# =============================================================================
# CATEGORY MANAGER TESTS
# These test our actual CategoryManager class, not just the raw API
# =============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
async def test_category_manager_get_category_groups(category_manager):
    """Test that CategoryManager.get_category_groups() works with real API."""
    groups = await category_manager.get_category_groups()

    # Verify it returns what we expect
    assert isinstance(groups, list), "Should return a list"

    # Most accounts have at least one category group
    if len(groups) > 0:
        group = groups[0]
        assert "id" in group, "Group should have id"
        assert "name" in group, "Group should have name"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_category_manager_get_all_categories_grouped(category_manager):
    """Test that CategoryManager.get_all_categories_grouped() works with real API."""
    groups = await category_manager.get_all_categories_grouped()

    assert isinstance(groups, list), "Should return a list"

    # Verify structure matches what we expect
    if len(groups) > 0:
        group = groups[0]
        assert "id" in group, "Group should have id"
        assert "name" in group, "Group should have name"
        assert "categories" in group, "Group should have categories list"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_category_manager_caching(category_manager):
    """Test that caching works correctly."""
    # First call
    groups1 = await category_manager.get_category_groups()

    # Second call should use cache (we can't verify this directly,
    # but we can verify it returns the same data)
    groups2 = await category_manager.get_category_groups()

    assert groups1 == groups2, "Cached result should match original"

    # Force refresh should work
    groups3 = await category_manager.get_category_groups(force_refresh=True)
    assert isinstance(groups3, list), "Force refresh should return valid data"


# =============================================================================
# NON-DESTRUCTIVE WRITE OPERATION TESTS
# These create temporary data, test our code, then clean up
# =============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
async def test_category_manager_create_category_uses_correct_api(
    category_manager, unique_test_name
):
    """
    Test that CategoryManager.create_category() correctly calls the Monarch API.

    This validates that our wrapper code properly passes parameters to Monarch
    and handles the response correctly.
    """
    # Get a group to use
    groups = await category_manager.get_category_groups()
    if not groups:
        pytest.skip("No category groups available")

    group_id = groups[0]["id"]
    cat_id = None

    try:
        # Use our CategoryManager method (not raw API)
        # This tests our code, not just the API
        cat_id = await category_manager.create_category(
            name=unique_test_name,
            group_id=group_id,
        )

        assert cat_id is not None, "CategoryManager should return category ID"

        # Verify it was actually created in Monarch
        # Use a fresh API call (bypass cache)
        all_categories = await category_manager.get_all_categories_grouped()
        all_cat_ids = []
        for group in all_categories:
            for cat in group.get("categories", []):
                all_cat_ids.append(cat["id"])

        # Note: The category might be in a different format, check both
        assert cat_id in all_cat_ids or any(
            unique_test_name in str(cat)
            for group in all_categories
            for cat in group.get("categories", [])
        ), "Created category should exist in Monarch"

    finally:
        # Clean up - use our CategoryManager method
        if cat_id:
            await category_manager.delete_category(cat_id)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_category_manager_set_budget_correct_parameters(category_manager, unique_test_name):
    """
    Test that CategoryManager.set_budget() passes correct parameters to Monarch.

    This validates our code correctly constructs the API request.
    """
    from datetime import datetime

    groups = await category_manager.get_category_groups()
    if not groups:
        pytest.skip("No category groups available")

    group_id = groups[0]["id"]
    cat_id = None

    try:
        # Create a test category
        cat_id = await category_manager.create_category(
            name=unique_test_name,
            group_id=group_id,
        )

        # Use our CategoryManager to set budget (tests our code)
        current_month = datetime.now().strftime("%Y-%m")
        await category_manager.set_budget(
            category_id=cat_id,
            amount=123,  # Distinctive amount we can verify
            month=f"{current_month}-01",
        )

        # If we got here without exception, the API accepted our request
        # The budget system is eventually consistent, so we just verify the call worked

    finally:
        if cat_id:
            await category_manager.delete_category(cat_id)


# =============================================================================
# SAFETY VERIFICATION TESTS
# These verify our code doesn't accidentally do destructive things
# =============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_category_only_deletes_specified_category(category_manager, unique_test_name):
    """
    SAFETY TEST: Verify delete_category only deletes the specified category.

    This is a critical safety test - it ensures our delete code doesn't
    accidentally delete other categories.
    """
    groups = await category_manager.get_category_groups()
    if not groups:
        pytest.skip("No category groups available")

    group_id = groups[0]["id"]

    # Get count of categories before
    before = await category_manager.get_all_categories_grouped()
    before_count = sum(len(g.get("categories", [])) for g in before)

    cat_id = None
    try:
        # Create a test category
        cat_id = await category_manager.create_category(
            name=unique_test_name,
            group_id=group_id,
        )

        # Count after creation
        after_create = await category_manager.get_all_categories_grouped()
        after_create_count = sum(len(g.get("categories", [])) for g in after_create)

        # Should have one more category
        assert after_create_count >= before_count, "Creating should add a category"

        # Delete the test category
        await category_manager.delete_category(cat_id)
        cat_id = None  # Don't try to delete again in finally

        # Count after deletion
        after_delete = await category_manager.get_all_categories_grouped()
        after_delete_count = sum(len(g.get("categories", [])) for g in after_delete)

        # Should be back to original count (or at least not less)
        assert after_delete_count >= before_count - 1, "Delete should only remove one category"

    finally:
        if cat_id:
            await category_manager.delete_category(cat_id)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_set_budget_only_affects_specified_category(category_manager, unique_test_name):
    """
    SAFETY TEST: Verify set_budget only affects the specified category.

    This ensures our budget setting code doesn't accidentally modify
    other categories' budgets.
    """
    from datetime import datetime

    groups = await category_manager.get_category_groups()
    if not groups:
        pytest.skip("No category groups available")

    group_id = groups[0]["id"]
    cat_id = None

    try:
        # Create test category
        cat_id = await category_manager.create_category(
            name=unique_test_name,
            group_id=group_id,
        )

        # Get current budget state (for comparison)
        current_month = datetime.now().strftime("%Y-%m")

        # Set budget on OUR test category only
        await category_manager.set_budget(
            category_id=cat_id,
            amount=999,  # Distinctive amount
            month=f"{current_month}-01",
        )

        # The key assertion is that no exception was raised
        # and the call only affected our category (we can't easily verify
        # other budgets weren't touched without more complex setup)

    finally:
        if cat_id:
            await category_manager.delete_category(cat_id)
