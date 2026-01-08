"""
Tests for the SettingsExportService.

Tests cover:
- Exporting all tool settings
- Importing all tool settings
- Validating export format
- Selective tool import
- Round-trip export/import for every tool
"""

from datetime import datetime

from services.settings_export_service import (
    SettingsExportService,
)
from state.state_manager import (
    CategoryState,
    RollupState,
    StateManager,
    TrackerState,
)


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
        assert result.data["eclosion_export"]["version"] == "1.0"
        assert result.data["eclosion_export"]["source_mode"] == "production"
        assert "exported_at" in result.data["eclosion_export"]

        # Check tools section exists
        assert "tools" in result.data
        assert "recurring" in result.data["tools"]

    def test_export_configured_state(
        self, state_manager: StateManager, configured_state: TrackerState
    ) -> None:
        """Exporting configured state should include all settings."""
        state_manager.save(configured_state)
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
        state = TrackerState(
            target_group_id="group-123",
            target_group_name="Subscriptions",
        )
        state.rollup = RollupState(
            enabled=True,
            monarch_category_id="rollup-cat-001",
            category_name="Small Subscriptions",
            emoji="📦",
            item_ids={"item-1", "item-2"},
            total_budgeted=25.99,
            is_linked=True,
        )
        state_manager.save(state)

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
        assert rollup["total_budgeted"] == 25.99
        assert rollup["is_linked"] is True

    def test_export_excludes_runtime_data(
        self, state_manager: StateManager, configured_state: TrackerState
    ) -> None:
        """Export should exclude runtime/transient data."""
        # Add runtime data to state
        configured_state.last_sync = datetime.now().isoformat()
        configured_state.categories["recurring-001"].over_contribution = 5.00
        configured_state.categories["recurring-001"].frozen_monthly_target = 15.99
        configured_state.categories["recurring-001"].balance_at_month_start = 10.00

        state_manager.save(configured_state)
        service = SettingsExportService(state_manager)
        result = service.export_settings()

        assert result.success
        assert result.data is not None
        cat = result.data["tools"]["recurring"]["categories"]["recurring-001"]

        # These fields should not be in export
        assert "over_contribution" not in cat
        assert "frozen_monthly_target" not in cat
        assert "balance_at_month_start" not in cat
        assert "target_amount" not in cat  # Calculated at sync time


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
        assert state.auto_track_threshold == 50.0
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

    def test_import_selective_tools(self, state_manager: StateManager) -> None:
        """Should be able to import only specific tools."""
        # Set up existing state
        existing_state = TrackerState(
            target_group_id="old-group",
            target_group_name="Old Name",
        )
        state_manager.save(existing_state)

        export_data = {
            "eclosion_export": {
                "version": "1.0",
                "exported_at": "2026-01-03T12:00:00Z",
                "source_mode": "production",
            },
            "tools": {
                "recurring": {
                    "config": {
                        "target_group_id": "new-group",
                        "target_group_name": "New Name",
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

        # Import only recurring tool
        result = service.import_settings(export_data, tools=["recurring"])

        assert result.success
        assert result.imported.get("recurring") is True

        state = state_manager.load()
        assert state.target_group_id == "new-group"

    def test_import_nonexistent_tool(self, state_manager: StateManager) -> None:
        """Importing tool that doesn't exist in export should warn."""
        export_data = {
            "eclosion_export": {
                "version": "1.0",
                "exported_at": "2026-01-03T12:00:00Z",
                "source_mode": "production",
            },
            "tools": {},
            "app_settings": {},
        }

        service = SettingsExportService(state_manager)
        result = service.import_settings(export_data, tools=["recurring"])

        assert result.success
        assert "recurring" not in result.imported or not result.imported["recurring"]
        # Should have a warning about missing tool
        assert any("not found" in w.lower() for w in result.warnings)


class TestExportImportRoundTrip:
    """Tests for complete export/import round trips."""

    def test_roundtrip_recurring_tool(
        self, state_manager: StateManager, configured_state: TrackerState
    ) -> None:
        """Recurring tool settings should survive export/import round trip."""
        # Set up complete state
        configured_state.auto_sync_new = True
        configured_state.auto_track_threshold = 25.0
        configured_state.auto_update_targets = True

        # Add more categories
        configured_state.categories["recurring-002"] = CategoryState(
            monarch_category_id="cat-002",
            name="Spotify",
            target_amount=9.99,
            emoji="🎵",
            sync_name=False,
            is_linked=True,
        )
        configured_state.enabled_items.add("recurring-002")

        # Add rollup
        configured_state.rollup = RollupState(
            enabled=True,
            monarch_category_id="rollup-001",
            category_name="Small Subs",
            emoji="📦",
            item_ids={"item-a", "item-b"},
            total_budgeted=15.0,
            is_linked=False,
        )

        state_manager.save(configured_state)
        service = SettingsExportService(state_manager)

        # Export
        export_result = service.export_settings()
        assert export_result.success

        # Clear state
        state_manager.save(TrackerState())

        # Import
        assert export_result.data is not None
        import_result = service.import_settings(export_result.data)
        assert import_result.success

        # Verify all settings restored
        restored_state = state_manager.load()

        # Config
        assert restored_state.target_group_id == "group-123"
        assert restored_state.target_group_name == "Subscriptions"
        assert restored_state.auto_sync_new is True
        assert restored_state.auto_track_threshold == 25.0
        assert restored_state.auto_update_targets is True

        # Enabled items
        assert restored_state.enabled_items == {"recurring-001", "recurring-002"}

        # Categories
        assert len(restored_state.categories) == 2
        assert restored_state.categories["recurring-001"].name == "Netflix"
        assert restored_state.categories["recurring-001"].emoji == "🎬"
        assert restored_state.categories["recurring-002"].name == "Spotify"
        assert restored_state.categories["recurring-002"].is_linked is True

        # Rollup
        assert restored_state.rollup.enabled is True
        assert restored_state.rollup.category_name == "Small Subs"
        assert restored_state.rollup.emoji == "📦"
        assert restored_state.rollup.item_ids == {"item-a", "item-b"}
        assert restored_state.rollup.total_budgeted == 15.0

    def test_roundtrip_preserves_category_mappings(self, state_manager: StateManager) -> None:
        """Category-to-recurring mappings should be preserved."""
        state = TrackerState(
            target_group_id="group-1",
            target_group_name="My Group",
        )

        # Create several category mappings
        for i in range(5):
            state.categories[f"recurring-{i}"] = CategoryState(
                monarch_category_id=f"cat-{i}",
                name=f"Category {i}",
                target_amount=float(i * 10),
                emoji="📌",
                sync_name=i % 2 == 0,
                is_linked=i % 3 == 0,
            )
            state.enabled_items.add(f"recurring-{i}")

        state_manager.save(state)
        service = SettingsExportService(state_manager)

        # Round trip
        export_result = service.export_settings()
        assert export_result.data is not None
        state_manager.save(TrackerState())  # Clear
        service.import_settings(export_result.data)

        # Verify all mappings preserved
        restored = state_manager.load()
        assert len(restored.categories) == 5
        assert len(restored.enabled_items) == 5

        for i in range(5):
            assert f"recurring-{i}" in restored.categories
            cat = restored.categories[f"recurring-{i}"]
            assert cat.monarch_category_id == f"cat-{i}"
            assert cat.name == f"Category {i}"
            assert cat.sync_name == (i % 2 == 0)
            assert cat.is_linked == (i % 3 == 0)


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

    def test_preview_export_data(
        self, state_manager: StateManager, configured_state: TrackerState
    ) -> None:
        """Preview should summarize export contents."""
        configured_state.categories["recurring-002"] = CategoryState(
            monarch_category_id="cat-002",
            name="Hulu",
            target_amount=7.99,
        )
        configured_state.enabled_items.add("recurring-002")
        configured_state.rollup = RollupState(
            enabled=True,
            item_ids={"item-1", "item-2", "item-3"},
        )

        state_manager.save(configured_state)
        service = SettingsExportService(state_manager)

        export_result = service.export_settings()
        assert export_result.data is not None
        preview = service.get_export_preview(export_result.data)

        assert preview["version"] == "1.0"
        assert "recurring" in preview["tools"]

        recurring = preview["tools"]["recurring"]
        assert recurring["has_config"] is True
        assert recurring["enabled_items_count"] == 2
        assert recurring["categories_count"] == 2
        assert recurring["has_rollup"] is True
        assert recurring["rollup_items_count"] == 3
