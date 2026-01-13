# Core infrastructure module
from . import config
from .automation_credentials import AutomationCredentialsManager
from .decorators import api_handler, async_flask, sanitize_response
from .error_detection import (
    classify_auth_error,
    format_auth_response,
    is_mfa_error,
    is_rate_limit_error,
)
from .exceptions import (
    AuthenticationError,
    CategoryNotFoundError,
    ConfigurationError,
    MFARequiredError,
    MonarchAPIError,
    MonarchTrackerError,
    RateLimitError,
    ValidationError,
)
from .logging_config import configure_logging
from .sanitization import (
    safe_error_message,
    sanitize_emoji,
    sanitize_for_json,
    sanitize_id,
    sanitize_name,
    sanitize_string,
)
from .scheduler import SyncScheduler
from .session import SessionManager

# Note: audit, middleware, and rate_limit are imported directly where needed
# to avoid circular imports with services

__all__ = [
    "AuthenticationError",
    "AutomationCredentialsManager",
    "CategoryNotFoundError",
    "ConfigurationError",
    "MFARequiredError",
    "MonarchAPIError",
    "MonarchTrackerError",
    "RateLimitError",
    "SessionManager",
    "SyncScheduler",
    "ValidationError",
    "api_handler",
    "async_flask",
    "classify_auth_error",
    "config",
    "configure_logging",
    "format_auth_response",
    "is_mfa_error",
    "is_rate_limit_error",
    "safe_error_message",
    "sanitize_emoji",
    "sanitize_for_json",
    "sanitize_id",
    "sanitize_name",
    "sanitize_response",
    "sanitize_string",
]
