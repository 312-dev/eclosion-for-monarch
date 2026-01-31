"""
Tests for the Security Service.

Tests cover:
- Event logging and retrieval
- Event filtering and pagination
- Summary statistics
- CSV export
- Geolocation caching
- Event cleanup
"""

from pathlib import Path
from unittest.mock import patch

import pytest

from services.security_service import SecurityEvent, SecurityEventSummary, SecurityService


@pytest.fixture
def security_service(tmp_path: Path):
    """Create a SecurityService with a temporary database."""
    db_path = tmp_path / "security.db"

    with patch("services.security_service.config") as mock_config:
        mock_config.SECURITY_DB_FILE = db_path
        mock_config.SECURITY_EVENT_RETENTION_DAYS = 90

        # Reset singleton for testing
        SecurityService._instance = None
        SecurityService._initialized = False

        service = SecurityService()
        yield service

        # Cleanup singleton after test
        SecurityService._instance = None
        SecurityService._initialized = False


class TestSecurityEventLogging:
    """Tests for event logging functionality."""

    def test_log_event_basic(self, security_service: SecurityService) -> None:
        """Should log a basic security event."""
        security_service.log_event(
            event_type="LOGIN_ATTEMPT",
            success=True,
            ip_address=None,
            details="Test login",
        )

        events, total = security_service.get_events(limit=10)
        assert len(events) == 1
        assert total == 1
        assert events[0].event_type == "LOGIN_ATTEMPT"
        assert events[0].success is True
        assert events[0].details == "Test login"

    def test_log_event_with_ip(self, security_service: SecurityService) -> None:
        """Should log event with IP address."""
        # Use a private IP to avoid geolocation lookup
        security_service.log_event(
            event_type="LOGIN_ATTEMPT",
            success=False,
            ip_address="192.168.1.1",
            details="Failed login",
        )

        events, _ = security_service.get_events(limit=10)
        assert len(events) == 1
        assert events[0].ip_address == "192.168.1.1"

    def test_log_event_truncates_details(self, security_service: SecurityService) -> None:
        """Should truncate long details to 500 characters."""
        long_details = "x" * 1000
        security_service.log_event(
            event_type="TEST",
            success=True,
            details=long_details,
        )

        events, _ = security_service.get_events(limit=10)
        assert len(events[0].details) == 500

    def test_log_event_truncates_user_agent(self, security_service: SecurityService) -> None:
        """Should truncate long user agent to 256 characters."""
        long_ua = "x" * 500
        security_service.log_event(
            event_type="TEST",
            success=True,
            user_agent=long_ua,
        )

        events, _ = security_service.get_events(limit=10)
        assert len(events[0].user_agent) == 256

    def test_log_multiple_events(self, security_service: SecurityService) -> None:
        """Should log multiple events."""
        for i in range(5):
            security_service.log_event(
                event_type=f"EVENT_{i}",
                success=i % 2 == 0,
            )

        events, total = security_service.get_events(limit=10)
        assert len(events) == 5
        assert total == 5


class TestEventRetrieval:
    """Tests for event retrieval and filtering."""

    def test_get_events_with_limit(self, security_service: SecurityService) -> None:
        """Should respect limit parameter."""
        for _ in range(10):
            security_service.log_event(event_type="TEST", success=True)

        events, total = security_service.get_events(limit=5)
        assert len(events) == 5
        assert total == 10  # Total count should be unaffected by limit

    def test_get_events_with_offset(self, security_service: SecurityService) -> None:
        """Should respect offset parameter."""
        for i in range(10):
            security_service.log_event(event_type=f"EVENT_{i}", success=True)

        all_events, _ = security_service.get_events(limit=10)
        offset_events, total = security_service.get_events(limit=5, offset=5)

        # Events are ordered by timestamp DESC, so offset skips most recent
        assert len(offset_events) == 5
        assert total == 10  # Total count should be unaffected by offset
        # The IDs should be different from the first 5
        all_ids = {e.id for e in all_events[:5]}
        offset_ids = {e.id for e in offset_events}
        assert all_ids.isdisjoint(offset_ids)

    def test_get_events_filter_by_type(self, security_service: SecurityService) -> None:
        """Should filter events by type."""
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=True)
        security_service.log_event(event_type="LOGOUT", success=True)
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=False)

        events, total = security_service.get_events(limit=10, event_types=["LOGIN_ATTEMPT"])
        assert len(events) == 2
        assert total == 2  # Total should reflect filtered count
        assert all(e.event_type == "LOGIN_ATTEMPT" for e in events)

    def test_get_events_filter_by_success(self, security_service: SecurityService) -> None:
        """Should filter events by success status."""
        security_service.log_event(event_type="TEST", success=True)
        security_service.log_event(event_type="TEST", success=False)
        security_service.log_event(event_type="TEST", success=True)

        success_events, success_total = security_service.get_events(limit=10, success=True)
        failed_events, failed_total = security_service.get_events(limit=10, success=False)

        assert len(success_events) == 2
        assert success_total == 2
        assert len(failed_events) == 1
        assert failed_total == 1

    def test_get_events_combined_filters(self, security_service: SecurityService) -> None:
        """Should combine multiple filters."""
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=True)
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=False)
        security_service.log_event(event_type="LOGOUT", success=True)

        events, total = security_service.get_events(
            limit=10, event_types=["LOGIN_ATTEMPT"], success=False
        )
        assert len(events) == 1
        assert total == 1
        assert events[0].event_type == "LOGIN_ATTEMPT"
        assert events[0].success is False

    def test_get_events_ordered_by_timestamp_desc(self, security_service: SecurityService) -> None:
        """Should return events ordered by timestamp descending."""
        security_service.log_event(event_type="FIRST", success=True)
        security_service.log_event(event_type="SECOND", success=True)
        security_service.log_event(event_type="THIRD", success=True)

        events, _ = security_service.get_events(limit=10)
        # Most recent should be first
        assert events[0].event_type == "THIRD"
        assert events[-1].event_type == "FIRST"


class TestSummaryStatistics:
    """Tests for summary statistics."""

    def test_get_summary_empty(self, security_service: SecurityService) -> None:
        """Should return zeroed summary for empty database."""
        summary = security_service.get_summary()

        assert summary.total_events == 0
        assert summary.successful_logins == 0
        assert summary.failed_logins == 0
        assert summary.failed_unlock_attempts == 0
        assert summary.logouts == 0
        assert summary.session_timeouts == 0
        assert summary.unique_ips == 0

    def test_get_summary_counts(self, security_service: SecurityService) -> None:
        """Should correctly count events by type."""
        # Successful logins
        security_service.log_event(
            event_type="LOGIN_ATTEMPT", success=True, ip_address="192.168.1.1"
        )
        security_service.log_event(
            event_type="LOGIN_ATTEMPT", success=True, ip_address="192.168.1.2"
        )

        # Failed logins
        security_service.log_event(
            event_type="LOGIN_ATTEMPT", success=False, ip_address="192.168.1.1"
        )

        # Failed unlock
        security_service.log_event(event_type="UNLOCK_ATTEMPT", success=False)

        # Logout
        security_service.log_event(event_type="LOGOUT", success=True)

        # Session timeout
        security_service.log_event(event_type="SESSION_TIMEOUT", success=True)

        summary = security_service.get_summary()

        assert summary.total_events == 6
        assert summary.successful_logins == 2
        assert summary.failed_logins == 1
        assert summary.failed_unlock_attempts == 1
        assert summary.logouts == 1
        assert summary.session_timeouts == 1
        assert summary.unique_ips == 2

    def test_get_summary_last_login_timestamps(self, security_service: SecurityService) -> None:
        """Should track last successful/failed login timestamps."""
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=True)
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=False)

        summary = security_service.get_summary()

        assert summary.last_successful_login is not None
        assert summary.last_failed_login is not None


class TestCSVExport:
    """Tests for CSV export functionality."""

    def test_export_events_csv_empty(self, security_service: SecurityService) -> None:
        """Should export empty CSV with headers only."""
        csv_content = security_service.export_events_csv()

        lines = csv_content.strip().split("\n")
        assert len(lines) == 1  # Header only
        assert "Event Type" in lines[0]

    def test_export_events_csv_with_data(self, security_service: SecurityService) -> None:
        """Should export events as CSV."""
        security_service.log_event(
            event_type="LOGIN_ATTEMPT",
            success=True,
            ip_address="192.168.1.1",
            details="Test login",
        )

        csv_content = security_service.export_events_csv()

        lines = csv_content.strip().split("\n")
        assert len(lines) == 2  # Header + 1 data row
        assert "LOGIN_ATTEMPT" in lines[1]
        assert "Yes" in lines[1]  # Success

    def test_export_csv_sanitizes_values(self, security_service: SecurityService) -> None:
        """Should sanitize values to prevent CSV injection."""
        # Log event with potentially dangerous content
        security_service.log_event(
            event_type="TEST",
            success=True,
            details='=HYPERLINK("malicious")',  # CSV injection attempt
        )

        csv_content = security_service.export_events_csv()

        # Should be escaped/prefixed
        assert "=HYPERLINK" not in csv_content or "'=HYPERLINK" in csv_content


class TestGeolocation:
    """Tests for IP geolocation functionality."""

    def test_skip_private_ip(self, security_service: SecurityService) -> None:
        """Should skip geolocation for private IPs."""
        # Private IPs should return None, None
        country, city = security_service._get_geolocation("192.168.1.1")
        assert country is None
        assert city is None

    def test_skip_loopback_ip(self, security_service: SecurityService) -> None:
        """Should skip geolocation for loopback IPs."""
        country, city = security_service._get_geolocation("127.0.0.1")
        assert country is None
        assert city is None

    def test_skip_invalid_ip(self, security_service: SecurityService) -> None:
        """Should skip geolocation for invalid IPs."""
        country, city = security_service._get_geolocation("not-an-ip")
        assert country is None
        assert city is None

    def test_skip_empty_ip(self, security_service: SecurityService) -> None:
        """Should skip geolocation for empty IP."""
        country, city = security_service._get_geolocation("")
        assert country is None
        assert city is None

    def test_caches_geolocation(self, security_service: SecurityService) -> None:
        """Should cache geolocation results."""
        # Manually cache a result
        security_service._cache_geolocation("8.8.8.8", "United States", "Mountain View")

        # Should retrieve from cache
        cached = security_service._get_cached_geolocation("8.8.8.8")
        assert cached is not None
        assert cached[0] == "United States"
        assert cached[1] == "Mountain View"


class TestClearEvents:
    """Tests for clearing events."""

    def test_clear_events(self, security_service: SecurityService) -> None:
        """Should delete all security events."""
        # Add some events
        for _ in range(5):
            security_service.log_event(event_type="TEST", success=True)

        # Verify events exist
        events, total = security_service.get_events(limit=10)
        assert len(events) == 5
        assert total == 5

        # Clear events
        security_service.clear_events()

        # Verify events are gone
        events, total = security_service.get_events(limit=10)
        assert len(events) == 0
        assert total == 0


class TestFailedSinceLastLogin:
    """Tests for getting failed attempts since last login."""

    def test_get_failed_since_last_login_empty(self, security_service: SecurityService) -> None:
        """Should return empty list when no failed attempts."""
        events = security_service.get_failed_since_last_login()
        assert events == []

    def test_get_failed_since_last_login(self, security_service: SecurityService) -> None:
        """Should return failed attempts after last successful login."""
        # Successful login sets last_login_timestamp
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=True)

        # Failed attempts after login
        security_service.log_event(event_type="UNLOCK_ATTEMPT", success=False)
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=False)

        events = security_service.get_failed_since_last_login()
        assert len(events) == 2
        assert all(e.success is False for e in events)

    def test_dismiss_security_alert(self, security_service: SecurityService) -> None:
        """Should dismiss security alerts."""
        # Log a failed attempt
        security_service.log_event(event_type="LOGIN_ATTEMPT", success=False)

        # Get alerts - should have one
        events_before = security_service.get_failed_since_last_login()
        assert len(events_before) == 1

        # Dismiss alerts
        security_service.dismiss_security_alert()

        # Should not return dismissed alerts
        events_after = security_service.get_failed_since_last_login()
        assert len(events_after) == 0


class TestSecurityEventDataclass:
    """Tests for SecurityEvent dataclass."""

    def test_security_event_creation(self) -> None:
        """Should create SecurityEvent with all fields."""
        event = SecurityEvent(
            id=1,
            event_type="LOGIN_ATTEMPT",
            success=True,
            timestamp="2025-01-01T00:00:00",
            ip_address="192.168.1.1",
            country="United States",
            city="New York",
            details="Test login",
            user_agent="Mozilla/5.0",
        )

        assert event.id == 1
        assert event.event_type == "LOGIN_ATTEMPT"
        assert event.success is True
        assert event.ip_address == "192.168.1.1"
        assert event.country == "United States"

    def test_security_event_defaults(self) -> None:
        """Should have correct default values."""
        event = SecurityEvent(
            id=1,
            event_type="TEST",
            success=True,
            timestamp="2025-01-01T00:00:00",
        )

        assert event.ip_address is None
        assert event.country is None
        assert event.city is None
        assert event.details is None
        assert event.user_agent is None


class TestSecurityEventSummaryDataclass:
    """Tests for SecurityEventSummary dataclass."""

    def test_security_event_summary_creation(self) -> None:
        """Should create SecurityEventSummary with all fields."""
        summary = SecurityEventSummary(
            total_events=100,
            successful_logins=50,
            failed_logins=10,
            failed_unlock_attempts=5,
            logouts=30,
            session_timeouts=5,
            unique_ips=25,
            last_successful_login="2025-01-01T00:00:00",
            last_failed_login="2025-01-01T01:00:00",
        )

        assert summary.total_events == 100
        assert summary.successful_logins == 50
        assert summary.unique_ips == 25

    def test_security_event_summary_defaults(self) -> None:
        """Should have correct default values."""
        summary = SecurityEventSummary(
            total_events=0,
            successful_logins=0,
            failed_logins=0,
            failed_unlock_attempts=0,
            logouts=0,
            session_timeouts=0,
            unique_ips=0,
        )

        assert summary.last_successful_login is None
        assert summary.last_failed_login is None


class TestCSVSanitization:
    """Tests for CSV value sanitization."""

    def test_sanitize_csv_value_none(self, security_service: SecurityService) -> None:
        """Should return empty string for None."""
        result = security_service._sanitize_csv_value(None)
        assert result == ""

    def test_sanitize_csv_value_normal(self, security_service: SecurityService) -> None:
        """Should pass through normal values."""
        result = security_service._sanitize_csv_value("normal value")
        assert result == "normal value"

    def test_sanitize_csv_value_html_entities(self, security_service: SecurityService) -> None:
        """Should escape HTML entities."""
        result = security_service._sanitize_csv_value("<script>alert('xss')</script>")
        assert "<script>" not in result
        assert "&lt;script&gt;" in result

    def test_sanitize_csv_value_formula_injection(self, security_service: SecurityService) -> None:
        """Should prefix formula characters."""
        dangerous_values = ["=cmd|", "+cmd|", "-cmd|", "@SUM(A1)", "|cmd", "%cmd"]

        for value in dangerous_values:
            result = security_service._sanitize_csv_value(value)
            # Should be prefixed with single quote
            assert result.startswith("'"), f"Value {value} was not prefixed"

    def test_sanitize_csv_value_control_chars(self, security_service: SecurityService) -> None:
        """Should remove control characters."""
        result = security_service._sanitize_csv_value("line1\r\nline2\ttab")
        assert "\r" not in result
        assert "\n" not in result
        assert "\t" not in result
