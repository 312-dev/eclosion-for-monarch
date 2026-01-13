# Auth blueprint
# /auth/* endpoints for authentication and credential management

import logging

from flask import Blueprint, jsonify, request, session

from core import api_handler, async_flask, config
from core.audit import audit_log
from core.middleware import sanitize_api_result
from core.rate_limit import limiter
from core.session import SessionManager

from . import get_services

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/status", methods=["GET"])
@api_handler(handle_mfa=False)
async def auth_status():
    """
    Check authentication status.

    Returns:
    - authenticated: True if session has active (unlocked) credentials
    - has_stored_credentials: True if encrypted credentials exist on disk
    - needs_unlock: True if credentials exist but are locked (need passphrase)
    """
    services = get_services()
    is_authenticated = await services.sync_service.check_auth()
    has_stored = services.sync_service.has_stored_credentials()
    return {
        "authenticated": is_authenticated,
        "has_stored_credentials": has_stored,
        "needs_unlock": has_stored and not is_authenticated,
    }


@auth_bp.route("/validate", methods=["GET"])
@api_handler(handle_mfa=False)
async def auth_validate():
    """Validate that session credentials are still valid with the Monarch API."""
    services = get_services()
    is_valid = await services.sync_service.validate_auth()
    return {"authenticated": is_valid, "validated": True}


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")  # Strict rate limit for login attempts
@async_flask
async def auth_login():
    """
    Validate Monarch Money credentials.

    On success, returns needs_passphrase=True.
    Caller must then call /auth/set-passphrase to encrypt and save credentials.
    """
    services = get_services()
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        mfa_secret = data.get("mfa_secret", "")
        mfa_mode = data.get("mfa_mode", "secret")  # 'secret' or 'code'

        if not email or not password:
            audit_log(services.security_service, "LOGIN_ATTEMPT", False, "Missing credentials")
            return jsonify({"success": False, "error": "Email and password are required"}), 400

        result = await services.sync_service.login(email, password, mfa_secret, mfa_mode)
        audit_log(
            services.security_service,
            "LOGIN_ATTEMPT",
            result.get("success", False),
            f"MFA mode: {mfa_mode}",
        )

        if result.get("success"):
            SessionManager.update_activity()  # Start session timeout tracking

        return jsonify(result)
    except Exception as e:
        audit_log(
            services.security_service, "LOGIN_ATTEMPT", False, f"Exception: {type(e).__name__}"
        )
        logger.error(f"[LOGIN] Exception: {e}")
        # Return generic error message to prevent information exposure
        return jsonify({"success": False, "error": "Login failed. Please try again."}), 500


@auth_bp.route("/desktop-login", methods=["POST"])
@limiter.limit("5 per minute")
@async_flask
async def auth_desktop_login():
    """
    Desktop mode login: validate credentials and establish session directly.

    Unlike /auth/login, this does NOT require a passphrase step.
    Credentials are stored in Electron's safeStorage, not on the Python side.
    The backend only keeps them in memory for the session.

    Only available in desktop mode (ECLOSION_DESKTOP=1).
    """
    services = get_services()

    if not config.is_desktop_environment():
        return jsonify({"success": False, "error": "Desktop mode only"}), 403

    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        mfa_secret = data.get("mfa_secret", "")
        mfa_mode = data.get("mfa_mode", "secret")  # 'secret' or 'code'

        if not email or not password:
            audit_log(services.security_service, "DESKTOP_LOGIN", False, "Missing credentials")
            return jsonify({"success": False, "error": "Email and password are required"}), 400

        result = await services.sync_service.credentials_service.desktop_login(
            email, password, mfa_secret, mfa_mode
        )
        audit_log(
            services.security_service,
            "DESKTOP_LOGIN",
            result.get("success", False),
            f"Desktop mode, MFA mode: {mfa_mode}",
        )

        if result.get("success"):
            SessionManager.update_activity()

        return jsonify(result)
    except Exception as e:
        audit_log(
            services.security_service, "DESKTOP_LOGIN", False, f"Exception: {type(e).__name__}"
        )
        logger.error(f"[DESKTOP_LOGIN] Exception: {e}")
        return jsonify({"success": False, "error": "Login failed. Please try again."}), 500


@auth_bp.route("/set-passphrase", methods=["POST"])
@limiter.limit("5 per minute")  # Rate limit passphrase attempts
@api_handler(handle_mfa=False)
def auth_set_passphrase():
    """
    Set encryption passphrase and save credentials.

    Must be called after successful /auth/login.
    Validates passphrase complexity before saving.
    """
    services = get_services()
    data = request.get_json()
    passphrase = data.get("passphrase", "")

    if not passphrase:
        audit_log(services.security_service, "SET_PASSPHRASE", False, "Empty passphrase provided")
        return {"success": False, "error": "Passphrase is required"}

    result = services.sync_service.set_passphrase(passphrase)
    audit_log(
        services.security_service,
        "SET_PASSPHRASE",
        result.get("success", False),
        "Credentials encrypted",
    )

    if result.get("success"):
        SessionManager.update_activity()
        # Save passphrase in session for auto-restore on page refresh
        session.permanent = True
        session["auth_unlocked"] = True
        session["session_passphrase"] = passphrase

    return sanitize_api_result(result, "Failed to set passphrase.")


@auth_bp.route("/unlock", methods=["POST"])
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
    services = get_services()
    data = request.get_json()
    passphrase = data.get("passphrase", "")
    validate = data.get("validate", False)

    if not passphrase:
        audit_log(services.security_service, "UNLOCK_ATTEMPT", False, "Empty passphrase")
        return {"success": False, "unlock_success": False, "error": "Passphrase is required"}

    if validate:
        # New flow: unlock AND validate against Monarch
        result = await services.sync_service.unlock_and_validate(passphrase)
        unlock_success = result.get("unlock_success", False)
        validation_success = result.get("validation_success", False)

        audit_log(
            services.security_service,
            "UNLOCK_AND_VALIDATE",
            result.get("success", False),
            f"unlock={unlock_success}, validation={validation_success}",
        )

        if result.get("success"):
            SessionManager.update_activity()
            session.permanent = True
            session["auth_unlocked"] = True
            session["session_passphrase"] = passphrase
    else:
        # Legacy flow: just decrypt, no validation
        result = services.sync_service.unlock(passphrase)
        audit_log(services.security_service, "UNLOCK_ATTEMPT", result.get("success", False), "")

        if result.get("success"):
            SessionManager.update_activity()
            session.permanent = True
            session["auth_unlocked"] = True
            session["session_passphrase"] = passphrase

    return sanitize_api_result(result, "Unlock failed.")


@auth_bp.route("/lock", methods=["POST"])
@api_handler(handle_mfa=False)
def auth_lock():
    """Lock the session without clearing stored credentials."""
    services = get_services()
    services.sync_service.lock()
    # Clear session auth state (but keep stored credentials on disk)
    session.pop("auth_unlocked", None)
    session.pop("session_passphrase", None)
    audit_log(services.security_service, "SESSION_LOCK", True, "User initiated lock")
    return {"success": True}


@auth_bp.route("/logout", methods=["POST"])
@api_handler(handle_mfa=False)
def auth_logout():
    """Clear stored credentials and session."""
    services = get_services()
    services.sync_service.logout()
    # Clear entire session
    session.clear()
    audit_log(services.security_service, "LOGOUT", True, "Credentials cleared")
    return {"success": True}


@auth_bp.route("/reauthenticate", methods=["POST"])
@limiter.limit("5 per minute")
@api_handler(handle_mfa=False)
@async_flask
async def auth_reauthenticate():
    """
    Re-authenticate with a one-time MFA code.

    Used when:
    - User's Monarch session has expired
    - User is in 'code' mode (using 6-digit codes instead of stored secret)

    Request body:
    - mfa_code: The 6-digit MFA code from authenticator app
    """
    services = get_services()
    data = request.get_json()
    mfa_code = data.get("mfa_code", "")

    if not mfa_code:
        audit_log(services.security_service, "REAUTHENTICATE", False, "Missing MFA code")
        return {"success": False, "error": "MFA code is required"}

    result = await services.sync_service.reauthenticate(mfa_code)
    audit_log(services.security_service, "REAUTHENTICATE", result.get("success", False), "")

    if result.get("success"):
        SessionManager.update_activity()

    return sanitize_api_result(result, "Re-authentication failed.")


@auth_bp.route("/update-credentials", methods=["POST"])
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
    services = get_services()
    data = request.get_json()
    email = data.get("email", "")
    password = data.get("password", "")
    mfa_secret = data.get("mfa_secret", "")
    passphrase = data.get("passphrase", "")

    if not email or not password:
        audit_log(
            services.security_service, "UPDATE_CREDENTIALS", False, "Missing email or password"
        )
        return {"success": False, "error": "Email and password are required"}

    if not passphrase:
        audit_log(services.security_service, "UPDATE_CREDENTIALS", False, "Missing passphrase")
        return {"success": False, "error": "Passphrase is required"}

    result = await services.sync_service.update_credentials(email, password, mfa_secret, passphrase)
    audit_log(services.security_service, "UPDATE_CREDENTIALS", result.get("success", False), "")

    if result.get("success"):
        SessionManager.update_activity()
        # Save passphrase in session for auto-restore on page refresh
        session.permanent = True
        session["auth_unlocked"] = True
        session["session_passphrase"] = passphrase

    return sanitize_api_result(result, "Failed to update credentials.")


@auth_bp.route("/reset-app", methods=["POST"])
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
    services = get_services()
    services.sync_service.reset_credentials_only()
    # Clear session
    session.pop("auth_unlocked", None)
    session.pop("session_passphrase", None)
    audit_log(
        services.security_service, "RESET_APP", True, "Credentials cleared, preferences preserved"
    )
    return {"success": True, "message": "App reset. Please log in again."}
