# Security audit logging
# Extracted from api.py for use in blueprints

import logging
from typing import TYPE_CHECKING

from flask import request

if TYPE_CHECKING:
    from services.security_service import SecurityService

logger = logging.getLogger(__name__)


def _sanitize_log_value(value: str | None) -> str:
    """Sanitize a value for safe logging by removing control characters."""
    if value is None:
        return "unknown"
    # Remove newlines and carriage returns to prevent log injection
    # Using .replace() as it's recognized by static analysis tools as sanitization
    result = str(value)
    result = result.replace("\r\n", "").replace("\n", "").replace("\r", "")
    # Also remove null bytes and other control characters
    result = result.replace("\x00", "").replace("\t", " ")
    return result[:100]


def audit_log(
    security_service: "SecurityService",
    event: str,
    success: bool,
    details: str = "",
) -> None:
    """Log security-relevant events for audit trail.

    Args:
        security_service: Service instance for persisting events to SQLite
        event: Event type (LOGIN, LOGOUT, MFA_*, SESSION_*, RESET_*, etc.)
        success: Whether the operation succeeded
        details: Additional context (will be sanitized)

    Note: Use hardcoded event names only - never pass user input to event parameter.
    Valid events: LOGIN, LOGOUT, MFA_*, SESSION_*, RESET_*, INSTANCE_*, UNLOCK, PASSPHRASE_*
    """
    status = "SUCCESS" if success else "FAILED"
    # Get client IP, sanitize and use repr() to prevent log injection
    # repr() is recognized by static analyzers as a sanitization barrier
    raw_ip = request.headers.get("X-Forwarded-For", request.remote_addr) or "unknown"
    safe_ip = repr(_sanitize_log_value(raw_ip))
    safe_details = repr(_sanitize_log_value(details)) if details else "''"
    # Use %-style formatting with repr'd values for CodeQL compatibility
    logger.info("[AUDIT] %s | %s | IP: %s | Details: %s", event, status, safe_ip, safe_details)

    # Store event in SQLite database for security panel
    user_agent = request.headers.get("User-Agent", "")[:256]
    ip_address = raw_ip.split(",")[0].strip() if raw_ip != "unknown" else None
    security_service.log_event(
        event_type=event,
        success=success,
        ip_address=ip_address,
        details=_sanitize_log_value(details)[:500] if details else None,
        user_agent=user_agent,
    )
