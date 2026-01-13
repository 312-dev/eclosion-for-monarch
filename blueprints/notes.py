# Notes blueprint
# /notes/* endpoints for monthly notes feature

import re

from flask import Blueprint, request, session

from core import api_handler, sanitize_id, sanitize_name
from core.exceptions import ValidationError

from . import get_services

notes_bp = Blueprint("notes", __name__, url_prefix="/notes")


def _get_passphrase() -> str:
    """Get passphrase from session. Raises if not available."""
    passphrase: str | None = session.get("session_passphrase")
    if not passphrase:
        raise ValidationError("Session expired. Please unlock again.")
    return passphrase


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
    passphrase = _get_passphrase()
    return services.notes_manager.get_all_notes_for_month(month_key, passphrase)


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
    passphrase = _get_passphrase()
    return services.notes_manager.get_all_notes(passphrase)


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
    passphrase = _get_passphrase()
    note = services.notes_manager.save_note(
        passphrase=passphrase,
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
        "note": note,
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
    passphrase = _get_passphrase()
    note = services.notes_manager.get_general_note(month_key, passphrase)
    return {"note": note}


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
    passphrase = _get_passphrase()
    note = services.notes_manager.save_general_note(month_key, content, passphrase)
    return {
        "success": True,
        "note": note,
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
    passphrase = _get_passphrase()
    archived = services.notes_manager.get_archived_notes(passphrase)
    return {"archived_notes": archived}


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
    passphrase = _get_passphrase()

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

    result = services.notes_manager.sync_categories(current_ids, passphrase)
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
    passphrase = _get_passphrase()
    history = services.notes_manager.get_revision_history(category_type, category_id, passphrase)
    return {"history": history}
