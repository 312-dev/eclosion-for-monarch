/**
 * Demo Settings Functions
 *
 * Settings and export/import operations.
 */

import type { EclosionExport, ImportOptions, ImportResult, ImportPreviewResponse } from '../../types';
import { getDemoState, updateDemoState, simulateDelay } from './demoState';

/**
 * Get current settings.
 */
export async function getSettings(): Promise<{ auto_sync_new: boolean }> {
  await simulateDelay(50);
  const state = getDemoState();
  return { auto_sync_new: state.settings.auto_sync_new };
}

/**
 * Update settings.
 */
export async function updateSettings(settings: {
  auto_sync_new?: boolean;
  auto_track_threshold?: number | null;
  auto_update_targets?: boolean;
}): Promise<void> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    settings: { ...state.settings, ...settings },
    dashboard: {
      ...state.dashboard,
      config: {
        ...state.dashboard.config,
        ...(settings.auto_sync_new !== undefined && {
          auto_sync_new: settings.auto_sync_new,
        }),
        ...(settings.auto_track_threshold !== undefined && {
          auto_track_threshold: settings.auto_track_threshold,
        }),
        ...(settings.auto_update_targets !== undefined && {
          auto_update_targets: settings.auto_update_targets,
        }),
      },
    },
  }));
}

/**
 * Export settings to a backup file.
 */
export async function exportSettings(): Promise<EclosionExport> {
  await simulateDelay(100);
  const state = getDemoState();

  const enabledItems = state.dashboard.items
    .filter((item) => item.is_enabled)
    .map((item) => item.id);

  const categories: Record<string, {
    monarch_category_id: string;
    name: string;
    emoji: string;
    sync_name: boolean;
    is_linked: boolean;
  }> = {};

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

  return {
    eclosion_export: {
      version: '1.0',
      exported_at: new Date().toISOString(),
      source_mode: 'demo',
    },
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
    },
    app_settings: {},
  };
}

/**
 * Import settings from a backup file.
 */
export async function importSettings(
  data: EclosionExport,
  options?: ImportOptions
): Promise<ImportResult> {
  await simulateDelay(200);

  if (data.eclosion_export.version !== '1.0') {
    return {
      success: false,
      imported: {},
      warnings: [],
      error: `Unsupported export version: ${data.eclosion_export.version}`,
    };
  }

  const imported: Record<string, boolean> = {};
  const warnings: string[] = [];
  const toolsToImport = options?.tools ?? ['recurring'];

  if (toolsToImport.includes('recurring') && data.tools['recurring']) {
    const recurring = data.tools['recurring'];

    updateDemoState((state) => {
      const newConfig = {
        ...state.dashboard.config,
        target_group_id: recurring.config.target_group_id,
        target_group_name: recurring.config.target_group_name,
        is_configured: !!recurring.config.target_group_id,
        auto_sync_new: recurring.config.auto_sync_new,
        auto_track_threshold: recurring.config.auto_track_threshold,
        auto_update_targets: recurring.config.auto_update_targets,
      };

      const newSettings = {
        auto_sync_new: recurring.config.auto_sync_new,
        auto_track_threshold: recurring.config.auto_track_threshold,
        auto_update_targets: recurring.config.auto_update_targets,
      };

      const newItems = state.dashboard.items.map((item) => ({
        ...item,
        is_enabled: recurring.enabled_items.includes(item.id),
        is_in_rollup: recurring.rollup.item_ids.includes(item.id),
      }));

      return {
        ...state,
        settings: newSettings,
        dashboard: {
          ...state.dashboard,
          config: newConfig,
          items: newItems,
          rollup: {
            ...state.dashboard.rollup,
            enabled: recurring.rollup.enabled,
            category_name: recurring.rollup.category_name,
            emoji: recurring.rollup.emoji,
            budgeted: recurring.rollup.total_budgeted,
          },
        },
      };
    });

    imported['recurring'] = true;
  }

  return {
    success: true,
    imported,
    warnings,
  };
}

/**
 * Preview an import before applying.
 */
export async function previewImport(
  data: EclosionExport
): Promise<ImportPreviewResponse> {
  await simulateDelay(100);

  if (data.eclosion_export?.version !== '1.0') {
    return {
      success: false,
      valid: false,
      errors: ['Unsupported or invalid export format'],
    };
  }

  const preview = {
    version: data.eclosion_export.version,
    exported_at: data.eclosion_export.exported_at,
    source_mode: data.eclosion_export.source_mode,
    tools: {} as Record<string, {
      has_config: boolean;
      enabled_items_count: number;
      categories_count: number;
      has_rollup: boolean;
      rollup_items_count: number;
    }>,
  };

  const recurringData = data.tools['recurring'];
  if (recurringData) {
    preview.tools['recurring'] = {
      has_config: !!recurringData.config,
      enabled_items_count: recurringData.enabled_items.length,
      categories_count: Object.keys(recurringData.categories).length,
      has_rollup: recurringData.rollup.enabled,
      rollup_items_count: recurringData.rollup.item_ids.length,
    };
  }

  return {
    success: true,
    valid: true,
    preview,
  };
}
