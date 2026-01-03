"""
Centralized Error Detection Utilities

Provides consistent error detection for rate limiting and MFA errors
across the codebase. Eliminates duplication in sync_service.py,
decorators.py, and monarch_utils.py.
"""


from .exceptions import MFARequiredError, RateLimitError


def is_rate_limit_error(error: Exception) -> bool:
    """
    Check if exception indicates a rate limit (429) error.

    Detects rate limit errors through:
    1. Exception type (RateLimitError)
    2. String matching in error message for common patterns

    Args:
        error: The exception to check

    Returns:
        True if the error is a rate limit error
    """
    # Type-based detection (preferred)
    if isinstance(error, RateLimitError):
        return True

    # String-based fallback for external library exceptions
    error_str = str(error).lower()
    return (
        "429" in error_str or
        "too many requests" in error_str or
        "rate limit" in error_str
    )


def is_mfa_error(error: Exception) -> bool:
    """
    Check if exception is an MFA-related error.

    Detects MFA errors through:
    1. Exception type (MFARequiredError)
    2. String matching in error message for common MFA patterns

    Args:
        error: The exception to check

    Returns:
        True if the error is an MFA-related error
    """
    # Type-based detection (preferred)
    if isinstance(error, MFARequiredError):
        return True

    # String-based fallback for Monarch library exceptions
    error_msg = str(error).upper()
    return any(term in error_msg for term in ["MFA", "MULTI-FACTOR", "2FA", "TOTP"])


def classify_auth_error(
    error: Exception,
    has_mfa_secret: bool = False
) -> tuple[str, str, str | None]:
    """
    Classify an authentication error and return appropriate error type,
    message, and optional code.

    This centralizes the error classification logic used in login/unlock flows.

    Args:
        error: The exception to classify
        has_mfa_secret: Whether an MFA secret was provided in the auth attempt

    Returns:
        Tuple of (error_type, user_message, error_code)
        error_type: "rate_limit" | "mfa_required" | "mfa_failed" | "auth_failed"
        user_message: Human-readable error message
        error_code: Optional error code for API responses
    """
    if is_rate_limit_error(error):
        return (
            "rate_limit",
            "Rate limited. Please wait a moment and try again.",
            "RATE_LIMITED"
        )

    if is_mfa_error(error):
        if has_mfa_secret:
            return (
                "mfa_failed",
                f"MFA verification failed: {error}",
                "MFA_FAILED"
            )
        return (
            "mfa_required",
            "MFA required. Enter your TOTP secret key.",
            "MFA_REQUIRED"
        )

    return (
        "auth_failed",
        f"Login failed: {error}",
        "AUTH_FAILED"
    )


def format_auth_response(
    error: Exception,
    has_mfa_secret: bool = False
) -> dict:
    """
    Format an authentication error into a standardized API response dict.

    Args:
        error: The exception that occurred
        has_mfa_secret: Whether an MFA secret was provided

    Returns:
        Dict suitable for JSON API response with success, error, and optionally
        needs_mfa fields
    """
    error_type, message, code = classify_auth_error(error, has_mfa_secret)

    response = {
        "success": False,
        "error": message,
    }

    if code:
        response["code"] = code

    if error_type == "mfa_required":
        response["needs_mfa"] = True

    return response
