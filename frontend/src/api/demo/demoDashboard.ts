/**
 * Demo Dashboard Functions
 *
 * Dashboard and sync operations for demo mode.
 */

import type { DashboardData, SyncResult } from '../../types';
import { getDemoState, updateDemoState, simulateDelay } from './demoState';

/**
 * Get the current dashboard data.
 */
export async function getDashboard(): Promise<DashboardData> {
  await simulateDelay(100);
  const state = getDemoState();
  return state.dashboard;
}

/**
 * Trigger a sync operation (simulated in demo mode).
 */
export async function triggerSync(): Promise<SyncResult> {
  await simulateDelay(800);
  const state = getDemoState();

  updateDemoState((s) => ({
    ...s,
    dashboard: {
      ...s.dashboard,
      last_sync: new Date().toISOString(),
    },
  }));

  return {
    success: true,
    categories_created: 0,
    categories_updated: state.dashboard.items.length,
    categories_deactivated: 0,
    errors: [],
  };
}
