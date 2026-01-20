/**
 * Demo Settings Functions
 *
 * Settings and export/import operations.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';

// Re-export export/import functions from dedicated module
export { exportSettings, importSettings, previewImport } from './demoSettingsExport';

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
  auto_categorize_enabled?: boolean;
  show_category_group?: boolean;
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
        ...(settings.auto_categorize_enabled !== undefined && {
          auto_categorize_enabled: settings.auto_categorize_enabled,
        }),
        ...(settings.show_category_group !== undefined && {
          show_category_group: settings.show_category_group,
        }),
      },
    },
  }));
}
