"""
Tests for Flask API security headers.

Tests cover:
- Security headers on responses

Note: Full API integration tests require proper Flask test configuration.
These tests focus on security headers which can be tested in isolation.
"""

import pytest

from api import app


@pytest.fixture
def client():
    """Create test client."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestSecurityHeaders:
    """Tests for security headers on responses.

    Security headers are added via @app.after_request decorator
    and should be present on all responses.
    """

    def test_x_content_type_options_header(self, client) -> None:
        """Should include X-Content-Type-Options header."""
        # Use any route that returns successfully
        response = client.get("/health")
        # Follow redirect if necessary
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        assert response.headers.get("X-Content-Type-Options") == "nosniff"

    def test_x_frame_options_header(self, client) -> None:
        """Should include X-Frame-Options header."""
        response = client.get("/health")
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        assert response.headers.get("X-Frame-Options") == "DENY"

    def test_x_xss_protection_header(self, client) -> None:
        """Should include X-XSS-Protection header."""
        response = client.get("/health")
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"

    def test_referrer_policy_header(self, client) -> None:
        """Should include Referrer-Policy header."""
        response = client.get("/health")
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

    def test_content_security_policy_header(self, client) -> None:
        """Should include Content-Security-Policy header."""
        response = client.get("/health")
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        csp = response.headers.get("Content-Security-Policy")
        assert csp is not None
        assert "default-src 'self'" in csp

    def test_permissions_policy_header(self, client) -> None:
        """Should include Permissions-Policy header."""
        response = client.get("/health")
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        pp = response.headers.get("Permissions-Policy")
        assert pp is not None
        assert "camera=()" in pp


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_returns_ok(self, client) -> None:
        """Health endpoint should return 200 or 301 redirect."""
        response = client.get("/health")
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        assert response.status_code == 200

    def test_health_returns_json(self, client) -> None:
        """Health endpoint should return JSON."""
        response = client.get("/health")
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        assert "application/json" in response.content_type

    def test_health_contains_status_ok(self, client) -> None:
        """Health response should contain status: ok."""
        response = client.get("/health")
        if response.status_code == 301:
            response = client.get(response.headers.get("Location", "/health"))
        data = response.get_json()
        assert data is not None
        assert data.get("status") == "ok"
