"""
Tests for the Credentials Service.

Tests cover:
- Session credential management
- Desktop mode login (new flow without passphrase)
- Traditional login with passphrase flow
- Unlock and validation
- Credential updates
- Rate limit handling
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.credentials_service import CredentialsService

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def credentials_service(tmp_path: Path):
    """Create a CredentialsService with mocked dependencies."""
    # Clear class-level session state before each test
    CredentialsService._session_credentials = None
    CredentialsService._pending_credentials = None

    with patch("services.credentials_service.CredentialsManager") as mock_creds_mgr_class:
        mock_creds_mgr = MagicMock()
        mock_creds_mgr.exists.return_value = False
        mock_creds_mgr_class.return_value = mock_creds_mgr

        service = CredentialsService()
        service._mock_creds_mgr = mock_creds_mgr  # Expose for test assertions
        yield service

    # Cleanup after test
    CredentialsService._session_credentials = None
    CredentialsService._pending_credentials = None


@pytest.fixture
def mock_get_mm():
    """Mock the get_mm function for Monarch authentication."""
    with patch("services.credentials_service.get_mm", new_callable=AsyncMock) as mock:
        yield mock


@pytest.fixture
def mock_get_mm_with_code():
    """Mock the get_mm_with_code function for Monarch auth with one-time code."""
    with patch("services.credentials_service.get_mm_with_code", new_callable=AsyncMock) as mock:
        yield mock


# ============================================================================
# Session Management Tests
# ============================================================================


class TestSessionManagement:
    """Tests for session credential management."""

    def test_no_session_credentials_initially(
        self, credentials_service: CredentialsService
    ) -> None:
        """Should have no session credentials on fresh start."""
        assert credentials_service.get_session_credentials() is None

    def test_set_session_credentials_direct(self, credentials_service: CredentialsService) -> None:
        """Should set session credentials directly without validation."""
        credentials_service.set_session_credentials_direct(
            email="test@example.com",
            password="password123",
            mfa_secret="TOTP123",
        )

        creds = credentials_service.get_session_credentials()
        assert creds is not None
        assert creds["email"] == "test@example.com"
        assert creds["password"] == "password123"
        assert creds["mfa_secret"] == "TOTP123"

    def test_lock_clears_session(self, credentials_service: CredentialsService) -> None:
        """Should clear session credentials on lock."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")
        assert credentials_service.get_session_credentials() is not None

        credentials_service.lock()

        assert credentials_service.get_session_credentials() is None

    def test_logout_clears_all(self, credentials_service: CredentialsService) -> None:
        """Should clear session and stored credentials on logout."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")
        CredentialsService._pending_credentials = {"email": "pending@example.com"}

        credentials_service.logout()

        assert credentials_service.get_session_credentials() is None
        assert CredentialsService._pending_credentials is None
        credentials_service._mock_creds_mgr.clear.assert_called_once()


# ============================================================================
# Check Auth Tests
# ============================================================================


class TestCheckAuth:
    """Tests for authentication status checking."""

    @pytest.mark.asyncio
    async def test_check_auth_with_session(self, credentials_service: CredentialsService) -> None:
        """Should return True when session credentials exist."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")

        result = await credentials_service.check_auth()

        assert result is True

    @pytest.mark.asyncio
    async def test_check_auth_no_session(self, credentials_service: CredentialsService) -> None:
        """Should return False when no session or env credentials."""
        with patch.dict("os.environ", {}, clear=True):
            result = await credentials_service.check_auth()
            assert result is False

    @pytest.mark.asyncio
    async def test_check_auth_with_env_vars(self, credentials_service: CredentialsService) -> None:
        """Should return True when env vars have credentials."""
        env = {
            "MONARCH_MONEY_EMAIL": "env@example.com",
            "MONARCH_MONEY_PASSWORD": "envpass",
        }
        with patch.dict("os.environ", env, clear=True):
            result = await credentials_service.check_auth()
            assert result is True


# ============================================================================
# Desktop Login Tests
# ============================================================================


class TestDesktopLogin:
    """Tests for desktop mode login (no passphrase flow)."""

    @pytest.mark.asyncio
    async def test_desktop_login_success(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should validate credentials and establish session on success."""
        mock_get_mm.return_value = MagicMock()  # Successful auth

        result = await credentials_service.desktop_login(
            email="test@example.com",
            password="password123",
            mfa_secret="TOTP123",
        )

        assert result["success"] is True
        mock_get_mm.assert_called_once_with(
            email="test@example.com",
            password="password123",
            mfa_secret_key="TOTP123",
        )

        # Should have session credentials set
        creds = credentials_service.get_session_credentials()
        assert creds is not None
        assert creds["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_desktop_login_invalid_credentials(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should return error on invalid credentials."""
        mock_get_mm.side_effect = Exception("Invalid credentials")

        result = await credentials_service.desktop_login(
            email="test@example.com",
            password="wrongpass",
        )

        assert result["success"] is False
        assert credentials_service.get_session_credentials() is None

    @pytest.mark.asyncio
    async def test_desktop_login_mfa_required(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should indicate MFA required error."""
        mock_get_mm.side_effect = Exception("MFA required")

        result = await credentials_service.desktop_login(
            email="test@example.com",
            password="password123",
        )

        assert result["success"] is False
        # Error should mention MFA
        assert "MFA" in result.get("error", "") or "mfa" in result.get("error", "").lower()


# ============================================================================
# Traditional Login Tests
# ============================================================================


class TestTraditionalLogin:
    """Tests for traditional login with passphrase flow."""

    @pytest.mark.asyncio
    async def test_login_success_needs_passphrase(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should return needs_passphrase=True on successful login."""
        mock_get_mm.return_value = MagicMock()

        result = await credentials_service.login(
            email="test@example.com",
            password="password123",
        )

        assert result["success"] is True
        assert result["needs_passphrase"] is True
        # Credentials should be pending, not in session yet
        assert CredentialsService._pending_credentials is not None
        assert credentials_service.get_session_credentials() is None

    @pytest.mark.asyncio
    async def test_login_with_mfa_code(
        self,
        credentials_service: CredentialsService,
        mock_get_mm: AsyncMock,
        mock_get_mm_with_code: AsyncMock,
    ) -> None:
        """Should use code-based auth when mfa_mode is 'code'."""
        mock_get_mm_with_code.return_value = MagicMock()

        result = await credentials_service.login(
            email="test@example.com",
            password="password123",
            mfa_secret="123456",
            mfa_mode="code",
        )

        assert result["success"] is True
        mock_get_mm_with_code.assert_called_once()
        # MFA code should not be stored (it's one-time)
        assert CredentialsService._pending_credentials["mfa_secret"] == ""

    @pytest.mark.asyncio
    async def test_login_with_mfa_secret(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should use secret-based auth when mfa_mode is 'secret'."""
        mock_get_mm.return_value = MagicMock()

        result = await credentials_service.login(
            email="test@example.com",
            password="password123",
            mfa_secret="JBSWY3DPEHPK3PXP",
            mfa_mode="secret",
        )

        assert result["success"] is True
        mock_get_mm.assert_called_once()
        # MFA secret should be stored
        assert CredentialsService._pending_credentials["mfa_secret"] == "JBSWY3DPEHPK3PXP"


# ============================================================================
# Set Passphrase Tests
# ============================================================================


class TestSetPassphrase:
    """Tests for setting encryption passphrase after login."""

    def test_set_passphrase_no_pending(self, credentials_service: CredentialsService) -> None:
        """Should fail if no pending credentials from login."""
        result = credentials_service.set_passphrase("StrongPass123!")

        assert result["success"] is False
        assert (
            "pending" in result.get("error", "").lower()
            or "login" in result.get("error", "").lower()
        )

    def test_set_passphrase_weak_passphrase(self, credentials_service: CredentialsService) -> None:
        """Should fail for weak passphrase."""
        CredentialsService._pending_credentials = {
            "email": "test@example.com",
            "password": "pass",
            "mfa_secret": "",
            "mfa_mode": "secret",
        }

        with patch("core.encryption.validate_passphrase") as mock_validate:
            mock_validate.return_value = (False, ["Too short", "Needs special char"])
            result = credentials_service.set_passphrase("weak")

        assert result["success"] is False
        assert "requirements" in result

    def test_set_passphrase_success(self, credentials_service: CredentialsService) -> None:
        """Should save credentials and set session on valid passphrase."""
        CredentialsService._pending_credentials = {
            "email": "test@example.com",
            "password": "pass123",
            "mfa_secret": "TOTP",
            "mfa_mode": "secret",
        }

        with patch("core.encryption.validate_passphrase") as mock_validate:
            mock_validate.return_value = (True, [])

            result = credentials_service.set_passphrase("ValidPass123!")

        assert result["success"] is True
        credentials_service._mock_creds_mgr.save.assert_called_once()
        assert credentials_service.get_session_credentials() is not None
        assert CredentialsService._pending_credentials is None


# ============================================================================
# Unlock Tests
# ============================================================================


class TestUnlock:
    """Tests for unlocking stored credentials."""

    def test_unlock_no_stored_credentials(self, credentials_service: CredentialsService) -> None:
        """Should fail if no stored credentials exist."""
        credentials_service._mock_creds_mgr.exists.return_value = False

        result = credentials_service.unlock("anypassphrase")

        assert result["success"] is False

    def test_unlock_wrong_passphrase(self, credentials_service: CredentialsService) -> None:
        """Should fail with wrong passphrase."""
        from core.encryption import DecryptionError

        credentials_service._mock_creds_mgr.exists.return_value = True
        credentials_service._mock_creds_mgr.load.side_effect = DecryptionError("Invalid passphrase")

        result = credentials_service.unlock("wrongpass")

        assert result["success"] is False
        assert "passphrase" in result.get("error", "").lower()

    def test_unlock_success(self, credentials_service: CredentialsService) -> None:
        """Should set session credentials on successful unlock."""
        credentials_service._mock_creds_mgr.exists.return_value = True
        credentials_service._mock_creds_mgr.load.return_value = {
            "email": "test@example.com",
            "password": "pass123",
            "mfa_secret": "",
        }

        result = credentials_service.unlock("correctpass")

        assert result["success"] is True
        creds = credentials_service.get_session_credentials()
        assert creds["email"] == "test@example.com"


# ============================================================================
# Validate Auth Tests
# ============================================================================


class TestValidateAuth:
    """Tests for validating credentials against Monarch API."""

    @pytest.mark.asyncio
    async def test_validate_auth_no_credentials(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should return False when no credentials available."""
        with patch.dict("os.environ", {}, clear=True):
            result = await credentials_service.validate_auth()
            assert result is False

    @pytest.mark.asyncio
    async def test_validate_auth_success(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should return True when credentials are valid."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")
        mock_get_mm.return_value = MagicMock()

        result = await credentials_service.validate_auth()

        assert result is True

    @pytest.mark.asyncio
    async def test_validate_auth_invalid_clears_session(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should clear session and return False for invalid credentials."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")
        mock_get_mm.side_effect = Exception("Auth failed")

        result = await credentials_service.validate_auth()

        assert result is False
        assert credentials_service.get_session_credentials() is None

    @pytest.mark.asyncio
    async def test_validate_auth_rate_limit_treated_as_success(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should return True on rate limit to avoid locking users out."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")

        with patch("services.credentials_service.is_rate_limit_error", return_value=True):
            mock_get_mm.side_effect = Exception("Rate limited")
            result = await credentials_service.validate_auth()

        assert result is True


# ============================================================================
# Unlock and Validate Tests
# ============================================================================


class TestUnlockAndValidate:
    """Tests for unlock_and_validate which combines decryption and API validation."""

    @pytest.mark.asyncio
    async def test_unlock_and_validate_success(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should return success when both unlock and validation succeed."""
        credentials_service._mock_creds_mgr.exists.return_value = True
        credentials_service._mock_creds_mgr.load.return_value = {
            "email": "test@example.com",
            "password": "pass",
            "mfa_secret": "",
        }
        mock_get_mm.return_value = MagicMock()

        result = await credentials_service.unlock_and_validate("correctpass")

        assert result["success"] is True
        assert result["unlock_success"] is True
        assert result["validation_success"] is True

    @pytest.mark.asyncio
    async def test_unlock_and_validate_wrong_passphrase(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should indicate unlock failure for wrong passphrase."""
        from core.encryption import DecryptionError

        credentials_service._mock_creds_mgr.exists.return_value = True
        credentials_service._mock_creds_mgr.load.side_effect = DecryptionError("Wrong pass")

        result = await credentials_service.unlock_and_validate("wrongpass")

        assert result["success"] is False
        assert result["unlock_success"] is False

    @pytest.mark.asyncio
    async def test_unlock_and_validate_credentials_invalid(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should indicate needs_credential_update when Monarch rejects credentials."""
        credentials_service._mock_creds_mgr.exists.return_value = True
        credentials_service._mock_creds_mgr.load.return_value = {
            "email": "test@example.com",
            "password": "oldpass",
            "mfa_secret": "",
        }
        mock_get_mm.side_effect = Exception("Auth failed - password changed")

        with patch("services.credentials_service.is_rate_limit_error", return_value=False):
            result = await credentials_service.unlock_and_validate("correctpass")

        assert result["success"] is False
        assert result["unlock_success"] is True
        assert result["validation_success"] is False
        assert result.get("needs_credential_update") is True


# ============================================================================
# Update Credentials Tests
# ============================================================================


class TestUpdateCredentials:
    """Tests for updating stored credentials."""

    @pytest.mark.asyncio
    async def test_update_credentials_success(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should validate and save new credentials."""
        mock_get_mm.return_value = MagicMock()

        with patch("core.encryption.validate_passphrase") as mock_validate:
            mock_validate.return_value = (True, [])

            result = await credentials_service.update_credentials(
                email="new@example.com",
                password="newpass",
                mfa_secret="NEWTOTP",
                passphrase="ValidPass123!",
            )

        assert result["success"] is True
        credentials_service._mock_creds_mgr.save.assert_called_once()
        creds = credentials_service.get_session_credentials()
        assert creds["email"] == "new@example.com"

    @pytest.mark.asyncio
    async def test_update_credentials_validation_fails(
        self, credentials_service: CredentialsService, mock_get_mm: AsyncMock
    ) -> None:
        """Should fail if new credentials are invalid with Monarch."""
        mock_get_mm.side_effect = Exception("Invalid credentials")

        with patch("core.encryption.validate_passphrase") as mock_validate:
            mock_validate.return_value = (True, [])

            result = await credentials_service.update_credentials(
                email="bad@example.com",
                password="badpass",
                mfa_secret="",
                passphrase="ValidPass123!",
            )

        assert result["success"] is False
        credentials_service._mock_creds_mgr.save.assert_not_called()


# ============================================================================
# Reset Credentials Only Tests
# ============================================================================


class TestResetCredentialsOnly:
    """Tests for resetting credentials while preserving preferences."""

    def test_reset_credentials_only(self, credentials_service: CredentialsService) -> None:
        """Should clear credentials but keep state preferences."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")
        CredentialsService._pending_credentials = {"email": "pending@example.com"}

        credentials_service.reset_credentials_only()

        assert credentials_service.get_session_credentials() is None
        assert CredentialsService._pending_credentials is None
        credentials_service._mock_creds_mgr.clear.assert_called_once()


# ============================================================================
# Reauthenticate Tests
# ============================================================================


class TestReauthenticate:
    """Tests for re-authentication with one-time MFA code."""

    @pytest.mark.asyncio
    async def test_reauthenticate_no_session(self, credentials_service: CredentialsService) -> None:
        """Should fail if no session credentials."""
        result = await credentials_service.reauthenticate("123456")

        assert result["success"] is False
        assert "session" in result.get("error", "").lower()

    @pytest.mark.asyncio
    async def test_reauthenticate_success(
        self, credentials_service: CredentialsService, mock_get_mm_with_code: AsyncMock
    ) -> None:
        """Should succeed with valid MFA code."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")
        mock_get_mm_with_code.return_value = MagicMock()

        result = await credentials_service.reauthenticate("123456")

        assert result["success"] is True
        mock_get_mm_with_code.assert_called_once()

    @pytest.mark.asyncio
    async def test_reauthenticate_invalid_code(
        self, credentials_service: CredentialsService, mock_get_mm_with_code: AsyncMock
    ) -> None:
        """Should fail with invalid MFA code."""
        credentials_service.set_session_credentials_direct("test@example.com", "pass", "")
        mock_get_mm_with_code.side_effect = Exception("Invalid MFA code")

        result = await credentials_service.reauthenticate("000000")

        assert result["success"] is False
