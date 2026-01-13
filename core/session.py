# Session timeout management
# Extracted from api.py for use in blueprints

from datetime import datetime, timedelta

from core import config


class SessionManager:
    """Encapsulates session timeout tracking.

    Uses class-level state for single-process app.
    Thread-safe for basic operations.

    Note: Class variables are global state, acceptable for single-process
    Flask apps. Would need Redis or similar for multi-process deployments.
    """

    _last_activity: datetime | None = None

    @classmethod
    def update_activity(cls) -> None:
        """Update last activity timestamp for session timeout tracking."""
        cls._last_activity = datetime.now()

    @classmethod
    def check_timeout(cls) -> bool:
        """Check if session has timed out due to inactivity.

        Returns True if session has exceeded the configured timeout.
        """
        if cls._last_activity is None:
            return False
        elapsed = datetime.now() - cls._last_activity
        return elapsed > timedelta(minutes=config.SESSION_TIMEOUT_MINUTES)

    @classmethod
    def clear(cls) -> None:
        """Clear session state.

        Used in tests and logout to reset timeout tracking.
        """
        cls._last_activity = None

    @classmethod
    def is_active(cls) -> bool:
        """Check if there's an active session being tracked.

        Returns True if activity has been recorded (session started).
        """
        return cls._last_activity is not None
