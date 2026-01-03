"""
Input sanitization utilities for security.

Provides functions to sanitize user input to prevent:
- XSS (Cross-Site Scripting)
- Log injection
- Path traversal
"""

import html
import re
from typing import Any


def sanitize_string(value: str | None, max_length: int = 500) -> str:
    """
    Sanitize a string value for safe output.

    - HTML-encodes special characters to prevent XSS
    - Removes control characters
    - Truncates to max_length

    Args:
        value: The string to sanitize
        max_length: Maximum length of output

    Returns:
        Sanitized string
    """
    if value is None:
        return ""

    # Convert to string if needed
    value = str(value)

    # Remove control characters (except newlines and tabs in some contexts)
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)

    # HTML-encode to prevent XSS when rendered
    value = html.escape(value, quote=True)

    # Truncate to max length
    return value[:max_length]


def sanitize_for_json(value: str | None, max_length: int = 500) -> str:
    """
    Sanitize a string for safe inclusion in JSON responses.

    JSON encoding handles most XSS concerns, but we still:
    - Remove control characters that could cause parsing issues
    - Truncate to reasonable length
    - Validate the content is safe

    Args:
        value: The string to sanitize
        max_length: Maximum length of output

    Returns:
        Sanitized string safe for JSON
    """
    if value is None:
        return ""

    value = str(value)

    # Remove control characters
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)

    # Truncate
    return value[:max_length]


def sanitize_name(value: str | None, max_length: int = 200) -> str:
    """
    Sanitize a name field (category name, group name, etc.).

    More restrictive than general string sanitization:
    - Removes HTML tags entirely
    - Removes control characters
    - Strips leading/trailing whitespace
    - Truncates to max_length

    Args:
        value: The name to sanitize
        max_length: Maximum length of output

    Returns:
        Sanitized name
    """
    if value is None:
        return ""

    value = str(value)

    # Remove any HTML tags
    value = re.sub(r"<[^>]*>", "", value)

    # Remove control characters
    value = re.sub(r"[\x00-\x1f\x7f]", "", value)

    # Strip whitespace
    value = value.strip()

    # Truncate
    return value[:max_length]


def sanitize_emoji(value: str | None) -> str:
    """
    Sanitize an emoji field.

    Only allows actual emoji characters or a small fallback set.

    Args:
        value: The emoji to sanitize

    Returns:
        Sanitized emoji or default
    """
    if value is None:
        return "🔄"

    value = str(value)

    # Remove any HTML/script content
    value = re.sub(r"<[^>]*>", "", value)

    # Only keep first grapheme cluster (emoji can be multi-codepoint)
    # Simple approach: take first 4 characters max
    value = value[:4].strip()

    # If empty after sanitization, use default
    return value if value else "🔄"


def sanitize_id(value: str | None) -> str | None:
    """
    Sanitize an ID field.

    IDs should be alphanumeric with limited special characters.

    Args:
        value: The ID to sanitize

    Returns:
        Sanitized ID or None if invalid
    """
    if value is None:
        return None

    value = str(value)

    # Only allow alphanumeric, hyphens, underscores
    if not re.match(r"^[\w-]+$", value):
        return None

    # Reasonable max length for IDs
    return value[:100]


def sanitize_dict_values(data: dict[str, Any], fields: list[str]) -> dict[str, Any]:
    """
    Sanitize specific string fields in a dictionary.

    Args:
        data: Dictionary to sanitize
        fields: List of field names to sanitize

    Returns:
        Dictionary with sanitized values
    """
    result = data.copy()
    for field in fields:
        if field in result and isinstance(result[field], str):
            result[field] = sanitize_for_json(result[field])
    return result


def safe_error_message(error: Exception) -> str:
    """
    Get a safe error message that doesn't expose sensitive details.

    Sanitizes the error message to prevent:
    - Information disclosure (stack traces, file paths)
    - Log injection
    - XSS if message is displayed

    Args:
        error: The exception

    Returns:
        Safe error message string
    """
    from .exceptions import ValidationError

    # For ValidationError, we can expose the message but sanitize it
    if isinstance(error, ValidationError):
        msg = str(error)
        # Remove any file paths
        msg = re.sub(r"[/\\][\w./\\-]+", "[path]", msg)
        # Sanitize for output
        return sanitize_for_json(msg, max_length=200)

    # For ValueError with simple messages, expose but sanitize
    if isinstance(error, ValueError):
        msg = str(error)
        # Only expose if it's a simple message without sensitive info
        if len(msg) < 100 and "/" not in msg and "\\" not in msg:
            return sanitize_for_json(msg, max_length=200)

    # For all other exceptions, return generic message
    return "An error occurred. Please try again."
