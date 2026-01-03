"""
API Decorators

Provides decorators for Flask API endpoints including:
- Async support
- Unified error handling
- MFA error detection
- Rate limit handling
"""

import asyncio
import inspect
import logging
from collections.abc import Callable
from functools import wraps

from flask import jsonify

from .error_detection import is_mfa_error, is_rate_limit_error

logger = logging.getLogger(__name__)


def async_flask(f: Callable) -> Callable:
    """
    Decorator to allow async Flask views.

    Wraps an async function to run in asyncio event loop.
    """

    @wraps(f)
    def wrapper(*args, **kwargs):
        if inspect.iscoroutinefunction(f):
            return asyncio.run(f(*args, **kwargs))
        return f(*args, **kwargs)

    return wrapper


def api_handler(
    handle_mfa: bool = True,
    require_auth: bool = True,
    success_wrapper: str | None = None,
) -> Callable:
    """
    Unified API error handler decorator.

    Eliminates repetitive try-except blocks across endpoints by providing
    centralized error handling for common scenarios.

    Args:
        handle_mfa: Whether to handle MFA errors specially (logout + 401)
        require_auth: Whether endpoint requires authentication
        success_wrapper: Optional key to wrap successful response (e.g., "data")

    Handles:
        - MFA errors -> 401 with auth_required flag
        - Rate limit errors -> 429 with retry_after
        - Validation errors -> 400
        - Generic errors -> 500

    Usage:
        @app.route("/recurring/dashboard", methods=["GET"])
        @api_handler(handle_mfa=True)
        async def recurring_dashboard():
            return await sync_service.get_dashboard_data()
    """

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                # Handle async functions
                if inspect.iscoroutinefunction(f):
                    result = asyncio.run(f(*args, **kwargs))
                else:
                    result = f(*args, **kwargs)

                # Format successful response
                if success_wrapper:
                    return jsonify({success_wrapper: result})
                return jsonify(result)

            except Exception as e:
                return _handle_exception(e, handle_mfa)

        return wrapper

    return decorator


def _safe_error_message(e: Exception) -> str:
    """
    Get a safe error message that doesn't expose internal details.

    Uses the centralized safe_error_message from sanitization module.
    """
    from .sanitization import safe_error_message

    return safe_error_message(e)


def _handle_exception(e: Exception, handle_mfa: bool) -> tuple:
    """
    Centralized exception handling.

    Returns appropriate JSON response and status code based on error type.
    """
    from .exceptions import ValidationError

    # MFA Error - requires re-authentication
    if handle_mfa and is_mfa_error(e):
        logger.warning(f"MFA required, clearing credentials: {e}")
        # Import here to avoid circular dependency
        try:
            from services.credentials_service import CredentialsService

            CredentialsService().logout()
        except Exception:
            pass  # Best effort logout

        return (
            jsonify(
                {
                    "error": "Multi-Factor Auth Required",
                    "auth_required": True,
                    "code": "MFA_REQUIRED",
                }
            ),
            401,
        )

    # Rate limit error
    if is_rate_limit_error(e):
        logger.warning(f"Rate limited: {e}")
        retry_after = getattr(e, "retry_after", 60)
        return (
            jsonify(
                {
                    "error": "Rate limit exceeded. Please try again later.",
                    "code": "RATE_LIMITED",
                    "retry_after": retry_after,
                }
            ),
            429,
        )

    # Validation error - sanitize message before exposing
    if isinstance(e, ValidationError):
        logger.warning(f"Validation error: {e}")
        return (
            jsonify({"error": _safe_error_message(e), "code": "VALIDATION_ERROR", "success": False}),
            400,
        )

    # Generic error - use safe message to prevent information exposure
    logger.exception(f"API error: {e}")
    return jsonify(
        {"error": _safe_error_message(e), "success": False, "code": "INTERNAL_ERROR"}
    ), 500
