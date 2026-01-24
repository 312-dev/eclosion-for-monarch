/**
 * Demo Settings Import Functions
 *
 * Handles import and preview of settings in demo mode.
 * Supports recurring, notes, and stash tools.
 */

import type {
  EclosionExport,
  ImportOptions,
  ImportResult,
  ImportPreviewResponse,
  Note,
  GeneralMonthNote,
  ArchivedNote,
  BrowserType,
  ImportPreview,
  StashEventsMap,
} from '../../types';
import { updateDemoState, simulateDelay } from './demoState';
import { buildCategoryRef, buildStashItem } from './demoSettingsHelpers';

/** Import settings from a backup file. Supports recurring, notes, and stash tools. */
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
  const toolsToImport = options?.tools ?? ['recurring', 'notes', 'stash'];

  // Import Recurring
  if (toolsToImport.includes('recurring') && data.tools.recurring) {
    importRecurringTool(data, imported);
  }

  // Import Notes
  if (toolsToImport.includes('notes') && data.tools.notes) {
    importNotesTool(data, imported);
  }

  // Import Stash
  if (toolsToImport.includes('stash') && data.tools.stash) {
    importStashTool(data, imported, warnings);
  }

  return { success: true, imported, warnings };
}

function importRecurringTool(data: EclosionExport, imported: Record<string, boolean>): void {
  const recurring = data.tools.recurring!;
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

function importNotesTool(data: EclosionExport, imported: Record<string, boolean>): void {
  const notesData = data.tools.notes!;
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

function importStashTool(
  data: EclosionExport,
  imported: Record<string, boolean>,
  warnings: string[]
): void {
  const stashData = data.tools.stash!;
  updateDemoState((state) => {
    const newItems = stashData.items
      .filter((i) => !i.is_archived)
      .map((item, index) => buildStashItem(item, index, state.stash.items.length, false));
    const newArchivedItems = stashData.items
      .filter((i) => i.is_archived)
      .map((item, index) => buildStashItem(item, index, state.stash.archived_items.length, true));

    // Import hypotheses
    const existingHypotheses = state.stashHypotheses ?? [];
    const newHypotheses = (stashData.hypotheses ?? []).map((h) => ({
      id: `imported-${h.id}`,
      name: h.name,
      savingsAllocations: h.savings_allocations,
      savingsTotal: h.savings_total,
      monthlyAllocations: h.monthly_allocations,
      monthlyTotal: h.monthly_total,
      events: h.events as StashEventsMap,
      createdAt: h.created_at ?? new Date().toISOString(),
      updatedAt: h.updated_at ?? new Date().toISOString(),
    }));

    return {
      ...state,
      stash: {
        ...state.stash,
        items: [...state.stash.items, ...newItems],
        archived_items: [...state.stash.archived_items, ...newArchivedItems],
      },
      stashConfig: {
        ...state.stashConfig,
        isConfigured: stashData.config.is_configured,
        defaultCategoryGroupName: stashData.config.default_category_group_name ?? null,
        selectedBrowser: (stashData.config.selected_browser ?? null) as BrowserType | null,
        selectedFolderNames: stashData.config.selected_folder_names,
        autoArchiveOnBookmarkDelete: stashData.config.auto_archive_on_bookmark_delete,
        autoArchiveOnGoalMet: stashData.config.auto_archive_on_goal_met,
        includeExpectedIncome: stashData.config.include_expected_income ?? false,
      },
      stashHypotheses: [...existingHypotheses, ...newHypotheses],
    };
  });
  imported['stash'] = true;
  if (stashData.items.length > 0)
    warnings.push(
      `Imported ${stashData.items.length} stash(es). Stashes are unlinked and need to be connected to Monarch categories.`
    );
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
  if (data.tools.stash) {
    const activeItems = data.tools.stash.items.filter((i) => !i.is_archived);
    const archivedItems = data.tools.stash.items.filter((i) => i.is_archived);
    preview.tools.stash = {
      has_config: !!data.tools.stash.config,
      items_count: activeItems.length,
      archived_items_count: archivedItems.length,
      pending_bookmarks_count: data.tools.stash.pending_bookmarks.length,
      hypotheses_count: data.tools.stash.hypotheses?.length ?? 0,
    };
  }

  return { success: true, valid: true, preview };
}
