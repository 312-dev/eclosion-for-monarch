# Eclosion for Monarch - Your budgeting, evolved.
# A toolkit for Monarch Money that automates recurring expense tracking.
import os
import secrets

import requests as http_requests  # type: ignore[import-untyped]
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS

from blueprints import Services, init_services, register_blueprints
from core import config, configure_logging
from core.middleware import (
    add_security_headers,
    check_and_handle_session_timeout,
    enforce_desktop_secret,
    enforce_https,
    enforce_instance_secret,
    enforce_tunnel_auth,
    fix_session_cookie_for_tunnel,
    restore_session_credentials,
    set_instance_cookie,
)
from core.rate_limit import init_limiter
from core.session import SessionManager
from services.credentials_service import CredentialsService
from services.security_service import SecurityService
from services.sync_service import SyncService
from state import NotesStateManager
from state.db import init_db

load_dotenv()

# Setup logging (Docker-aware)
logger = configure_logging()

# Dev mode: Proxy frontend requests to Vite for hot-reload
# This allows tunnel access to get hot-reloaded content during development
dev_vite_url = os.environ.get("DEV_VITE_URL")

# Serve static files from frontend directory
# Priority: FRONTEND_PATH env var (desktop mode) > local 'static' directory (web production)
static_folder = None
frontend_path = os.environ.get("FRONTEND_PATH")
if frontend_path and os.path.exists(frontend_path):
    # Desktop mode: Electron passes the bundled frontend path
    static_folder = frontend_path
else:
    # Web mode: Check for local 'static' directory (production build)
    local_static = os.path.join(os.path.dirname(__file__), "static")
    if os.path.exists(local_static):
        static_folder = local_static

if static_folder:
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
# Secure cookies require HTTPS, but desktop mode uses HTTP localhost
# Desktop mode is still secure via DESKTOP_SECRET header authentication
app.config["SESSION_COOKIE_SECURE"] = not app.debug and not config.is_desktop_environment()
app.config["SESSION_COOKIE_HTTPONLY"] = True  # Not accessible via JavaScript
# SameSite=Lax prevents cookies on cross-site requests. Desktop mode loads from file://
# and makes requests to http://localhost, which is cross-site. Disable SameSite for desktop.
# Security: Desktop mode is protected by DESKTOP_SECRET header, not cookies.
app.config["SESSION_COOKIE_SAMESITE"] = None if config.is_desktop_environment() else "Lax"
app.config["PERMANENT_SESSION_LIFETIME"] = config.SESSION_COOKIE_LIFETIME

# CORS configuration
# - Desktop prod mode: Disable CORS (Electron loads bundled files from same origin)
# - Desktop dev mode: Enable CORS (Vite on :5174 makes requests to Flask on :5002)
# - Web/server mode: Enable CORS with credentials for session cookies
if not config.is_desktop_environment() or config.DEBUG_MODE:
    CORS(app, supports_credentials=True)

# Initialize rate limiter
init_limiter(app)

# Initialize SQLite database (runs Alembic migrations)
init_db()
logger.info("Database initialized")

# Initialize services
sync_service = SyncService()
security_service = SecurityService()
notes_manager = NotesStateManager()

# Create services container and register blueprints
services = Services(
    sync_service=sync_service,
    security_service=security_service,
    notes_manager=notes_manager,
)
init_services(app, services)
register_blueprints(app)

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


# ---- SECURITY MIDDLEWARE ----


@app.before_request
def _ensure_scheduler_started():
    """Ensure scheduler is started on first request."""
    _init_scheduler()


@app.before_request
def security_checks():
    """Run security checks before each request."""
    if redirect_response := enforce_https(app.debug):
        return redirect_response

    # Desktop mode: validate runtime secret before processing any request
    # This prevents other local processes from accessing the API
    if error_response := enforce_desktop_secret(services):
        return error_response

    # Tunnel mode: require passphrase auth for remote access
    # This protects the app when accessed via Tunnelmole or similar services
    if error_response := enforce_tunnel_auth(services):
        return error_response

    if error_response := enforce_instance_secret(services):
        return error_response

    # Try to restore credentials from session cookie
    restore_session_credentials(services)

    check_and_handle_session_timeout(services)

    if CredentialsService._session_credentials:
        SessionManager.update_activity()


@app.after_request
def after_request_handler(response):
    """Add security headers and set instance access cookie if needed."""
    response = set_instance_cookie(response)
    response = fix_session_cookie_for_tunnel(response)
    response = add_security_headers(response)
    return response


# ---- FRONTEND SERVING ----


INDEX_HTML = "index.html"


def _sanitize_vite_path(path: str) -> str | None:
    """
    Sanitize and validate a path for Vite proxy requests.

    Security: Prevents SSRF by ensuring the path is a safe relative path
    that only accesses the local Vite dev server.

    Returns sanitized path or None if invalid.
    """
    from urllib.parse import unquote, urlparse

    # Decode URL-encoded characters to catch encoded attacks
    decoded = unquote(path)

    # Block absolute URLs and protocol handlers
    parsed = urlparse(decoded)
    if parsed.scheme or parsed.netloc:
        return None

    # Block path traversal attempts
    if ".." in decoded:
        return None

    # Block null bytes and other dangerous characters
    if "\x00" in decoded or "\\" in decoded:
        return None

    # Ensure path starts with /
    return path if path.startswith("/") else f"/{path}"


def _proxy_to_vite(path: str = "/"):
    """
    Proxy a request to Vite dev server for hot-reload support.

    Used when DEV_VITE_URL is set (dev mode with tunnel).
    Security: Only proxies to the configured Vite dev server (localhost).
    """
    if not dev_vite_url:
        return None

    # Security: Validate and sanitize the path to prevent SSRF
    safe_path = _sanitize_vite_path(path)
    if safe_path is None:
        # lgtm[py/log-injection] - path is truncated and this is development-only code
        logger.warning("Blocked potentially malicious proxy path: %r", path[:50])
        return None

    try:
        # Build the full URL to Vite (dev_vite_url is a trusted env var)
        # This is a dev-only feature for hot-reload support via tunnels
        url = f"{dev_vite_url}{safe_path}"

        # Forward the request to Vite
        # lgtm[py/ssrf] - URL is validated by _sanitize_vite_path, dev_vite_url is trusted
        resp = http_requests.get(url, timeout=5)

        # Build Flask response from Vite response
        # Security: Only forward safe headers from Vite dev server
        excluded_headers = ["content-encoding", "transfer-encoding", "connection"]
        headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded_headers}

        # Security: Vite dev server is trusted, content is proxied as-is
        # The response is from our local dev server running on localhost, not user-controlled
        # lgtm[py/reflective-xss] - Vite dev server response is trusted
        return Response(resp.content, status=resp.status_code, headers=headers)
    except http_requests.RequestException as e:
        logger.debug("Failed to proxy to Vite: %s", e)
        return None


def _serve_spa():
    """Serve the React SPA index.html if available."""
    # In dev mode with DEV_VITE_URL, proxy to Vite for hot-reload
    if dev_vite_url:
        return _proxy_to_vite("/")

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


def _should_proxy_to_vite(path: str, query: str) -> bool:
    """Check if a request should be proxied to Vite dev server."""
    # Proxy static assets and Vite internals directly
    # Includes: source files, assets, Vite client, dependencies
    vite_paths = ("/assets/", "/src/", "/@", "/node_modules/", "/fonts/")
    if path.startswith(vite_paths):
        return True

    # Proxy specific static files at root level
    vite_files = ("/sw.js", "/manifest.json", "/favicon.ico", "/robots.txt")
    if path in vite_files:
        return True

    # Also proxy requests with Vite query params (e.g., ?import for JSON modules)
    return bool(query and ("import" in query or "t=" in query))


@app.errorhandler(404)
def not_found(e):
    """Serve index.html for SPA client-side routing."""
    # In dev mode, proxy any frontend asset requests to Vite
    if dev_vite_url:
        path = request.path
        query = request.query_string.decode() if request.query_string else ""

        if _should_proxy_to_vite(path, query):
            full_path = f"{path}?{query}" if query else path
            response = _proxy_to_vite(full_path)
            if response and response.status_code == 200:
                return response

    # For SPA routes, serve index.html
    response = _serve_spa()
    if response:
        return response
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    # In debug mode, enable hot reloading (watches for file changes)
    use_reloader = app.debug
    app.run(host="0.0.0.0", port=config.SERVER_PORT, use_reloader=use_reloader)
