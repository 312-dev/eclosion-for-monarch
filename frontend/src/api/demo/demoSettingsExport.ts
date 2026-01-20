/**
 * Demo Settings Export/Import Functions
 *
 * Handles export and import of settings in demo mode.
 * Supports recurring, notes, and wishlist tools.
 */

import type {
  EclosionExport,
  ImportOptions,
  ImportResult,
  ImportPreviewResponse,
  NotesExport,
  WishlistExport,
  WishlistExportItem,
  CategoryReference,
  Note,
  GeneralMonthNote,
  ArchivedNote,
  WishlistItem,
  BrowserType,
  ImportPreview,
} from '../../types';
import { getDemoState, updateDemoState, simulateDelay } from './demoState';

/** Build CategoryReference without undefined values (required for exactOptionalPropertyTypes) */
function buildCategoryRef(
  type: 'group' | 'category',
  id: string,
  name: string,
  groupId: string | null,
  groupName: string | null
): CategoryReference {
  const ref: CategoryReference = { type, id, name };
  if (type === 'category' && groupId) ref.groupId = groupId;
  if (type === 'category' && groupName) ref.groupName = groupName;
  return ref;
}

/** Build WishlistItem with optional properties conditionally set */
function buildWishlistItem(
  item: WishlistExportItem,
  index: number,
  baseOrder: number,
  isArchived: boolean
): WishlistItem {
  const wishlistItem: WishlistItem = {
    type: 'wishlist',
    id: `imported-${item.id}`,
    name: item.name,
    amount: item.amount,
    target_date: item.target_date,
    emoji: item.emoji,
    category_id: null,
    category_name: 'Unlinked',
    category_group_id: null,
    category_group_name: item.category_group_name ?? null,
    is_archived: isArchived,
    is_enabled: !isArchived,
    status: 'behind',
    progress_percent: 0,
    months_remaining: isArchived ? 0 : 12,
    current_balance: 0,
    planned_budget: 0,
    monthly_target: isArchived ? 0 : Math.ceil(item.amount / 12),
    shortfall: item.amount,
    sort_order: baseOrder + index,
    grid_x: item.grid_x,
    grid_y: item.grid_y,
    col_span: item.col_span,
    row_span: item.row_span,
  };
  if (item.source_url) wishlistItem.source_url = item.source_url;
  if (item.logo_url) wishlistItem.logo_url = item.logo_url;
  if (isArchived) wishlistItem.archived_at = item.archived_at ?? new Date().toISOString();
  return wishlistItem;
}

/** Export settings to a backup file. Includes recurring, notes, and wishlist tools. */
export async function exportSettings(): Promise<EclosionExport> {
  await simulateDelay(100);
  const state = getDemoState();

  // Recurring export
  const enabledItems = state.dashboard.items
    .filter((item) => item.is_enabled)
    .map((item) => item.id);
  const categories: Record<
    string,
    {
      monarch_category_id: string;
      name: string;
      emoji: string;
      sync_name: boolean;
      is_linked: boolean;
    }
  > = {};
  state.dashboard.items
    .filter((item) => item.is_enabled && !item.is_in_rollup && item.category_id)
    .forEach((item) => {
      categories[item.id] = {
        monarch_category_id: item.category_id!,
        name: item.category_name,
        emoji: item.emoji || '🔄',
        sync_name: true,
        is_linked: false,
      };
    });

  // Notes export
  const notesExport: NotesExport = {
    config: {},
    category_notes: Object.values(state.notes.notes).map((note) => ({
      id: note.id,
      category_type: note.categoryRef.type,
      category_id: note.categoryRef.id,
      category_name: note.categoryRef.name,
      group_id: note.categoryRef.type === 'category' ? (note.categoryRef.groupId ?? null) : null,
      group_name:
        note.categoryRef.type === 'category' ? (note.categoryRef.groupName ?? null) : null,
      month_key: note.monthKey,
      content: note.content,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    })),
    general_notes: Object.values(state.notes.generalNotes).map((note) => ({
      id: note.id,
      month_key: note.monthKey,
      content: note.content,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    })),
    archived_notes: state.notes.archivedNotes.map((note) => ({
      id: note.id,
      category_type: note.categoryRef.type,
      category_id: note.categoryRef.id,
      category_name: note.categoryRef.name,
      group_id: note.categoryRef.type === 'category' ? (note.categoryRef.groupId ?? null) : null,
      group_name:
        note.categoryRef.type === 'category' ? (note.categoryRef.groupName ?? null) : null,
      month_key: note.monthKey,
      content: note.content,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
      archived_at: note.archivedAt,
      original_category_name: note.originalCategoryName,
      original_group_name: note.originalGroupName ?? null,
    })),
    checkbox_states: state.notes.checkboxStates ?? {},
  };

  // Wishlist export
  const allWishlistItems = [...state.wishlist.items, ...state.wishlist.archived_items];
  const wishlistExport: WishlistExport = {
    config: {
      is_configured: state.wishlistConfig.isConfigured,
      default_category_group_id: state.wishlistConfig.defaultCategoryGroupId ?? null,
      default_category_group_name: state.wishlistConfig.defaultCategoryGroupName ?? null,
      selected_browser: state.wishlistConfig.selectedBrowser ?? null,
      selected_folder_ids: state.wishlistConfig.selectedFolderIds ?? [],
      selected_folder_names: state.wishlistConfig.selectedFolderNames ?? [],
      auto_archive_on_bookmark_delete: state.wishlistConfig.autoArchiveOnBookmarkDelete ?? true,
      auto_archive_on_goal_met: state.wishlistConfig.autoArchiveOnGoalMet ?? true,
    },
    items: allWishlistItems.map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      target_date: item.target_date,
      emoji: item.emoji ?? '🎯',
      monarch_category_id: item.category_id ?? null,
      category_group_id: item.category_group_id ?? null,
      category_group_name: item.category_group_name ?? null,
      source_url: item.source_url ?? null,
      source_bookmark_id: item.source_bookmark_id ?? null,
      logo_url: item.logo_url ?? null,
      is_archived: item.is_archived,
      archived_at: item.archived_at ?? null,
      created_at: null,
      grid_x: item.grid_x ?? 0,
      grid_y: item.grid_y ?? 0,
      col_span: item.col_span ?? 1,
      row_span: item.row_span ?? 1,
    })),
    pending_bookmarks: state.pendingBookmarks.map((bm) => ({
      url: bm.url,
      name: bm.name,
      bookmark_id: bm.bookmark_id,
      browser_type: bm.browser_type,
      logo_url: bm.logo_url,
      status: bm.status,
      wishlist_item_id: null,
      created_at: bm.created_at,
    })),
  };

  return {
    eclosion_export: { version: '1.1', exported_at: new Date().toISOString(), source_mode: 'demo' },
    tools: {
      recurring: {
        config: {
          target_group_id: state.dashboard.config.target_group_id,
          target_group_name: state.dashboard.config.target_group_name,
          auto_sync_new: state.settings.auto_sync_new,
          auto_track_threshold: state.settings.auto_track_threshold,
          auto_update_targets: state.settings.auto_update_targets,
        },
        enabled_items: enabledItems,
        categories,
        rollup: {
          enabled: state.dashboard.rollup.enabled,
          monarch_category_id: state.dashboard.rollup.category_id,
          category_name: state.dashboard.rollup.category_name || 'Small Subscriptions',
          emoji: state.dashboard.rollup.emoji || '📦',
          item_ids: state.dashboard.rollup.items.map((i) => i.id),
          total_budgeted: state.dashboard.rollup.budgeted,
          is_linked: false,
        },
      },
      notes: notesExport,
      wishlist: wishlistExport,
    },
    app_settings: {},
  };
}

/** Import settings from a backup file. Supports recurring, notes, and wishlist tools. */
export async function importSettings(
  data: EclosionExport,
  options?: ImportOptions
): Promise<ImportResult> {
  await simulateDelay(200);
  const supportedVersions = ['1.0', '1.1'];
  if (!supportedVersions.includes(data.eclosion_export.version)) {
    return {
      success: false,
      imported: {},
      warnings: [],
      error: `Unsupported export version: ${data.eclosion_export.version}`,
    };
  }

  const imported: Record<string, boolean> = {};
  const warnings: string[] = [];
  const toolsToImport = options?.tools ?? ['recurring', 'notes', 'wishlist'];

  // Import Recurring
  if (toolsToImport.includes('recurring') && data.tools.recurring) {
    const recurring = data.tools.recurring;
    updateDemoState((state) => ({
      ...state,
      settings: {
        auto_sync_new: recurring.config.auto_sync_new,
        auto_track_threshold: recurring.config.auto_track_threshold,
        auto_update_targets: recurring.config.auto_update_targets,
        auto_categorize_enabled: state.settings.auto_categorize_enabled,
        show_category_group: state.settings.show_category_group,
      },
      dashboard: {
        ...state.dashboard,
        config: {
          ...state.dashboard.config,
          target_group_id: recurring.config.target_group_id,
          target_group_name: recurring.config.target_group_name,
          is_configured: !!recurring.config.target_group_id,
          auto_sync_new: recurring.config.auto_sync_new,
          auto_track_threshold: recurring.config.auto_track_threshold,
          auto_update_targets: recurring.config.auto_update_targets,
        },
        items: state.dashboard.items.map((item) => ({
          ...item,
          is_enabled: recurring.enabled_items.includes(item.id),
          is_in_rollup: recurring.rollup.item_ids.includes(item.id),
        })),
        rollup: {
          ...state.dashboard.rollup,
          enabled: recurring.rollup.enabled,
          category_name: recurring.rollup.category_name,
          emoji: recurring.rollup.emoji,
          budgeted: recurring.rollup.total_budgeted,
        },
      },
    }));
    imported['recurring'] = true;
  }

  // Import Notes
  if (toolsToImport.includes('notes') && data.tools.notes) {
    const notesData = data.tools.notes;
    updateDemoState((state) => {
      const newNotes: Record<string, Note> = {};
      const newGeneralNotes: Record<string, GeneralMonthNote> = {};
      notesData.category_notes.forEach((note) => {
        const newId = `imported-${note.id}`;
        newNotes[newId] = {
          id: newId,
          categoryRef: buildCategoryRef(
            note.category_type,
            note.category_id,
            note.category_name,
            note.group_id,
            note.group_name
          ),
          monthKey: note.month_key,
          content: note.content,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        };
      });
      notesData.general_notes.forEach((note) => {
        newGeneralNotes[note.month_key] = {
          id: `imported-${note.id}`,
          monthKey: note.month_key,
          content: note.content,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
        };
      });
      const newArchivedNotes: ArchivedNote[] = notesData.archived_notes.map((note) => {
        const archivedNote: ArchivedNote = {
          id: `imported-${note.id}`,
          categoryRef: buildCategoryRef(
            note.category_type,
            note.category_id,
            note.category_name,
            note.group_id,
            note.group_name
          ),
          monthKey: note.month_key,
          content: note.content,
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          archivedAt: note.archived_at,
          originalCategoryName: note.original_category_name,
        };
        if (note.original_group_name) archivedNote.originalGroupName = note.original_group_name;
        return archivedNote;
      });
      return {
        ...state,
        notes: {
          ...state.notes,
          notes: { ...state.notes.notes, ...newNotes },
          generalNotes: { ...state.notes.generalNotes, ...newGeneralNotes },
          archivedNotes: [...state.notes.archivedNotes, ...newArchivedNotes],
          checkboxStates: { ...state.notes.checkboxStates, ...notesData.checkbox_states },
        },
      };
    });
    imported['notes'] = true;
  }

  // Import Wishlist
  if (toolsToImport.includes('wishlist') && data.tools.wishlist) {
    const wishlistData = data.tools.wishlist;
    updateDemoState((state) => {
      const newItems = wishlistData.items
        .filter((i) => !i.is_archived)
        .map((item, index) => buildWishlistItem(item, index, state.wishlist.items.length, false));
      const newArchivedItems = wishlistData.items
        .filter((i) => i.is_archived)
        .map((item, index) =>
          buildWishlistItem(item, index, state.wishlist.archived_items.length, true)
        );
      return {
        ...state,
        wishlist: {
          ...state.wishlist,
          items: [...state.wishlist.items, ...newItems],
          archived_items: [...state.wishlist.archived_items, ...newArchivedItems],
        },
        wishlistConfig: {
          ...state.wishlistConfig,
          isConfigured: wishlistData.config.is_configured,
          defaultCategoryGroupName: wishlistData.config.default_category_group_name ?? null,
          selectedBrowser: (wishlistData.config.selected_browser ?? null) as BrowserType | null,
          selectedFolderNames: wishlistData.config.selected_folder_names,
          autoArchiveOnBookmarkDelete: wishlistData.config.auto_archive_on_bookmark_delete,
          autoArchiveOnGoalMet: wishlistData.config.auto_archive_on_goal_met,
        },
      };
    });
    imported['wishlist'] = true;
    if (wishlistData.items.length > 0)
      warnings.push(
        `Imported ${wishlistData.items.length} wishlist item(s). Items are unlinked and need to be connected to Monarch categories.`
      );
  }

  return { success: true, imported, warnings };
}

/** Preview an import before applying. Supports v1.0 and v1.1 exports. */
export async function previewImport(data: EclosionExport): Promise<ImportPreviewResponse> {
  await simulateDelay(100);
  const supportedVersions = ['1.0', '1.1'];
  if (!data.eclosion_export?.version || !supportedVersions.includes(data.eclosion_export.version)) {
    return { success: false, valid: false, errors: ['Unsupported or invalid export format'] };
  }

  const preview: ImportPreview = {
    version: data.eclosion_export.version,
    exported_at: data.eclosion_export.exported_at,
    source_mode: data.eclosion_export.source_mode,
    tools: {},
  };

  if (data.tools.recurring) {
    preview.tools.recurring = {
      has_config: !!data.tools.recurring.config,
      enabled_items_count: data.tools.recurring.enabled_items.length,
      categories_count: Object.keys(data.tools.recurring.categories).length,
      has_rollup: data.tools.recurring.rollup.enabled,
      rollup_items_count: data.tools.recurring.rollup.item_ids.length,
    };
  }
  if (data.tools.notes) {
    preview.tools.notes = {
      category_notes_count: data.tools.notes.category_notes.length,
      general_notes_count: data.tools.notes.general_notes.length,
      archived_notes_count: data.tools.notes.archived_notes.length,
      has_checkbox_states: Object.keys(data.tools.notes.checkbox_states).length > 0,
    };
  }
  if (data.tools.wishlist) {
    const activeItems = data.tools.wishlist.items.filter((i) => !i.is_archived);
    const archivedItems = data.tools.wishlist.items.filter((i) => i.is_archived);
    preview.tools.wishlist = {
      has_config: !!data.tools.wishlist.config,
      items_count: activeItems.length,
      archived_items_count: archivedItems.length,
      pending_bookmarks_count: data.tools.wishlist.pending_bookmarks.length,
    };
  }

  return { success: true, valid: true, preview };
}
