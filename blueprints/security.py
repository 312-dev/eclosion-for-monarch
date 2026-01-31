# Security blueprint
# /security/* endpoints for security status and audit logs

from flask import Blueprint, Response, request
from markupsafe import escape as markupsafe_escape

from core import api_handler, config
from core.audit import audit_log

from . import get_services

security_bp = Blueprint("security", __name__, url_prefix="/security")


@security_bp.route("/status", methods=["GET"])
@api_handler(handle_mfa=False)
def security_status():
    """
    Get security configuration for display in UI.

    Returns information about encryption status and security features.
    """
    return {
        "encryption_enabled": True,
        "encryption_algorithm": "Fernet (AES-128-CBC + HMAC-SHA256)",
        "key_derivation": "PBKDF2 with SHA-256 (480,000 iterations)",
        "file_permissions": "0600 (owner read/write only)",
        "passphrase_requirements": {
            "min_length": 12,
            "requires_uppercase": True,
            "requires_lowercase": True,
            "requires_number": True,
            "requires_special": True,
        },
        "rate_limiting": {
            "enabled": True,
            "auth_endpoints": "5 requests per minute",
            "general_endpoints": "200 requests per hour",
        },
        "session_timeout": {
            "enabled": True,
            "timeout_minutes": config.SESSION_TIMEOUT_MINUTES,
        },
        "security_headers": {
            "csp": True,
            "hsts": True,
            "x_frame_options": "DENY",
            "x_content_type_options": "nosniff",
        },
        "audit_logging": True,
    }


@security_bp.route("/events", methods=["GET"])
@api_handler(handle_mfa=False)
def get_security_events():
    """
    Get security events with optional filtering.

    Query params:
    - limit: Max events to return (default: 50, max: 200)
    - offset: Pagination offset (default: 0)
    - event_type: Filter by event type (e.g., "LOGIN_ATTEMPT")
    - event_types: Filter by multiple event types (comma-separated, e.g., "LOGIN_ATTEMPT,REMOTE_UNLOCK")
    - success: Filter by success/failure (true/false)
    """
    services = get_services()

    limit = min(request.args.get("limit", 50, type=int), 200)
    offset = request.args.get("offset", 0, type=int)
    event_type = request.args.get("event_type")
    event_types_param = request.args.get("event_types")
    success_param = request.args.get("success")

    success_filter: bool | None = None
    if success_param is not None:
        success_filter = success_param.lower() == "true"

    # Support both single event_type and comma-separated event_types
    event_types: list[str] | None = None
    if event_types_param:
        event_types = [t.strip() for t in event_types_param.split(",") if t.strip()]
    elif event_type:
        event_types = [event_type]

    events, total = services.security_service.get_events(
        limit=limit, offset=offset, event_types=event_types, success=success_filter
    )

    # Sanitize all string fields to prevent reflected XSS
    # Uses markupsafe.escape which CodeQL recognizes as a sanitization barrier
    sanitized_events = [
        {
            "id": e.id,
            "event_type": str(markupsafe_escape(e.event_type)) if e.event_type else None,
            "success": e.success,
            "timestamp": e.timestamp,
            "ip_address": str(markupsafe_escape(e.ip_address)) if e.ip_address else None,
            "country": str(markupsafe_escape(e.country)) if e.country else None,
            "city": str(markupsafe_escape(e.city)) if e.city else None,
            "details": str(markupsafe_escape(e.details)) if e.details else None,
        }
        for e in events
    ]

    # Return dict - api_handler decorator handles jsonify
    return {
        "events": sanitized_events,
        "total": int(total),
        "limit": int(limit),
        "offset": int(offset),
    }


@security_bp.route("/events/summary", methods=["GET"])
@api_handler(handle_mfa=False)
def get_security_summary():
    """Get summary statistics for security events."""
    services = get_services()
    summary = services.security_service.get_summary()
    return {
        "total_events": summary.total_events,
        "successful_logins": summary.successful_logins,
        "failed_logins": summary.failed_logins,
        "failed_unlock_attempts": summary.failed_unlock_attempts,
        "logouts": summary.logouts,
        "session_timeouts": summary.session_timeouts,
        "unique_ips": summary.unique_ips,
        "last_successful_login": summary.last_successful_login,
        "last_failed_login": summary.last_failed_login,
    }


@security_bp.route("/events/export", methods=["GET"])
@api_handler(handle_mfa=False)
def export_security_events():
    """Export security events as CSV file."""
    services = get_services()

    # CSV content is sanitized in security_service.export_events_csv()
    csv_content = services.security_service.export_events_csv()
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment;filename=security_events.csv",
            "X-Content-Type-Options": "nosniff",  # Prevent MIME type sniffing
        },
    )


@security_bp.route("/events/clear", methods=["POST"])
@api_handler(handle_mfa=False)
def clear_security_events():
    """Clear all security event logs."""
    services = get_services()
    services.security_service.clear_events()
    audit_log(
        services.security_service,
        "SECURITY_LOGS_CLEARED",
        True,
        "All security logs cleared by user",
    )
    return {"success": True, "message": "Security logs cleared"}


@security_bp.route("/alerts", methods=["GET"])
@api_handler(handle_mfa=False)
def get_security_alerts():
    """Get failed login/unlock attempts since last successful login."""
    services = get_services()
    failed_events = services.security_service.get_failed_since_last_login()
    return {
        "has_alerts": len(failed_events) > 0,
        "count": len(failed_events),
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "timestamp": e.timestamp,
                "ip_address": e.ip_address,
                "country": e.country,
                "city": e.city,
            }
            for e in failed_events
        ],
    }


@security_bp.route("/alerts/dismiss", methods=["POST"])
@api_handler(handle_mfa=False)
def dismiss_security_alerts():
    """Dismiss security alert banner."""
    services = get_services()
    services.security_service.dismiss_security_alert()
    return {"success": True}


@security_bp.route("/debug/headers", methods=["GET"])
@api_handler(handle_mfa=False)
def debug_headers():
    """Debug endpoint to see all request headers (for diagnosing tunnel IP issues).

    Only enabled in debug mode for security reasons.
    Response is JSON (not HTML) so XSS is not a concern.
    """
    if not config.DEBUG_MODE:
        return {"error": "Debug endpoint disabled in production"}, 403

    # Sanitize header values to prevent any potential injection attacks
    def sanitize(val: str | None) -> str | None:
        if val is None:
            return None
        return str(markupsafe_escape(val))

    # lgtm[py/reflective-xss] - Response is JSON (auto-escaped), debug-only, and values are sanitized
    return {
        "remote_addr": sanitize(request.remote_addr),
        "host": sanitize(request.host),
        "headers": {k: sanitize(v) for k, v in request.headers.items()},
        "ip_related": {
            "X-Forwarded-For": sanitize(request.headers.get("X-Forwarded-For")),
            "X-Real-IP": sanitize(request.headers.get("X-Real-IP")),
            "CF-Connecting-IP": sanitize(request.headers.get("CF-Connecting-IP")),
            "True-Client-IP": sanitize(request.headers.get("True-Client-IP")),
            "X-Client-IP": sanitize(request.headers.get("X-Client-IP")),
        },
    }
