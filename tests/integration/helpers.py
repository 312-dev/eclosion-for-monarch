"""
Helper functions for extracting data from Monarch API responses.
"""

from typing import Any


def extract_categories(result: dict[str, Any]) -> list[Any]:
    """Extract categories list from get_transaction_categories response."""
    if isinstance(result, dict):
        categories = result.get("categories", [])
        return list(categories) if categories else []
    return list(result) if isinstance(result, list) else []


def extract_category_id(result: Any) -> str | None:
    """Extract category ID from create_transaction_category response."""
    if not isinstance(result, dict):
        return str(result) if result else None

    # Direct ID in result
    if result.get("id"):
        return str(result["id"])

    # Nested in createCategory response
    create_response = result.get("createCategory", {})
    cat_id = create_response.get("category", {}).get("id")
    return str(cat_id) if cat_id else None
