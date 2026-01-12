"""
Integration tests for category lifecycle operations.

Tests create, read, update, and delete operations against real Monarch API.
All tests use temporary categories that are cleaned up after each test.
"""

from datetime import datetime

import pytest


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_and_delete_category(monarch_client, unique_test_name):
    """Test that we can create and delete a category."""
    # Get a group to add category to
    categories = await monarch_client.get_transaction_categories()
    group_id = None
    for cat in categories:
        if cat.get("group") and cat["group"].get("id"):
            group_id = cat["group"]["id"]
            break

    # Create
    result = await monarch_client.create_transaction_category(
        name=unique_test_name,
        group_id=group_id,
    )
    cat_id = result.get("id") if isinstance(result, dict) else result
    assert cat_id is not None, "Category creation should return an ID"

    # Verify exists
    categories = await monarch_client.get_transaction_categories()
    cat_ids = [c["id"] for c in categories]
    assert cat_id in cat_ids, "Created category should appear in category list"

    # Delete
    await monarch_client.delete_transaction_category(cat_id)

    # Verify deleted
    categories = await monarch_client.get_transaction_categories()
    cat_ids = [c["id"] for c in categories]
    assert cat_id not in cat_ids, "Deleted category should not appear in category list"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_category_appears_in_list(monarch_client, test_category, unique_test_name):
    """Test that a created category appears in the category list."""
    categories = await monarch_client.get_transaction_categories()

    # Find our test category
    found = False
    for cat in categories:
        if cat["id"] == test_category:
            found = True
            assert unique_test_name in cat["name"], "Category should have our test name"
            break

    assert found, "Test category should appear in category list"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_multiple_test_categories(monarch_client, test_category_prefix):
    """Test creating multiple categories and cleaning them all up."""
    created_ids = []

    # Get a group
    categories = await monarch_client.get_transaction_categories()
    group_id = None
    for cat in categories:
        if cat.get("group") and cat["group"].get("id"):
            group_id = cat["group"]["id"]
            break

    try:
        # Create 3 test categories
        for i in range(3):
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
            name = f"{test_category_prefix}-MULTI-{i}-{timestamp}"

            result = await monarch_client.create_transaction_category(
                name=name,
                group_id=group_id,
            )
            cat_id = result.get("id") if isinstance(result, dict) else result
            created_ids.append(cat_id)

        # Verify all exist
        categories = await monarch_client.get_transaction_categories()
        existing_ids = {c["id"] for c in categories}

        for cat_id in created_ids:
            assert cat_id in existing_ids, f"Category {cat_id} should exist"

    finally:
        # Clean up all created categories
        for cat_id in created_ids:
            try:
                await monarch_client.delete_transaction_category(cat_id)
            except Exception as e:
                print(f"Warning: Failed to delete category {cat_id}: {e}")
