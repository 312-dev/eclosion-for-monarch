"""
Internal Blueprint
/internal/* endpoints for desktop<->Flask communication.

These endpoints are ONLY accessible from localhost with the desktop secret.
They are used for secure IPC between Electron and Flask.
"""

import logging

from flask import Blueprint, Response, request

from core import config
from core.middleware import clear_ifttt_secrets, set_ifttt_secrets

logger = logging.getLogger(__name__)

internal_bp = Blueprint("internal", __name__, url_prefix="/internal")


def _validate_desktop_secret() -> bool:
    """Validate the desktop secret header. Returns True if valid."""
    if not config.DESKTOP_SECRET:
        # Dev mode: no secret configured, allow local requests
        return True
    provided = request.headers.get("X-Desktop-Secret")
    if not provided:
        return False
    import secrets as secrets_module

    return secrets_module.compare_digest(provided, config.DESKTOP_SECRET)


@internal_bp.route("/ifttt-secrets", methods=["POST"])
def set_ifttt_secrets_endpoint() -> tuple[Response, int] | Response:
    """
    Receive IFTTT secrets from Electron and store in memory.

    This replaces file-based secret storage for improved security.
    Secrets are stored in-memory only and never written to disk.

    Request body:
    - action_secret: The per-subdomain IFTTT action secret
    - subdomain: The tunnel subdomain
    - management_key: The management key for broker auth
    """
    logger.info(
        f"[Internal] IFTTT secrets endpoint called, DESKTOP_SECRET configured: {bool(config.DESKTOP_SECRET)}"
    )
    if not _validate_desktop_secret():
        logger.warning("[Internal] IFTTT secrets endpoint: desktop secret validation failed")
        return Response('{"error": "Unauthorized"}', status=403, mimetype="application/json")

    data = request.get_json()
    if not data:
        return Response('{"error": "Missing JSON body"}', status=400, mimetype="application/json")

    action_secret = data.get("action_secret")
    subdomain = data.get("subdomain")
    management_key = data.get("management_key")

    set_ifttt_secrets(
        action_secret=action_secret,
        subdomain=subdomain,
        management_key=management_key,
    )

    logger.info(
        f"[Internal] IFTTT secrets updated via IPC: subdomain={subdomain}, hasManagementKey={bool(management_key)}"
    )
    return Response('{"success": true}', status=200, mimetype="application/json")


@internal_bp.route("/ifttt-secrets", methods=["DELETE"])
def clear_ifttt_secrets_endpoint() -> tuple[Response, int] | Response:
    """
    Clear IFTTT secrets from memory.

    Called when tunnel is stopped or IFTTT is disconnected.
    """
    if not _validate_desktop_secret():
        return Response('{"error": "Unauthorized"}', status=403, mimetype="application/json")

    clear_ifttt_secrets()
    logger.info("[Internal] IFTTT secrets cleared via IPC")
    return Response('{"success": true}', status=200, mimetype="application/json")
