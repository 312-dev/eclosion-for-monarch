"""
Settings Export Service

Handles export and import of application settings for backup/restore functionality.
Supports modular export of individual tool settings.

Security Notes:
- Notes content is encrypted in the database with per-note salts
- For export, notes are decrypted (requires passphrase) and included in plaintext JSON
- The JSON is then encrypted by EncryptedExportService for auto-backups
- Plaintext exports (GET /settings/export) exclude notes for security
- On import, notes are re-encrypted with the importing user's passphrase
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Any, ClassVar

from state import StateManager, TrackerState

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from state.db.repositories.notes_repo import NotesRepository
    from state.db.repositories.tracker_repo import TrackerRepository


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
    - Notes tool (category notes, general notes, archived notes, checkbox states)
    - Wishlist tool (items, config, pending bookmarks)
    - App settings (theme preference, landing page - if provided)

    Export excludes:
    - Credentials (email, password, MFA secret)
    - Runtime state (last_sync, frozen targets, balances)
    - Auto-sync job state
    - Wishlist custom_image_path (not portable across machines)

    Security:
    - Notes require passphrase for export (decryption) and import (re-encryption)
    - Plaintext exports exclude notes tool - use encrypted export for full backup
    """

    EXPORT_VERSION: ClassVar[str] = "1.1"
    SUPPORTED_IMPORT_VERSIONS: ClassVar[list[str]] = ["1.0", "1.1"]

    def __init__(
        self,
        state_manager: StateManager | None = None,
        db_session: Session | None = None,
    ):
        self.state_manager = state_manager or StateManager()
        self._db_session = db_session

    def _get_notes_repo(self) -> NotesRepository:
        """Get NotesRepository, creating session if needed."""
        from state.db.database import get_session_factory
        from state.db.repositories.notes_repo import NotesRepository

        session = self._db_session or get_session_factory()()
        return NotesRepository(session)

    def _get_tracker_repo(self) -> TrackerRepository:
        """Get TrackerRepository, creating session if needed."""
        from state.db.database import get_session_factory
        from state.db.repositories.tracker_repo import TrackerRepository

        session = self._db_session or get_session_factory()()
        return TrackerRepository(session)

    def export_settings(
        self,
        app_settings: dict[str, Any] | None = None,
        passphrase: str | None = None,
        include_notes: bool = False,
        include_wishlist: bool = True,
    ) -> ExportResult:
        """
        Export current settings to a portable format.

        Args:
            app_settings: Optional frontend app settings (theme, landing_page)
            passphrase: Required for notes export (decrypts note content)
            include_notes: Include notes tool data (requires passphrase)
            include_wishlist: Include wishlist tool data

        Returns:
            ExportResult with the export data or error

        Security:
            - Notes are decrypted for export using passphrase
            - Caller should encrypt the result for storage (see EncryptedExportService)
        """
        # Validate: notes requires passphrase
        if include_notes and not passphrase:
            return ExportResult(
                success=False,
                error="Passphrase required for notes export",
            )

        try:
            state = self.state_manager.load()
            export_data = self._build_export(
                state=state,
                app_settings=app_settings,
                passphrase=passphrase,
                include_notes=include_notes,
                include_wishlist=include_wishlist,
            )
            return ExportResult(success=True, data=export_data)
        except Exception as e:
            return ExportResult(success=False, error=str(e))

    def import_settings(
        self,
        data: dict[str, Any],
        tools: list[str] | None = None,
        passphrase: str | None = None,
    ) -> ImportResult:
        """
        Import settings from export data.

        Args:
            data: The export data to import
            tools: Optional list of tool names to import (None = all)
            passphrase: Required for notes import (re-encrypts note content)

        Returns:
            ImportResult with success status and any warnings

        Security:
            - Notes are re-encrypted with the provided passphrase
            - If passphrase is None and notes are in the export, notes will be skipped
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

            # Import notes tool if requested (requires passphrase)
            if tools is None or "notes" in tools:
                if "notes" in tools_data:
                    if passphrase:
                        self._import_notes(tools_data["notes"], passphrase, warnings)
                        imported["notes"] = True
                    else:
                        warnings.append("Notes import skipped: passphrase required")
                elif tools is not None and "notes" in tools:
                    warnings.append("Notes tool data not found in export")

            # Import wishlist tool if requested
            if tools is None or "wishlist" in tools:
                if "wishlist" in tools_data:
                    self._import_wishlist(tools_data["wishlist"], warnings)
                    imported["wishlist"] = True
                elif tools is not None and "wishlist" in tools:
                    warnings.append("Wishlist tool data not found in export")

            # Save the updated state (for recurring tool)
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
        NOTE: Does not include sensitive content (note text, etc.)
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

        if "notes" in tools_data:
            notes = tools_data["notes"]
            preview["tools"]["notes"] = {
                "category_notes_count": len(notes.get("category_notes", [])),
                "general_notes_count": len(notes.get("general_notes", [])),
                "archived_notes_count": len(notes.get("archived_notes", [])),
                "has_checkbox_states": bool(notes.get("checkbox_states")),
            }

        if "wishlist" in tools_data:
            wishlist = tools_data["wishlist"]
            items = wishlist.get("items", [])
            active_items = [i for i in items if not i.get("is_archived")]
            archived_items = [i for i in items if i.get("is_archived")]
            preview["tools"]["wishlist"] = {
                "has_config": bool(wishlist.get("config")),
                "items_count": len(active_items),
                "archived_items_count": len(archived_items),
                "pending_bookmarks_count": len(wishlist.get("pending_bookmarks", [])),
            }

        return preview

    def _build_export(
        self,
        state: TrackerState,
        app_settings: dict[str, Any] | None,
        passphrase: str | None = None,
        include_notes: bool = False,
        include_wishlist: bool = True,
    ) -> dict[str, Any]:
        """Build the export dictionary from state."""
        tools: dict[str, Any] = {
            "recurring": self._export_recurring(state),
        }

        # Add wishlist tool if requested
        if include_wishlist:
            tools["wishlist"] = self._export_wishlist()

        # Add notes tool if requested (requires passphrase)
        if include_notes and passphrase:
            tools["notes"] = self._export_notes(passphrase)

        export_data: dict[str, Any] = {
            "eclosion_export": {
                "version": self.EXPORT_VERSION,
                "exported_at": datetime.now().isoformat(),
                "source_mode": "production",
            },
            "tools": tools,
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
        # Skip rollup_ prefixed entries - these are frozen target storage, not real categories
        categories: dict[str, Any] = {}
        for recurring_id, cat in state.categories.items():
            if recurring_id.startswith("rollup_"):
                continue
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
            from state import CategoryState

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
            from state import RollupState

            state.rollup = RollupState(
                enabled=rollup_data.get("enabled", False),
                monarch_category_id=rollup_data.get("monarch_category_id"),
                category_name=rollup_data.get("category_name", "Recurring Rollup"),
                emoji=rollup_data.get("emoji", "🔄"),
                item_ids=set(rollup_data.get("item_ids", [])),
                total_budgeted=rollup_data.get("total_budgeted", 0.0),
                is_linked=rollup_data.get("is_linked", False),
            )

    # ========== Notes Export/Import ==========

    def _export_notes(self, passphrase: str) -> dict[str, Any]:
        """
        Export all notes data with decrypted content.

        SECURITY: Requires passphrase to decrypt DB content.
        Exported content will be re-encrypted by EncryptedExportService.

        Args:
            passphrase: User's Monarch credentials (email + password)

        Returns:
            Notes export dict with decrypted content
        """
        repo = self._get_notes_repo()

        # Get all notes with decrypted content
        category_notes = repo.get_all_category_notes(passphrase)
        general_notes = repo.get_all_general_notes(passphrase)
        archived_notes = repo.get_archived_notes(passphrase)

        # Get all checkbox states
        checkbox_states = self._export_all_checkbox_states(repo)

        return {
            "config": {},  # Reserved for future settings
            "category_notes": category_notes,
            "general_notes": general_notes,
            "archived_notes": archived_notes,
            "checkbox_states": checkbox_states,
        }

    def _export_all_checkbox_states(self, repo: NotesRepository) -> dict[str, list[bool]]:
        """
        Export all checkbox states from the database.

        Returns a dict mapping keys to checkbox state arrays:
        - For category notes: "{note_id}:{viewing_month}"
        - For general notes: "general:{source_month}:{viewing_month}"
        """
        from state.db.models import CheckboxState

        result: dict[str, list[bool]] = {}

        # Query all checkbox states directly
        states = repo.session.query(CheckboxState).all()
        for state in states:
            states_list: list[bool] = json.loads(state.states_json)
            if state.note_id:
                key = f"{state.note_id}:{state.viewing_month}"
                result[key] = states_list
            elif state.general_note_month_key:
                key = f"general:{state.general_note_month_key}:{state.viewing_month}"
                result[key] = states_list

        return result

    def _import_notes(
        self,
        notes_data: dict[str, Any],
        passphrase: str,
        warnings: list[str],
    ) -> dict[str, int]:
        """
        Import notes data, re-encrypting with user's current passphrase.

        SECURITY: Content arrives decrypted from export, re-encrypted for storage.

        Args:
            notes_data: Notes export data with decrypted content
            passphrase: User's passphrase for re-encryption
            warnings: List to append warnings to

        Returns:
            Dict with counts of imported items
        """
        repo = self._get_notes_repo()
        imported = {"category_notes": 0, "general_notes": 0, "archived_notes": 0}

        # Map old note IDs to new IDs for checkbox state migration
        note_id_map: dict[str, str] = {}
        general_note_month_map: dict[str, str] = {}  # old_month -> new_month (same)

        # Import category notes
        for note in notes_data.get("category_notes", []):
            old_id = note.get("id", "")
            try:
                new_note = repo.save_note(
                    passphrase=passphrase,
                    category_type=note["category_type"],
                    category_id=note["category_id"],
                    category_name=note["category_name"],
                    month_key=note["month_key"],
                    content=note["content"],
                    group_id=note.get("group_id"),
                    group_name=note.get("group_name"),
                )
                note_id_map[old_id] = new_note["id"]
                imported["category_notes"] += 1
            except Exception as e:
                warnings.append(f"Failed to import note for {note.get('category_name')}: {e}")

        # Import general notes
        for note in notes_data.get("general_notes", []):
            old_month = note.get("month_key", "")
            try:
                repo.save_general_note(
                    month_key=note["month_key"],
                    content=note["content"],
                    passphrase=passphrase,
                )
                general_note_month_map[old_month] = old_month  # Month key stays same
                imported["general_notes"] += 1
            except Exception as e:
                warnings.append(f"Failed to import general note for {note.get('month_key')}: {e}")

        # Import archived notes
        for note in notes_data.get("archived_notes", []):
            try:
                self._import_archived_note(repo, note, passphrase)
                imported["archived_notes"] += 1
            except Exception as e:
                warnings.append(f"Failed to import archived note: {e}")

        # Import checkbox states with ID remapping
        checkbox_states = notes_data.get("checkbox_states", {})
        if checkbox_states:
            self._import_checkbox_states(repo, checkbox_states, note_id_map, general_note_month_map)

        # Commit the session
        repo.session.commit()

        return imported

    def _import_archived_note(
        self,
        repo: NotesRepository,
        note: dict[str, Any],
        passphrase: str,
    ) -> None:
        """Import a single archived note."""
        from datetime import datetime

        from state.db.models import ArchivedNote

        # Encrypt the content
        encrypted, salt = repo._encrypt_content(note["content"], passphrase)

        archived = ArchivedNote(
            id=str(uuid.uuid4()),
            category_type=note["category_type"],
            category_id=note["category_id"],
            category_name=note["category_name"],
            group_id=note.get("group_id"),
            group_name=note.get("group_name"),
            month_key=note["month_key"],
            content_encrypted=encrypted,
            salt=salt,
            created_at=datetime.fromisoformat(note["created_at"])
            if note.get("created_at")
            else datetime.utcnow(),
            updated_at=datetime.fromisoformat(note["updated_at"])
            if note.get("updated_at")
            else datetime.utcnow(),
            archived_at=datetime.fromisoformat(note["archived_at"])
            if note.get("archived_at")
            else datetime.utcnow(),
            original_category_name=note.get("original_category_name", note["category_name"]),
            original_group_name=note.get("original_group_name", note.get("group_name")),
        )
        repo.session.add(archived)

    def _import_checkbox_states(
        self,
        repo: NotesRepository,
        checkbox_states: dict[str, list[bool]],
        note_id_map: dict[str, str],
        general_note_month_map: dict[str, str],
    ) -> None:
        """
        Import checkbox states with ID remapping.

        Args:
            repo: NotesRepository instance
            checkbox_states: Dict mapping old keys to state arrays
            note_id_map: Mapping from old note IDs to new note IDs
            general_note_month_map: Mapping for general note months
        """
        from datetime import datetime

        from state.db.models import CheckboxState

        now = datetime.utcnow()

        for key, states in checkbox_states.items():
            if key.startswith("general:"):
                # Format: "general:{source_month}:{viewing_month}"
                parts = key.split(":")
                if len(parts) == 3:
                    source_month = parts[1]
                    viewing_month = parts[2]
                    # Only import if we imported this general note
                    if source_month in general_note_month_map:
                        checkbox = CheckboxState(
                            note_id=None,
                            general_note_month_key=source_month,
                            viewing_month=viewing_month,
                            states_json=json.dumps(states),
                            created_at=now,
                            updated_at=now,
                        )
                        repo.session.add(checkbox)
            else:
                # Format: "{note_id}:{viewing_month}"
                parts = key.split(":")
                if len(parts) == 2:
                    old_note_id = parts[0]
                    viewing_month = parts[1]
                    # Only import if we have a mapping for this note
                    new_note_id = note_id_map.get(old_note_id)
                    if new_note_id:
                        checkbox = CheckboxState(
                            note_id=new_note_id,
                            general_note_month_key=None,
                            viewing_month=viewing_month,
                            states_json=json.dumps(states),
                            created_at=now,
                            updated_at=now,
                        )
                        repo.session.add(checkbox)

    # ========== Wishlist Export/Import ==========

    def _export_wishlist(self) -> dict[str, Any]:
        """
        Export wishlist items, config, and pending bookmarks.

        NOTE: custom_image_path is excluded as it's not portable.
        """
        repo = self._get_tracker_repo()

        # Get config
        config = repo.get_wishlist_config()
        config_export = {
            "is_configured": config.is_configured,
            "default_category_group_id": config.default_category_group_id,
            "default_category_group_name": config.default_category_group_name,
            "selected_browser": config.selected_browser,
            "selected_folder_ids": json.loads(config.selected_folder_ids or "[]"),
            "selected_folder_names": json.loads(config.selected_folder_names or "[]"),
            "auto_archive_on_bookmark_delete": config.auto_archive_on_bookmark_delete,
            "auto_archive_on_goal_met": config.auto_archive_on_goal_met,
        }

        # Get all items (active + archived)
        items = repo.get_all_wishlist_items()
        items_export = [self._wishlist_item_to_export(item) for item in items]

        # Get pending bookmarks
        bookmarks = repo.get_pending_bookmarks()
        bookmarks_export = [self._bookmark_to_export(bm) for bm in bookmarks]

        return {
            "config": config_export,
            "items": items_export,
            "pending_bookmarks": bookmarks_export,
        }

    def _wishlist_item_to_export(self, item: Any) -> dict[str, Any]:
        """Convert a WishlistItem to export format."""
        return {
            "id": item.id,
            "name": item.name,
            "amount": item.amount,
            "target_date": item.target_date,
            "emoji": item.emoji,
            "monarch_category_id": item.monarch_category_id,
            "category_group_id": item.category_group_id,
            "category_group_name": item.category_group_name,
            "source_url": item.source_url,
            "source_bookmark_id": item.source_bookmark_id,
            "logo_url": item.logo_url,
            # NOTE: custom_image_path intentionally excluded - not portable
            "is_archived": item.is_archived,
            "archived_at": item.archived_at.isoformat() if item.archived_at else None,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "grid_x": item.grid_x,
            "grid_y": item.grid_y,
            "col_span": item.col_span,
            "row_span": item.row_span,
        }

    def _bookmark_to_export(self, bm: Any) -> dict[str, Any]:
        """Convert a PendingBookmark to export format."""
        return {
            "url": bm.url,
            "name": bm.name,
            "bookmark_id": bm.bookmark_id,
            "browser_type": bm.browser_type,
            "logo_url": bm.logo_url,
            "status": bm.status,
            "wishlist_item_id": bm.wishlist_item_id,
            "created_at": bm.created_at.isoformat() if bm.created_at else None,
        }

    def _import_wishlist(
        self,
        wishlist_data: dict[str, Any],
        warnings: list[str],
    ) -> dict[str, int]:
        """
        Import wishlist items and config.

        NOTE: monarch_category_id values are NOT imported because they may not
        exist in the target account. Items are imported unlinked.

        Args:
            wishlist_data: Wishlist export data
            warnings: List to append warnings to

        Returns:
            Dict with counts of imported items
        """
        repo = self._get_tracker_repo()
        imported = {"items": 0, "pending_bookmarks": 0}

        # Import config (but not category IDs - they may not exist)
        config = wishlist_data.get("config", {})
        if config:
            repo.update_wishlist_config(
                is_configured=config.get("is_configured", False),
                # Don't import category group IDs - may not exist in target account
                default_category_group_id=None,
                default_category_group_name=config.get("default_category_group_name"),
                selected_browser=config.get("selected_browser"),
                selected_folder_ids=json.dumps(config.get("selected_folder_ids", [])),
                selected_folder_names=json.dumps(config.get("selected_folder_names", [])),
                auto_archive_on_bookmark_delete=config.get("auto_archive_on_bookmark_delete", True),
                auto_archive_on_goal_met=config.get("auto_archive_on_goal_met", True),
            )

        # Import items (unlinked - user must re-link to Monarch categories)
        items = wishlist_data.get("items", [])
        for item in items:
            try:
                repo.create_wishlist_item(
                    item_id=str(uuid.uuid4()),
                    name=item["name"],
                    amount=item["amount"],
                    target_date=item["target_date"],
                    emoji=item.get("emoji", "🎯"),
                    monarch_category_id=None,  # Unlinked on import
                    category_group_id=None,
                    category_group_name=item.get("category_group_name"),
                    source_url=item.get("source_url"),
                    source_bookmark_id=None,  # Don't preserve bookmark link
                    logo_url=item.get("logo_url"),
                    is_archived=item.get("is_archived", False),
                    grid_x=item.get("grid_x", 0),
                    grid_y=item.get("grid_y", 0),
                    col_span=item.get("col_span", 1),
                    row_span=item.get("row_span", 1),
                )
                imported["items"] += 1
            except Exception as e:
                warnings.append(f"Failed to import wishlist item '{item.get('name')}': {e}")

        # Import pending bookmarks (skip converted ones - they're tied to old items)
        bookmarks = wishlist_data.get("pending_bookmarks", [])
        for bm in bookmarks:
            # Only import pending or skipped bookmarks, not converted ones
            if bm.get("status") in ("pending", "skipped"):
                try:
                    repo.create_pending_bookmark(
                        url=bm["url"],
                        name=bm["name"],
                        bookmark_id=bm.get("bookmark_id", str(uuid.uuid4())),
                        browser_type=bm.get("browser_type", "unknown"),
                        logo_url=bm.get("logo_url"),
                    )
                    # If it was skipped, mark it as skipped again
                    if bm.get("status") == "skipped":
                        existing = repo.get_pending_bookmark_by_url(bm["url"])
                        if existing:
                            repo.skip_pending_bookmark(existing.id)
                    imported["pending_bookmarks"] += 1
                except Exception:
                    # Likely duplicate URL, skip silently
                    pass

        # Commit
        repo.session.commit()

        # Add warning about unlinked items
        if imported["items"] > 0:
            warnings.append(
                f"Imported {imported['items']} wishlist item(s). "
                "Items are unlinked and need to be connected to Monarch categories."
            )

        return imported
