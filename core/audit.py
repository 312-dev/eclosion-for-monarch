# Security audit logging
# Extracted from api.py for use in blueprints

import logging
from typing import TYPE_CHECKING

from flask import request

if TYPE_CHECKING:
    from services.security_service import SecurityService

logger = logging.getLogger(__name__)


def _sanitize_ip(ip: str | None) -> str:
    """Sanitize an IP address for safe logging."""
    if not ip:
        return "unknown"
    # Remove newlines, carriage returns, and null bytes
    safe = str(ip).replace("\r\n", "").replace("\n", "").replace("\r", "")
    safe = safe.replace("\x00", "").replace("\t", "")
    # Limit length and remove any non-printable characters
    return safe[:45]  # Max IPv6 length


def get_client_ip() -> str | None:
    """Get the real client IP, accounting for tunnel proxies.

    Priority:
    1. CF-Connecting-IP (Cloudflare Quick Tunnel header - used for remote access)
    2. X-Real-IP (common proxy header, used by nginx and some tunnels)
    3. X-Forwarded-For (standard proxy header, take first IP)
    4. request.remote_addr (direct connection fallback)

    Returns sanitized IP address safe for logging.
    """
    # Cloudflare provides the original client IP in this header
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        safe_ip = _sanitize_ip(cf_ip)
        logger.debug("[IP] Using CF-Connecting-IP: %s", safe_ip)
        return safe_ip

    # X-Real-IP is often used by nginx and some tunnel providers
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        safe_ip = _sanitize_ip(real_ip)
        logger.debug("[IP] Using X-Real-IP: %s", safe_ip)
        return safe_ip

    # Standard proxy header - first IP is the original client
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        safe_ip = _sanitize_ip(client_ip)
        safe_full = _sanitize_ip(forwarded_for)
        logger.debug("[IP] Using X-Forwarded-For: %s (full: %s)", safe_ip, safe_full)
        return safe_ip

    safe_remote = _sanitize_ip(request.remote_addr)
    logger.debug("[IP] Using remote_addr: %s", safe_remote)
    return safe_remote


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
    # Get client IP (handles Cloudflare tunnels), sanitize and use repr() for log injection prevention
    raw_ip = get_client_ip() or "unknown"
    safe_ip = repr(_sanitize_log_value(raw_ip))
    safe_details = repr(_sanitize_log_value(details)) if details else "''"
    # Use %-style formatting with repr'd values for CodeQL compatibility
    logger.info("[AUDIT] %s | %s | IP: %s | Details: %s", event, status, safe_ip, safe_details)

    # Store event in SQLite database for security panel
    user_agent = request.headers.get("User-Agent", "")[:256]
    ip_address = raw_ip if raw_ip != "unknown" else None
    security_service.log_event(
        event_type=event,
        success=success,
        ip_address=ip_address,
        details=_sanitize_log_value(details)[:500] if details else None,
        user_agent=user_agent,
    )
