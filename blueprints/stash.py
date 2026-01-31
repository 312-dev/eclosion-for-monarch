# Stash blueprint
# /stash/* endpoints for stash savings goals

import logging
import re

from flask import Blueprint, jsonify, request, send_file

from core import (
    api_handler,
    config,
    sanitize_emoji,
    sanitize_id,
    sanitize_name,
    sanitize_path,
    sanitize_response,
    sanitize_url,
)
from core.exceptions import ValidationError
from core.middleware import sanitize_api_result
from services.metadata_service import fetch_favicon, fetch_og_image
from services.stash_service import StashService

logger = logging.getLogger(__name__)

stash_bp = Blueprint("stash", __name__, url_prefix="/stash")

# Create service instance
_stash_service: StashService | None = None


def get_stash_service() -> StashService:
    """Get or create the stash service singleton."""
    global _stash_service
    if _stash_service is None:
        _stash_service = StashService()
    return _stash_service


# ---- DASHBOARD & SYNC ENDPOINTS ----


@stash_bp.route("/dashboard", methods=["GET"])
@api_handler(handle_mfa=True)
async def stash_dashboard():
    """Get all stash items with computed fields for the frontend."""
    service = get_stash_service()
    return await service.get_dashboard_data()


@stash_bp.route("/sync", methods=["POST"])
@api_handler(handle_mfa=True)
async def stash_sync():
    """Sync stash items from Monarch to update balances and budgets."""
    service = get_stash_service()
    result = await service.sync_from_monarch()
    return sanitize_api_result(result, "Sync failed. Please try again.")


@stash_bp.route("/history", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_stash_history():
    """
    Get monthly history for all stash items.

    Query params:
    - months: Number of months of history (default: 12, max: 36)

    Returns:
    - items: List of stash items with monthly balance/contribution history
    - months: List of month strings (e.g., ["2025-01", "2025-02", ...])

    Used for the Reports tab to show progress charts over time.
    """
    service = get_stash_service()
    months = request.args.get("months", 12, type=int)
    # Clamp to reasonable range
    months = max(1, min(36, months))
    return await service.get_stash_history(months)


@stash_bp.route("/available-to-stash", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_available_to_stash():
    """
    Get data needed for Available Funds calculation.

    Returns aggregated data from Monarch accounts, budgets, and goals,
    plus stash balances. The frontend performs the actual calculation.

    See .claude/rules/available-to-stash.md for the formula.
    """
    service = get_stash_service()
    return await service.get_available_to_stash_data()


@stash_bp.route("/fetch-og-image", methods=["GET"])
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


@stash_bp.route("/fetch-favicon", methods=["GET"])
@api_handler(handle_mfa=False)
async def fetch_favicon_endpoint():
    """
    Fetch favicon from a domain and return as base64 data URL.

    Query params:
    - domain: The domain to fetch favicon from (e.g., "amazon.com")

    Returns:
    - favicon: Base64 data URL or null if not found/failed

    Tries common favicon locations (/apple-touch-icon.png, /favicon.ico, etc.)
    and parses HTML for link tags. Only returns favicons >= 32x32.
    Times out after 5 seconds. Fails silently (returns null).
    """
    domain = request.args.get("domain")
    if not domain:
        raise ValidationError("Missing 'domain' parameter")

    favicon_data = await fetch_favicon(domain)
    return {"favicon": favicon_data}


# ---- LAYOUT ENDPOINTS ----


@stash_bp.route("/layout", methods=["PUT"])
@api_handler(handle_mfa=False)
async def update_layout():
    """
    Update grid layout positions for stash items.

    Request body:
    - layouts: Array of {id, grid_x, grid_y, col_span, row_span}

    Used for drag-drop reordering and widget resizing.
    """
    service = get_stash_service()
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


@stash_bp.route("/monarch-goals", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_monarch_goals():
    """
    Get Monarch savings goals with grid layout data.

    Returns full goal data from Monarch API merged with stored grid positions.
    Goals are filtered to active (non-archived) only.

    Response:
    - goals: Array of goal objects with financial data, layout, and status
    """
    service = get_stash_service()
    return await service.get_monarch_goals()


@stash_bp.route("/monarch-goals/layout", methods=["PUT"])
@api_handler(handle_mfa=False)
async def update_monarch_goal_layouts():
    """
    Update grid layout positions for Monarch goals.

    Request body:
    - layouts: Array of {goal_id, grid_x, grid_y, col_span, row_span}

    Used for drag-drop reordering and widget resizing of goal cards.
    """
    service = get_stash_service()
    data = request.get_json()

    layouts = data.get("layouts", [])
    if not isinstance(layouts, list):
        raise ValidationError("'layouts' must be an array")

    # Validate each layout entry
    for layout in layouts:
        if not isinstance(layout, dict):
            raise ValidationError("Each layout entry must be an object")
        if "goal_id" not in layout:
            raise ValidationError("Each layout entry must have a 'goal_id'")

    result = await service.update_monarch_goal_layouts(layouts)
    return sanitize_api_result(result, "Failed to update goal layouts.")


# ---- ITEM MANAGEMENT ENDPOINTS ----


@stash_bp.route("", methods=["POST"])
@api_handler(handle_mfa=True)
async def create_item():
    """
    Create a new stash item.

    Required fields:
    - name: Item name
    - amount: Target amount
    - target_date: Goal date (YYYY-MM-DD)

    Category (one of):
    - category_group_id: Monarch category group ID (creates new category)
    - existing_category_id: Existing Monarch category ID (links to existing)
    - flexible_group_id: Flexible category group ID with group-level rollover

    Optional fields:
    - emoji: Display emoji (default: 🎯)
    - source_url: Original bookmark URL
    - source_bookmark_id: Bookmark ID from sync
    - logo_url: Favicon URL
    """
    service = get_stash_service()
    data = request.get_json()

    name = sanitize_name(data.get("name"))
    amount = data.get("amount")
    target_date = data.get("target_date")
    category_group_id = sanitize_id(data.get("category_group_id"))
    existing_category_id = sanitize_id(data.get("existing_category_id"))
    flexible_group_id = sanitize_id(data.get("flexible_group_id"))

    if not name:
        raise ValidationError("Missing 'name'")
    if amount is None or amount <= 0:
        raise ValidationError("Missing or invalid 'amount'")
    if not target_date:
        raise ValidationError("Missing 'target_date'")

    # Exactly one category option must be provided
    options_provided = sum(
        1 for opt in [category_group_id, existing_category_id, flexible_group_id] if opt
    )
    if options_provided == 0:
        raise ValidationError(
            "Must provide 'category_group_id', 'existing_category_id', or 'flexible_group_id'"
        )
    if options_provided > 1:
        raise ValidationError(
            "Cannot provide multiple category options - choose one of "
            "'category_group_id', 'existing_category_id', or 'flexible_group_id'"
        )

    # Optional fields
    emoji = sanitize_emoji(data.get("emoji", "🎯"))
    source_url = sanitize_url(data.get("source_url"))
    source_bookmark_id = data.get("source_bookmark_id")
    logo_url = sanitize_url(data.get("logo_url"))
    custom_image_path = sanitize_path(data.get("custom_image_path"))
    image_attribution = data.get("image_attribution")  # Attribution for Openverse images

    # Goal type: 'one_time' (default), 'debt', or 'savings_buffer'
    goal_type = data.get("goal_type", "one_time")
    if goal_type not in ("one_time", "debt", "savings_buffer"):
        raise ValidationError(
            "Invalid 'goal_type'. Must be 'one_time', 'debt', or 'savings_buffer'"
        )

    # Tracking start date for one_time goals (optional, YYYY-MM-DD)
    tracking_start_date = data.get("tracking_start_date")

    # Initial starting balance (optional, sets rollover starting balance)
    starting_balance = data.get("starting_balance")
    if starting_balance is not None:
        try:
            starting_balance = int(starting_balance)
            if starting_balance < 0:
                raise ValidationError("'starting_balance' must be non-negative")
        except (ValueError, TypeError):
            raise ValidationError("'starting_balance' must be an integer")

    result = await service.create_item(
        name=name,
        amount=float(amount),
        target_date=target_date,
        category_group_id=category_group_id,
        existing_category_id=existing_category_id,
        flexible_group_id=flexible_group_id,
        emoji=emoji,
        source_url=source_url,
        source_bookmark_id=source_bookmark_id,
        logo_url=logo_url,
        custom_image_path=custom_image_path,
        image_attribution=image_attribution,
        goal_type=goal_type,
        tracking_start_date=tracking_start_date,
        starting_balance=starting_balance,
    )

    return sanitize_api_result(result, "Failed to create stash.")


@stash_bp.route("/<item_id>", methods=["PUT"])
@api_handler(handle_mfa=True)
async def update_item(item_id: str):
    """
    Update a stash item.

    Supported fields:
    - name: Item name (also updates Monarch category)
    - amount: Target amount
    - target_date: Goal date
    - emoji: Display emoji (also updates Monarch category)
    - source_url: Link URL
    - custom_image_path: Path to custom image or Openverse URL
    - image_attribution: Attribution text for Openverse images
    """
    service = get_stash_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    data = request.get_json()
    updates: dict[str, str | float | bool | None] = {}

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
    if "image_attribution" in data:
        updates["image_attribution"] = data["image_attribution"]
    if "goal_type" in data:
        goal_type = data["goal_type"]
        if goal_type not in ("one_time", "debt", "savings_buffer"):
            raise ValidationError(
                "Invalid 'goal_type'. Must be 'one_time', 'debt', or 'savings_buffer'"
            )
        updates["goal_type"] = goal_type
    if "tracking_start_date" in data:
        updates["tracking_start_date"] = data["tracking_start_date"]

    if not updates:
        raise ValidationError("No valid fields to update")

    result = await service.update_item(item_id, **updates)
    return jsonify(sanitize_response(result))


@stash_bp.route("/<item_id>", methods=["DELETE"])
@api_handler(handle_mfa=True)
async def delete_item(item_id: str):
    """
    Delete a stash item.

    Query params:
    - delete_category: If true, also delete the Monarch category (default: false)
    """
    service = get_stash_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    delete_category = request.args.get("delete_category", "false").lower() == "true"

    result = await service.delete_item(item_id, delete_category=delete_category)
    return sanitize_api_result(result, "Failed to delete stash.")


@stash_bp.route("/<item_id>/archive", methods=["POST"])
@api_handler(handle_mfa=True)
async def archive_item(item_id: str):
    """Archive a stash item (mark as completed)."""
    service = get_stash_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    result = await service.archive_item(item_id)
    return sanitize_api_result(result, "Failed to archive stash.")


@stash_bp.route("/<item_id>/unarchive", methods=["POST"])
@api_handler(handle_mfa=True)
async def unarchive_item(item_id: str):
    """Unarchive a stash item."""
    service = get_stash_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    result = await service.unarchive_item(item_id)
    return sanitize_api_result(result, "Failed to unarchive stash.")


@stash_bp.route("/<item_id>/complete", methods=["POST"])
@api_handler(handle_mfa=True)
async def complete_item(item_id: str):
    """
    Mark a one-time purchase goal as completed (archived).

    Request body (optional):
    - release_funds: If true, release remaining funds to Left to Budget (default: false)
    """
    service = get_stash_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    data = request.get_json(silent=True) or {}
    release_funds = bool(data.get("release_funds", False))

    result = await service.mark_complete(item_id, release_funds=release_funds)
    return sanitize_api_result(result, "Failed to mark item as complete.")


@stash_bp.route("/<item_id>/complete", methods=["DELETE"])
@api_handler(handle_mfa=True)
def uncomplete_item(item_id: str):
    """Unmark a completed one-time purchase, moving it back to active."""
    service = get_stash_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    result = service.unmark_complete(item_id)
    return sanitize_api_result(result, "Failed to unmark item as complete.")


# ---- BUDGET ENDPOINTS ----


@stash_bp.route("/<item_id>/allocate", methods=["POST"])
@api_handler(handle_mfa=True)
async def allocate_funds(item_id: str):
    """
    Set the budget amount for a stash item's category.

    Request body:
    - amount: Budget amount (integer, sets the absolute budget)
    """
    service = get_stash_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]

    if not item_id:
        raise ValidationError("Invalid item ID")

    data = request.get_json()
    amount = data.get("amount")

    if amount is None:
        raise ValidationError("Missing 'amount'")

    result = await service.allocate_funds(item_id, int(amount))
    return sanitize_api_result(result, "Failed to allocate funds.")


@stash_bp.route("/allocate-batch", methods=["POST"])
@api_handler(handle_mfa=True)
async def allocate_funds_batch():
    """
    Set budget amounts for multiple stash items in a single request.

    Request body:
    - allocations: Array of {id, budget} objects

    Used by the Distribute feature to update all stash budgets at once.
    """
    service = get_stash_service()
    data = request.get_json()

    allocations = data.get("allocations", [])
    if not isinstance(allocations, list):
        raise ValidationError("'allocations' must be an array")

    if not allocations:
        raise ValidationError("'allocations' cannot be empty")

    # Validate and sanitize each allocation
    validated_allocations = []
    for allocation in allocations:
        if not isinstance(allocation, dict):
            raise ValidationError("Each allocation must be an object")
        if "id" not in allocation:
            raise ValidationError("Each allocation must have an 'id'")
        if "budget" not in allocation:
            raise ValidationError("Each allocation must have a 'budget'")

        item_id = sanitize_id(allocation["id"])
        if not item_id:
            raise ValidationError("Invalid item ID in allocations")

        budget = allocation["budget"]
        if not isinstance(budget, (int, float)) or budget < 0:
            raise ValidationError("'budget' must be a non-negative number")

        validated_allocations.append({"id": item_id, "budget": int(budget)})

    result = await service.allocate_funds_batch(validated_allocations)
    return sanitize_api_result(result, "Failed to update budgets.")


@stash_bp.route("/update-rollover-balance", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_rollover_balance():
    """
    Add funds to a category's rollover starting balance.

    Used by the Distribute wizard to allocate the "rollover portion" of
    available funds (Available to Stash - Left to Budget) to categories.
    This effectively adds savings to a category that persists month-to-month.

    Request body:
    - category_id: The Monarch category ID to update
    - amount: Amount (integer) to add to the rollover starting balance

    Returns:
    - success: boolean
    - category: updated category data from Monarch
    """
    from monarch_utils import update_category_rollover_balance

    data = request.get_json()

    category_id = sanitize_id(data.get("category_id"))
    amount = data.get("amount")

    if not category_id:
        raise ValidationError("Missing 'category_id'")
    if amount is None:
        raise ValidationError("Missing 'amount'")

    try:
        amount_int = int(amount)
    except (ValueError, TypeError):
        raise ValidationError("'amount' must be an integer")

    # Security: Sanitize category_id for logging (remove newlines/control chars)
    safe_cat_id = str(category_id).replace("\n", "").replace("\r", "")[:50]
    logger.info(
        "[Rollover API] Calling update_category_rollover_balance(%s, %d)",
        safe_cat_id,
        amount_int,
    )
    result = await update_category_rollover_balance(category_id, amount_int)
    logger.info("[Rollover API] Result received")

    # Check for errors in the response
    update_result = result.get("updateCategory", {})
    errors = update_result.get("errors")
    if errors:
        error_msg = errors.get("message", "Failed to update rollover balance")
        raise ValidationError(error_msg)

    return {
        "success": True,
        "category": update_result.get("category"),
    }


@stash_bp.route("/update-group-rollover-balance", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_group_rollover_balance():
    """
    Add funds to a category group's rollover starting balance.

    Used by the Distribute wizard for stash items linked to flexible category
    groups that have group-level rollover enabled.

    Request body:
    - group_id: The Monarch category group ID to update
    - amount: Amount (integer) to add to the rollover starting balance

    Returns:
    - success: boolean
    - group: updated category group data from Monarch
    """
    data = request.get_json()

    group_id = sanitize_id(data.get("group_id"))
    amount = data.get("amount")

    if not group_id:
        raise ValidationError("Missing 'group_id'")
    if amount is None:
        raise ValidationError("Missing 'amount'")

    try:
        amount_int = int(amount)
    except (ValueError, TypeError):
        raise ValidationError("'amount' must be an integer")

    service = get_stash_service()
    try:
        result = await service.category_manager.update_group_rollover_balance(group_id, amount_int)
    except ValueError as e:
        raise ValidationError(str(e))

    return {
        "success": True,
        "group": result,
    }


@stash_bp.route("/<item_id>/change-group", methods=["POST"])
@api_handler(handle_mfa=True)
async def change_category_group(item_id: str):
    """
    Move a stash item's category to a different group.

    Request body:
    - group_id: New category group ID
    - group_name: New category group name
    """
    service = get_stash_service()
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


@stash_bp.route("/<item_id>/link-category", methods=["POST"])
@api_handler(handle_mfa=True)
async def link_category(item_id: str):
    """
    Link a category to an existing stash item.

    Used when restoring an archived item whose category was deleted,
    or when changing the linked category.

    Request body (one of):
    - category_group_id: Category group to create new category in
    - existing_category_id: Existing category ID to link to
    - flexible_group_id: Flexible category group ID (has group-level rollover)
    """
    service = get_stash_service()
    item_id = sanitize_id(item_id)  # type: ignore[assignment]
    data = request.get_json()

    category_group_id = sanitize_id(data.get("category_group_id"))
    existing_category_id = sanitize_id(data.get("existing_category_id"))
    flexible_group_id = sanitize_id(data.get("flexible_group_id"))

    if not item_id:
        raise ValidationError("Invalid item ID")

    # Exactly one option must be provided
    options_provided = sum(
        1 for opt in [category_group_id, existing_category_id, flexible_group_id] if opt
    )
    if options_provided == 0:
        raise ValidationError(
            "Must provide 'category_group_id', 'existing_category_id', or 'flexible_group_id'"
        )
    if options_provided > 1:
        raise ValidationError("Cannot provide multiple category options - choose only one")

    result = await service.link_category(
        item_id,
        category_group_id=category_group_id,
        existing_category_id=existing_category_id,
        flexible_group_id=flexible_group_id,
    )
    return sanitize_api_result(result, "Failed to link category.")


# ---- CATEGORY GROUP ENDPOINTS ----


@stash_bp.route("/groups", methods=["GET"])
@api_handler(handle_mfa=True, success_wrapper="groups")
async def get_category_groups():
    """Get available category groups for selection."""
    service = get_stash_service()
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    return await service.get_category_groups(force_refresh)


# ---- CONFIG ENDPOINTS ----


@stash_bp.route("/config", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_config():
    """
    Get stash configuration.

    Returns configuration for browser sync and auto-archive settings.
    """
    service = get_stash_service()
    return await service.get_config()


def _parse_json_field(data: dict, field: str) -> str | None:
    """Parse a field that should be stored as JSON string."""
    import json

    value = data.get(field)
    if value is None:
        return None
    return json.dumps(value) if value else None


def _build_config_updates(data: dict) -> dict[str, str | bool | int | None]:
    """Build updates dict from request data, validating fields."""
    updates: dict[str, str | bool | int | None] = {}

    # Simple string fields
    if "default_category_group_id" in data:
        updates["default_category_group_id"] = sanitize_id(data["default_category_group_id"])
    if "default_category_group_name" in data:
        updates["default_category_group_name"] = sanitize_name(data["default_category_group_name"])

    # Browser validation
    if "selected_browser" in data:
        browser = data["selected_browser"]
        if browser and browser not in ("chrome", "edge", "brave", "safari"):
            raise ValidationError("Invalid browser type")
        updates["selected_browser"] = browser

    # JSON array fields
    json_fields = ["selected_folder_ids", "selected_folder_names", "selected_cash_account_ids"]
    for field in json_fields:
        if field in data:
            updates[field] = _parse_json_field(data, field)

    # Boolean fields
    bool_fields = [
        "auto_archive_on_bookmark_delete",
        "auto_archive_on_goal_met",
        "include_expected_income",
        "show_monarch_goals",
        "is_configured",
    ]
    for field in bool_fields:
        if field in data:
            updates[field] = bool(data[field])

    # Buffer amount (numeric with validation)
    if "buffer_amount" in data:
        buffer = data["buffer_amount"]
        if not isinstance(buffer, (int, float)) or buffer < 0:
            raise ValidationError("'buffer_amount' must be a non-negative number")
        updates["buffer_amount"] = int(buffer)

    return updates


@stash_bp.route("/config", methods=["PUT"])
@api_handler(handle_mfa=False)
async def update_config():
    """
    Update stash configuration.

    Supported fields:
    - default_category_group_id: Default group for new items
    - default_category_group_name: Default group name
    - selected_browser: Browser for bookmark sync (chrome/edge/brave/safari)
    - selected_folder_ids: JSON array of bookmark folder IDs
    - selected_cash_account_ids: JSON array of cash account IDs for Available to Stash
    - auto_archive_on_bookmark_delete: Auto-archive when bookmark removed
    - auto_archive_on_goal_met: Auto-archive when goal completed
    - is_configured: Mark setup as complete
    """
    service = get_stash_service()
    data = request.get_json()

    updates = _build_config_updates(data)

    if not updates:
        raise ValidationError("No valid fields to update")

    result = await service.update_config(**updates)
    return sanitize_api_result(result, "Failed to update stash configuration.")


# ---- PENDING BOOKMARKS ENDPOINTS ----


@stash_bp.route("/pending", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_pending_bookmarks():
    """
    Get all pending bookmarks awaiting review.

    Returns bookmarks that have been imported but not yet converted to stash items.
    """
    service = get_stash_service()
    return await service.get_pending_bookmarks()


@stash_bp.route("/pending/count", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_pending_count():
    """Get count of pending bookmarks (for banner display)."""
    service = get_stash_service()
    return await service.get_pending_count()


@stash_bp.route("/pending/skipped", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_skipped_bookmarks():
    """
    Get all skipped/ignored bookmarks.

    Returns bookmarks that have been skipped by the user, allowing them
    to be restored via "Create Target".
    """
    service = get_stash_service()
    return await service.get_skipped_bookmarks()


@stash_bp.route("/pending/<bookmark_id>/skip", methods=["POST"])
@api_handler(handle_mfa=False)
async def skip_pending_bookmark(bookmark_id: str):
    """
    Skip a pending bookmark.

    Marks the bookmark as skipped. The URL is remembered and won't appear
    in pending review again even if the bookmark is re-added.
    """
    service = get_stash_service()
    bookmark_id = sanitize_id(bookmark_id)  # type: ignore[assignment]

    if not bookmark_id:
        raise ValidationError("Invalid bookmark ID")

    result = await service.skip_pending_bookmark(bookmark_id)
    return sanitize_api_result(result, "Failed to skip bookmark.")


@stash_bp.route("/pending/<bookmark_id>/convert", methods=["POST"])
@api_handler(handle_mfa=False)
async def convert_pending_bookmark(bookmark_id: str):
    """
    Mark a pending bookmark as converted.

    This is called after successfully creating a stash item from a pending bookmark.
    Optionally links the pending bookmark to the created stash item.

    Request body (optional):
    - stash_item_id: The ID of the created stash item (optional)
    """
    service = get_stash_service()
    sanitized_id = sanitize_id(bookmark_id)
    data = request.get_json(silent=True) or {}
    stash_item_id = sanitize_id(data.get("stash_item_id")) if data.get("stash_item_id") else None

    if not sanitized_id:
        raise ValidationError("Invalid bookmark ID")

    result = await service.convert_pending_bookmark(sanitized_id, stash_item_id)
    return sanitize_api_result(result, "Failed to convert bookmark.")


@stash_bp.route("/pending/import", methods=["POST"])
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
    service = get_stash_service()
    data = request.get_json()

    bookmarks = data.get("bookmarks", [])
    if not isinstance(bookmarks, list):
        raise ValidationError("'bookmarks' must be an array")

    result = await service.import_bookmarks(bookmarks)
    return result


@stash_bp.route("/pending/clear-unconverted", methods=["POST"])
@api_handler(handle_mfa=False)
async def clear_unconverted_bookmarks():
    """
    Clear all pending and skipped bookmarks (preserve converted ones).

    Used when re-running the wizard to change bookmark source.
    Converted bookmarks are preserved because they're linked to stash items.
    """
    service = get_stash_service()
    result = await service.clear_unconverted_bookmarks()
    return result


# ---- HYPOTHESIS ENDPOINTS ----


@stash_bp.route("/hypotheses", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_hypotheses():
    """
    Get all saved hypotheses.

    Returns list of hypotheses with their allocations and events.
    Used by the Distribute Wizard's hypothesize mode.
    """
    service = get_stash_service()
    result = service.get_hypotheses()
    return jsonify(sanitize_response(result))


@stash_bp.route("/hypotheses", methods=["POST"])
@api_handler(handle_mfa=False)
async def save_hypothesis():
    """
    Save a hypothesis.

    If a hypothesis with the same name exists (case-insensitive), it will be updated.
    Otherwise creates a new one if under the max limit (10).

    Request body:
    - name: Hypothesis name (required)
    - savings_allocations: Record<stashId, amount>
    - savings_total: Total savings allocated
    - monthly_allocations: Record<stashId, amount>
    - monthly_total: Total monthly allocated
    - events: StashEventsMap
    - custom_available_funds: Override for Available to Stash (optional)
    - custom_left_to_budget: Override for Left to Budget (optional)
    - item_apys: Record<stashId, apy> for HYSA projections (optional)
    """
    service = get_stash_service()
    data = request.get_json()

    name = sanitize_name(data.get("name", ""))
    if not name:
        raise ValidationError("Hypothesis name is required")

    if len(name) > 100:
        raise ValidationError("Hypothesis name must be 100 characters or less")

    result = service.save_hypothesis(
        name=name,
        savings_allocations=data.get("savings_allocations", {}),
        savings_total=data.get("savings_total", 0),
        monthly_allocations=data.get("monthly_allocations", {}),
        monthly_total=data.get("monthly_total", 0),
        events=data.get("events", {}),
        custom_available_funds=data.get("custom_available_funds"),
        custom_left_to_budget=data.get("custom_left_to_budget"),
        item_apys=data.get("item_apys", {}),
    )
    return jsonify(sanitize_response(result))


@stash_bp.route("/hypotheses/<hypothesis_id>", methods=["DELETE"])
@api_handler(handle_mfa=False)
async def delete_hypothesis(hypothesis_id: str):
    """
    Delete a hypothesis by ID.
    """
    service = get_stash_service()
    sanitized_id = sanitize_id(hypothesis_id)

    if not sanitized_id:
        raise ValidationError("Invalid hypothesis ID")

    result = service.delete_hypothesis(sanitized_id)
    return jsonify(sanitize_response(result))


# ---- LOCAL IMAGE SERVING (for remote/tunnel access) ----


# Regex for safe image filenames: alphanumeric, hyphens, underscores, with image extension
_SAFE_IMAGE_FILENAME = re.compile(r"^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|webp)$")


@stash_bp.route("/images/<filename>", methods=["GET"])
def serve_stash_image(filename: str):
    """
    Serve a stash item image from local storage.

    This endpoint enables remote/tunnel access to locally-stored images.
    In desktop mode, images are stored in STATE_DIR/stash-images/.

    Security:
    - Validates filename format (alphanumeric + extension only)
    - Prevents path traversal attacks
    - Only serves from the designated images directory
    """
    # Validate filename format to prevent path traversal
    if not _SAFE_IMAGE_FILENAME.match(filename):
        return jsonify({"error": "Invalid filename"}), 400

    # Get the stash images directory
    images_dir = config.STATE_DIR / "stash-images"

    if not images_dir.exists():
        return jsonify({"error": "Images directory not found"}), 404

    # Resolve the full path and ensure it's within the images directory
    # lgtm[py/path-injection] - Path is validated via relative_to check below
    image_path = (images_dir / filename).resolve()

    # Security: ensure the resolved path is still within images_dir
    # This prevents path traversal attacks (e.g., ../../../etc/passwd)
    try:
        image_path.relative_to(images_dir.resolve())
    except ValueError:
        # Path is outside images_dir (path traversal attempt)
        # Security: Sanitize filename for logging to prevent log injection
        safe_name = str(filename).replace("\n", "").replace("\r", "")[:50]
        logger.warning("Path traversal attempt: %s", safe_name)
        return jsonify({"error": "Invalid filename"}), 400

    # lgtm[py/path-injection] - Path validated via relative_to check above
    if not image_path.exists():
        return jsonify({"error": "Image not found"}), 404

    # Determine MIME type from extension
    extension = image_path.suffix.lower()
    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    mimetype = mime_types.get(extension, "application/octet-stream")

    # lgtm[py/path-injection] - Path validated via relative_to check above
    return send_file(image_path, mimetype=mimetype)
