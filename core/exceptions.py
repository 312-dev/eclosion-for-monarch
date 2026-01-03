"""
Custom Exception Hierarchy

Provides specific exception types for different error scenarios,
enabling more precise error handling and better error messages.
"""


class MonarchTrackerError(Exception):
    """Base exception for all tracker errors."""

    code: str = "UNKNOWN_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message)
        if code:
            self.code = code


class AuthenticationError(MonarchTrackerError):
    """Raised when authentication fails."""

    code = "AUTH_ERROR"


class MFARequiredError(AuthenticationError):
    """Raised when MFA is required but not provided or invalid."""

    code = "MFA_REQUIRED"


class MonarchAPIError(MonarchTrackerError):
    """Raised when Monarch API returns an error."""

    code = "MONARCH_API_ERROR"


class RateLimitError(MonarchAPIError):
    """Raised when rate limited by Monarch API."""

    code = "RATE_LIMITED"

    def __init__(
        self,
        message: str = "Rate limited. Please wait and try again.",
        retry_after: int = 60,
    ):
        super().__init__(message)
        self.retry_after = retry_after


class CategoryNotFoundError(MonarchTrackerError):
    """Raised when a category doesn't exist."""

    code = "CATEGORY_NOT_FOUND"


class ConfigurationError(MonarchTrackerError):
    """Raised when tracker is not configured."""

    code = "NOT_CONFIGURED"


class ValidationError(MonarchTrackerError):
    """Raised when request validation fails."""

    code = "VALIDATION_ERROR"
