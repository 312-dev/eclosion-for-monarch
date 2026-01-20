"""
Integration tests for category lifecycle operations.

Tests create, read, update, and delete operations against real Monarch API.
All tests use temporary categories that are cleaned up after each test.
"""

from datetime import datetime

import pytest

from .helpers import extract_categories, extract_category_id


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_and_delete_category(monarch_client, unique_test_name):
    """Test that we can create and delete a category."""
    # Get a group to add category to
    result = await monarch_client.get_transaction_categories()
    categories = extract_categories(result)
    group_id = None
    for cat in categories:
        if cat.get("group") and cat["group"].get("id"):
            group_id = cat["group"]["id"]
            break

    # Create
    create_result = await monarch_client.create_transaction_category(
        transaction_category_name=unique_test_name,
        group_id=group_id,
    )
    cat_id = extract_category_id(create_result)
    assert cat_id is not None, "Category creation should return an ID"

    # Verify exists
    result = await monarch_client.get_transaction_categories()
    categories = extract_categories(result)
    cat_ids = [c["id"] for c in categories]
    assert cat_id in cat_ids, "Created category should appear in category list"

    # Delete
    await monarch_client.delete_transaction_category(cat_id)

    # Verify deleted
    result = await monarch_client.get_transaction_categories()
    categories = extract_categories(result)
    cat_ids = [c["id"] for c in categories]
    assert cat_id not in cat_ids, "Deleted category should not appear in category list"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_category_appears_in_list(monarch_client, test_category, unique_test_name):
    """Test that a created category appears in the category list."""
    result = await monarch_client.get_transaction_categories()
    categories = extract_categories(result)

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
    result = await monarch_client.get_transaction_categories()
    categories = extract_categories(result)
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
                transaction_category_name=name,
                group_id=group_id,
            )
            cat_id = extract_category_id(result)
            created_ids.append(cat_id)

        # Verify all exist
        result = await monarch_client.get_transaction_categories()
        categories = extract_categories(result)
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


@pytest.mark.integration
@pytest.mark.asyncio
async def test_enable_category_rollover(monarch_client, unique_test_name):
    """Test that we can enable rollover on an existing category."""
    # Get a group to add category to
    result = await monarch_client.get_transaction_categories()
    categories = extract_categories(result)
    group_id = None
    for cat in categories:
        if cat.get("group") and cat["group"].get("id"):
            group_id = cat["group"]["id"]
            break

    # Create category WITHOUT rollover
    create_result = await monarch_client.create_transaction_category(
        transaction_category_name=unique_test_name,
        group_id=group_id,
        rollover_enabled=False,
    )
    cat_id = extract_category_id(create_result)

    try:
        # Enable rollover on the category
        result = await monarch_client.enable_category_rollover(category_id=cat_id)

        # Verify the response contains updated category with rollover enabled
        assert result is not None, "enable_category_rollover should return a result"
        assert "updateCategory" in result, "Response should contain updateCategory"

        category = result["updateCategory"]["category"]
        assert category["id"] == cat_id, "Response should contain the correct category ID"

        # Verify rolloverPeriod is now set
        rollover_period = category.get("rolloverPeriod")
        assert rollover_period is not None, "Category should now have a rolloverPeriod"
        assert rollover_period.get("frequency") == "monthly", "Rollover frequency should be monthly"

    finally:
        await monarch_client.delete_transaction_category(cat_id)
