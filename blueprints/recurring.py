# Recurring blueprint
# /recurring/* endpoints for recurring expense tracking

import logging
from typing import Any

from flask import Blueprint, request

from core import (
    api_handler,
    async_flask,
    config,
    sanitize_emoji,
    sanitize_id,
    sanitize_name,
    sanitize_response,
)
from core.audit import audit_log
from core.exceptions import MonarchTrackerError, ValidationError
from core.middleware import sanitize_api_result
from core.rate_limit import limiter
from services.credentials_service import CredentialsService

from . import get_services

logger = logging.getLogger(__name__)

recurring_bp = Blueprint("recurring", __name__, url_prefix="/recurring")


# ---- DASHBOARD & SYNC ENDPOINTS ----


@recurring_bp.route("/dashboard", methods=["GET"])
@api_handler(handle_mfa=True)
async def recurring_dashboard():
    """Get dashboard data for the frontend."""
    services = get_services()
    return await services.sync_service.get_dashboard_data()


@recurring_bp.route("/sync", methods=["POST"])
@api_handler(handle_mfa=True)
async def recurring_sync():
    """
    Trigger full synchronization of recurring transactions.

    In desktop mode, accepts an optional passphrase parameter to unlock
    credentials before syncing. This enables background sync when the app
    is locked but has the passphrase stored in OS-level secure storage.
    """
    services = get_services()

    # In desktop mode, accept optional passphrase for unlocking
    if config.is_desktop_environment():
        data = request.get_json(silent=True) or {}
        passphrase = data.get("passphrase")

        if passphrase:
            # Unlock credentials if not already unlocked
            credentials_service = CredentialsService()
            if not credentials_service.get_session_credentials():
                unlock_result = credentials_service.unlock(passphrase)
                if not unlock_result.get("success"):
                    return sanitize_api_result(
                        {"success": False, "error": unlock_result.get("error", "Unlock failed")},
                        "Failed to unlock credentials for sync.",
                    )

    result = await services.sync_service.full_sync()
    # Sanitize all error messages to prevent stack trace exposure
    return sanitize_api_result(result, "Sync failed. Please try again.")


@recurring_bp.route("/config", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_config():
    """Get current configuration."""
    services = get_services()
    return await services.sync_service.get_config()


@recurring_bp.route("/config", methods=["POST"])
@api_handler(handle_mfa=False)
async def set_config():
    """Update configuration settings."""
    services = get_services()
    data = request.get_json()
    group_id = sanitize_id(data.get("group_id"))
    group_name = sanitize_name(data.get("group_name"))

    if not group_id or not group_name:
        raise ValidationError("Missing 'group_id' or 'group_name' in request body.")

    result = await services.sync_service.configure(group_id, group_name)
    return result


@recurring_bp.route("/groups", methods=["GET"])
@api_handler(handle_mfa=True, success_wrapper="groups")
async def get_category_groups():
    """Get available category groups for selection."""
    services = get_services()
    return await services.sync_service.get_category_groups()


@recurring_bp.route("/toggle", methods=["POST"])
@api_handler(handle_mfa=True)
async def toggle_item():
    """Enable or disable tracking for a recurring item."""
    services = get_services()
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    enabled = data.get("enabled", False)
    item_data = data.get("item_data")
    initial_budget = data.get("initial_budget")  # Optional: use this instead of calculated amount

    if not recurring_id:
        raise ValidationError("Missing 'recurring_id'")

    result = await services.sync_service.toggle_item(
        recurring_id, enabled, item_data, initial_budget
    )
    return result


@recurring_bp.route("/settings", methods=["GET"])
@api_handler(handle_mfa=False)
def get_settings():
    """Get current settings."""
    services = get_services()
    return services.sync_service.state_manager.get_settings()


@recurring_bp.route("/settings", methods=["POST"])
@api_handler(handle_mfa=False)
def update_settings():
    """Update settings like auto_sync_new, auto_track_threshold, auto_update_targets, auto_categorize_enabled, and show_category_group."""
    services = get_services()
    data = request.get_json()
    if "auto_sync_new" in data:
        services.sync_service.set_auto_sync(data["auto_sync_new"])
    if "auto_track_threshold" in data:
        services.sync_service.set_auto_track_threshold(data["auto_track_threshold"])
    if "auto_update_targets" in data:
        services.sync_service.set_auto_update_targets(data["auto_update_targets"])
    if "auto_categorize_enabled" in data:
        services.sync_service.set_auto_categorize(data["auto_categorize_enabled"])
    if "show_category_group" in data:
        services.sync_service.set_show_category_group(data["show_category_group"])
    return {"success": True}


@recurring_bp.route("/auto-categorize", methods=["POST"])
@api_handler(handle_mfa=True)
async def run_auto_categorize():
    """
    Manually trigger auto-categorization of recurring transactions.

    Finds recent transactions matching tracked recurring streams and
    categorizes them to the appropriate tracking category.
    """
    from services.transaction_categorizer import TransactionCategorizerService

    services = get_services()
    categorizer = TransactionCategorizerService(services.sync_service.state_manager)
    result = await categorizer.auto_categorize_new_transactions(force=True)
    # Sanitize to prevent stack trace exposure in error messages
    return sanitize_api_result(result, "Auto-categorization failed. Please try again.")


# ---- AUTO-SYNC ENDPOINTS ----


@recurring_bp.route("/auto-sync/status", methods=["GET"])
@api_handler(handle_mfa=False)
def get_auto_sync_status():
    """Get auto-sync status and configuration."""
    services = get_services()
    return services.sync_service.get_auto_sync_status()


@recurring_bp.route("/auto-sync/enable", methods=["POST"])
@limiter.limit("5 per minute")
@api_handler(handle_mfa=False)
@async_flask
async def enable_auto_sync():
    """
    Enable automatic background sync.

    Requires:
    - interval_minutes: Sync interval (60-1440 minutes)
    - passphrase: User's passphrase to decrypt credentials
    - consent_acknowledged: User has accepted the security trade-off
    """
    services = get_services()
    data = request.get_json()
    interval = data.get("interval_minutes", 360)
    passphrase = data.get("passphrase")
    consent = data.get("consent_acknowledged", False)

    if not passphrase:
        return {"success": False, "error": "Passphrase required"}

    result = await services.sync_service.enable_auto_sync(interval, passphrase, consent)
    audit_log(
        services.security_service,
        "AUTO_SYNC_ENABLE",
        result.get("success", False),
        f"interval={interval}",
    )
    return sanitize_api_result(result, "Failed to enable auto-sync.")


@recurring_bp.route("/auto-sync/disable", methods=["POST"])
@api_handler(handle_mfa=False)
def disable_auto_sync():
    """Disable automatic background sync."""
    services = get_services()
    result = services.sync_service.disable_auto_sync()
    audit_log(services.security_service, "AUTO_SYNC_DISABLE", result.get("success", False), "")
    return sanitize_api_result(result, "Failed to disable auto-sync.")


# ---- NOTICES ENDPOINTS ----


@recurring_bp.route("/notices", methods=["GET"])
@api_handler(handle_mfa=False)
def get_notices():
    """Get all active (undismissed) notices for removed recurring items."""
    services = get_services()
    notices = services.sync_service.state_manager.get_active_notices()
    return {
        "notices": [
            {
                "id": n.id,
                "recurring_id": n.recurring_id,
                "name": n.name,
                "category_name": n.category_name,
                "was_rollup": n.was_rollup,
                "removed_at": n.removed_at,
            }
            for n in notices
        ]
    }


@recurring_bp.route("/notices/<notice_id>/dismiss", methods=["POST"])
@api_handler(handle_mfa=False)
def dismiss_notice(notice_id):
    """Dismiss a notice by its ID."""
    services = get_services()
    result = services.sync_service.state_manager.dismiss_notice(notice_id)
    if not result:
        raise MonarchTrackerError("Notice not found", code="NOT_FOUND")
    return {"success": True}


# ---- ITEM MANAGEMENT ENDPOINTS ----


@recurring_bp.route("/refresh-item", methods=["POST"])
@api_handler(handle_mfa=False)
def refresh_item():
    """Clear frozen target for an item to force recalculation."""
    services = get_services()
    data = request.get_json()
    recurring_id = data.get("recurring_id")

    if not recurring_id:
        raise ValidationError("Missing 'recurring_id'")

    result = services.sync_service.state_manager.clear_frozen_target(recurring_id)
    return {"success": result}


@recurring_bp.route("/ready-to-assign", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_ready_to_assign():
    """Get the ready to assign (unbudgeted) amount."""
    services = get_services()
    return await services.sync_service.get_ready_to_assign()


@recurring_bp.route("/allocate", methods=["POST"])
@api_handler(handle_mfa=True)
async def allocate_funds():
    """Allocate funds to a recurring item's category."""
    services = get_services()
    data = request.get_json()
    recurring_id = data.get("recurring_id")
    amount = data.get("amount", 0)

    if not recurring_id:
        raise ValidationError("Missing 'recurring_id'")

    return await services.sync_service.allocate_funds(recurring_id, amount)


@recurring_bp.route("/recreate-category", methods=["POST"])
@api_handler(handle_mfa=True)
async def recreate_category():
    """Recreate a missing category for a recurring item."""
    services = get_services()
    data = request.get_json()
    recurring_id = data.get("recurring_id")

    if not recurring_id:
        raise ValidationError("Missing 'recurring_id'")

    return await services.sync_service.recreate_category(recurring_id)


@recurring_bp.route("/change-group", methods=["POST"])
@api_handler(handle_mfa=True)
async def change_category_group():
    """Move a subscription's category to a different group."""
    services = get_services()
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    new_group_id = sanitize_id(data.get("group_id"))
    new_group_name = sanitize_name(data.get("group_name", ""))

    if not recurring_id or not new_group_id:
        raise ValidationError("Missing 'recurring_id' or 'group_id'")

    result = await services.sync_service.change_category_group(
        recurring_id, new_group_id, new_group_name
    )
    return result


# ---- CATEGORY LINKING ENDPOINTS ----


@recurring_bp.route("/unmapped-categories", methods=["GET"])
@api_handler(handle_mfa=True, success_wrapper="categories")
async def get_unmapped_categories():
    """Get all categories that are not mapped to any recurring item."""
    services = get_services()
    return await services.sync_service.get_unmapped_categories()


@recurring_bp.route("/link-category", methods=["POST"])
@api_handler(handle_mfa=True)
async def link_category():
    """Link a recurring item to an existing category."""
    services = get_services()
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    category_id = sanitize_id(data.get("category_id"))
    sync_name = data.get("sync_name", True)

    if not recurring_id or not category_id:
        raise ValidationError("Missing 'recurring_id' or 'category_id'")

    result = await services.sync_service.link_to_category(recurring_id, category_id, sync_name)
    return result


@recurring_bp.route("/clear-category-cache", methods=["POST"])
@api_handler(handle_mfa=False)
def clear_category_cache():
    """Clear the category cache to force a fresh fetch from Monarch."""
    services = get_services()
    return services.sync_service.clear_category_cache()


# ---- ROLLUP ENDPOINTS ----


@recurring_bp.route("/rollup", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_rollup():
    """Get current rollup state and items."""
    services = get_services()
    return await services.sync_service.get_rollup_data()


@recurring_bp.route("/rollup/add", methods=["POST"])
@api_handler(handle_mfa=True)
async def add_to_rollup():
    """Add a subscription to the rollup."""
    services = get_services()
    data = request.get_json()
    recurring_id = data.get("recurring_id")

    if not recurring_id:
        raise ValidationError("Missing 'recurring_id'")

    return await services.sync_service.add_to_rollup(recurring_id)


@recurring_bp.route("/rollup/remove", methods=["POST"])
@api_handler(handle_mfa=True)
async def remove_from_rollup():
    """Remove a subscription from the rollup."""
    services = get_services()
    data = request.get_json()
    recurring_id = data.get("recurring_id")

    if not recurring_id:
        raise ValidationError("Missing 'recurring_id'")

    return await services.sync_service.remove_from_rollup(recurring_id)


@recurring_bp.route("/rollup/budget", methods=["POST"])
@api_handler(handle_mfa=True)
async def set_rollup_budget():
    """Set the rollup budget amount."""
    services = get_services()
    data = request.get_json()
    amount = data.get("amount", 0)
    return await services.sync_service.set_rollup_budget(amount)


@recurring_bp.route("/rollup/link", methods=["POST"])
@api_handler(handle_mfa=True)
async def link_rollup_to_category():
    """Link the rollup to an existing Monarch category."""
    services = get_services()
    data = request.get_json()
    category_id = data.get("category_id")
    sync_name = data.get("sync_name", True)

    if not category_id:
        raise ValidationError("Missing 'category_id'")

    return await services.sync_service.rollup_service.link_rollup_to_category(
        category_id, sync_name
    )


@recurring_bp.route("/rollup/create", methods=["POST"])
@api_handler(handle_mfa=True)
async def create_rollup_category():
    """Explicitly create the rollup category in Monarch."""
    services = get_services()
    data = request.get_json()
    budget = data.get("budget", 0)
    return await services.sync_service.rollup_service.create_rollup_category(budget)


# ---- EMOJI ENDPOINTS ----


@recurring_bp.route("/emoji", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_category_emoji():
    """Update the emoji for a category."""
    services = get_services()
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    emoji = sanitize_emoji(data.get("emoji", "🔄"))

    if not recurring_id:
        raise ValidationError("Missing 'recurring_id'")

    result = await services.sync_service.update_category_emoji(recurring_id, emoji)
    return result


@recurring_bp.route("/rollup/emoji", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_rollup_emoji():
    """Update the emoji for the rollup category."""
    services = get_services()
    data = request.get_json()
    emoji = sanitize_emoji(data.get("emoji", "🔄"))
    return await services.sync_service.update_rollup_emoji(emoji)


@recurring_bp.route("/rollup/name", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_rollup_name():
    """Update the name for the rollup category."""
    services = get_services()
    data = request.get_json()
    name = data.get("name", "Rollup Category")
    return await services.sync_service.update_rollup_category_name(name)


@recurring_bp.route("/category-name", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_category_name():
    """Update the name for a category."""
    services = get_services()
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    name = sanitize_name(data.get("name"))

    if not recurring_id or not name:
        raise ValidationError("Missing 'recurring_id' or 'name'")

    result = await services.sync_service.update_category_name(recurring_id, name)
    # Explicit sanitization for CodeQL - prevents reflected XSS
    return sanitize_response(result)


# ---- UNINSTALL ENDPOINTS ----


@recurring_bp.route("/reset-dedicated", methods=["POST"])
@api_handler(handle_mfa=True)
async def reset_dedicated_categories():
    """
    Reset the dedicated categories feature.

    - Deletes all app-created dedicated categories from Monarch
    - Disables all non-rollup items
    - Preserves: rollup, config, credentials
    """
    services = get_services()
    result = await services.sync_service.reset_dedicated_categories()
    audit_log(
        services.security_service,
        "RESET_DEDICATED",
        result.get("success", False),
        f"deleted={result.get('deleted_count', 0)}, untracked={result.get('items_disabled', 0)}",
    )
    return sanitize_api_result(result, "Failed to reset dedicated categories.")


@recurring_bp.route("/reset-rollup", methods=["POST"])
@api_handler(handle_mfa=True)
async def reset_rollup():
    """
    Reset the rollup feature.

    - Deletes the rollup category from Monarch (if app-created)
    - Disables all items that were in rollup
    - Preserves: dedicated categories, config, credentials
    """
    services = get_services()
    result = await services.sync_service.reset_rollup()
    audit_log(
        services.security_service,
        "RESET_ROLLUP",
        result.get("success", False),
        f"deleted_category={result.get('deleted_category', False)}, untracked={result.get('items_disabled', 0)}",
    )
    # Sanitize all error messages to prevent stack trace exposure
    return sanitize_api_result(result, "Reset rollup failed. Please try again.")


@recurring_bp.route("/reset-tool", methods=["POST"])
@api_handler(handle_mfa=True)
async def reset_recurring_tool():
    """
    Full reset of the Recurring tool.
    Deletes all categories, disables all items, and resets the setup wizard.
    """
    services = get_services()
    result = await services.sync_service.reset_recurring_tool()
    audit_log(
        services.security_service,
        "RESET_RECURRING_TOOL",
        result.get("success", False),
        f"dedicated_deleted={result.get('dedicated_deleted', 0)}, rollup_deleted={result.get('rollup_deleted', False)}",
    )
    # Sanitize all error messages to prevent stack trace exposure
    return sanitize_api_result(result, "Reset failed. Please try again.")


@recurring_bp.route("/deletable-categories", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_deletable_categories():
    """Get categories that can be deleted (created by this tool, not linked)."""
    services = get_services()
    return await services.sync_service.get_deletable_categories()


@recurring_bp.route("/delete-all-categories", methods=["POST"])
@api_handler(handle_mfa=True)
async def delete_all_categories():
    """Delete all categories created by this tool and reset state."""
    services = get_services()
    result = await services.sync_service.delete_all_categories()
    return sanitize_api_result(result, "Failed to delete categories.")


@recurring_bp.route("/cancel-subscription", methods=["POST"])
@api_handler(handle_mfa=True)
async def cancel_subscription():
    """
    Full uninstall flow:
    1. Optionally delete all Monarch categories created by this tool
    2. Clear all local state and credentials
    3. Reset config to trigger setup wizard on next visit
    """
    services = get_services()
    data = request.get_json() or {}
    delete_categories = data.get("delete_categories", True)
    full_reset = data.get("full_reset", False)

    steps_completed: list[str] = []
    instructions: list[str] = []

    # Step 0: Full reset (if requested) - resets all recurring data
    if full_reset:
        try:
            reset_result = await services.sync_service.reset_recurring_tool()
            if reset_result.get("success"):
                steps_completed.append("full_reset_completed")
                # Full reset already deletes categories, so skip step 1
                delete_categories = False
        except Exception as e:
            logger.warning(f"[CANCEL] Failed to perform full reset: {e}")

    # Step 1: Delete Monarch categories (if requested and not already done by full reset)
    if delete_categories:
        try:
            delete_result = await services.sync_service.delete_all_categories()
            if delete_result.get("success"):
                steps_completed.append("monarch_categories_deleted")
        except Exception as e:
            logger.warning(f"[CANCEL] Failed to delete Monarch categories: {e}")
            # Continue anyway - user may have already deleted them
    elif "full_reset_completed" not in steps_completed:
        steps_completed.append("monarch_categories_kept")

    # Step 2: Clear credentials and logout
    try:
        services.sync_service.logout()
        steps_completed.append("credentials_cleared")
    except Exception as e:
        logger.warning(f"[CANCEL] Failed to clear credentials: {e}")

    # Step 3: Reset config to trigger setup wizard on next visit
    try:
        services.sync_service.state_manager.reset_config()
        steps_completed.append("config_reset")
    except Exception as e:
        logger.warning(f"[CANCEL] Failed to reset config: {e}")

    if "full_reset_completed" in steps_completed:
        categories_msg = "All recurring data and categories have been reset."
    elif "monarch_categories_deleted" in steps_completed:
        categories_msg = "Categories deleted from Monarch."
    else:
        categories_msg = "Categories kept in Monarch."

    is_desktop = config.is_desktop_environment()
    data_cleared_msg = "App data has been cleared."

    result: dict[str, Any] = {
        "success": True,
        "steps_completed": steps_completed,
        "instructions": instructions,
        "is_desktop": is_desktop,
    }

    if is_desktop:
        result["instructions"] = [
            categories_msg,
            data_cleared_msg,
        ]
    else:
        result["instructions"] = [
            categories_msg,
            data_cleared_msg,
        ]

    audit_log(services.security_service, "CANCEL_SUBSCRIPTION", True, f"Steps: {steps_completed}")

    return result


@recurring_bp.route("/deployment-info", methods=["GET"])
@api_handler(handle_mfa=False)
def get_deployment_info():
    """Get information about the current deployment for cancellation UI."""
    is_desktop = config.is_desktop_environment()
    is_container = config.is_container_environment()

    if is_desktop:
        deployment_type = "desktop"
    elif is_container:
        deployment_type = "docker"
    else:
        deployment_type = "local"

    return {
        "deployment_type": deployment_type,
    }
