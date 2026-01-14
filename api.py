# Eclosion for Monarch - Your budgeting, evolved.
# A toolkit for Monarch Money that automates recurring expense tracking.
import os
import secrets

from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from blueprints import Services, init_services, register_blueprints
from core import config, configure_logging
from core.middleware import (
    add_security_headers,
    check_and_handle_session_timeout,
    enforce_desktop_secret,
    enforce_https,
    enforce_instance_secret,
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
# - Desktop mode: Disable CORS (only Electron app should access API via desktop secret)
# - Web/server mode: Enable CORS with credentials for session cookies
if not config.is_desktop_environment():
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
    response = add_security_headers(response)
    return response


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
