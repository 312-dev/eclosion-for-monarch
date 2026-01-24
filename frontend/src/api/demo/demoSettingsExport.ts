/**
 * Demo Settings Export Functions
 *
 * Handles export of settings in demo mode.
 * Supports recurring, notes, and stash tools.
 */

import type { DemoState } from '../demoData';
import type { EclosionExport, NotesExport, StashExport } from '../../types';
import { getDemoState, simulateDelay } from './demoState';

// Re-export import functions for backward compatibility
export { importSettings, previewImport } from './demoSettingsImport';

/** Export settings to a backup file. Includes recurring, notes, and stash tools. */
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
  const notesExport = buildNotesExport(state);

  // Stash export
  const stashExport = buildStashExport(state);

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
      stash: stashExport,
    },
    app_settings: {},
  };
}

function buildNotesExport(state: DemoState): NotesExport {
  const notes = Object.values(state.notes.notes);
  const generalNotes = Object.values(state.notes.generalNotes);
  const archivedNotes = state.notes.archivedNotes;

  return {
    config: {},
    category_notes: notes.map((note) => ({
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
    general_notes: generalNotes.map((note) => ({
      id: note.id,
      month_key: note.monthKey,
      content: note.content,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
    })),
    archived_notes: archivedNotes.map((note) => ({
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
}

function buildStashExport(state: DemoState): StashExport {
  const items = state.stash.items;
  const archivedItems = state.stash.archived_items;
  const allStashItems = [...items, ...archivedItems];
  const pendingBookmarks = state.pendingBookmarks;

  return {
    config: {
      is_configured: state.stashConfig.isConfigured,
      default_category_group_id: state.stashConfig.defaultCategoryGroupId ?? null,
      default_category_group_name: state.stashConfig.defaultCategoryGroupName ?? null,
      selected_browser: state.stashConfig.selectedBrowser ?? null,
      selected_folder_ids: state.stashConfig.selectedFolderIds ?? [],
      selected_folder_names: state.stashConfig.selectedFolderNames ?? [],
      auto_archive_on_bookmark_delete: state.stashConfig.autoArchiveOnBookmarkDelete ?? true,
      auto_archive_on_goal_met: state.stashConfig.autoArchiveOnGoalMet ?? true,
      include_expected_income: state.stashConfig.includeExpectedIncome ?? false,
    },
    items: allStashItems.map((item) => ({
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
    pending_bookmarks: pendingBookmarks.map((bm) => ({
      url: bm.url,
      name: bm.name,
      bookmark_id: bm.bookmark_id,
      browser_type: bm.browser_type,
      logo_url: bm.logo_url,
      status: bm.status,
      stash_item_id: null,
      created_at: bm.created_at,
    })),
    hypotheses: (state.stashHypotheses ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      savings_allocations: h.savingsAllocations,
      savings_total: h.savingsTotal,
      monthly_allocations: h.monthlyAllocations,
      monthly_total: h.monthlyTotal,
      events: h.events,
      created_at: h.createdAt,
      updated_at: h.updatedAt,
    })),
  };
}
