# Request middleware functions
# Extracted from api.py for organization, still called from api.py before_request/after_request

import os
import re
from typing import TYPE_CHECKING
from urllib.parse import quote, urlparse

from flask import jsonify, make_response, redirect, request, session
from flask.wrappers import Response
from markupsafe import escape as markupsafe_escape
from werkzeug.wrappers import Response as WerkzeugResponse

from core import config
from core.session import SessionManager

if TYPE_CHECKING:
    from blueprints import Services


_HEALTH_CHECK_ENDPOINT = "admin.health_check"

_SAFE_NUMERIC_FIELDS = (
    "dedicated_deleted",
    "dedicated_failed",
    "rollup_deleted",
    "items_disabled",
    "deleted_count",
    "failed_count",
    "categories_created",
    "categories_updated",
    "items_synced",
    "retry_after",
    "categorized_count",
    "skipped_count",
)

_ERROR_LIST_FIELDS = ("errors", "sync_errors", "failed")

_SAFE_REASONS = ("disabled", "no_tracked_items", "no_changes", "success")


def _copy_numeric_field(result: dict, sanitized: dict, key: str) -> None:
    """Copy a numeric/boolean field with explicit type conversion."""
    if key not in result:
        return
    val = result[key]
    if isinstance(val, bool):
        sanitized[key] = bool(val)
    elif isinstance(val, int):
        sanitized[key] = int(val)
    elif isinstance(val, float):
        sanitized[key] = float(val)


def sanitize_api_result(result: dict, generic_error: str = "Operation failed.") -> dict:
    """Sanitize API result dict to prevent information exposure.

    Creates a NEW dict with only safe fields to ensure CodeQL recognizes
    the sanitization barrier. All error messages are replaced with generic
    ones to prevent stack traces from being exposed to users.

    Uses markupsafe.escape which CodeQL recognizes as a sanitization barrier.
    """
    sanitized: dict = {"success": bool(result.get("success", False))}

    # Replace error message with generic one on failure
    if not sanitized["success"]:
        sanitized["error"] = str(markupsafe_escape(generic_error))

    # Copy whitelisted numeric/boolean fields
    for key in _SAFE_NUMERIC_FIELDS:
        _copy_numeric_field(result, sanitized, key)

    # For error lists, only expose count (not the actual error messages)
    for key in _ERROR_LIST_FIELDS:
        if key in result and isinstance(result[key], list):
            sanitized[f"{key}_count"] = len(result[key])

    # Sanitize reason field if present
    if "reason" in result and isinstance(result["reason"], str):
        reason_val = result["reason"]
        sanitized["reason"] = (
            reason_val if reason_val in _SAFE_REASONS else str(markupsafe_escape(reason_val))
        )

    return sanitized


def is_api_request() -> bool:
    """Check if the request is for an API endpoint."""
    api_prefixes = ("/auth/", "/recurring/", "/security/", "/version/", "/notes/", "/settings/")
    return any(request.path.startswith(p) for p in api_prefixes)


def is_tunnel_request() -> bool:
    """Check if the request is coming through a tunnel (remote access).

    Tunnel providers like Tunnelmole add X-Forwarded-For header to
    indicate the request is being proxied. Local requests from the
    Electron app don't have this header.

    Returns True if the request appears to be from a tunnel, False otherwise.
    """
    # Tunnelmole and similar tunnel providers add X-Forwarded-For
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return True

    # Also check for other common proxy headers
    if request.headers.get("X-Real-IP"):
        return True

    # Check if the request is NOT from localhost (direct tunnel access)
    # Note: In desktop mode, local requests should be from 127.0.0.1
    if config.is_desktop_environment():
        remote_addr = request.remote_addr
        # Local addresses
        local_addrs = ("127.0.0.1", "::1", "localhost")
        if remote_addr and remote_addr not in local_addrs:
            return True

        # Check Host header - tunnel requests have external hostnames
        # Tunnelmole proxies locally but preserves the external Host header
        host = request.host.lower() if request.host else ""
        # Strip port if present
        host_without_port = host.split(":")[0]
        # If host is not localhost/127.0.0.1, it's a tunnel request
        if host_without_port and host_without_port not in local_addrs:
            return True

    return False


def get_trusted_host() -> str | None:
    """Get the trusted host for redirects.

    Returns the host from environment config if set, otherwise validates
    the request host against safe patterns.
    """
    # Prefer configured trusted host from environment
    trusted_host = os.environ.get("TRUSTED_HOST")
    if trusted_host:
        return trusted_host

    # Validate request.host has safe format (no path characters)
    host = request.host
    if host and re.match(r"^[\w.-]+(:\d+)?$", host):
        return host

    return None


def check_instance_secret() -> bool:
    """Check if the request has valid instance secret access.

    Returns True if access is granted, False otherwise.
    """
    if not config.INSTANCE_SECRET:
        return True  # No secret configured, allow all access

    # Check cookie, query parameter, or header
    return (
        request.cookies.get(config.INSTANCE_SECRET_COOKIE) == config.INSTANCE_SECRET
        or request.args.get("secret") == config.INSTANCE_SECRET
        or request.headers.get("X-Instance-Secret") == config.INSTANCE_SECRET
    )


def get_access_denied_page() -> str:
    """Return HTML page for instance access denied."""
    return """<!DOCTYPE html>
<html>
<head>
    <title>Access Denied - Eclosion</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #e0e0e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .container { text-align: center; padding: 2rem; max-width: 400px; }
        h1 { color: #ff692d; margin-bottom: 0.5rem; }
        .tagline { color: #ff692d; font-style: italic; margin-bottom: 1rem; }
        p { color: #888; margin-bottom: 1.5rem; }
        form { display: flex; flex-direction: column; gap: 1rem; }
        input { padding: 0.75rem; border: 1px solid #333; border-radius: 0.5rem; background: #252540; color: #fff; font-size: 1rem; }
        button { padding: 0.75rem; border: none; border-radius: 0.5rem; background: #ff692d; color: white; font-size: 1rem; cursor: pointer; }
        button:hover { background: #e55a1f; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Eclosion</h1>
        <p class="tagline">Your budgeting, evolved.</p>
        <p>This instance is protected. Enter the access code to continue.</p>
        <form method="GET">
            <input type="password" name="secret" placeholder="Access Code" required autofocus>
            <button type="submit">Access Instance</button>
        </form>
    </div>
</body>
</html>"""


def enforce_https(app_debug: bool) -> WerkzeugResponse | None:
    """Redirect HTTP to HTTPS in production.

    Returns redirect response or None if no redirect needed.
    """
    # Skip HTTPS redirect for secure requests, debug mode, or desktop app (localhost only)
    if request.is_secure or app_debug or config.is_desktop_environment():
        return None
    if request.headers.get("X-Forwarded-Proto", "http") == "http":
        # Get a validated/trusted host for the redirect
        # Security: get_trusted_host() validates host format to prevent open redirect
        trusted_host = get_trusted_host()
        if not trusted_host:
            # If we can't validate the host, don't redirect (fail safe)
            return None

        # Security: Validate path to prevent open redirect attacks
        # Replace backslashes (browser normalization bypass) before parsing
        raw_path = request.full_path.replace("\\", "/")
        parsed_path = urlparse(raw_path)

        # Reject if path contains scheme or netloc (would be absolute URL)
        if parsed_path.scheme or parsed_path.netloc:
            return redirect(f"https://{trusted_host}/", code=301)

        # Extract and validate path component
        path_component = parsed_path.path or "/"

        # Reject paths that could be interpreted as protocol-relative URLs
        # This includes //host, /\host, and similar patterns
        if path_component.startswith("//") or "//" in path_component[:10]:
            return redirect(f"https://{trusted_host}/", code=301)

        # Ensure path starts with single /
        path_component = "/" + path_component.lstrip("/")

        # URL-encode path to ensure safe redirect (quote preserves / as safe)
        # This breaks the data flow for static analysis since quote() is a sanitizer
        safe_path = quote(path_component, safe="/@")

        # Preserve query string if present (also encode it)
        if parsed_path.query:
            safe_query = quote(parsed_path.query, safe="=&")
            safe_path = f"{safe_path}?{safe_query}"

        return redirect(f"https://{trusted_host}{safe_path}", code=301)
    return None


def enforce_instance_secret(services: "Services") -> tuple[Response, int] | None:
    """Check instance secret if configured.

    Returns error response tuple or None if access is granted.
    """
    from core.audit import audit_log  # Local import to avoid circular dependency

    if not config.INSTANCE_SECRET or request.endpoint == "_HEALTH_CHECK_ENDPOINT":
        return None
    if check_instance_secret():
        return None
    audit_log(
        services.security_service, "INSTANCE_ACCESS", False, "Invalid or missing instance secret"
    )
    if is_api_request():
        return jsonify({"error": "Instance secret required", "instance_locked": True}), 403
    return make_response(get_access_denied_page()), 403


def enforce_tunnel_auth(services: "Services") -> tuple[Response, int] | None:
    """Enforce authentication for tunnel (remote) requests.

    When a request comes through a tunnel (identified by X-Forwarded-For header),
    it must have a valid session with remote_unlocked=True.

    This protects the app from unauthorized remote access while allowing
    local Electron requests to use the desktop secret auth.

    Returns error response tuple or None if authentication passes.
    """
    from core.audit import audit_log  # Local import to avoid circular dependency

    # Only enforce for tunnel requests
    if not is_tunnel_request():
        return None

    # Skip for health check endpoint
    if request.endpoint == "_HEALTH_CHECK_ENDPOINT":
        return None

    # Skip for the remote unlock endpoint/page itself
    if request.endpoint in ("auth.remote_unlock", "auth.remote_unlock_page"):
        return None
    # Also skip by path since /remote-unlock is a SPA route served by the 404 handler
    # And /auth/remote-unlock is the API endpoint for unlocking
    if request.path in ("/remote-unlock", "/auth/remote-unlock", "/auth/remote-status"):
        return None
    if request.path.startswith("/remote-unlock/"):
        return None

    # Skip for static assets (js, css, images)
    if request.path.startswith("/static/") or request.path.startswith("/assets/"):
        return None

    # Skip for Vite dev server paths (hot-reload support in dev mode)
    if request.path.startswith(("/@vite/", "/@react-refresh", "/@fs/", "/src/", "/node_modules/")):
        return None

    # Check if session is authenticated for remote access
    if session.get("remote_unlocked"):
        return None

    # Not authenticated - return error for API requests, redirect for pages
    audit_log(
        services.security_service,
        "TUNNEL_AUTH",
        False,
        f"Unauthenticated tunnel request to {request.path}",
    )

    if is_api_request():
        return jsonify(
            {"error": "Remote access requires authentication", "code": "REMOTE_AUTH_REQUIRED"}
        ), 401

    # For page requests, redirect to remote unlock page
    return make_response(redirect("/remote-unlock")), 302


def enforce_desktop_secret(services: "Services") -> tuple[Response, int] | None:
    """Validate desktop secret for Electron app requests.

    In desktop mode, all API requests must include the X-Desktop-Secret header
    with the runtime secret generated by the Electron main process.
    This prevents other local processes (browser tabs, malicious apps) from
    accessing the API.

    Tunnel (remote access) requests are exempt from this check - they are
    authenticated via the remote_unlocked session flag in enforce_tunnel_auth().

    Returns error response tuple or None if validation passes.
    """
    import secrets as secrets_module

    from core.audit import audit_log  # Local import to avoid circular dependency

    # Only enforce in desktop mode
    if not config.is_desktop_environment() or not config.DESKTOP_SECRET:
        return None

    # Allow health check without secret (needed for backend startup)
    if request.endpoint == "_HEALTH_CHECK_ENDPOINT":
        return None

    # Skip for tunnel (remote access) requests - they use session auth instead
    # Tunnel requests are authenticated via remote_unlocked session in enforce_tunnel_auth()
    if is_tunnel_request():
        return None

    # Check the X-Desktop-Secret header
    provided_secret = request.headers.get("X-Desktop-Secret")

    # Use constant-time comparison to prevent timing attacks
    if not provided_secret or not secrets_module.compare_digest(
        provided_secret, config.DESKTOP_SECRET
    ):
        audit_log(
            services.security_service, "DESKTOP_AUTH", False, "Invalid or missing desktop secret"
        )
        return jsonify({"error": "Unauthorized", "code": "DESKTOP_AUTH_REQUIRED"}), 403

    return None


def restore_session_credentials(services: "Services") -> None:
    """Restore credentials from session cookie or dev session file if not in memory.

    This handles the case where:
    - Server restarted but user's session cookie is still valid
    - Page was refreshed and session cookie contains unlock state
    - Flask restarted in dev mode and dev session file exists
    """
    from core.audit import audit_log  # Local import to avoid circular dependency
    from services.credentials_service import (
        CredentialsService,
        _is_dev_desktop_mode,
        _load_dev_session,
    )

    # Skip if credentials already in memory
    if CredentialsService._session_credentials:
        return

    # In dev desktop mode, try to restore from dev session file first
    # This handles Flask restarts that clear in-memory credentials
    if _is_dev_desktop_mode():
        dev_session = _load_dev_session()
        if dev_session:
            CredentialsService._session_credentials = dev_session
            audit_log(
                services.security_service,
                "DEV_SESSION_RESTORE",
                True,
                "Credentials restored from dev session file",
            )
            SessionManager.update_activity()
            return

    # Check if session indicates user was unlocked
    # Check both desktop unlock (auth_unlocked) and remote/tunnel unlock (remote_unlocked)
    if not session.get("auth_unlocked") and not session.get("remote_unlocked"):
        return

    # Session says we were unlocked - try to restore from stored credentials
    # This requires the passphrase to be derivable from session or re-unlock
    passphrase = session.get("session_passphrase")
    if passphrase and services.sync_service.has_stored_credentials():
        result = services.sync_service.unlock(passphrase)
        if result.get("success"):
            audit_log(
                services.security_service,
                "SESSION_RESTORE",
                True,
                "Credentials restored from session",
            )
            SessionManager.update_activity()
        else:
            # Passphrase no longer valid, clear session
            session.pop("auth_unlocked", None)
            session.pop("session_passphrase", None)
            audit_log(
                services.security_service, "SESSION_RESTORE", False, "Failed to restore credentials"
            )


def check_and_handle_session_timeout(services: "Services") -> None:
    """Lock session if timed out."""
    from core.audit import audit_log  # Local import to avoid circular dependency
    from services.credentials_service import CredentialsService

    if not request.endpoint or request.endpoint.startswith(("auth_", "serve")):
        return
    if SessionManager.check_timeout() and CredentialsService._session_credentials:
        audit_log(
            services.security_service, "SESSION_TIMEOUT", True, "Auto-locked due to inactivity"
        )
        services.sync_service.lock()
        session.pop("auth_unlocked", None)


def add_security_headers(response: Response) -> Response:
    """Add security headers to response."""
    # Basic security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Content Security Policy - restrict resource loading
    # External APIs needed: GitHub (changelog), jsDelivr (emoji data), Openverse (image search)
    external_connect = (
        "https://raw.githubusercontent.com "
        "https://api.github.com "
        "https://cdn.jsdelivr.net "
        "https://api.openverse.org"
    )

    # In dev mode (DEV_VITE_URL set), allow WebSocket connections to localhost for HMR
    dev_vite_url = os.environ.get("DEV_VITE_URL")
    if dev_vite_url:
        # Dev mode: allow Vite HMR WebSocket and module loading
        connect_src = f"'self' ws://localhost:* wss://localhost:* {external_connect}"
        script_src = "'self' 'unsafe-inline' 'unsafe-eval'"  # Vite needs eval for HMR
    else:
        # Production: strict CSP with required external APIs
        connect_src = f"'self' {external_connect}"
        script_src = "'self' 'unsafe-inline'"

    csp_directives = [
        "default-src 'self'",
        f"script-src {script_src}",  # React needs inline for some features
        "style-src 'self' 'unsafe-inline'",  # Tailwind uses inline styles
        "img-src 'self' data: https:",  # Allow data URIs for emojis/icons
        "font-src 'self'",
        f"connect-src {connect_src}",  # API calls + WebSocket for dev HMR
        "frame-ancestors 'none'",  # Prevent framing (clickjacking)
        "base-uri 'self'",
        "form-action 'self'",
    ]
    response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

    # HSTS in production (when behind HTTPS proxy)
    if request.headers.get("X-Forwarded-Proto") == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Permissions Policy - restrict access to browser features we don't use
    response.headers["Permissions-Policy"] = (
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
        "magnetometer=(), microphone=(), payment=(), usb=()"
    )

    # Cross-Origin-Opener-Policy - protect against Spectre-like attacks
    # Using same-origin-allow-popups to allow OAuth popups if needed
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"

    return response


def set_instance_cookie(response: Response) -> Response:
    """Set instance access cookie if secret was provided in query and is valid."""
    if config.INSTANCE_SECRET:
        query_secret = request.args.get("secret")
        if query_secret == config.INSTANCE_SECRET and response.status_code != 403:
            # Set secure cookie for future requests (7 days)
            response.set_cookie(
                config.INSTANCE_SECRET_COOKIE,
                config.INSTANCE_SECRET,
                max_age=7 * 24 * 60 * 60,
                httponly=True,
                secure=request.headers.get("X-Forwarded-Proto") == "https",
                samesite="Strict",
            )
            # Note: audit_log not called here to avoid circular import at module level
            # The audit logging will be handled by the caller
    return response


def fix_session_cookie_for_tunnel(response: Response) -> Response:
    """Fix session cookie attributes for tunnel (remote) requests.

    Flask sets session cookie attributes at app startup based on config.
    For desktop mode, SESSION_COOKIE_SECURE=False and SameSite=None.

    However, when accessed via tunnel (HTTPS), browsers require:
    - Secure=True for cookies with SameSite=None
    - Or SameSite=Lax/Strict for cross-site cookies

    This function rewrites the session cookie header for tunnel requests
    to use proper secure attributes, preventing cookie rejection.
    """
    # Only fix for tunnel requests
    if not is_tunnel_request():
        return response

    # Check if response has Set-Cookie header for session
    cookie_header = response.headers.get("Set-Cookie")
    if not cookie_header or "session=" not in cookie_header:
        return response

    # Check if request is over HTTPS (via proxy)
    is_https = request.headers.get("X-Forwarded-Proto") == "https"

    # Parse and fix each Set-Cookie header
    new_cookies = []
    for cookie in response.headers.getlist("Set-Cookie"):
        if cookie.startswith("session="):
            # Remove existing SameSite and Secure attributes
            parts = [p.strip() for p in cookie.split(";")]
            filtered_parts = [
                p for p in parts if not p.lower().startswith("samesite") and p.lower() != "secure"
            ]

            # Add correct attributes for tunnel access
            # Use SameSite=Lax for better compatibility (works with top-level navigation)
            filtered_parts.append("SameSite=Lax")
            if is_https:
                filtered_parts.append("Secure")

            cookie = "; ".join(filtered_parts)

        new_cookies.append(cookie)

    # Replace all Set-Cookie headers
    # Remove existing headers
    del response.headers["Set-Cookie"]
    # Add fixed headers
    for cookie in new_cookies:
        response.headers.add("Set-Cookie", cookie)

    return response
