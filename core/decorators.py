"""
API Decorators

Provides decorators for Flask API endpoints including:
- Async support
- Unified error handling
- MFA error detection
- Rate limit handling
- XSS sanitization
"""

import asyncio
import html
import inspect
import logging
from collections.abc import Callable
from functools import wraps

from flask import jsonify

from .error_detection import is_mfa_error, is_rate_limit_error

logger = logging.getLogger(__name__)


def _sanitize_response_xss(data: dict | list | str | None) -> dict | list | str | None:
    """
    Sanitize response data to prevent reflected XSS.

    Recursively applies html.escape() to all string values in the response.
    This ensures user-controlled data cannot be used for XSS attacks even if
    the JSON response is somehow rendered as HTML.
    """
    if data is None:
        return None
    if isinstance(data, bool):
        # Must check bool before int since bool is subclass of int
        return data
    if isinstance(data, int | float):
        return data
    if isinstance(data, str):
        return html.escape(data)
    if isinstance(data, list):
        return [_sanitize_response_xss(item) for item in data]
    if isinstance(data, dict):
        return {key: _sanitize_response_xss(value) for key, value in data.items()}
    # For any other type, convert to string and escape
    return html.escape(str(data))


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

                # Sanitize response to prevent XSS
                sanitized = _sanitize_response_xss(result)

                # Format successful response
                if success_wrapper:
                    return jsonify({success_wrapper: sanitized})
                return jsonify(sanitized)

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

    # Validation error - use the explicit user_message property
    if isinstance(e, ValidationError):
        logger.warning(f"Validation error: {e}")
        # Use user_message property which is explicitly designed to be safe for exposure
        return (
            jsonify({"error": e.user_message, "code": "VALIDATION_ERROR", "success": False}),
            400,
        )

    # Generic error - never expose exception details to prevent information leakage
    logger.exception(f"API error: {e}")
    # Return static message - do not pass exception to response
    return jsonify(
        {
            "error": "An error occurred. Please try again.",
            "success": False,
            "code": "INTERNAL_ERROR",
        }
    ), 500
