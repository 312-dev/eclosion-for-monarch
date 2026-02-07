/**
 * Shared test utilities for settings export/import tests.
 * Provides factory functions for creating verbose export data structures.
 */

import type { StashExportItem, StashExportConfig, RecurringExport, EclosionExport } from '../types';

export const DEMO_STORAGE_KEY = 'eclosion-demo-data';

/** Create a minimal stash export item with sensible defaults. */
export function createStashItem(overrides: Partial<StashExportItem> = {}): StashExportItem {
  return {
    id: 'test-item',
    name: 'Test',
    amount: 100,
    target_date: null,
    emoji: '🎯',
    monarch_category_id: null,
    category_group_id: null,
    category_group_name: null,
    source_url: null,
    source_bookmark_id: null,
    logo_url: null,
    is_archived: false,
    archived_at: null,
    created_at: null,
    grid_x: 0,
    grid_y: 0,
    col_span: 1,
    row_span: 1,
    ...overrides,
  };
}

/** Create a minimal stash export config with sensible defaults. */
export function createStashConfig(overrides: Partial<StashExportConfig> = {}): StashExportConfig {
  return {
    is_configured: false,
    default_category_group_id: null,
    default_category_group_name: null,
    selected_browser: null,
    selected_folder_ids: [],
    selected_folder_names: [],
    auto_archive_on_bookmark_delete: true,
    auto_archive_on_goal_met: true,
    ...overrides,
  };
}

/** Create a minimal recurring export with sensible defaults. */
export function createRecurringExport(overrides: Partial<RecurringExport> = {}): RecurringExport {
  return {
    config: {
      target_group_id: null,
      target_group_name: null,
      auto_sync_new: false,
      auto_track_threshold: null,
      auto_update_targets: false,
    },
    enabled_items: [],
    categories: {},
    rollup: {
      enabled: false,
      monarch_category_id: null,
      category_name: 'Rollup',
      emoji: '🔄',
      item_ids: [],
      total_budgeted: 0,
      is_linked: false,
    },
    ...overrides,
  };
}

/** Create a minimal EclosionExport wrapper. */
export function createExport(tools: EclosionExport['tools'], version = '1.1'): EclosionExport {
  return {
    eclosion_export: {
      version,
      exported_at: new Date().toISOString(),
      source_mode: 'demo',
    },
    tools,
    app_settings: {},
  };
}
