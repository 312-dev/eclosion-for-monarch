# Settings blueprint
# /settings/* endpoints for export/import functionality

from flask import Blueprint, request
from markupsafe import escape as markupsafe_escape

from core import api_handler

from . import get_services


def _sanitize_errors(errors: list[str]) -> list[str]:
    """Sanitize error messages to prevent XSS.

    Uses markupsafe.escape which CodeQL recognizes as a sanitization barrier.
    """
    return [str(markupsafe_escape(e)) for e in errors]


def _sanitize_preview(preview: dict) -> dict:
    """Sanitize preview data to prevent XSS.

    Uses markupsafe.escape which CodeQL recognizes as a sanitization barrier.
    """
    sanitized: dict = {}
    for key, value in preview.items():
        if isinstance(value, str):
            sanitized[key] = str(markupsafe_escape(value))
        elif isinstance(value, dict):
            sanitized[key] = _sanitize_preview(value)
        elif isinstance(value, list):
            sanitized[key] = [
                str(markupsafe_escape(item)) if isinstance(item, str) else item for item in value
            ]
        else:
            sanitized[key] = value
    return sanitized


settings_bp = Blueprint("settings", __name__, url_prefix="/settings")


@settings_bp.route("/export", methods=["GET"])
@api_handler(handle_mfa=False)
def export_settings():
    """
    Export user settings and tool configurations as JSON (plaintext).

    Returns a portable backup that can be imported later.
    Excludes credentials and runtime state.

    SECURITY NOTE: This endpoint EXCLUDES the notes tool because notes content
    is encrypted and should not be exposed in plaintext exports. Use the
    /export-encrypted endpoint for full backups including notes.
    """
    from services.settings_export_service import SettingsExportService

    services = get_services()
    export_service = SettingsExportService(services.sync_service.state_manager)
    # Explicitly exclude notes from plaintext exports (security requirement)
    result = export_service.export_settings(
        include_notes=False,  # Notes require encrypted export
        include_wishlist=True,
    )

    if result.success:
        return result.data
    else:
        return {"success": False, "error": result.error or "Export failed"}, 500


@settings_bp.route("/import", methods=["POST"])
@api_handler(handle_mfa=False)
def import_settings():
    """
    Import settings from a previously exported backup.

    Body: {
        "data": { ... },  # The export data
        "options": {
            "tools": ["recurring", "notes", "wishlist"],  # Optional: specific tools
            "passphrase": "email+password"  # Required for notes import
        }
    }

    Note: If the export contains notes and passphrase is not provided,
    notes will be skipped with a warning.
    """
    from services.settings_export_service import SettingsExportService

    services = get_services()
    request_data = request.get_json()
    if not request_data or "data" not in request_data:
        return {"success": False, "error": "Missing 'data' in request body"}, 400

    export_data = request_data["data"]
    options = request_data.get("options", {})
    tools = options.get("tools")
    passphrase = options.get("passphrase")

    export_service = SettingsExportService(services.sync_service.state_manager)
    result = export_service.import_settings(
        data=export_data,
        tools=tools,
        passphrase=passphrase,
    )

    return {
        "success": result.success,
        "imported": result.imported,
        "warnings": result.warnings,
        "error": result.error,
    }


@settings_bp.route("/import/preview", methods=["POST"])
@api_handler(handle_mfa=False)
def preview_import():
    """
    Preview what would be imported from an export file.

    Body: { "data": { ... } }
    Returns a summary of tools and item counts.
    """
    from services.settings_export_service import SettingsExportService

    services = get_services()
    request_data = request.get_json()
    if not request_data or "data" not in request_data:
        return {"success": False, "error": "Missing 'data' in request body"}, 400

    export_data = request_data["data"]
    export_service = SettingsExportService(services.sync_service.state_manager)

    # Validate first
    is_valid, errors = export_service.validate_import(export_data)
    if not is_valid:
        # Sanitize error messages with markupsafe.escape for CodeQL recognition
        return {"success": False, "valid": False, "errors": _sanitize_errors(errors)}, 400

    preview = export_service.get_export_preview(export_data)
    # Sanitize preview with markupsafe.escape for CodeQL recognition
    return {"success": True, "valid": True, "preview": _sanitize_preview(preview)}


@settings_bp.route("/export-encrypted", methods=["POST"])
@api_handler(handle_mfa=False)
def export_settings_encrypted():
    """
    Export user settings as encrypted JSON for auto-backup.

    Body: {
        "passphrase": "email+password"  # Encryption passphrase
    }

    Returns: {
        "success": true,
        "salt": "base64 salt",
        "data": "base64 encrypted JSON"
    }
    """
    from services.encrypted_export_service import EncryptedExportService

    request_data = request.get_json()
    if not request_data or "passphrase" not in request_data:
        return {"success": False, "error": "Missing 'passphrase' in request body"}, 400

    passphrase = request_data["passphrase"]
    app_settings = request_data.get("app_settings")

    export_service = EncryptedExportService()
    result = export_service.export_encrypted(passphrase, app_settings)

    if result.success:
        return {
            "success": True,
            "salt": result.salt,
            "data": result.data,
        }
    else:
        return {"success": False, "error": result.error or "Encrypted export failed"}, 500


@settings_bp.route("/import-encrypted", methods=["POST"])
@api_handler(handle_mfa=False)
def import_settings_encrypted():
    """
    Import settings from an encrypted backup.

    Body: {
        "salt": "base64 salt",
        "data": "base64 encrypted JSON",
        "passphrase": "email+password",
        "options": {
            "tools": ["recurring"]  # Optional: specific tools to import
        }
    }

    Returns: {
        "success": true/false,
        "needs_credentials": false,  # True if decryption failed
        "imported": { "recurring": true },
        "warnings": [],
        "error": null
    }
    """
    from services.encrypted_export_service import EncryptedExportService

    request_data = request.get_json()
    if not request_data:
        return {"success": False, "error": "Missing request body"}, 400

    required_fields = ["salt", "data", "passphrase"]
    for field in required_fields:
        if field not in request_data:
            return {"success": False, "error": f"Missing '{field}' in request body"}, 400

    salt = request_data["salt"]
    encrypted_data = request_data["data"]
    passphrase = request_data["passphrase"]
    options = request_data.get("options", {})
    tools = options.get("tools")

    export_service = EncryptedExportService()
    result = export_service.import_encrypted(salt, encrypted_data, passphrase, tools)

    return {
        "success": result.success,
        "needs_credentials": result.needs_credentials,
        "imported": result.imported,
        "warnings": result.warnings,
        "error": result.error,
    }
