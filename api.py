# Eclosion for Monarch - Your budgeting, evolved.
# A toolkit for Monarch Money that automates recurring expense tracking.
import json
import os
import re
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote, urlparse

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory, session
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from core import (
    api_handler,
    async_flask,
    config,
    configure_logging,
    sanitize_emoji,
    sanitize_id,
    sanitize_name,
    sanitize_response,
)
from services.credentials_service import CredentialsService
from services.security_service import SecurityService
from services.sync_service import SyncService

load_dotenv()

# Setup logging (Docker-aware)
logger = configure_logging()

# Serve static files from 'static' directory if it exists (production build)
static_folder = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_folder):
    app = Flask(__name__, static_folder=static_folder, static_url_path="")
else:
    app = Flask(__name__)

# Enable debug mode for local development (disables HTTPS redirect)
app.debug = os.environ.get("FLASK_DEBUG", "0") == "1"


# Session configuration for auth persistence across page refreshes
# Secret key is generated on first run and stored, or use env var
def _get_or_create_session_secret():
    """
    Get session secret from environment or generate an ephemeral one.

    Security notes:
    - Set SESSION_SECRET environment variable for persistent sessions
    - Without env var, an ephemeral secret is generated (sessions expire on restart)
    - Never stores secrets to disk to prevent clear-text storage vulnerabilities
    """
    # Use environment variable if set (recommended for production)
    if env_secret := os.environ.get("SESSION_SECRET"):
        return env_secret

    # Generate ephemeral secret (sessions won't persist across restarts)
    is_production = config.is_container_environment() or not app.debug
    if is_production:
        logger.warning(
            "Generated ephemeral session secret. "
            "Set SESSION_SECRET environment variable for persistent sessions."
        )
    return secrets.token_hex(32)


app.secret_key = _get_or_create_session_secret()
app.config["SESSION_COOKIE_SECURE"] = not app.debug  # Only require HTTPS in production
app.config["SESSION_COOKIE_HTTPONLY"] = True  # Not accessible via JavaScript
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"  # CSRF protection
app.config["PERMANENT_SESSION_LIFETIME"] = config.SESSION_COOKIE_LIFETIME

CORS(app, supports_credentials=True)  # Enable CORS with credentials for session cookies

# Rate limiting configuration
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=list(config.DEFAULT_RATE_LIMITS),
    storage_uri="memory://",
)

# Session timeout tracking
_last_activity: datetime | None = None

# Initialize sync service
sync_service = SyncService()

# Initialize security service
security_service = SecurityService()

# Initialize scheduler for background sync
import atexit  # noqa: E402 - Intentionally delayed, scheduler depends on app setup

from core.scheduler import SyncScheduler  # noqa: E402

_scheduler_started = False


def _init_scheduler():
    """Initialize and start the background scheduler."""
    global _scheduler_started
    if _scheduler_started:
        return

    scheduler = SyncScheduler.get_instance()
    scheduler.start()
    _scheduler_started = True

    # Restore auto-sync if it was previously enabled
    if sync_service.restore_auto_sync():
        logger.info("Auto-sync restored from saved state")


def _shutdown_scheduler():
    """Shutdown the background scheduler gracefully."""
    scheduler = SyncScheduler.get_instance()
    scheduler.shutdown()


# Register shutdown handler
atexit.register(_shutdown_scheduler)


@app.before_request
def _ensure_scheduler_started():
    """Ensure scheduler is started on first request."""
    _init_scheduler()


# ---- SECURITY MIDDLEWARE ----


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


def _sanitize_api_result(result: dict, generic_error: str = "Operation failed.") -> dict:
    """
    Sanitize API result dict to prevent information exposure.

    Creates a NEW dict with only safe fields to ensure CodeQL recognizes
    the sanitization barrier. All error messages are replaced with generic
    ones to prevent stack traces from being exposed to users.
    """
    # Create a completely new dict to break taint tracking
    sanitized: dict = {}

    # Copy success status as explicit boolean
    sanitized["success"] = bool(result.get("success", False))

    # Replace error message with generic one on failure
    if not sanitized["success"]:
        sanitized["error"] = generic_error

    # Whitelist of safe numeric/boolean fields to copy (explicit type conversion)
    safe_numeric_fields = (
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
    )
    for key in safe_numeric_fields:
        if key in result:
            val = result[key]
            if isinstance(val, bool):
                sanitized[key] = bool(val)
            elif isinstance(val, int):
                sanitized[key] = int(val)
            elif isinstance(val, float):
                sanitized[key] = float(val)

    # For error lists, only expose count (not the actual error messages)
    for key in ("errors", "sync_errors", "failed"):
        if key in result and isinstance(result[key], list):
            sanitized[f"{key}_count"] = len(result[key])

    return sanitized


def _audit_log(event: str, success: bool, details: str = ""):
    """Log security-relevant events for audit trail."""
    # Use hardcoded event names only - never pass user input to event parameter
    # Valid events: LOGIN, LOGOUT, MFA_*, SESSION_*, RESET_*, INSTANCE_*, UNLOCK, PASSPHRASE_*
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


def _update_activity():
    """Update last activity timestamp for session timeout tracking."""
    global _last_activity
    _last_activity = datetime.now()


def _check_session_timeout():
    """Check if session has timed out due to inactivity."""
    global _last_activity
    if _last_activity is None:
        return False
    elapsed = datetime.now() - _last_activity
    return elapsed > timedelta(minutes=config.SESSION_TIMEOUT_MINUTES)


def _check_instance_secret():
    """
    Check if the request has valid instance secret access.
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


def _get_access_denied_page():
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


def _is_api_request():
    """Check if the request is for an API endpoint."""
    api_prefixes = ("/auth/", "/recurring/", "/security/", "/version/")
    return any(request.path.startswith(p) for p in api_prefixes)


def _get_trusted_host() -> str | None:
    """
    Get the trusted host for redirects.

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


def _enforce_https():
    """Redirect HTTP to HTTPS in production. Returns redirect response or None."""
    if request.is_secure or app.debug:
        return None
    if request.headers.get("X-Forwarded-Proto", "http") == "http":
        # Get a validated/trusted host for the redirect
        # Security: _get_trusted_host() validates host format to prevent open redirect
        trusted_host = _get_trusted_host()
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


def _enforce_instance_secret():
    """Check instance secret if configured. Returns error response or None."""
    if not config.INSTANCE_SECRET or request.endpoint == "health_check":
        return None
    if _check_instance_secret():
        return None
    _audit_log("INSTANCE_ACCESS", False, "Invalid or missing instance secret")
    if _is_api_request():
        return jsonify({"error": "Instance secret required", "instance_locked": True}), 403
    return _get_access_denied_page(), 403


def _check_and_handle_session_timeout():
    """Lock session if timed out."""
    if not request.endpoint or request.endpoint.startswith(("auth_", "serve")):
        return
    if _check_session_timeout() and CredentialsService._session_credentials:
        _audit_log("SESSION_TIMEOUT", True, "Auto-locked due to inactivity")
        sync_service.lock()
        session.pop("auth_unlocked", None)


def _restore_session_credentials():
    """
    Restore credentials from session cookie if not in memory.

    This handles the case where:
    - Server restarted but user's session cookie is still valid
    - Page was refreshed and session cookie contains unlock state
    """
    # Skip if credentials already in memory
    if CredentialsService._session_credentials:
        return

    # Check if session indicates user was unlocked
    if not session.get("auth_unlocked"):
        return

    # Session says we were unlocked - try to restore from stored credentials
    # This requires the passphrase to be derivable from session or re-unlock
    passphrase = session.get("session_passphrase")
    if passphrase and sync_service.has_stored_credentials():
        result = sync_service.unlock(passphrase)
        if result.get("success"):
            _audit_log("SESSION_RESTORE", True, "Credentials restored from session")
            _update_activity()
        else:
            # Passphrase no longer valid, clear session
            session.pop("auth_unlocked", None)
            session.pop("session_passphrase", None)
            _audit_log("SESSION_RESTORE", False, "Failed to restore credentials")


@app.before_request
def security_checks():
    """Run security checks before each request."""
    if redirect_response := _enforce_https():
        return redirect_response

    if error_response := _enforce_instance_secret():
        return error_response

    # Try to restore credentials from session cookie
    _restore_session_credentials()

    _check_and_handle_session_timeout()

    if CredentialsService._session_credentials:
        _update_activity()


@app.after_request
def add_security_headers(response):
    """Add security headers and set instance access cookie if needed."""
    # Set instance access cookie if secret was provided in query and is valid
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
            _audit_log("INSTANCE_ACCESS", True, "Access cookie set")

    # Basic security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Content Security Policy - restrict resource loading
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",  # React needs inline for some features
        "style-src 'self' 'unsafe-inline'",  # Tailwind uses inline styles
        "img-src 'self' data: https:",  # Allow data URIs for emojis/icons
        "font-src 'self'",
        "connect-src 'self'",  # API calls to same origin
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


# ---- AUTH ENDPOINTS ----


@app.route("/auth/status", methods=["GET"])
@api_handler(handle_mfa=False)
async def auth_status():
    """
    Check authentication status.

    Returns:
    - authenticated: True if session has active (unlocked) credentials
    - has_stored_credentials: True if encrypted credentials exist on disk
    - needs_unlock: True if credentials exist but are locked (need passphrase)
    """
    is_authenticated = await sync_service.check_auth()
    has_stored = sync_service.has_stored_credentials()
    return {
        "authenticated": is_authenticated,
        "has_stored_credentials": has_stored,
        "needs_unlock": has_stored and not is_authenticated,
    }


@app.route("/auth/validate", methods=["GET"])
@api_handler(handle_mfa=False)
async def auth_validate():
    """Validate that session credentials are still valid with the Monarch API."""
    is_valid = await sync_service.validate_auth()
    return {"authenticated": is_valid, "validated": True}


@app.route("/auth/login", methods=["POST"])
@limiter.limit("5 per minute")  # Strict rate limit for login attempts
@async_flask
async def auth_login():
    """
    Validate Monarch Money credentials.

    On success, returns needs_passphrase=True.
    Caller must then call /auth/set-passphrase to encrypt and save credentials.
    """
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        mfa_secret = data.get("mfa_secret", "")

        # Mask email for audit log
        masked_email = email[:3] + "***" if email and len(email) > 3 else "***"

        if not email or not password:
            _audit_log("LOGIN_ATTEMPT", False, f"Missing credentials for {masked_email}")
            return jsonify({"success": False, "error": "Email and password are required"}), 400

        result = await sync_service.login(email, password, mfa_secret)
        _audit_log("LOGIN_ATTEMPT", result.get("success", False), f"User: {masked_email}")

        if result.get("success"):
            _update_activity()  # Start session timeout tracking

        return jsonify(result)
    except Exception as e:
        _audit_log("LOGIN_ATTEMPT", False, f"Exception: {type(e).__name__}")
        logger.error(f"[LOGIN] Exception: {e}")
        # Return generic error message to prevent information exposure
        return jsonify({"success": False, "error": "Login failed. Please try again."}), 500


@app.route("/auth/set-passphrase", methods=["POST"])
@limiter.limit("5 per minute")  # Rate limit passphrase attempts
@api_handler(handle_mfa=False)
def auth_set_passphrase():
    """
    Set encryption passphrase and save credentials.

    Must be called after successful /auth/login.
    Validates passphrase complexity before saving.
    """
    data = request.get_json()
    passphrase = data.get("passphrase", "")

    if not passphrase:
        _audit_log("SET_PASSPHRASE", False, "Empty passphrase provided")
        return {"success": False, "error": "Passphrase is required"}

    result = sync_service.set_passphrase(passphrase)
    _audit_log("SET_PASSPHRASE", result.get("success", False), "Credentials encrypted")

    if result.get("success"):
        _update_activity()
        # Save passphrase in session for auto-restore on page refresh
        session.permanent = True
        session["auth_unlocked"] = True
        session["session_passphrase"] = passphrase

    return _sanitize_api_result(result, "Failed to set passphrase.")


@app.route("/auth/unlock", methods=["POST"])
@limiter.limit("5 per minute")  # Critical: prevent brute-force on passphrase
@api_handler(handle_mfa=False)
@async_flask
async def auth_unlock():
    """
    Unlock stored credentials with passphrase.

    Used when returning to the app with existing encrypted credentials.

    If validate=true is passed, also validates credentials against Monarch API.
    This is the recommended flow for unlock to detect expired credentials early.
    """
    data = request.get_json()
    passphrase = data.get("passphrase", "")
    validate = data.get("validate", False)

    if not passphrase:
        _audit_log("UNLOCK_ATTEMPT", False, "Empty passphrase")
        return {"success": False, "unlock_success": False, "error": "Passphrase is required"}

    if validate:
        # New flow: unlock AND validate against Monarch
        result = await sync_service.unlock_and_validate(passphrase)
        unlock_success = result.get("unlock_success", False)
        validation_success = result.get("validation_success", False)

        _audit_log(
            "UNLOCK_AND_VALIDATE",
            result.get("success", False),
            f"unlock={unlock_success}, validation={validation_success}",
        )

        if result.get("success"):
            _update_activity()
            session.permanent = True
            session["auth_unlocked"] = True
            session["session_passphrase"] = passphrase
    else:
        # Legacy flow: just decrypt, no validation
        result = sync_service.unlock(passphrase)
        _audit_log("UNLOCK_ATTEMPT", result.get("success", False), "")

        if result.get("success"):
            _update_activity()
            session.permanent = True
            session["auth_unlocked"] = True
            session["session_passphrase"] = passphrase

    return _sanitize_api_result(result, "Unlock failed.")


@app.route("/auth/lock", methods=["POST"])
@api_handler(handle_mfa=False)
def auth_lock():
    """Lock the session without clearing stored credentials."""
    sync_service.lock()
    # Clear session auth state (but keep stored credentials on disk)
    session.pop("auth_unlocked", None)
    session.pop("session_passphrase", None)
    _audit_log("SESSION_LOCK", True, "User initiated lock")
    return {"success": True}


@app.route("/auth/logout", methods=["POST"])
@api_handler(handle_mfa=False)
def auth_logout():
    """Clear stored credentials and session."""
    sync_service.logout()
    # Clear entire session
    session.clear()
    _audit_log("LOGOUT", True, "Credentials cleared")
    return {"success": True}


@app.route("/auth/update-credentials", methods=["POST"])
@limiter.limit("5 per minute")
@api_handler(handle_mfa=False)
@async_flask
async def auth_update_credentials():
    """
    Update Monarch credentials and re-encrypt with the provided passphrase.

    Used when:
    - Existing credentials failed Monarch validation
    - User needs to enter new Monarch email/password
    - Must re-encrypt with the SAME passphrase they used to unlock

    Request body:
    - email: New Monarch email
    - password: New Monarch password
    - mfa_secret: Optional MFA secret (TOTP key)
    - passphrase: The SAME passphrase used for initial unlock
    """
    data = request.get_json()
    email = data.get("email", "")
    password = data.get("password", "")
    mfa_secret = data.get("mfa_secret", "")
    passphrase = data.get("passphrase", "")

    if not email or not password:
        _audit_log("UPDATE_CREDENTIALS", False, "Missing email or password")
        return {"success": False, "error": "Email and password are required"}

    if not passphrase:
        _audit_log("UPDATE_CREDENTIALS", False, "Missing passphrase")
        return {"success": False, "error": "Passphrase is required"}

    result = await sync_service.update_credentials(email, password, mfa_secret, passphrase)
    _audit_log("UPDATE_CREDENTIALS", result.get("success", False), "")

    if result.get("success"):
        _update_activity()
        # Save passphrase in session for auto-restore on page refresh
        session.permanent = True
        session["auth_unlocked"] = True
        session["session_passphrase"] = passphrase

    return _sanitize_api_result(result, "Failed to update credentials.")


@app.route("/auth/reset-app", methods=["POST"])
@api_handler(handle_mfa=False)
def auth_reset_app():
    """
    Reset the app when user can't unlock (forgot passphrase).

    This:
    - Clears encrypted credentials (credentials.json)
    - Preserves preferences (tracker_state.json) - linked categories, rollups, settings
    - Clears session

    User will need to re-login with Monarch credentials and set a new passphrase.
    """
    sync_service.reset_credentials_only()
    # Clear session
    session.pop("auth_unlocked", None)
    session.pop("session_passphrase", None)
    _audit_log("RESET_APP", True, "Credentials cleared, preferences preserved")
    return {"success": True, "message": "App reset. Please log in again."}


# ---- RECURRING SAVINGS TRACKER ENDPOINTS ----


@app.route("/recurring/dashboard", methods=["GET"])
@api_handler(handle_mfa=True)
async def recurring_dashboard():
    """Get dashboard data for the frontend."""
    return await sync_service.get_dashboard_data()


@app.route("/recurring/sync", methods=["POST"])
@api_handler(handle_mfa=True)
async def recurring_sync():
    """Trigger full synchronization of recurring transactions."""
    result = await sync_service.full_sync()
    # Sanitize all error messages to prevent stack trace exposure
    return _sanitize_api_result(result, "Sync failed. Please try again.")


@app.route("/recurring/config", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_config():
    """Get current configuration."""
    return await sync_service.get_config()


@app.route("/recurring/config", methods=["POST"])
@api_handler(handle_mfa=False)
async def set_config():
    """Update configuration settings."""
    data = request.get_json()
    group_id = sanitize_id(data.get("group_id"))
    group_name = sanitize_name(data.get("group_name"))

    if not group_id or not group_name:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'group_id' or 'group_name' in request body.")

    result = await sync_service.configure(group_id, group_name)
    return sanitize_response(result)


@app.route("/recurring/groups", methods=["GET"])
@api_handler(handle_mfa=True, success_wrapper="groups")
async def get_category_groups():
    """Get available category groups for selection."""
    return await sync_service.get_category_groups()


@app.route("/recurring/toggle", methods=["POST"])
@api_handler(handle_mfa=True)
async def toggle_item():
    """Enable or disable tracking for a recurring item."""
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    enabled = data.get("enabled", False)
    item_data = data.get("item_data")
    initial_budget = data.get("initial_budget")  # Optional: use this instead of calculated amount

    if not recurring_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id'")

    result = await sync_service.toggle_item(recurring_id, enabled, item_data, initial_budget)
    return sanitize_response(result)


@app.route("/recurring/settings", methods=["GET"])
@api_handler(handle_mfa=False)
def get_settings():
    """Get current settings."""
    return sync_service.state_manager.get_settings()


@app.route("/recurring/settings", methods=["POST"])
@api_handler(handle_mfa=False)
def update_settings():
    """Update settings like auto_sync_new, auto_track_threshold, and auto_update_targets."""
    data = request.get_json()
    if "auto_sync_new" in data:
        sync_service.set_auto_sync(data["auto_sync_new"])
    if "auto_track_threshold" in data:
        sync_service.set_auto_track_threshold(data["auto_track_threshold"])
    if "auto_update_targets" in data:
        sync_service.set_auto_update_targets(data["auto_update_targets"])
    return {"success": True}


# ---- SETTINGS EXPORT/IMPORT ENDPOINTS ----


@app.route("/settings/export", methods=["GET"])
@api_handler(handle_mfa=False)
def export_settings():
    """
    Export user settings and tool configurations as JSON.

    Returns a portable backup that can be imported later.
    Excludes credentials and runtime state.
    """
    from services.settings_export_service import SettingsExportService

    export_service = SettingsExportService(sync_service.state_manager)
    result = export_service.export_settings()

    if result.success:
        return result.data
    else:
        return {"success": False, "error": result.error or "Export failed"}, 500


@app.route("/settings/import", methods=["POST"])
@api_handler(handle_mfa=False)
def import_settings():
    """
    Import settings from a previously exported backup.

    Body: {
        "data": { ... },  # The export data
        "options": {
            "tools": ["recurring"],  # Optional: specific tools to import
        }
    }
    """
    from services.settings_export_service import SettingsExportService

    request_data = request.get_json()
    if not request_data or "data" not in request_data:
        return {"success": False, "error": "Missing 'data' in request body"}, 400

    export_data = request_data["data"]
    options = request_data.get("options", {})
    tools = options.get("tools")

    export_service = SettingsExportService(sync_service.state_manager)
    result = export_service.import_settings(export_data, tools=tools)

    return {
        "success": result.success,
        "imported": result.imported,
        "warnings": result.warnings,
        "error": result.error,
    }


@app.route("/settings/import/preview", methods=["POST"])
@api_handler(handle_mfa=False)
def preview_import():
    """
    Preview what would be imported from an export file.

    Body: { "data": { ... } }
    Returns a summary of tools and item counts.
    """
    from services.settings_export_service import SettingsExportService

    request_data = request.get_json()
    if not request_data or "data" not in request_data:
        return {"success": False, "error": "Missing 'data' in request body"}, 400

    export_data = request_data["data"]
    export_service = SettingsExportService(sync_service.state_manager)

    # Validate first
    is_valid, errors = export_service.validate_import(export_data)
    if not is_valid:
        return {"success": False, "valid": False, "errors": errors}, 400

    preview = export_service.get_export_preview(export_data)
    return {"success": True, "valid": True, "preview": preview}


# ---- AUTO-SYNC ENDPOINTS ----


@app.route("/recurring/auto-sync/status", methods=["GET"])
@api_handler(handle_mfa=False)
def get_auto_sync_status():
    """Get auto-sync status and configuration."""
    return sync_service.get_auto_sync_status()


@app.route("/recurring/auto-sync/enable", methods=["POST"])
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
    data = request.get_json()
    interval = data.get("interval_minutes", 360)
    passphrase = data.get("passphrase")
    consent = data.get("consent_acknowledged", False)

    if not passphrase:
        return {"success": False, "error": "Passphrase required"}

    result = await sync_service.enable_auto_sync(interval, passphrase, consent)
    _audit_log("AUTO_SYNC_ENABLE", result.get("success", False), f"interval={interval}")
    return _sanitize_api_result(result, "Failed to enable auto-sync.")


@app.route("/recurring/auto-sync/disable", methods=["POST"])
@api_handler(handle_mfa=False)
def disable_auto_sync():
    """Disable automatic background sync."""
    result = sync_service.disable_auto_sync()
    _audit_log("AUTO_SYNC_DISABLE", result.get("success", False), "")
    return _sanitize_api_result(result, "Failed to disable auto-sync.")


@app.route("/recurring/notices", methods=["GET"])
@api_handler(handle_mfa=False)
def get_notices():
    """Get all active (undismissed) notices for removed recurring items."""
    notices = sync_service.state_manager.get_active_notices()
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


@app.route("/recurring/notices/<notice_id>/dismiss", methods=["POST"])
@api_handler(handle_mfa=False)
def dismiss_notice(notice_id):
    """Dismiss a notice by its ID."""
    result = sync_service.state_manager.dismiss_notice(notice_id)
    if not result:
        from core.exceptions import MonarchTrackerError

        raise MonarchTrackerError("Notice not found", code="NOT_FOUND")
    return {"success": True}


@app.route("/recurring/refresh-item", methods=["POST"])
@api_handler(handle_mfa=False)
def refresh_item():
    """Clear frozen target for an item to force recalculation."""
    data = request.get_json()
    recurring_id = data.get("recurring_id")

    if not recurring_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id'")

    result = sync_service.state_manager.clear_frozen_target(recurring_id)
    return {"success": result}


@app.route("/recurring/ready-to-assign", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_ready_to_assign():
    """Get the ready to assign (unbudgeted) amount."""
    return await sync_service.get_ready_to_assign()


@app.route("/recurring/allocate", methods=["POST"])
@api_handler(handle_mfa=True)
async def allocate_funds():
    """Allocate funds to a recurring item's category."""
    data = request.get_json()
    recurring_id = data.get("recurring_id")
    amount = data.get("amount", 0)

    if not recurring_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id'")

    return await sync_service.allocate_funds(recurring_id, amount)


@app.route("/recurring/recreate-category", methods=["POST"])
@api_handler(handle_mfa=True)
async def recreate_category():
    """Recreate a missing category for a recurring item."""
    data = request.get_json()
    recurring_id = data.get("recurring_id")

    if not recurring_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id'")

    return await sync_service.recreate_category(recurring_id)


@app.route("/recurring/change-group", methods=["POST"])
@api_handler(handle_mfa=True)
async def change_category_group():
    """Move a subscription's category to a different group."""
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    new_group_id = sanitize_id(data.get("group_id"))
    new_group_name = sanitize_name(data.get("group_name", ""))

    if not recurring_id or not new_group_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id' or 'group_id'")

    result = await sync_service.change_category_group(recurring_id, new_group_id, new_group_name)
    return sanitize_response(result)


# ---- CATEGORY LINKING ENDPOINTS ----


@app.route("/recurring/unmapped-categories", methods=["GET"])
@api_handler(handle_mfa=True, success_wrapper="categories")
async def get_unmapped_categories():
    """Get all categories that are not mapped to any recurring item."""
    return await sync_service.get_unmapped_categories()


@app.route("/recurring/link-category", methods=["POST"])
@api_handler(handle_mfa=True)
async def link_category():
    """Link a recurring item to an existing category."""
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    category_id = sanitize_id(data.get("category_id"))
    sync_name = data.get("sync_name", True)

    if not recurring_id or not category_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id' or 'category_id'")

    result = await sync_service.link_to_category(recurring_id, category_id, sync_name)
    return sanitize_response(result)


@app.route("/recurring/clear-category-cache", methods=["POST"])
@api_handler(handle_mfa=False)
def clear_category_cache():
    """Clear the category cache to force a fresh fetch from Monarch."""
    return sync_service.clear_category_cache()


# ---- ROLLUP ENDPOINTS ----


@app.route("/recurring/rollup", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_rollup():
    """Get current rollup state and items."""
    return await sync_service.get_rollup_data()


@app.route("/recurring/rollup/add", methods=["POST"])
@api_handler(handle_mfa=True)
async def add_to_rollup():
    """Add a subscription to the rollup."""
    data = request.get_json()
    recurring_id = data.get("recurring_id")

    if not recurring_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id'")

    return await sync_service.add_to_rollup(recurring_id)


@app.route("/recurring/rollup/remove", methods=["POST"])
@api_handler(handle_mfa=True)
async def remove_from_rollup():
    """Remove a subscription from the rollup."""
    data = request.get_json()
    recurring_id = data.get("recurring_id")

    if not recurring_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id'")

    return await sync_service.remove_from_rollup(recurring_id)


@app.route("/recurring/rollup/budget", methods=["POST"])
@api_handler(handle_mfa=True)
async def set_rollup_budget():
    """Set the rollup budget amount."""
    data = request.get_json()
    amount = data.get("amount", 0)
    return await sync_service.set_rollup_budget(amount)


@app.route("/recurring/rollup/link", methods=["POST"])
@api_handler(handle_mfa=True)
async def link_rollup_to_category():
    """Link the rollup to an existing Monarch category."""
    data = request.get_json()
    category_id = data.get("category_id")
    sync_name = data.get("sync_name", True)

    if not category_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'category_id'")

    return await sync_service.rollup_service.link_rollup_to_category(category_id, sync_name)


@app.route("/recurring/rollup/create", methods=["POST"])
@api_handler(handle_mfa=True)
async def create_rollup_category():
    """Explicitly create the rollup category in Monarch."""
    data = request.get_json()
    budget = data.get("budget", 0)
    return await sync_service.rollup_service.create_rollup_category(budget)


# ---- EMOJI ENDPOINTS ----


@app.route("/recurring/emoji", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_category_emoji():
    """Update the emoji for a category."""
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    emoji = sanitize_emoji(data.get("emoji", "🔄"))

    if not recurring_id:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id'")

    result = await sync_service.update_category_emoji(recurring_id, emoji)
    return sanitize_response(result)


@app.route("/recurring/rollup/emoji", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_rollup_emoji():
    """Update the emoji for the rollup category."""
    data = request.get_json()
    emoji = data.get("emoji", "🔄")
    return await sync_service.update_rollup_emoji(emoji)


@app.route("/recurring/rollup/name", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_rollup_name():
    """Update the name for the rollup category."""
    data = request.get_json()
    name = data.get("name", "Rollup Category")
    return await sync_service.update_rollup_category_name(name)


@app.route("/recurring/category-name", methods=["POST"])
@api_handler(handle_mfa=True)
async def update_category_name():
    """Update the name for a category."""
    data = request.get_json()
    recurring_id = sanitize_id(data.get("recurring_id"))
    name = sanitize_name(data.get("name"))

    if not recurring_id or not name:
        from core.exceptions import ValidationError

        raise ValidationError("Missing 'recurring_id' or 'name'")

    result = await sync_service.update_category_name(recurring_id, name)
    return sanitize_response(result)


# ---- UNINSTALL ENDPOINTS ----


def _get_railway_project_url() -> str | None:
    """Get the Railway project deletion URL if running on Railway."""
    project_id = os.environ.get("RAILWAY_PROJECT_ID")
    if project_id:
        return f"https://railway.app/project/{project_id}/settings/danger"
    return None


@app.route("/recurring/reset-dedicated", methods=["POST"])
@api_handler(handle_mfa=True)
async def reset_dedicated_categories():
    """
    Reset the dedicated categories feature.

    - Deletes all app-created dedicated categories from Monarch
    - Disables all non-rollup items
    - Preserves: rollup, config, credentials
    """
    result = await sync_service.reset_dedicated_categories()
    _audit_log(
        "RESET_DEDICATED",
        result.get("success", False),
        f"deleted={result.get('deleted_count', 0)}, untracked={result.get('items_disabled', 0)}",
    )
    return _sanitize_api_result(result, "Failed to reset dedicated categories.")


@app.route("/recurring/reset-rollup", methods=["POST"])
@api_handler(handle_mfa=True)
async def reset_rollup():
    """
    Reset the rollup feature.

    - Deletes the rollup category from Monarch (if app-created)
    - Disables all items that were in rollup
    - Preserves: dedicated categories, config, credentials
    """
    result = await sync_service.reset_rollup()
    _audit_log(
        "RESET_ROLLUP",
        result.get("success", False),
        f"deleted_category={result.get('deleted_category', False)}, untracked={result.get('items_disabled', 0)}",
    )
    # Sanitize all error messages to prevent stack trace exposure
    return _sanitize_api_result(result, "Reset rollup failed. Please try again.")


@app.route("/recurring/reset-tool", methods=["POST"])
@api_handler(handle_mfa=True)
async def reset_recurring_tool():
    """
    Full reset of the Recurring tool.
    Deletes all categories, disables all items, and resets the setup wizard.
    """
    result = await sync_service.reset_recurring_tool()
    _audit_log(
        "RESET_RECURRING_TOOL",
        result.get("success", False),
        f"dedicated_deleted={result.get('dedicated_deleted', 0)}, rollup_deleted={result.get('rollup_deleted', False)}",
    )
    # Sanitize all error messages to prevent stack trace exposure
    return _sanitize_api_result(result, "Reset failed. Please try again.")


@app.route("/recurring/deletable-categories", methods=["GET"])
@api_handler(handle_mfa=True)
async def get_deletable_categories():
    """Get categories that can be deleted (created by this tool, not linked)."""
    return await sync_service.get_deletable_categories()


@app.route("/recurring/delete-all-categories", methods=["POST"])
@api_handler(handle_mfa=True)
async def delete_all_categories():
    """Delete all categories created by this tool and reset state."""
    result = await sync_service.delete_all_categories()
    return _sanitize_api_result(result, "Failed to delete categories.")


@app.route("/recurring/cancel-subscription", methods=["POST"])
@api_handler(handle_mfa=True)
async def cancel_subscription():
    """
    Full cancellation flow:
    1. Delete all Monarch categories created by this tool
    2. Clear all local state and credentials
    3. Return Railway project deletion URL for final step

    This is the "nuclear option" - completely removes all traces of the app.
    """
    from typing import Any

    steps_completed: list[str] = []
    instructions: list[str] = []

    # Step 1: Delete Monarch categories
    try:
        delete_result = await sync_service.delete_all_categories()
        if delete_result.get("success"):
            steps_completed.append("monarch_categories_deleted")
    except Exception as e:
        logger.warning(f"[CANCEL] Failed to delete Monarch categories: {e}")
        # Continue anyway - user may have already deleted them

    # Step 2: Clear credentials and logout
    try:
        sync_service.logout()
        steps_completed.append("credentials_cleared")
    except Exception as e:
        logger.warning(f"[CANCEL] Failed to clear credentials: {e}")

    # Step 3: Get Railway deletion URL
    railway_url = _get_railway_project_url()
    result: dict[str, Any] = {
        "success": True,
        "steps_completed": steps_completed,
        "railway_deletion_url": railway_url,
        "instructions": instructions,
    }

    if railway_url:
        result["instructions"] = [
            "All app data has been deleted.",
            "To stop billing, click the link below to delete your Railway project.",
            "On the Railway page, scroll down and click 'Delete Project'.",
        ]
        result["is_railway"] = True
    else:
        result["instructions"] = [
            "All app data has been deleted.",
            "If running on a cloud platform, delete the deployment from your provider's dashboard to stop billing.",
        ]
        result["is_railway"] = False

    _audit_log("CANCEL_SUBSCRIPTION", True, f"Steps: {steps_completed}")

    return result


@app.route("/recurring/deployment-info", methods=["GET"])
@api_handler(handle_mfa=False)
def get_deployment_info():
    """Get information about the current deployment for cancellation UI."""
    railway_url = _get_railway_project_url()
    return {
        "is_railway": railway_url is not None,
        "railway_project_url": railway_url,
        "railway_project_id": os.environ.get("RAILWAY_PROJECT_ID"),
    }


# ---- SECURITY ENDPOINTS ----


@app.route("/security/status", methods=["GET"])
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


@app.route("/security/events", methods=["GET"])
@api_handler(handle_mfa=False)
def get_security_events():
    """
    Get security events with optional filtering.

    Query params:
    - limit: Max events to return (default: 50, max: 200)
    - offset: Pagination offset (default: 0)
    - event_type: Filter by event type (e.g., "LOGIN_ATTEMPT")
    - success: Filter by success/failure (true/false)
    """
    limit = min(request.args.get("limit", 50, type=int), 200)
    offset = request.args.get("offset", 0, type=int)
    event_type = request.args.get("event_type")
    success_param = request.args.get("success")

    success_filter: bool | None = None
    if success_param is not None:
        success_filter = success_param.lower() == "true"

    events = security_service.get_events(
        limit=limit, offset=offset, event_type=event_type, success=success_filter
    )

    return {
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "success": e.success,
                "timestamp": e.timestamp,
                "ip_address": e.ip_address,
                "country": e.country,
                "city": e.city,
                "details": e.details,
            }
            for e in events
        ],
        "limit": limit,
        "offset": offset,
    }


@app.route("/security/events/summary", methods=["GET"])
@api_handler(handle_mfa=False)
def get_security_summary():
    """Get summary statistics for security events."""
    summary = security_service.get_summary()
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


@app.route("/security/events/export", methods=["GET"])
@api_handler(handle_mfa=False)
def export_security_events():
    """Export security events as CSV file."""
    from flask import Response

    # CSV content is sanitized in security_service.export_events_csv()
    csv_content = security_service.export_events_csv()
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={
            "Content-Disposition": "attachment;filename=security_events.csv",
            "X-Content-Type-Options": "nosniff",  # Prevent MIME type sniffing
        },
    )


@app.route("/security/events/clear", methods=["POST"])
@api_handler(handle_mfa=False)
def clear_security_events():
    """Clear all security event logs."""
    security_service.clear_events()
    _audit_log("SECURITY_LOGS_CLEARED", True, "All security logs cleared by user")
    return {"success": True, "message": "Security logs cleared"}


@app.route("/security/alerts", methods=["GET"])
@api_handler(handle_mfa=False)
def get_security_alerts():
    """Get failed login/unlock attempts since last successful login."""
    failed_events = security_service.get_failed_since_last_login()
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


@app.route("/security/alerts/dismiss", methods=["POST"])
@api_handler(handle_mfa=False)
def dismiss_security_alerts():
    """Dismiss security alert banner."""
    security_service.dismiss_security_alert()
    return {"success": True}


# ---- UTILITY ENDPOINTS ----


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


def create_app():
    return app


# ---- VERSION & CHANGELOG ENDPOINTS ----


def _get_app_version() -> str:
    """Get app version from frontend package.json."""
    pkg_path = Path(__file__).parent / "frontend" / "package.json"
    if pkg_path.exists():
        with open(pkg_path) as f:
            return str(json.load(f).get("version", "0.0.0"))
    return "0.0.0"


def _parse_changelog() -> list[dict]:
    """Parse CHANGELOG.md into structured data."""
    changelog_path = Path(__file__).parent / "CHANGELOG.md"
    if not changelog_path.exists():
        return []

    content = changelog_path.read_text()
    versions: list[dict] = []

    # Parse changelog format: ## [X.Y.Z] - YYYY-MM-DD
    version_pattern = r"^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$"
    section_pattern = r"^### (Added|Changed|Deprecated|Removed|Fixed|Security)$"
    summary_pattern = r"^> (.+)$"

    current_version = None
    current_section = None
    expecting_summary = False

    for line in content.split("\n"):
        version_match = re.match(version_pattern, line)
        if version_match:
            if current_version:
                versions.append(current_version)
            current_version = {
                "version": version_match.group(1),
                "date": version_match.group(2),
                "summary": None,
                "sections": {},
            }
            current_section = None
            expecting_summary = True
            continue

        # Capture blockquote summary after version header
        if expecting_summary and current_version:
            summary_match = re.match(summary_pattern, line)
            if summary_match:
                if current_version["summary"]:
                    current_version["summary"] += " " + summary_match.group(1)
                else:
                    current_version["summary"] = summary_match.group(1)
                continue
            elif line.strip() == "":
                continue  # Skip blank lines while looking for summary
            else:
                expecting_summary = False  # Stop looking if we hit other content

        section_match = re.match(section_pattern, line)
        if section_match and current_version:
            current_section = section_match.group(1).lower()
            current_version["sections"][current_section] = []
            expecting_summary = False
            continue

        if line.startswith("- ") and current_version and current_section:
            current_version["sections"][current_section].append(line[2:])

    if current_version:
        versions.append(current_version)

    return versions


def _get_update_type(client: tuple, server: tuple) -> str:
    """Determine update type: major, minor, or patch."""
    if server[0] > client[0]:
        return "major"
    if server[1] > client[1]:
        return "minor"
    return "patch"


def _parse_semver(v: str) -> tuple:
    """Parse a semver string into a tuple of ints."""
    parts = v.split(".")
    return tuple(int(p) for p in parts[:3])


@app.route("/version", methods=["GET"])
def get_version():
    """Get current app version, channel, and build info."""
    version = _get_app_version()
    channel = config.RELEASE_CHANNEL
    is_beta = "-beta" in version or "-rc" in version or "-alpha" in version or channel == "beta"

    return jsonify(
        {
            "version": version,
            "channel": channel,
            "is_beta": is_beta,
            "schema_version": config.SCHEMA_VERSION,
            "build_time": config.BUILD_TIME,
            "git_sha": config.GIT_SHA,
        }
    )


@app.route("/version/changelog", methods=["GET"])
def get_changelog():
    """Get parsed changelog entries."""
    limit = request.args.get("limit", type=int, default=5)
    changelog = _parse_changelog()
    return jsonify(
        {
            "current_version": _get_app_version(),
            "entries": changelog[:limit] if limit else changelog,
            "total_entries": len(changelog),
        }
    )


@app.route("/version/check", methods=["POST"])
def check_version():
    """
    Check if client version is outdated.

    Body: { "client_version": "1.0.0" }
    """
    data = request.get_json() or {}
    client_version = data.get("client_version", "0.0.0")
    server_version = _get_app_version()

    client_parts = _parse_semver(client_version)
    server_parts = _parse_semver(server_version)

    update_available = server_parts > client_parts

    return jsonify(
        {
            "client_version": client_version,
            "server_version": server_version,
            "update_available": update_available,
            "update_type": _get_update_type(client_parts, server_parts)
            if update_available
            else None,
        }
    )


@app.route("/version/changelog/status", methods=["GET"])
def get_changelog_status():
    """
    Check if there are unread changelog entries.

    Returns whether the current version has been read and the latest version available.
    """
    current_version = _get_app_version()
    last_read = sync_service.state_manager.get_last_read_changelog_version()

    # If never read, there are unread entries (unless this is a fresh install with no changelog)
    has_unread = last_read is None or _parse_semver(current_version) > _parse_semver(last_read)

    return jsonify(
        {
            "current_version": current_version,
            "last_read_version": last_read,
            "has_unread": has_unread,
        }
    )


@app.route("/version/changelog/read", methods=["POST"])
def mark_changelog_read():
    """
    Mark the changelog as read up to the current version.

    This is called when the user views the changelog.
    """
    current_version = _get_app_version()
    sync_service.state_manager.set_last_read_changelog_version(current_version)

    return jsonify(
        {
            "success": True,
            "marked_version": current_version,
        }
    )


# ---- RELEASES & UPDATES ----


@app.route("/version/releases", methods=["GET"])
def get_available_releases():
    """
    Fetch available releases from GitHub to show update options.

    Returns list of recent stable and beta releases.
    """
    import urllib.error
    import urllib.request

    current_version = _get_app_version()
    releases_url = f"https://api.github.com/repos/{config.GITHUB_REPO}/releases"

    try:
        req = urllib.request.Request(
            releases_url,
            headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "Eclosion"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            releases_data = json.loads(response.read().decode())

        stable_releases = []
        beta_releases = []

        for release in releases_data[:20]:  # Check last 20 releases
            tag = release.get("tag_name", "")
            # Remove 'v' prefix if present
            version = tag.lstrip("v")

            release_info = {
                "version": version,
                "tag": tag,
                "name": release.get("name", version),
                "published_at": release.get("published_at"),
                "is_prerelease": release.get("prerelease", False),
                "html_url": release.get("html_url"),
                "is_current": version == current_version or tag == current_version,
            }

            if (
                release.get("prerelease")
                or "-beta" in version
                or "-rc" in version
                or "-alpha" in version
            ):
                beta_releases.append(release_info)
            else:
                stable_releases.append(release_info)

        return jsonify(
            {
                "current_version": current_version,
                "current_channel": config.RELEASE_CHANNEL,
                "stable_releases": stable_releases[:5],
                "beta_releases": beta_releases[:5],
            }
        )

    except (urllib.error.URLError, json.JSONDecodeError) as e:
        logger.warning(f"Failed to fetch releases: {e}")
        return jsonify(
            {
                "current_version": current_version,
                "current_channel": config.RELEASE_CHANNEL,
                "stable_releases": [],
                "beta_releases": [],
                "error": "Could not fetch releases from GitHub",
            }
        )


@app.route("/version/update-info", methods=["GET"])
def get_update_info():
    """
    Get deployment-specific update instructions.

    Detects deployment type (Railway vs Docker) and provides
    appropriate instructions for updating.
    """
    is_railway = os.environ.get("RAILWAY_PROJECT_ID") is not None
    is_container = config.is_container_environment()

    if is_railway:
        deployment_type = "railway"
    elif is_container:
        deployment_type = "docker"
    else:
        deployment_type = "local"

    instructions = {
        "railway": {
            "steps": [
                "Open your Railway project dashboard",
                "Click on your Eclosion service",
                "Go to Settings > Source",
                "Change the Docker image tag to the desired version",
                "Railway will automatically redeploy",
            ],
            "project_url": f"https://railway.app/project/{os.environ.get('RAILWAY_PROJECT_ID', '')}"
            if is_railway
            else None,
        },
        "docker": {
            "steps": [
                "Edit your docker-compose.yml file",
                "Change the image tag to the desired version (e.g., ghcr.io/graysoncadams/eclosion:1.2.3)",
                "Run: docker compose pull && docker compose up -d",
            ],
            "example_compose": f"image: ghcr.io/{config.GITHUB_REPO}:VERSION",
        },
        "local": {
            "steps": [
                "Pull the latest changes from the repository",
                "Rebuild and restart the application",
            ],
        },
    }

    return jsonify(
        {
            "deployment_type": deployment_type,
            "current_version": _get_app_version(),
            "current_channel": config.RELEASE_CHANNEL,
            "instructions": instructions.get(deployment_type, instructions["docker"]),
        }
    )


# ---- MIGRATION ----


@app.route("/migration/status", methods=["GET"])
def get_migration_status():
    """
    Check current state file compatibility.

    Returns compatibility status, whether migration is needed,
    and any warnings about the current state.
    """
    from state.migrations import BackupManager, check_compatibility

    # Load raw state data
    if not config.STATE_FILE.exists():
        return jsonify(
            {
                "compatibility": "compatible",
                "message": "No state file exists yet",
                "needs_migration": False,
                "can_auto_migrate": False,
                "has_backups": False,
            }
        )

    with open(config.STATE_FILE) as f:
        state_data = json.load(f)

    result = check_compatibility(state_data)
    backup_manager = BackupManager()
    backups = backup_manager.list_backups()

    return jsonify(
        {
            "compatibility": result.level.value,
            "current_schema_version": result.current_schema,
            "file_schema_version": result.file_schema,
            "current_channel": result.current_channel,
            "file_channel": result.file_channel,
            "message": result.message,
            "needs_migration": result.level.value != "compatible",
            "can_auto_migrate": result.can_auto_migrate,
            "requires_backup_first": result.requires_backup_first,
            "has_beta_data": result.has_beta_data,
            "has_backups": len(backups) > 0,
            "latest_backup": backups[0] if backups else None,
        }
    )


@app.route("/migration/execute", methods=["POST"])
@api_handler(handle_mfa=False)
def execute_migration():
    """
    Execute migration to target schema version.

    Body: {
        "target_version": "1.1",  # Optional, defaults to current app schema
        "target_channel": "stable",  # Optional, defaults to current app channel
        "confirm_backup": true  # Required
    }
    """
    from state.migrations import MigrationExecutor

    data = request.get_json() or {}

    if not data.get("confirm_backup"):
        return jsonify(
            {
                "success": False,
                "error": "You must confirm backup creation before migration",
            }
        ), 400

    target_version = data.get("target_version", config.SCHEMA_VERSION)
    target_channel = data.get("target_channel", config.RELEASE_CHANNEL)

    executor = MigrationExecutor()

    # Check safety first
    is_safe, warnings = executor.check_migration_safety(target_version, target_channel)
    if not is_safe and not data.get("force"):
        # Sanitize warnings before returning to prevent information exposure
        sanitized_warnings = []
        for warning in warnings:
            # Remove file paths and limit length to prevent sensitive data leakage
            sanitized = re.sub(r"[/\\][\w./\\-]+", "[path]", str(warning))
            sanitized_warnings.append(sanitized[:200])
        return jsonify(
            {
                "success": False,
                "error": "Migration has warnings. Set 'force': true to proceed.",
                "warnings": sanitized_warnings,
            }
        ), 400

    success, _message, backup_path = executor.execute_migration(
        target_version=target_version,
        target_channel=target_channel,
        create_backup=True,
    )

    # Use hardcoded messages to prevent any tainted data from flowing through
    # (CodeQL tracks exception info that could be in _message)
    safe_message = (
        "Migration completed successfully." if success else "Migration failed. Please try again."
    )

    # Only expose backup filename, not full path (prevents directory structure disclosure)
    # Use str() explicitly to break any taint tracking from Path object
    safe_backup_name = str(backup_path.name) if backup_path else None

    # Sanitize warnings to remove any paths or sensitive details
    safe_warnings: list[str] = []
    if not is_safe:
        for warning in warnings:
            # Remove file paths from warnings
            sanitized = re.sub(r"[/\\][\w./\\-]+", "[path]", str(warning))
            safe_warnings.append(sanitized[:200])  # Limit length

    # Return a new dict with only safe values to ensure CodeQL sees sanitization
    return jsonify(
        {
            "success": bool(success),
            "message": safe_message,
            "backup_name": safe_backup_name,
            "warnings": safe_warnings,
        }
    )


@app.route("/migration/backups", methods=["GET"])
def list_backups():
    """List available state backups."""
    from state.migrations import BackupManager

    backup_manager = BackupManager()
    backups = backup_manager.list_backups()

    return jsonify(
        {
            "backups": backups,
            "max_backups": config.MAX_BACKUPS,
        }
    )


@app.route("/migration/backups", methods=["POST"])
@api_handler(handle_mfa=False)
def create_backup():
    """
    Create a manual backup of the current state.

    Body: {
        "reason": "manual"  # Optional, default: "manual"
    }
    """
    from state.migrations import BackupManager

    data = request.get_json() or {}
    reason = data.get("reason", "manual")

    backup_manager = BackupManager()
    backup_path = backup_manager.create_backup(reason=reason)

    if backup_path:
        return jsonify(
            {
                "success": True,
                # Only expose filename, not full path (security: prevent path disclosure)
                "backup_path": backup_path.name,
            }
        )
    else:
        return jsonify(
            {
                "success": False,
                "error": "No state file to backup",
            }
        ), 400


@app.route("/migration/restore", methods=["POST"])
@api_handler(handle_mfa=False)
def restore_backup():
    """
    Restore state from a backup.

    Body: {
        "backup_path": "backup_filename.json",  # Filename only, not full path
        "create_backup_first": true  # Optional, default: true
    }
    """
    from state.migrations import BackupManager

    data = request.get_json() or {}
    backup_path = data.get("backup_path")

    if not backup_path:
        return jsonify(
            {
                "success": False,
                "error": "backup_path is required",
            }
        ), 400

    # Pre-validate path format to reject obvious traversal attempts early
    if ".." in str(backup_path) or not str(backup_path).endswith(".json"):
        return jsonify(
            {
                "success": False,
                "error": "Invalid backup path format.",
            }
        ), 400

    backup_manager = BackupManager()

    try:
        # BackupManager.restore_backup validates path is within backup directory
        backup_manager.restore_backup(
            backup_path=Path(backup_path),
            create_backup_first=data.get("create_backup_first", True),
        )
        return jsonify(
            {
                "success": True,
                "message": "Backup restored successfully.",
            }
        )
    except FileNotFoundError:
        return jsonify(
            {
                "success": False,
                "error": "Backup file not found",
            }
        ), 404
    except ValueError:
        # Path validation errors - return generic message to avoid path disclosure
        return jsonify(
            {
                "success": False,
                "error": "Invalid backup path provided.",
            }
        ), 400
    except Exception as e:
        logger.error(f"Restore failed: {type(e).__name__}")
        return jsonify(
            {
                "success": False,
                "error": "Restore failed. Please try again.",
            }
        ), 500


# ---- FRONTEND SERVING ----


INDEX_HTML = "index.html"


def _serve_spa():
    """Serve the React SPA index.html if available."""
    if app.static_folder and os.path.exists(os.path.join(app.static_folder, INDEX_HTML)):
        return send_from_directory(app.static_folder, INDEX_HTML)
    return None


@app.route("/")
def serve_index():
    """Serve the React frontend."""
    response = _serve_spa()
    if response:
        return response
    return jsonify({"message": "API is running. Frontend not available."}), 200


@app.errorhandler(404)
def not_found(e):
    """Serve index.html for SPA client-side routing."""
    response = _serve_spa()
    if response:
        return response
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.SERVER_PORT)
