"""
Tests for the SettingsExportService.

Tests cover:
- Exporting all tool settings
- Importing all tool settings
- Validating export format
- Selective tool import
- Round-trip export/import for every tool
"""

from typing import ClassVar

from services.settings_export_service import (
    SettingsExportService,
)
from state import (
    StateManager,
)


def setup_configured_state(state_manager: StateManager) -> None:
    """Set up a configured state with sample data."""
    state_manager.update_config("group-123", "Subscriptions")
    state_manager.set_auto_update_targets(True)
    state_manager.update_category(
        recurring_id="recurring-001",
        monarch_category_id="cat-001",
        name="Netflix",
        target_amount=15.99,
        due_date="2025-02-15",
    )
    state_manager.update_category_emoji("recurring-001", "🎬")
    state_manager.toggle_item_enabled("recurring-001", True)


class TestExportSettings:
    """Tests for exporting settings."""

    def test_export_empty_state(self, state_manager: StateManager) -> None:
        """Exporting empty state should succeed with minimal data."""
        service = SettingsExportService(state_manager)
        result = service.export_settings()

        assert result.success
        assert result.data is not None
        assert result.error is None

        # Check metadata
        assert result.data["eclosion_export"]["version"] == "1.2"
        assert result.data["eclosion_export"]["source_mode"] == "production"
        assert "exported_at" in result.data["eclosion_export"]

        # Check tools section exists
        assert "tools" in result.data
        assert "recurring" in result.data["tools"]

    def test_export_configured_state(self, state_manager: StateManager) -> None:
        """Exporting configured state should include all settings."""
        setup_configured_state(state_manager)
        service = SettingsExportService(state_manager)
        result = service.export_settings()

        assert result.success
        assert result.data is not None
        recurring = result.data["tools"]["recurring"]

        # Check config
        assert recurring["config"]["target_group_id"] == "group-123"
        assert recurring["config"]["target_group_name"] == "Subscriptions"
        assert recurring["config"]["auto_update_targets"] is True

        # Check enabled items
        assert "recurring-001" in recurring["enabled_items"]

        # Check categories
        assert "recurring-001" in recurring["categories"]
        cat = recurring["categories"]["recurring-001"]
        assert cat["monarch_category_id"] == "cat-001"
        assert cat["name"] == "Netflix"
        assert cat["emoji"] == "🎬"

    def test_export_with_rollup(self, state_manager: StateManager) -> None:
        """Exporting state with rollup should include rollup settings."""
        state_manager.update_config("group-123", "Subscriptions")
        state_manager.toggle_rollup_enabled(True)
        state_manager.set_rollup_category_id("rollup-cat-001")
        state_manager.update_rollup_category_name("Small Subscriptions")
        state_manager.update_rollup_emoji("📦")
        state_manager.add_to_rollup("item-1", 10.0)
        state_manager.add_to_rollup("item-2", 15.99)
        state_manager.set_rollup_budget(25.99)

        service = SettingsExportService(state_manager)
        result = service.export_settings()

        assert result.success
        assert result.data is not None
        rollup = result.data["tools"]["recurring"]["rollup"]

        assert rollup["enabled"] is True
        assert rollup["monarch_category_id"] == "rollup-cat-001"
        assert rollup["category_name"] == "Small Subscriptions"
        assert rollup["emoji"] == "📦"
        assert set(rollup["item_ids"]) == {"item-1", "item-2"}


class TestImportSettings:
    """Tests for importing settings."""

    def test_import_valid_data(self, state_manager: StateManager) -> None:
        """Importing valid data should succeed."""
        export_data = {
            "eclosion_export": {
                "version": "1.0",
                "exported_at": "2026-01-03T12:00:00Z",
                "source_mode": "production",
            },
            "tools": {
                "recurring": {
                    "config": {
                        "target_group_id": "group-456",
                        "target_group_name": "Bills",
                        "auto_sync_new": True,
                        "auto_track_threshold": 50.0,
                        "auto_update_targets": True,
                    },
                    "enabled_items": ["item-1", "item-2"],
                    "categories": {
                        "item-1": {
                            "monarch_category_id": "cat-1",
                            "name": "Spotify",
                            "emoji": "🎵",
                            "sync_name": True,
                            "is_linked": False,
                        }
                    },
                    "rollup": {
                        "enabled": True,
                        "monarch_category_id": "rollup-1",
                        "category_name": "Small Bills",
                        "emoji": "💰",
                        "item_ids": ["item-2"],
                        "total_budgeted": 30.0,
                        "is_linked": False,
                    },
                }
            },
            "app_settings": {},
        }

        service = SettingsExportService(state_manager)
        result = service.import_settings(export_data)

        assert result.success
        assert result.imported["recurring"] is True
        assert len(result.warnings) == 0
        assert result.error is None

        # Verify state was updated
        state = state_manager.load()
        assert state.target_group_id == "group-456"
        assert state.target_group_name == "Bills"
        assert state.auto_sync_new is True
        assert state.enabled_items == {"item-1", "item-2"}
        assert "item-1" in state.categories
        assert state.rollup.enabled is True
        assert state.rollup.category_name == "Small Bills"

    def test_import_invalid_version(self, state_manager: StateManager) -> None:
        """Importing unsupported version should fail."""
        export_data = {
            "eclosion_export": {
                "version": "99.0",
                "exported_at": "2026-01-03T12:00:00Z",
                "source_mode": "production",
            },
            "tools": {},
            "app_settings": {},
        }

        service = SettingsExportService(state_manager)
        result = service.import_settings(export_data)

        assert not result.success
        assert result.error is not None
        assert "version" in result.error.lower()

    def test_import_missing_metadata(self, state_manager: StateManager) -> None:
        """Importing data without metadata should fail."""
        export_data: dict[str, object] = {
            "tools": {},
            "app_settings": {},
        }

        service = SettingsExportService(state_manager)
        result = service.import_settings(export_data)

        assert not result.success
        assert result.error is not None
        assert "metadata" in result.error.lower()


class TestValidateImport:
    """Tests for import validation."""

    def test_validate_valid_data(self, state_manager: StateManager) -> None:
        """Valid data should pass validation."""
        export_data = {
            "eclosion_export": {
                "version": "1.0",
                "exported_at": "2026-01-03T12:00:00Z",
                "source_mode": "production",
            },
            "tools": {"recurring": {}},
            "app_settings": {},
        }

        service = SettingsExportService(state_manager)
        is_valid, errors = service.validate_import(export_data)

        assert is_valid
        assert len(errors) == 0

    def test_validate_missing_version(self, state_manager: StateManager) -> None:
        """Data missing version should fail validation."""
        export_data = {
            "eclosion_export": {
                "exported_at": "2026-01-03T12:00:00Z",
            },
            "tools": {},
        }

        service = SettingsExportService(state_manager)
        is_valid, errors = service.validate_import(export_data)

        assert not is_valid
        assert any("version" in e.lower() for e in errors)


class TestExportPreview:
    """Tests for export preview functionality."""

    def test_preview_export_data(self, state_manager: StateManager) -> None:
        """Preview should summarize export contents."""
        setup_configured_state(state_manager)

        # Add another category
        state_manager.update_category(
            recurring_id="recurring-002",
            monarch_category_id="cat-002",
            name="Hulu",
            target_amount=7.99,
            due_date="2026-01-20",
        )
        state_manager.toggle_item_enabled("recurring-002", True)

        # Add rollup
        state_manager.toggle_rollup_enabled(True)
        state_manager.add_to_rollup("item-1", 5.0)
        state_manager.add_to_rollup("item-2", 10.0)
        state_manager.add_to_rollup("item-3", 15.0)

        service = SettingsExportService(state_manager)

        export_result = service.export_settings()
        assert export_result.data is not None
        preview = service.get_export_preview(export_result.data)

        assert preview["version"] == "1.2"
        assert "recurring" in preview["tools"]

        recurring = preview["tools"]["recurring"]
        assert recurring["has_config"] is True
        assert recurring["enabled_items_count"] == 2
        assert recurring["categories_count"] == 2
        assert recurring["has_rollup"] is True
        assert recurring["rollup_items_count"] == 3


class TestRefundsExportImport:
    """Tests for refunds tool export/import."""

    def test_export_includes_refunds(self, state_manager: StateManager) -> None:
        """Export should include refunds tool with empty defaults."""
        service = SettingsExportService(state_manager)
        result = service.export_settings()

        assert result.success
        assert result.data is not None
        assert "refunds" in result.data["tools"]

        refunds = result.data["tools"]["refunds"]
        assert "config" in refunds
        assert "views" in refunds
        assert "matches" in refunds
        assert refunds["config"]["replace_tag_by_default"] is True
        assert refunds["config"]["aging_warning_days"] == 30
        assert refunds["config"]["show_badge"] is True

    def test_import_refunds_config(self, state_manager: StateManager) -> None:
        """Import should restore refunds config."""
        export_data = {
            "eclosion_export": {
                "version": "1.2",
                "exported_at": "2026-01-03T12:00:00Z",
                "source_mode": "production",
            },
            "tools": {
                "refunds": {
                    "config": {
                        "replacement_tag_id": "tag-refunded",
                        "replace_tag_by_default": False,
                        "aging_warning_days": 45,
                        "show_badge": False,
                    },
                    "views": [
                        {
                            "id": "v1",
                            "name": "Pending",
                            "tag_ids": ["tag-1"],
                            "category_ids": None,
                            "sort_order": 0,
                        },
                    ],
                    "matches": [
                        {
                            "original_transaction_id": "txn-100",
                            "refund_transaction_id": "txn-200",
                            "refund_amount": 75.0,
                            "refund_merchant": "Store",
                            "refund_date": "2026-01-15",
                            "refund_account": "Checking",
                            "skipped": False,
                            "expected_refund": False,
                            "expected_date": None,
                            "expected_account": None,
                            "expected_account_id": None,
                            "expected_note": None,
                            "expected_amount": None,
                            "transaction_data": {"id": "txn-100", "amount": -75.0},
                        },
                    ],
                }
            },
            "app_settings": {},
        }

        service = SettingsExportService(state_manager, db_session=state_manager._session)
        result = service.import_settings(export_data, tools=["refunds"])

        assert result.success
        assert result.imported["refunds"] is True

    def test_import_v1_0_without_refunds(self, state_manager: StateManager) -> None:
        """Importing v1.0 export (no refunds) should succeed."""
        export_data = {
            "eclosion_export": {
                "version": "1.0",
                "exported_at": "2026-01-03T12:00:00Z",
                "source_mode": "production",
            },
            "tools": {
                "recurring": {
                    "config": {
                        "target_group_id": None,
                        "target_group_name": None,
                        "auto_sync_new": False,
                        "auto_track_threshold": None,
                        "auto_update_targets": False,
                    },
                    "enabled_items": [],
                    "categories": {},
                    "rollup": {
                        "enabled": False,
                        "monarch_category_id": None,
                        "category_name": "Rollup",
                        "emoji": "🔄",
                        "item_ids": [],
                        "total_budgeted": 0,
                        "is_linked": False,
                    },
                }
            },
            "app_settings": {},
        }

        service = SettingsExportService(state_manager)
        result = service.import_settings(export_data)

        assert result.success
        assert "refunds" not in result.imported

    def test_preview_includes_refunds(self, state_manager: StateManager) -> None:
        """Preview should include refunds tool summary."""
        service = SettingsExportService(state_manager)
        result = service.export_settings()
        assert result.data is not None

        preview = service.get_export_preview(result.data)
        assert "refunds" in preview["tools"]
        refunds_preview = preview["tools"]["refunds"]
        assert refunds_preview["has_config"] is True
        assert refunds_preview["views_count"] == 0
        assert refunds_preview["matches_count"] == 0


class TestExhaustiveToolCoverage:
    """Exhaustive tests ensuring all non-conditional tools are in export/import."""

    # Notes excluded: requires passphrase (conditionally included)
    EXPECTED_TOOLS: ClassVar[set[str]] = {"recurring", "stash", "refunds"}

    def test_export_contains_all_expected_tools(self, state_manager: StateManager) -> None:
        """Full export should contain all non-conditional tools."""
        service = SettingsExportService(state_manager)
        result = service.export_settings()
        assert result.success
        assert result.data is not None

        exported_tools = set(result.data["tools"].keys())
        for tool in self.EXPECTED_TOOLS:
            assert tool in exported_tools, f"Tool '{tool}' missing from export"

    def test_import_handles_all_exported_tools(self, state_manager: StateManager) -> None:
        """Import should handle all tools that appear in a full export."""
        service = SettingsExportService(state_manager, db_session=state_manager._session)
        result = service.export_settings(include_notes=False)
        assert result.success
        assert result.data is not None

        import_result = service.import_settings(result.data)
        assert import_result.success

        for tool in self.EXPECTED_TOOLS:
            assert tool in import_result.imported, f"Tool '{tool}' not imported"

    def test_preview_covers_all_exported_tools(self, state_manager: StateManager) -> None:
        """Preview should handle all tools that appear in a full export."""
        service = SettingsExportService(state_manager)
        result = service.export_settings(include_notes=False)
        assert result.success
        assert result.data is not None

        preview = service.get_export_preview(result.data)
        preview_tools = set(preview["tools"].keys())

        for tool in self.EXPECTED_TOOLS:
            assert tool in preview_tools, f"Tool '{tool}' missing from preview"

    def test_version_is_current(self, state_manager: StateManager) -> None:
        """Export version should be current."""
        service = SettingsExportService(state_manager)
        result = service.export_settings()
        assert result.data is not None
        assert result.data["eclosion_export"]["version"] == "1.2"
