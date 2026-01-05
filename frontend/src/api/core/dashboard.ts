/**
 * Dashboard API Functions
 *
 * Dashboard data and sync operations.
 */

import type { DashboardData, SyncResult } from '../../types';
import { fetchApi } from './fetchApi';

export async function getDashboard(): Promise<DashboardData> {
  return fetchApi<DashboardData>('/recurring/dashboard');
}

export async function triggerSync(): Promise<SyncResult> {
  return fetchApi<SyncResult>('/recurring/sync', { method: 'POST' });
}
