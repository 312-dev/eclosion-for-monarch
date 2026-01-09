/**
 * Misc API Functions
 *
 * Auto-sync, deployment info, notices, uninstall, and migration.
 */

import type {
  AutoSyncStatus,
  EnableAutoSyncResult,
  DisableAutoSyncResult,
  DeletableCategoriesResult,
  DeleteCategoriesResult,
  ResetDedicatedResult,
  ResetRollupResult,
} from '../../types';
import { fetchApi } from './fetchApi';

// Auto-sync functions

export async function getAutoSyncStatus(): Promise<AutoSyncStatus> {
  return fetchApi<AutoSyncStatus>('/recurring/auto-sync/status');
}

export async function enableAutoSync(
  intervalMinutes: number,
  passphrase: string,
  consentAcknowledged: boolean
): Promise<EnableAutoSyncResult> {
  return fetchApi<EnableAutoSyncResult>('/recurring/auto-sync/enable', {
    method: 'POST',
    body: JSON.stringify({
      interval_minutes: intervalMinutes,
      passphrase,
      consent_acknowledged: consentAcknowledged,
    }),
  });
}

export async function disableAutoSync(): Promise<DisableAutoSyncResult> {
  return fetchApi<DisableAutoSyncResult>('/recurring/auto-sync/disable', {
    method: 'POST',
  });
}

// Notice functions

export async function dismissNotice(noticeId: string): Promise<{ success: boolean }> {
  return fetchApi(`/recurring/notices/${noticeId}/dismiss`, {
    method: 'POST',
  });
}

// Deployment info

export interface DeploymentInfo {
  is_railway: boolean;
  railway_project_url: string | null;
  railway_project_id: string | null;
}

export interface CancelSubscriptionResult {
  success: boolean;
  steps_completed: string[];
  railway_deletion_url: string | null;
  instructions: string[];
  is_railway: boolean;
  is_desktop: boolean;
}

export async function getDeploymentInfo(): Promise<DeploymentInfo> {
  return fetchApi<DeploymentInfo>('/recurring/deployment-info');
}

export async function cancelSubscription(
  deleteCategories: boolean = true,
  fullReset: boolean = false
): Promise<CancelSubscriptionResult> {
  return fetchApi<CancelSubscriptionResult>('/recurring/cancel-subscription', {
    method: 'POST',
    body: JSON.stringify({ delete_categories: deleteCategories, full_reset: fullReset }),
  });
}

// Uninstall functions

export async function getDeletableCategories(): Promise<DeletableCategoriesResult> {
  return fetchApi<DeletableCategoriesResult>('/recurring/deletable-categories');
}

export async function deleteAllCategories(): Promise<DeleteCategoriesResult> {
  return fetchApi<DeleteCategoriesResult>('/recurring/delete-all-categories', {
    method: 'POST',
  });
}

export async function resetDedicatedCategories(): Promise<ResetDedicatedResult> {
  return fetchApi<ResetDedicatedResult>('/recurring/reset-dedicated', {
    method: 'POST',
  });
}

export async function resetRollup(): Promise<ResetRollupResult> {
  return fetchApi<ResetRollupResult>('/recurring/reset-rollup', {
    method: 'POST',
  });
}

export interface ResetRecurringToolResult {
  success: boolean;
  dedicated_deleted: number;
  dedicated_failed: number;
  rollup_deleted: boolean;
  items_disabled: number;
  errors: string[];
}

export async function resetRecurringTool(): Promise<ResetRecurringToolResult> {
  return fetchApi<ResetRecurringToolResult>('/recurring/reset-tool', {
    method: 'POST',
  });
}

// Migration functions

export interface MigrationStatus {
  compatibility: 'compatible' | 'needs_migration' | 'incompatible' | 'channel_mismatch';
  current_schema_version: string;
  file_schema_version: string;
  current_channel: string;
  file_channel: string;
  message: string;
  needs_migration: boolean;
  can_auto_migrate: boolean;
  requires_backup_first: boolean;
  has_beta_data: boolean;
  has_backups: boolean;
  latest_backup: Backup | null;
}

export interface Backup {
  path: string;
  filename: string;
  timestamp: string;
  channel: string;
  schema_version: string;
  reason: string;
  size_bytes: number;
  created_at: string;
}

export async function getMigrationStatus(): Promise<MigrationStatus> {
  return fetchApi<MigrationStatus>('/migration/status');
}

export interface ExecuteMigrationResult {
  success: boolean;
  message: string;
  backup_path: string | null;
  warnings: string[];
  error?: string;
}

export async function executeMigration(options: {
  target_version?: string;
  target_channel?: string;
  confirm_backup: boolean;
  force?: boolean;
}): Promise<ExecuteMigrationResult> {
  return fetchApi<ExecuteMigrationResult>('/migration/execute', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export interface BackupsResponse {
  backups: Backup[];
  max_backups: number;
}

export async function listBackups(): Promise<BackupsResponse> {
  return fetchApi<BackupsResponse>('/migration/backups');
}

export async function createBackup(
  reason?: string
): Promise<{ success: boolean; backup_path?: string; error?: string }> {
  return fetchApi('/migration/backups', {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'manual' }),
  });
}

export async function restoreBackup(
  backupPath: string,
  createBackupFirst: boolean = true
): Promise<{ success: boolean; message?: string; error?: string }> {
  return fetchApi('/migration/restore', {
    method: 'POST',
    body: JSON.stringify({
      backup_path: backupPath,
      create_backup_first: createBackupFirst,
    }),
  });
}
