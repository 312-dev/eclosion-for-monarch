# Notes blueprint
# /notes/* endpoints for monthly notes feature

import re

from flask import Blueprint, request

from core import api_handler, sanitize_id, sanitize_name
from core.exceptions import ValidationError

from . import get_services

notes_bp = Blueprint("notes", __name__, url_prefix="/notes")


@notes_bp.route("/month/<month_key>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_month_notes(month_key: str):
    """
    Get all notes for a specific month with inheritance resolved.

    Returns notes, general month note, and metadata.
    """
    # Validate month_key format (YYYY-MM)
    if not re.match(r"^\d{4}-\d{2}$", month_key):
        raise ValidationError("Invalid month_key format. Expected YYYY-MM.")

    services = get_services()
    return services.notes_manager.get_all_notes_for_month(month_key)


@notes_bp.route("/all", methods=["GET"])
@api_handler(handle_mfa=False)
def get_all_notes():
    """
    Get all notes data for bulk loading.

    Returns all raw notes and general notes so the frontend can compute
    effective notes for any month instantly without additional API calls.
    This enables immediate page navigation in the notes feature.
    """
    services = get_services()
    return services.notes_manager.get_all_notes()


@notes_bp.route("/categories", methods=["GET"])
@api_handler(handle_mfa=True, success_wrapper="groups")
async def get_notes_categories():
    """
    Get all Monarch categories organized by group for the Notes feature.

    Returns all category groups with their categories, not filtered by
    recurring expenses or any other criteria.
    """
    services = get_services()
    return await services.sync_service.get_all_categories_grouped()


@notes_bp.route("/category", methods=["POST"])
@api_handler(handle_mfa=False)
def save_category_note():
    """Save or update a note for a category or group."""
    data = request.get_json()

    category_type = data.get("category_type")
    category_id = sanitize_id(data.get("category_id"))
    category_name = sanitize_name(data.get("category_name"))
    month_key = data.get("month_key")
    content = data.get("content", "")
    group_id = sanitize_id(data.get("group_id")) if data.get("group_id") else None
    group_name = sanitize_name(data.get("group_name")) if data.get("group_name") else None

    # Validate required fields
    if not category_type or category_type not in ("group", "category"):
        raise ValidationError("Invalid category_type. Must be 'group' or 'category'.")

    if not category_id or not category_name:
        raise ValidationError("Missing category_id or category_name.")

    if not month_key or not re.match(r"^\d{4}-\d{2}$", month_key):
        raise ValidationError("Invalid month_key format. Expected YYYY-MM.")

    services = get_services()
    note = services.notes_manager.save_note(
        category_type=category_type,
        category_id=category_id,
        category_name=category_name,
        month_key=month_key,
        content=content,
        group_id=group_id,
        group_name=group_name,
    )

    return {
        "success": True,
        "note": services.notes_manager._serialize_note(note),
    }


@notes_bp.route("/category/<note_id>", methods=["DELETE"])
@api_handler(handle_mfa=False)
def delete_category_note(note_id: str):
    """Delete a category note by ID."""
    safe_note_id = sanitize_id(note_id)
    if not safe_note_id:
        raise ValidationError("Invalid note_id.")
    note_id = safe_note_id

    services = get_services()
    deleted = services.notes_manager.delete_note(note_id)
    return {"success": deleted}


@notes_bp.route("/general/<month_key>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_general_note(month_key: str):
    """Get general note for a specific month."""
    if not re.match(r"^\d{4}-\d{2}$", month_key):
        raise ValidationError("Invalid month_key format. Expected YYYY-MM.")

    services = get_services()
    note = services.notes_manager.get_general_note(month_key)
    if note:
        return {"note": services.notes_manager._serialize_general_note(note)}
    return {"note": None}


@notes_bp.route("/general", methods=["POST"])
@api_handler(handle_mfa=False)
def save_general_note():
    """Save or update a general note for a month."""
    data = request.get_json()

    month_key = data.get("month_key")
    content = data.get("content", "")

    if not month_key or not re.match(r"^\d{4}-\d{2}$", month_key):
        raise ValidationError("Invalid month_key format. Expected YYYY-MM.")

    services = get_services()
    note = services.notes_manager.save_general_note(month_key, content)
    return {
        "success": True,
        "note": services.notes_manager._serialize_general_note(note),
    }


@notes_bp.route("/general/<month_key>", methods=["DELETE"])
@api_handler(handle_mfa=False)
def delete_general_note(month_key: str):
    """Delete general note for a month."""
    if not re.match(r"^\d{4}-\d{2}$", month_key):
        raise ValidationError("Invalid month_key format. Expected YYYY-MM.")

    services = get_services()
    deleted = services.notes_manager.delete_general_note(month_key)
    return {"success": deleted}


@notes_bp.route("/archived", methods=["GET"])
@api_handler(handle_mfa=False)
def get_archived_notes():
    """Get all archived notes."""
    services = get_services()
    archived = services.notes_manager.get_archived_notes()
    return {"archived_notes": [services.notes_manager._serialize_archived(n) for n in archived]}


@notes_bp.route("/archived/<note_id>", methods=["DELETE"])
@api_handler(handle_mfa=False)
def delete_archived_note(note_id: str):
    """Permanently delete an archived note."""
    safe_note_id = sanitize_id(note_id)
    if not safe_note_id:
        raise ValidationError("Invalid note_id.")
    note_id = safe_note_id

    services = get_services()
    deleted = services.notes_manager.delete_archived_note(note_id)
    return {"success": deleted}


@notes_bp.route("/sync-categories", methods=["POST"])
@api_handler(handle_mfa=True)
async def sync_notes_categories():
    """
    Sync known categories with current Monarch categories.

    Detects deleted categories and archives their notes.
    """
    services = get_services()

    # Get current categories from Monarch (with nested categories)
    groups = await services.sync_service.get_all_categories_grouped()

    # Extract all category IDs (both groups and categories)
    current_ids: set[str] = set()
    for group in groups:
        group_id = group.get("id")
        if group_id:
            current_ids.add(group_id)
        # Add category IDs from this group
        for cat in group.get("categories", []):
            cat_id = cat.get("id")
            if cat_id:
                current_ids.add(cat_id)

    result = services.notes_manager.sync_categories(current_ids)
    return {"success": True, **result}


@notes_bp.route("/history/<category_type>/<category_id>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_note_history(category_type: str, category_id: str):
    """Get revision history for a category or group's notes."""
    if category_type not in ("group", "category"):
        raise ValidationError("Invalid category_type. Must be 'group' or 'category'.")

    safe_category_id = sanitize_id(category_id)
    if not safe_category_id:
        raise ValidationError("Invalid category_id.")
    category_id = safe_category_id

    services = get_services()
    history = services.notes_manager.get_revision_history(category_type, category_id)
    return {"history": history}


# ---- CHECKBOX STATE ENDPOINTS ----


@notes_bp.route("/checkboxes/<note_id>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_checkbox_states(note_id: str):
    """
    Get checkbox states for a category note.

    Query params:
    - viewing_month: YYYY-MM (required) - the month the user is viewing
    """
    safe_note_id = sanitize_id(note_id)
    if not safe_note_id:
        raise ValidationError("Invalid note_id.")
    note_id = safe_note_id

    viewing_month = request.args.get("viewing_month")
    if not viewing_month or not re.match(r"^\d{4}-\d{2}$", viewing_month):
        raise ValidationError("Invalid viewing_month format. Expected YYYY-MM.")

    services = get_services()
    states = services.notes_manager.get_checkbox_states(
        note_id=note_id,
        general_note_month_key=None,
        viewing_month=viewing_month,
    )
    return {"states": states}


@notes_bp.route("/checkboxes/general/<month_key>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_general_checkbox_states(month_key: str):
    """
    Get checkbox states for a general note.

    Query params:
    - viewing_month: YYYY-MM (required) - the month the user is viewing
    """
    if not re.match(r"^\d{4}-\d{2}$", month_key):
        raise ValidationError("Invalid month_key format. Expected YYYY-MM.")

    viewing_month = request.args.get("viewing_month", month_key)
    if not re.match(r"^\d{4}-\d{2}$", viewing_month):
        raise ValidationError("Invalid viewing_month format. Expected YYYY-MM.")

    services = get_services()
    states = services.notes_manager.get_checkbox_states(
        note_id=None,
        general_note_month_key=month_key,
        viewing_month=viewing_month,
    )
    return {"states": states}


@notes_bp.route("/checkboxes", methods=["POST"])
@api_handler(handle_mfa=False)
def update_checkbox_state():
    """
    Update a checkbox state.

    Body: {
        "note_id": "uuid",  // For category notes (mutually exclusive with general_note_month_key)
        "general_note_month_key": "2025-01",  // For general notes
        "viewing_month": "2025-01",
        "checkbox_index": 0,
        "is_checked": true
    }
    """
    data = request.get_json()

    note_id = sanitize_id(data.get("note_id")) if data.get("note_id") else None
    general_note_month_key = data.get("general_note_month_key")
    viewing_month = data.get("viewing_month")
    checkbox_index = data.get("checkbox_index")
    is_checked = data.get("is_checked")

    # Validate viewing_month
    if not viewing_month or not re.match(r"^\d{4}-\d{2}$", viewing_month):
        raise ValidationError("Invalid viewing_month format. Expected YYYY-MM.")

    # Validate general_note_month_key if provided
    if general_note_month_key and not re.match(r"^\d{4}-\d{2}$", general_note_month_key):
        raise ValidationError("Invalid general_note_month_key format. Expected YYYY-MM.")

    # Must have either note_id or general_note_month_key
    if not note_id and not general_note_month_key:
        raise ValidationError("Must provide either note_id or general_note_month_key.")

    # Validate checkbox_index
    if checkbox_index is None or not isinstance(checkbox_index, int) or checkbox_index < 0:
        raise ValidationError("Invalid checkbox_index. Must be a non-negative integer.")

    # Validate is_checked
    if is_checked is None or not isinstance(is_checked, bool):
        raise ValidationError("Invalid is_checked. Must be a boolean.")

    services = get_services()
    states = services.notes_manager.set_checkbox_state(
        note_id=note_id,
        general_note_month_key=general_note_month_key,
        viewing_month=viewing_month,
        checkbox_index=checkbox_index,
        is_checked=is_checked,
    )
    return {"success": True, "states": states}


@notes_bp.route("/checkboxes/month/<month_key>", methods=["GET"])
@api_handler(handle_mfa=False)
def get_month_checkbox_states(month_key: str):
    """
    Get all checkbox states for a given month.

    More efficient than fetching per-note.
    """
    if not re.match(r"^\d{4}-\d{2}$", month_key):
        raise ValidationError("Invalid month_key format. Expected YYYY-MM.")

    services = get_services()
    states = services.notes_manager.get_all_checkbox_states_for_month(month_key)
    return {"states": states}


@notes_bp.route("/settings", methods=["GET"])
@api_handler(handle_mfa=False)
def get_notes_settings():
    """Get notes settings including checkbox mode."""
    services = get_services()
    settings = services.notes_manager.get_notes_settings()
    return {"settings": settings}


@notes_bp.route("/settings", methods=["POST"])
@api_handler(handle_mfa=False)
def update_notes_settings():
    """
    Update notes settings.

    Body: {
        "checkbox_mode": "persist" | "reset"
    }
    """
    data = request.get_json()

    checkbox_mode = data.get("checkbox_mode")
    if checkbox_mode and checkbox_mode not in ("persist", "reset"):
        raise ValidationError("Invalid checkbox_mode. Must be 'persist' or 'reset'.")

    services = get_services()
    settings = services.notes_manager.update_notes_settings(checkbox_mode=checkbox_mode)
    return {"success": True, "settings": settings}
