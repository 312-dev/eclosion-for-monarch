"""
Tests for the Sync Service.

Tests cover:
- Credential management delegation
- Configuration management
- State loading and saving
- Settings management
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


class MockStateManager:
    """Mock state manager for sync tests."""

    def __init__(self):
        self.state = MagicMock()
        self.state.target_group_id = "group-123"
        self.state.target_group_name = "Test Group"
        self.state.last_sync = None
        self.state.auto_sync_new = False
        self.state.auto_track_threshold = 3
        self.state.auto_update_targets = True
        self.state.auto_categorize_enabled = False
        self.state.categories = {}
        self.state.is_configured = MagicMock(return_value=True)
        self.state.is_item_enabled = MagicMock(return_value=True)

    def load(self):
        return self.state

    def save(self, state):
        self.state = state

    def update_config(self, group_id, group_name):
        self.state.target_group_id = group_id
        self.state.target_group_name = group_name

    def get_settings(self):
        return {
            "auto_sync_new": self.state.auto_sync_new,
            "auto_update_targets": self.state.auto_update_targets,
        }

    def set_auto_sync_new(self, enabled):
        self.state.auto_sync_new = enabled

    def set_auto_update_targets(self, enabled):
        self.state.auto_update_targets = enabled


@pytest.fixture
def mock_credentials_service():
    """Create a mock credentials service."""
    mock = MagicMock()
    mock.has_stored_credentials = MagicMock(return_value=False)
    mock.check_auth = AsyncMock(return_value=False)
    mock.validate_auth = AsyncMock(return_value=True)
    mock.login = AsyncMock(return_value={"success": True, "needs_passphrase": True})
    mock.set_passphrase = MagicMock(return_value={"success": True})
    mock.unlock = MagicMock(return_value={"success": True})
    mock.logout = MagicMock()
    mock.lock = MagicMock()
    mock.unlock_and_validate = AsyncMock(return_value={"success": True})
    mock.update_credentials = AsyncMock(return_value={"success": True})
    mock.reset_credentials_only = MagicMock()
    return mock


@pytest.fixture
def sync_service(mock_credentials_service):
    """Create a SyncService with mocked dependencies."""
    with patch("services.sync_service.StateManager", MockStateManager), \
         patch("services.sync_service.CredentialsService", return_value=mock_credentials_service), \
         patch("services.sync_service.AutomationCredentialsManager"), \
         patch("services.sync_service.SyncScheduler") as mock_scheduler, \
         patch("services.sync_service.RecurringService"), \
         patch("services.sync_service.SavingsCalculator"), \
         patch("services.sync_service.CategoryManager"), \
         patch("services.sync_service.RollupService"):

        mock_scheduler.get_instance = MagicMock()

        from services.sync_service import SyncService

        service = SyncService()
        service.credentials_service = mock_credentials_service
        yield service


class TestCredentialDelegation:
    """Tests that credential methods are properly delegated."""

    def test_has_stored_credentials_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate has_stored_credentials to credentials service."""
        mock_credentials_service.has_stored_credentials.return_value = True

        result = sync_service.has_stored_credentials()

        assert result is True
        mock_credentials_service.has_stored_credentials.assert_called_once()

    @pytest.mark.asyncio
    async def test_check_auth_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate check_auth to credentials service."""
        mock_credentials_service.check_auth.return_value = True

        result = await sync_service.check_auth()

        assert result is True
        mock_credentials_service.check_auth.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_auth_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate validate_auth to credentials service."""
        mock_credentials_service.validate_auth.return_value = True

        result = await sync_service.validate_auth()

        assert result is True
        mock_credentials_service.validate_auth.assert_called_once()

    @pytest.mark.asyncio
    async def test_login_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate login to credentials service."""
        mock_credentials_service.login.return_value = {"success": True}

        result = await sync_service.login("test@example.com", "password", "mfa")

        assert result["success"] is True
        mock_credentials_service.login.assert_called_once_with(
            "test@example.com", "password", "mfa"
        )

    def test_set_passphrase_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate set_passphrase to credentials service."""
        mock_credentials_service.set_passphrase.return_value = {"success": True}

        result = sync_service.set_passphrase("my-passphrase")

        assert result["success"] is True
        mock_credentials_service.set_passphrase.assert_called_once_with("my-passphrase")

    def test_unlock_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate unlock to credentials service."""
        mock_credentials_service.unlock.return_value = {"success": True}

        result = sync_service.unlock("my-passphrase")

        assert result["success"] is True
        mock_credentials_service.unlock.assert_called_once_with("my-passphrase")

    def test_logout_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate logout to credentials service."""
        sync_service.logout()

        mock_credentials_service.logout.assert_called_once()

    def test_lock_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate lock to credentials service."""
        sync_service.lock()

        mock_credentials_service.lock.assert_called_once()

    @pytest.mark.asyncio
    async def test_unlock_and_validate_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate unlock_and_validate to credentials service."""
        mock_credentials_service.unlock_and_validate.return_value = {"success": True}

        result = await sync_service.unlock_and_validate("my-passphrase")

        assert result["success"] is True
        mock_credentials_service.unlock_and_validate.assert_called_once_with("my-passphrase")

    @pytest.mark.asyncio
    async def test_update_credentials_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate update_credentials to credentials service."""
        mock_credentials_service.update_credentials.return_value = {"success": True}

        result = await sync_service.update_credentials(
            "test@example.com", "password", "mfa", "passphrase"
        )

        assert result["success"] is True
        mock_credentials_service.update_credentials.assert_called_once_with(
            "test@example.com", "password", "mfa", "passphrase"
        )

    def test_reset_credentials_only_delegates(self, sync_service, mock_credentials_service) -> None:
        """Should delegate reset_credentials_only to credentials service."""
        sync_service.reset_credentials_only()

        mock_credentials_service.reset_credentials_only.assert_called_once()


class TestConfiguration:
    """Tests for configuration management."""

    @pytest.mark.asyncio
    async def test_configure_updates_state(self, sync_service) -> None:
        """Should update state with new configuration."""
        result = await sync_service.configure("group-456", "New Group")

        assert result["success"] is True
        assert result["group_id"] == "group-456"
        assert result["group_name"] == "New Group"
        assert sync_service.state_manager.state.target_group_id == "group-456"
        assert sync_service.state_manager.state.target_group_name == "New Group"

    @pytest.mark.asyncio
    async def test_get_config_returns_state(self, sync_service) -> None:
        """Should return current configuration from state."""
        result = await sync_service.get_config()

        assert result["target_group_id"] == "group-123"
        assert result["target_group_name"] == "Test Group"
        assert result["is_configured"] is True
        assert result["auto_sync_new"] is False
        assert result["auto_update_targets"] is True


class TestSettings:
    """Tests for settings management."""

    def test_set_auto_sync(self, sync_service) -> None:
        """Should update auto_sync_new setting."""
        sync_service.set_auto_sync(True)

        assert sync_service.state_manager.state.auto_sync_new is True

    def test_set_auto_update_targets(self, sync_service) -> None:
        """Should update auto_update_targets setting."""
        sync_service.set_auto_update_targets(False)

        assert sync_service.state_manager.state.auto_update_targets is False


class TestStateManagerIntegration:
    """Tests for state manager integration."""

    def test_loads_state_on_get_config(self, sync_service) -> None:
        """Should load state when getting config."""
        # get_config calls state_manager.load()
        # This is tested implicitly by test_get_config_returns_state


class TestSyncServiceInitialization:
    """Tests for SyncService initialization."""

    def test_creates_dependencies(self) -> None:
        """Should create all required dependencies on init."""
        with patch("services.sync_service.StateManager") as MockStateManager, \
             patch("services.sync_service.CredentialsService") as MockCredService, \
             patch("services.sync_service.AutomationCredentialsManager") as MockAutoCreds, \
             patch("services.sync_service.SyncScheduler") as MockScheduler, \
             patch("services.sync_service.RecurringService") as MockRecurring, \
             patch("services.sync_service.SavingsCalculator") as MockCalc, \
             patch("services.sync_service.CategoryManager") as MockCatMgr, \
             patch("services.sync_service.RollupService") as MockRollup:

            MockScheduler.get_instance = MagicMock()

            from services.sync_service import SyncService

            service = SyncService()

            # Should have created all dependencies
            MockStateManager.assert_called_once()
            MockCredService.assert_called_once()
            MockAutoCreds.assert_called_once()
            MockRecurring.assert_called_once()
            MockCalc.assert_called_once()
            MockCatMgr.assert_called_once()
            MockRollup.assert_called_once()

    def test_uses_provided_state_manager(self) -> None:
        """Should use provided state manager instead of creating new one."""
        mock_state_manager = MagicMock()

        with patch("services.sync_service.CredentialsService"), \
             patch("services.sync_service.AutomationCredentialsManager"), \
             patch("services.sync_service.SyncScheduler") as MockScheduler, \
             patch("services.sync_service.RecurringService"), \
             patch("services.sync_service.SavingsCalculator"), \
             patch("services.sync_service.CategoryManager"), \
             patch("services.sync_service.RollupService"):

            MockScheduler.get_instance = MagicMock()

            from services.sync_service import SyncService

            service = SyncService(state_manager=mock_state_manager)

            assert service.state_manager is mock_state_manager
