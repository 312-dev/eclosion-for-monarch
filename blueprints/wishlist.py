# Wishlist blueprint
# /wishlist/* endpoints for wishlist savings goals

import logging

from flask import Blueprint, jsonify, request

from core import (
    api_handler,
    sanitize_emoji,
    sanitize_id,
    sanitize_name,
    sanitize_path,
    sanitize_response,
    sanitize_url,
)
from core.exceptions import ValidationError
from core.middleware import sanitize_api_result
from services.metadata_service import fetch_og_image
from services.wishlist_service import WishlistService

logger = logging.getLogger(__name__)

wishlist_bp = Blueprint("wishlist", __name__, url_prefix="/wishlist")

# Create service instance
_wishlist_service: WishlistService | None = None


def get_wishlist_service() -> WishlistService:
    """Get or create the wishlist service singleton."""
    global _wishlist_service
    if _wishlist_service is None:
        _wishlist_service = WishlistService()
    return _wishlist_service


# ---- DASHBOARD & SYNC ENDPOINTS ----


@wishlist_bp.route("/dashboard", methods=["GET"])
@api_handler(handle_mfa=True)
async def wishlist_dashboard():
    """Get all wishlist items with computed fields for the frontend."""
    service = get_wishlist_service()
    return await service.get_dashboard_data()


@wishlist_bp.route("/sync", methods=["POST"])
@api_handler(handle_mfa=True)
async def wishlist_sync():
    """Sync wishlist items from Monarch to update balances and budgets."""
    service = get_wishlist_service()
    result = await service.sync_from_monarch()
    return sanitize_api_result(result, "Sync failed. Please try again.")


@wishlist_bp.route("/fetch-og-image", methods=["GET"])
@api_handler(handle_mfa=False)
async def fetch_og_image_endpoint():
    """
    Fetch og:image from a URL and return as base64 data URL.

    Query params:
    - url: The webpage URL to extract og:image from

    Returns:
    - image: Base64 data URL or null if not found/failed

    Times out after 10 seconds. Fails silently (returns null).
    """
    url = request.args.get("url")
    if not url:
        raise ValidationError("Missing 'url' parameter")

    image_data = await fetch_og_image(url)
    return {"image": image_data}


# ---- LAYOUT ENDPOINTS ----


@wishlist_bp.route("/layout", methods=["PUT"])
@api_handler(handle_mfa=False)
async def update_layout():
    """
    Update grid layout positions for wishlist items.

    Request body:
    - layouts: Array of {id, grid_x, grid_y, col_span, row_span}

    Used for drag-drop reordering and widget resizing.
    """
    service = get_wishlist_service()
    data = request.get_json()

    layouts = data.get("layouts", [])
    if not isinstance(layouts, list):
        raise ValidationError("'layouts' must be an array")

    # Validate each layout entry
    for layout in layouts:
        if not isinstance(layout, dict):
            raise ValidationError("Each layout entry must be an object")
        if "id" not in layout:
            raise ValidationError("Each layout entry must have an 'id'")
        # Sanitize the ID
        layout["id"] = sanitize_id(layout["id"])
        if not layout["id"]:
            raise ValidationError("Invalid item ID in layout")

    result = await service.update_layouts(layouts)
    return sanitize_api_result(result, "Failed to update layout.")


# ---- ITEM MANAGEMENT ENDPOINTS ----


@wishlist_bp.route("", methods=["POST"])
@api_handler(handle_mfa=True)
async def create_item():
    """
    Create a new wishlist item.

    Required fields:
    - name: Item name
    - amount: Target amount
    - target_date: Goal date (YYYY-MM-DD)

    Category (one of):
    - category_group_id: Monarch category group ID (creates new category)
    - existing_category_id: Existing Monarch category ID (links to existing)

    Optional fields:
    - emoji: Display emoji (default: 🎯)
    - source_url: Original bookmark URL
    - source_bookmark_id: Bookmark ID from sync
    - logo_url: Favicon URL
    """
    service = get_wishlist_service()
    data = request.get_json()

    name = sanitize_name(data.get("name"))
    amount = data.get("amount")
    target_date = data.get("target_date")
    category_group_id = sanitize_id(data.get("category_group_id"))
    existing_category_id = sanitize_id(data.get("existing_category_id"))

    if not name:
        raise ValidationError("Missing 'name'")
    if amount is None or amount <= 0:
        raise ValidationError("Missing or invalid 'amount'")
    if not target_date:
        raise ValidationError("Missing 'target_date'")
    if not category_group_id and not existing_category_id:
        raise ValidationError("Must provide either 'category_group_id' or 'existing_category_id'")
    if category_group_id and existing_category_id:
        raise ValidationError("Cannot provide both 'category_group_id' and 'existing_category_id'")

    # Optional fields
    emoji = sanitize_emoji(data.get("emoji", "🎯"))
    source_url = sanitize_url(data.get("source_url"))
    source_bookmark_id = data.get("source_bookmark_id")
    logo_url = sanitize_url(data.get("logo_url"))
    custom_image_path = sanitize_path(data.get("custom_image_path"))

    result = await service.create_item(
        name=name,
        amount=float(amount),
        target_date=target_date,
        category_group_id=category_group_id,
        existing_category_id=existing_category_id,
        emoji=emoji,
        source_url=source_url,
        source_bookmark_id=source_bookmark_id,
        logo_url=logo_url,
        custom_image_path=custom_image_path,
    )

    return sanitize_api_result(result, "Failed to create wishlist item.")


@wishlist_bp.route("/<item_id>", methods=["PUT"])
@api_handler(handle_mfa=True)
async def update_item(item_id: str):
    """
    Update a wishlist item.

    Supported fields:
    - name: Item name (also updates Monarch category)
    - amount: Target amount
    - target_date: Goal date
    - emoji: Display emoji (also updates Monarch category)
    - source_url: Link URL
    - custom_image_path: Path to custom image
    """
    service = get_wishlist_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    data = request.get_json()
    updates: dict[str, str | float | None] = {}

    if "name" in data:
        updates["name"] = sanitize_name(data["name"])
    if "amount" in data:
        updates["amount"] = float(data["amount"])
    if "target_date" in data:
        updates["target_date"] = data["target_date"]
    if "emoji" in data:
        updates["emoji"] = sanitize_emoji(data["emoji"])
    if "source_url" in data:
        updates["source_url"] = sanitize_url(data["source_url"])
    if "custom_image_path" in data:
        updates["custom_image_path"] = sanitize_path(data["custom_image_path"])

    if not updates:
        raise ValidationError("No valid fields to update")

    result = await service.update_item(item_id, **updates)
    return jsonify(sanitize_response(result))


@wishlist_bp.route("/<item_id>", methods=["DELETE"])
@api_handler(handle_mfa=True)
async def delete_item(item_id: str):
    """
    Delete a wishlist item.

    Query params:
    - delete_category: If true, also delete the Monarch category (default: false)
    """
    service = get_wishlist_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    delete_category = request.args.get("delete_category", "false").lower() == "true"

    result = await service.delete_item(item_id, delete_category=delete_category)
    return sanitize_api_result(result, "Failed to delete wishlist item.")


@wishlist_bp.route("/<item_id>/archive", methods=["POST"])
@api_handler(handle_mfa=True)
async def archive_item(item_id: str):
    """Archive a wishlist item (mark as completed)."""
    service = get_wishlist_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    result = await service.archive_item(item_id)
    return sanitize_api_result(result, "Failed to archive wishlist item.")


@wishlist_bp.route("/<item_id>/unarchive", methods=["POST"])
@api_handler(handle_mfa=True)
async def unarchive_item(item_id: str):
    """Unarchive a wishlist item."""
    service = get_wishlist_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    result = await service.unarchive_item(item_id)
    return sanitize_api_result(result, "Failed to unarchive wishlist item.")


# ---- BUDGET ENDPOINTS ----


@wishlist_bp.route("/<item_id>/allocate", methods=["POST"])
@api_handler(handle_mfa=True)
async def allocate_funds(item_id: str):
    """
    Set the budget amount for a wishlist item's category.

    Request body:
    - amount: Budget amount (integer, sets the absolute budget)
    """
    service = get_wishlist_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    data = request.get_json()
    amount = data.get("amount")

    if amount is None:
        raise ValidationError("Missing 'amount'")

    result = await service.allocate_funds(item_id, int(amount))
    return sanitize_api_result(result, "Failed to allocate funds.")


@wishlist_bp.route("/<item_id>/change-group", methods=["POST"])
@api_handler(handle_mfa=True)
async def change_category_group(item_id: str):
    """
    Move a wishlist item's category to a different group.

    Request body:
    - group_id: New category group ID
    - group_name: New category group name
    """
    service = get_wishlist_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]
    data = request.get_json()

    new_group_id = sanitize_id(data.get("group_id"))
    new_group_name = sanitize_name(data.get("group_name", ""))

    if not item_id:
        raise ValidationError("Invalid item ID")
    if not new_group_id:
        raise ValidationError("Missing 'group_id'")

    result = await service.change_category_group(item_id, new_group_id, new_group_name)
    return sanitize_api_result(result, "Failed to change category group.")


@wishlist_bp.route("/<item_id>/link-category", methods=["POST"])
@api_handler(handle_mfa=True)
async def link_category(item_id: str):
    """
    Link a category to an existing wishlist item.

    Used when restoring an archived item whose category was deleted,
    or when changing the linked category.

    Request body:
    - category_group_id: Category group to create new category in (mutually exclusive with existing_category_id)
    - existing_category_id: Existing category ID to link to (mutually exclusive with category_group_id)
    """
    service = get_wishlist_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]
    data = request.get_json()

    category_group_id = sanitize_id(data.get("category_group_id"))
    existing_category_id = sanitize_id(data.get("existing_category_id"))

    if not item_id:
        raise ValidationError("Invalid item ID")
    if not category_group_id and not existing_category_id:
        raise ValidationError("Must provide 'category_group_id' or 'existing_category_id'")
    if category_group_id and existing_category_id:
        raise ValidationError("Cannot provide both 'category_group_id' and 'existing_category_id'")

    result = await service.link_category(
        item_id,
        category_group_id=category_group_id,
        existing_category_id=existing_category_id,
    )
    return sanitize_api_result(result, "Failed to link category.")


# ---- CATEGORY GROUP ENDPOINTS ----


@wishlist_bp.route("/groups", methods=["GET"])
@api_handler(handle_mfa=True, success_wrapper="groups")
async def get_category_groups():
    """Get available category groups for selection."""
    service = get_wishlist_service()
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    return await service.get_category_groups(force_refresh)


# ---- CONFIG ENDPOINTS ----


@wishlist_bp.route("/config", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_config():
    """
    Get wishlist configuration.

    Returns configuration for browser sync and auto-archive settings.
    """
    service = get_wishlist_service()
    return await service.get_config()


@wishlist_bp.route("/config", methods=["PUT"])
@api_handler(handle_mfa=False)
async def update_config():
    """
    Update wishlist configuration.

    Supported fields:
    - default_category_group_id: Default group for new items
    - default_category_group_name: Default group name
    - selected_browser: Browser for bookmark sync (chrome/edge/brave/safari)
    - selected_folder_ids: JSON array of bookmark folder IDs
    - auto_archive_on_bookmark_delete: Auto-archive when bookmark removed
    - auto_archive_on_goal_met: Auto-archive when goal completed
    - is_configured: Mark setup as complete
    """
    service = get_wishlist_service()
    data = request.get_json()

    updates: dict[str, str | bool | None] = {}

    # Category group settings
    if "default_category_group_id" in data:
        updates["default_category_group_id"] = sanitize_id(data["default_category_group_id"])
    if "default_category_group_name" in data:
        updates["default_category_group_name"] = sanitize_name(data["default_category_group_name"])

    # Browser sync settings
    if "selected_browser" in data:
        browser = data["selected_browser"]
        if browser and browser not in ("chrome", "edge", "brave", "safari"):
            raise ValidationError("Invalid browser type")
        updates["selected_browser"] = browser
    if "selected_folder_ids" in data:
        # Store as JSON string
        import json

        folder_ids = data["selected_folder_ids"]
        if folder_ids is not None:
            updates["selected_folder_ids"] = json.dumps(folder_ids) if folder_ids else None
        else:
            updates["selected_folder_ids"] = None
    if "selected_folder_names" in data:
        import json

        folder_names = data["selected_folder_names"]
        if folder_names is not None:
            updates["selected_folder_names"] = json.dumps(folder_names) if folder_names else None
        else:
            updates["selected_folder_names"] = None

    # Auto-archive settings
    if "auto_archive_on_bookmark_delete" in data:
        updates["auto_archive_on_bookmark_delete"] = bool(data["auto_archive_on_bookmark_delete"])
    if "auto_archive_on_goal_met" in data:
        updates["auto_archive_on_goal_met"] = bool(data["auto_archive_on_goal_met"])

    # Configuration state
    if "is_configured" in data:
        updates["is_configured"] = bool(data["is_configured"])

    if not updates:
        raise ValidationError("No valid fields to update")

    result = await service.update_config(**updates)
    return sanitize_api_result(result, "Failed to update wishlist configuration.")


# ---- PENDING BOOKMARKS ENDPOINTS ----


@wishlist_bp.route("/pending", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_pending_bookmarks():
    """
    Get all pending bookmarks awaiting review.

    Returns bookmarks that have been imported but not yet converted to wishlist items.
    """
    service = get_wishlist_service()
    return await service.get_pending_bookmarks()


@wishlist_bp.route("/pending/count", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_pending_count():
    """Get count of pending bookmarks (for banner display)."""
    service = get_wishlist_service()
    return await service.get_pending_count()


@wishlist_bp.route("/pending/skipped", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_skipped_bookmarks():
    """
    Get all skipped/ignored bookmarks.

    Returns bookmarks that have been skipped by the user, allowing them
    to be restored via "Create Target".
    """
    service = get_wishlist_service()
    return await service.get_skipped_bookmarks()


@wishlist_bp.route("/pending/<bookmark_id>/skip", methods=["POST"])
@api_handler(handle_mfa=False)
async def skip_pending_bookmark(bookmark_id: str):
    """
    Skip a pending bookmark.

    Marks the bookmark as skipped. The URL is remembered and won't appear
    in pending review again even if the bookmark is re-added.
    """
    service = get_wishlist_service()
    bookmark_id = sanitize_id(bookmark_id)  # type: ignore[assignment]

    if not bookmark_id:
        raise ValidationError("Invalid bookmark ID")

    result = await service.skip_pending_bookmark(bookmark_id)
    return sanitize_api_result(result, "Failed to skip bookmark.")


@wishlist_bp.route("/pending/<bookmark_id>/convert", methods=["POST"])
@api_handler(handle_mfa=False)
async def convert_pending_bookmark(bookmark_id: str):
    """
    Mark a pending bookmark as converted.

    This is called after successfully creating a wishlist item from a pending bookmark.
    Optionally links the pending bookmark to the created wishlist item.

    Request body (optional):
    - wishlist_item_id: The ID of the created wishlist item (optional)
    """
    service = get_wishlist_service()
    sanitized_id = sanitize_id(bookmark_id)
    data = request.get_json(silent=True) or {}
    wishlist_item_id = (
        sanitize_id(data.get("wishlist_item_id")) if data.get("wishlist_item_id") else None
    )

    if not sanitized_id:
        raise ValidationError("Invalid bookmark ID")

    result = await service.convert_pending_bookmark(sanitized_id, wishlist_item_id)
    return sanitize_api_result(result, "Failed to convert bookmark.")


@wishlist_bp.route("/pending/import", methods=["POST"])
@api_handler(handle_mfa=False)
async def import_bookmarks():
    """
    Import bookmarks from browser sync.

    Request body:
    - bookmarks: Array of bookmark objects with:
        - url: Bookmark URL (required)
        - name: Bookmark title
        - bookmark_id: Browser's bookmark ID
        - browser_type: Browser type (chrome/edge/brave/safari)
        - logo_url: Favicon URL (optional)

    URLs that are already pending, skipped, or converted are skipped.
    Returns count of imported and skipped bookmarks.
    """
    service = get_wishlist_service()
    data = request.get_json()

    bookmarks = data.get("bookmarks", [])
    if not isinstance(bookmarks, list):
        raise ValidationError("'bookmarks' must be an array")

    result = await service.import_bookmarks(bookmarks)
    return result


@wishlist_bp.route("/pending/clear-unconverted", methods=["POST"])
@api_handler(handle_mfa=False)
async def clear_unconverted_bookmarks():
    """
    Clear all pending and skipped bookmarks (preserve converted ones).

    Used when re-running the wizard to change bookmark source.
    Converted bookmarks are preserved because they're linked to wishlist items.
    """
    service = get_wishlist_service()
    result = await service.clear_unconverted_bookmarks()
    return result
