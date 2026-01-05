/**
 * Demo Miscellaneous Functions
 *
 * Auto-sync, deployment info, notices, and other utilities.
 */

import type { AutoSyncStatus } from '../../types';
import { updateDemoState, simulateDelay } from './demoState';

/**
 * Get auto-sync status (disabled in demo mode).
 */
export async function getAutoSyncStatus(): Promise<AutoSyncStatus> {
  await simulateDelay(50);
  return {
    enabled: false,
    interval_minutes: 0,
    next_run: null,
    last_sync: null,
    last_sync_success: null,
    last_sync_error: null,
    consent_acknowledged: false,
  };
}

/**
 * Get deployment info.
 */
export async function getDeploymentInfo(): Promise<{
  is_railway: boolean;
  railway_project_url: string | null;
  railway_project_id: string | null;
}> {
  await simulateDelay(50);
  return {
    is_railway: false,
    railway_project_url: null,
    railway_project_id: null,
  };
}

/**
 * Dismiss a notice.
 */
export async function dismissNotice(noticeId: string): Promise<{ success: boolean }> {
  await simulateDelay(50);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      notices: state.dashboard.notices.filter((n) => n.id !== noticeId),
    },
  }));

  return { success: true };
}

/**
 * Clear category cache.
 */
export async function clearCategoryCache(): Promise<{ success: boolean; message?: string }> {
  await simulateDelay(50);
  return { success: true, message: 'Cache cleared (demo mode)' };
}
