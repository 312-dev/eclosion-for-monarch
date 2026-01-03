"""
Settings Export Service

Handles export and import of application settings for backup/restore functionality.
Supports modular export of individual tool settings.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, ClassVar

from state.state_manager import StateManager, TrackerState


@dataclass
class ExportResult:
    """Result of an export operation."""

    success: bool
    data: dict[str, Any] | None = None
    error: str | None = None


@dataclass
class ImportResult:
    """Result of an import operation."""

    success: bool
    imported: dict[str, bool]
    warnings: list[str]
    error: str | None = None


class SettingsExportService:
    """
    Handles export and import of application settings.

    Export includes:
    - Tool settings (recurring tracker config, category mappings, rollup)
    - App settings (theme preference, landing page - if provided)

    Export excludes:
    - Credentials (email, password, MFA secret)
    - Runtime state (last_sync, frozen targets, balances)
    - Auto-sync job state
    """

    EXPORT_VERSION: ClassVar[str] = "1.0"
    SUPPORTED_IMPORT_VERSIONS: ClassVar[list[str]] = ["1.0"]

    def __init__(self, state_manager: StateManager | None = None):
        self.state_manager = state_manager or StateManager()

    def export_settings(self, app_settings: dict[str, Any] | None = None) -> ExportResult:
        """
        Export current settings to a portable format.

        Args:
            app_settings: Optional frontend app settings (theme, landing_page)

        Returns:
            ExportResult with the export data or error
        """
        try:
            state = self.state_manager.load()
            export_data = self._build_export(state, app_settings)
            return ExportResult(success=True, data=export_data)
        except Exception as e:
            return ExportResult(success=False, error=str(e))

    def import_settings(
        self,
        data: dict[str, Any],
        tools: list[str] | None = None,
    ) -> ImportResult:
        """
        Import settings from export data.

        Args:
            data: The export data to import
            tools: Optional list of tool names to import (None = all)

        Returns:
            ImportResult with success status and any warnings
        """
        # Validate the import data
        is_valid, errors = self.validate_import(data)
        if not is_valid:
            return ImportResult(
                success=False,
                imported={},
                warnings=[],
                error="; ".join(errors),
            )

        imported: dict[str, bool] = {}
        warnings: list[str] = []

        try:
            state = self.state_manager.load()
            tools_data = data.get("tools", {})

            # Import recurring tool if requested
            if tools is None or "recurring" in tools:
                if "recurring" in tools_data:
                    self._import_recurring(state, tools_data["recurring"], warnings)
                    imported["recurring"] = True
                elif tools is not None and "recurring" in tools:
                    warnings.append("Recurring tool data not found in export")

            # Save the updated state
            self.state_manager.save(state)

            return ImportResult(
                success=True,
                imported=imported,
                warnings=warnings,
            )
        except Exception as e:
            return ImportResult(
                success=False,
                imported=imported,
                warnings=warnings,
                error=str(e),
            )

    def validate_import(self, data: dict[str, Any]) -> tuple[bool, list[str]]:
        """
        Validate import data structure and version.

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors: list[str] = []

        # Check for required metadata
        if "eclosion_export" not in data:
            errors.append("Missing eclosion_export metadata")
            return False, errors

        metadata = data["eclosion_export"]
        if not isinstance(metadata, dict):
            errors.append("Invalid eclosion_export metadata format")
            return False, errors

        # Check version
        version = metadata.get("version")
        if not version:
            errors.append("Missing export version")
        elif version not in self.SUPPORTED_IMPORT_VERSIONS:
            errors.append(f"Unsupported export version: {version}")

        # Check for tools section
        if "tools" not in data:
            errors.append("Missing tools section")

        return len(errors) == 0, errors

    def get_export_preview(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Get a preview of what would be imported from export data.

        Returns dict with tool names and counts of items.
        """
        preview: dict[str, Any] = {
            "version": data.get("eclosion_export", {}).get("version"),
            "exported_at": data.get("eclosion_export", {}).get("exported_at"),
            "source_mode": data.get("eclosion_export", {}).get("source_mode"),
            "tools": {},
        }

        tools_data = data.get("tools", {})

        if "recurring" in tools_data:
            recurring = tools_data["recurring"]
            preview["tools"]["recurring"] = {
                "has_config": bool(recurring.get("config")),
                "enabled_items_count": len(recurring.get("enabled_items", [])),
                "categories_count": len(recurring.get("categories", {})),
                "has_rollup": recurring.get("rollup", {}).get("enabled", False),
                "rollup_items_count": len(recurring.get("rollup", {}).get("item_ids", [])),
            }

        return preview

    def _build_export(
        self, state: TrackerState, app_settings: dict[str, Any] | None
    ) -> dict[str, Any]:
        """Build the export dictionary from state."""
        export_data: dict[str, Any] = {
            "eclosion_export": {
                "version": self.EXPORT_VERSION,
                "exported_at": datetime.now().isoformat(),
                "source_mode": "production",
            },
            "tools": {
                "recurring": self._export_recurring(state),
            },
            "app_settings": app_settings or {},
        }
        return export_data

    def _export_recurring(self, state: TrackerState) -> dict[str, Any]:
        """Export recurring tool settings."""
        # Export config (exclude runtime fields)
        config = {
            "target_group_id": state.target_group_id,
            "target_group_name": state.target_group_name,
            "auto_sync_new": state.auto_sync_new,
            "auto_track_threshold": state.auto_track_threshold,
            "auto_update_targets": state.auto_update_targets,
        }

        # Export enabled items
        enabled_items = list(state.enabled_items)

        # Export category mappings (exclude runtime fields like frozen targets)
        categories: dict[str, Any] = {}
        for recurring_id, cat in state.categories.items():
            categories[recurring_id] = {
                "monarch_category_id": cat.monarch_category_id,
                "name": cat.name,
                "emoji": cat.emoji,
                "sync_name": cat.sync_name,
                "is_linked": cat.is_linked,
            }

        # Export rollup config (exclude runtime fields)
        rollup = {
            "enabled": state.rollup.enabled,
            "monarch_category_id": state.rollup.monarch_category_id,
            "category_name": state.rollup.category_name,
            "emoji": state.rollup.emoji,
            "item_ids": list(state.rollup.item_ids),
            "total_budgeted": state.rollup.total_budgeted,
            "is_linked": state.rollup.is_linked,
        }

        return {
            "config": config,
            "enabled_items": enabled_items,
            "categories": categories,
            "rollup": rollup,
        }

    def _import_recurring(
        self,
        state: TrackerState,
        recurring_data: dict[str, Any],
        warnings: list[str],
    ) -> None:
        """Import recurring tool settings into state."""
        # Import config
        config = recurring_data.get("config", {})
        if config:
            if "target_group_id" in config:
                state.target_group_id = config["target_group_id"]
            if "target_group_name" in config:
                state.target_group_name = config["target_group_name"]
            if "auto_sync_new" in config:
                state.auto_sync_new = config["auto_sync_new"]
            if "auto_track_threshold" in config:
                state.auto_track_threshold = config["auto_track_threshold"]
            if "auto_update_targets" in config:
                state.auto_update_targets = config["auto_update_targets"]

        # Import enabled items
        enabled_items = recurring_data.get("enabled_items", [])
        if enabled_items:
            state.enabled_items = set(enabled_items)

        # Import category mappings
        categories = recurring_data.get("categories", {})
        if categories:
            from state.state_manager import CategoryState

            for recurring_id, cat_data in categories.items():
                # Only import if we have the required fields
                if "monarch_category_id" in cat_data and "name" in cat_data:
                    state.categories[recurring_id] = CategoryState(
                        monarch_category_id=cat_data["monarch_category_id"],
                        name=cat_data["name"],
                        target_amount=0.0,  # Will be recalculated on sync
                        emoji=cat_data.get("emoji", "🔄"),
                        sync_name=cat_data.get("sync_name", True),
                        is_linked=cat_data.get("is_linked", False),
                    )
                else:
                    warnings.append(f"Skipped category {recurring_id}: missing required fields")

        # Import rollup config
        rollup_data = recurring_data.get("rollup", {})
        if rollup_data:
            from state.state_manager import RollupState

            state.rollup = RollupState(
                enabled=rollup_data.get("enabled", False),
                monarch_category_id=rollup_data.get("monarch_category_id"),
                category_name=rollup_data.get("category_name", "Recurring Rollup"),
                emoji=rollup_data.get("emoji", "🔄"),
                item_ids=set(rollup_data.get("item_ids", [])),
                total_budgeted=rollup_data.get("total_budgeted", 0.0),
                is_linked=rollup_data.get("is_linked", False),
            )
