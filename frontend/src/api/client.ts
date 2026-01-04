import type { DashboardData, CategoryGroup, SyncResult, AuthStatus, LoginResult, AllocateResult, RollupData, UnmappedCategory, LinkCategoryResult, DeletableCategoriesResult, DeleteCategoriesResult, SetPassphraseResult, UnlockResult, UpdateCredentialsResult, ResetAppResult, SecurityStatus, VersionInfo, VersionCheckResult, ChangelogStatusResult, MarkChangelogReadResult, ResetDedicatedResult, ResetRollupResult, AutoSyncStatus, EnableAutoSyncResult, DisableAutoSyncResult, EclosionExport, ImportOptions, ImportResult, ImportPreviewResponse, SecurityEventsResponse, SecurityEventSummary, SecurityAlertsResponse, SecurityEventsQueryOptions } from '../types';

const API_BASE = '';

export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}

export class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number = 60, message?: string) {
    super(message || `Monarch Money API rate limit reached. Please wait ${retryAfter}s before retrying.`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Track in-flight requests to deduplicate concurrent calls
const inFlightRequests = new Map<string, Promise<unknown>>();

// Track rate limit state per endpoint
const rateLimitState = new Map<string, { until: number }>();

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const method = options?.method || 'GET';
  const requestKey = `${method}:${endpoint}`;

  // Check if we're currently rate limited for this endpoint
  const rateLimited = rateLimitState.get(endpoint);
  if (rateLimited && Date.now() < rateLimited.until) {
    const waitSeconds = Math.ceil((rateLimited.until - Date.now()) / 1000);
    throw new RateLimitError(waitSeconds);
  }

  // For GET requests, deduplicate concurrent calls to the same endpoint
  if (method === 'GET') {
    const existing = inFlightRequests.get(requestKey);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include', // Include session cookies for auth persistence
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      if (!response.ok) {
        // Handle rate limiting (429)
        if (response.status === 429) {
          // Parse Retry-After header if present, default to 60 seconds
          const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '60', 10);
          // Store rate limit state to prevent immediate retries
          rateLimitState.set(endpoint, { until: Date.now() + (retryAfter * 1000) });
          // Try to get the error message from the backend
          const errorBody = await response.json().catch(() => ({}));
          throw new RateLimitError(retryAfter, errorBody.error);
        }

        const error = await response.json().catch(() => ({}));
        // Check if auth is required (session expired)
        if (error.auth_required || response.status === 401) {
          throw new AuthRequiredError();
        }
        throw new Error(error.error || `API error: ${response.status}`);
      }

      return response.json();
    } finally {
      // Clean up in-flight tracking
      if (method === 'GET') {
        inFlightRequests.delete(requestKey);
      }
    }
  })();

  // Track this request if it's a GET
  if (method === 'GET') {
    inFlightRequests.set(requestKey, requestPromise);
  }

  return requestPromise;
}

// Auth functions
export async function checkAuthStatus(): Promise<AuthStatus> {
  return fetchApi<AuthStatus>('/auth/status');
}

export async function validateAuth(): Promise<AuthStatus> {
  // Validates credentials with the Monarch API
  // Use this on startup to verify token is still valid
  return fetchApi<AuthStatus>('/auth/validate');
}

export async function login(
  email: string,
  password: string,
  mfaSecret?: string
): Promise<LoginResult> {
  return fetchApi<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, mfa_secret: mfaSecret || '' }),
  });
}

export async function setPassphrase(
  passphrase: string
): Promise<SetPassphraseResult> {
  return fetchApi<SetPassphraseResult>('/auth/set-passphrase', {
    method: 'POST',
    body: JSON.stringify({ passphrase }),
  });
}

export async function unlockCredentials(
  passphrase: string,
  validate: boolean = true
): Promise<UnlockResult> {
  return fetchApi<UnlockResult>('/auth/unlock', {
    method: 'POST',
    body: JSON.stringify({ passphrase, validate }),
  });
}

export async function updateCredentials(
  email: string,
  password: string,
  passphrase: string,
  mfaSecret?: string
): Promise<UpdateCredentialsResult> {
  return fetchApi<UpdateCredentialsResult>('/auth/update-credentials', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      passphrase,
      mfa_secret: mfaSecret || '',
    }),
  });
}

export async function resetApp(): Promise<ResetAppResult> {
  return fetchApi<ResetAppResult>('/auth/reset-app', {
    method: 'POST',
  });
}

export async function lockCredentials(): Promise<void> {
  await fetchApi('/auth/lock', { method: 'POST' });
}

export async function logout(): Promise<void> {
  await fetchApi('/auth/logout', { method: 'POST' });
}

// Security functions
export async function getSecurityStatus(): Promise<SecurityStatus> {
  return fetchApi<SecurityStatus>('/security/status');
}

export async function getSecurityEvents(
  options?: SecurityEventsQueryOptions
): Promise<SecurityEventsResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.eventType) params.set('event_type', options.eventType);
  if (options?.success !== undefined) params.set('success', String(options.success));

  const query = params.toString();
  const endpoint = query ? `/security/events?${query}` : '/security/events';
  return fetchApi<SecurityEventsResponse>(endpoint);
}

export async function getSecuritySummary(): Promise<SecurityEventSummary> {
  return fetchApi<SecurityEventSummary>('/security/events/summary');
}

export async function exportSecurityEvents(): Promise<Blob> {
  const response = await fetch(`${API_BASE}/security/events/export`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to export security events');
  }
  return response.blob();
}

export async function getSecurityAlerts(): Promise<SecurityAlertsResponse> {
  return fetchApi<SecurityAlertsResponse>('/security/alerts');
}

export async function dismissSecurityAlerts(): Promise<{ success: boolean }> {
  return fetchApi('/security/alerts/dismiss', { method: 'POST' });
}

export async function getDashboard(): Promise<DashboardData> {
  return fetchApi<DashboardData>('/recurring/dashboard');
}

export async function triggerSync(): Promise<SyncResult> {
  return fetchApi<SyncResult>('/recurring/sync', { method: 'POST' });
}

export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  const response = await fetchApi<{ groups: CategoryGroup[] }>(
    '/recurring/groups'
  );
  return response.groups;
}

export async function setConfig(
  groupId: string,
  groupName: string
): Promise<void> {
  await fetchApi('/recurring/config', {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, group_name: groupName }),
  });
}

export async function toggleItemTracking(
  recurringId: string,
  enabled: boolean,
  options?: { initialBudget?: number; itemData?: Record<string, unknown> }
): Promise<{ success: boolean; enabled: boolean }> {
  return fetchApi('/recurring/toggle', {
    method: 'POST',
    body: JSON.stringify({
      recurring_id: recurringId,
      enabled,
      initial_budget: options?.initialBudget,
      item_data: options?.itemData,
    }),
  });
}

export async function getSettings(): Promise<{ auto_sync_new: boolean }> {
  return fetchApi('/recurring/settings');
}

export async function updateSettings(settings: { auto_sync_new?: boolean; auto_track_threshold?: number | null; auto_update_targets?: boolean }): Promise<void> {
  await fetchApi('/recurring/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

// Settings export/import functions

export async function exportSettings(): Promise<EclosionExport> {
  return fetchApi<EclosionExport>('/settings/export');
}

export async function importSettings(
  data: EclosionExport,
  options?: ImportOptions
): Promise<ImportResult> {
  return fetchApi<ImportResult>('/settings/import', {
    method: 'POST',
    body: JSON.stringify({ data, options }),
  });
}

export async function previewImport(
  data: EclosionExport
): Promise<ImportPreviewResponse> {
  return fetchApi<ImportPreviewResponse>('/settings/import/preview', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

// Notice functions

export async function dismissNotice(noticeId: string): Promise<{ success: boolean }> {
  return fetchApi(`/recurring/notices/${noticeId}/dismiss`, {
    method: 'POST',
  });
}

export async function allocateFunds(
  recurringId: string,
  amount: number
): Promise<AllocateResult> {
  return fetchApi<AllocateResult>('/recurring/allocate', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId, amount }),
  });
}

export async function recreateCategory(
  recurringId: string
): Promise<{ success: boolean; category_id?: string; error?: string }> {
  return fetchApi('/recurring/recreate-category', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId }),
  });
}

export async function refreshItem(
  recurringId: string
): Promise<{ success: boolean }> {
  return fetchApi('/recurring/refresh-item', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId }),
  });
}

export async function changeCategoryGroup(
  recurringId: string,
  groupId: string,
  groupName: string
): Promise<{ success: boolean; error?: string }> {
  return fetchApi('/recurring/change-group', {
    method: 'POST',
    body: JSON.stringify({
      recurring_id: recurringId,
      group_id: groupId,
      group_name: groupName,
    }),
  });
}

// Rollup functions

export async function getRollupData(): Promise<RollupData> {
  return fetchApi<RollupData>('/recurring/rollup');
}

export async function addToRollup(
  recurringId: string
): Promise<{ success: boolean; item_id?: string; monthly_rate?: number; total_budgeted?: number; error?: string }> {
  return fetchApi('/recurring/rollup/add', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId }),
  });
}

export async function removeFromRollup(
  recurringId: string
): Promise<{ success: boolean; item_id?: string; monthly_rate?: number; total_budgeted?: number; error?: string }> {
  return fetchApi('/recurring/rollup/remove', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId }),
  });
}

export async function setRollupBudget(
  amount: number
): Promise<{ success: boolean; total_budgeted?: number; error?: string }> {
  return fetchApi('/recurring/rollup/budget', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function linkRollupToCategory(
  categoryId: string,
  syncName: boolean = true
): Promise<{
  success: boolean;
  category_id?: string;
  category_name?: string;
  planned_budget?: number;
  is_linked?: boolean;
  error?: string;
}> {
  return fetchApi('/recurring/rollup/link', {
    method: 'POST',
    body: JSON.stringify({ category_id: categoryId, sync_name: syncName }),
  });
}

export async function createRollupCategory(
  budget: number = 0
): Promise<{
  success: boolean;
  category_id?: string;
  category_name?: string;
  budget?: number;
  error?: string;
}> {
  return fetchApi('/recurring/rollup/create', {
    method: 'POST',
    body: JSON.stringify({ budget }),
  });
}

// Emoji functions

export async function updateCategoryEmoji(
  recurringId: string,
  emoji: string
): Promise<{ success: boolean; emoji?: string; new_name?: string; error?: string }> {
  return fetchApi('/recurring/emoji', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId, emoji }),
  });
}

export async function updateRollupEmoji(
  emoji: string
): Promise<{ success: boolean; emoji?: string; new_name?: string; error?: string }> {
  return fetchApi('/recurring/rollup/emoji', {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

export async function updateRollupCategoryName(
  name: string
): Promise<{ success: boolean; category_name?: string; error?: string }> {
  return fetchApi('/recurring/rollup/name', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateCategoryName(
  recurringId: string,
  name: string
): Promise<{ success: boolean; category_name?: string; error?: string }> {
  return fetchApi('/recurring/category-name', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId, name }),
  });
}

// Category linking functions

export async function getUnmappedCategories(): Promise<UnmappedCategory[]> {
  const response = await fetchApi<{ categories: UnmappedCategory[] }>(
    '/recurring/unmapped-categories'
  );
  return response.categories;
}

export async function linkToCategory(
  recurringId: string,
  categoryId: string,
  syncName: boolean
): Promise<LinkCategoryResult> {
  return fetchApi<LinkCategoryResult>('/recurring/link-category', {
    method: 'POST',
    body: JSON.stringify({
      recurring_id: recurringId,
      category_id: categoryId,
      sync_name: syncName,
    }),
  });
}

export async function clearCategoryCache(): Promise<{ success: boolean; message?: string }> {
  return fetchApi('/recurring/clear-category-cache', {
    method: 'POST',
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

// Deployment info and cancellation

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
}

export async function getDeploymentInfo(): Promise<DeploymentInfo> {
  return fetchApi<DeploymentInfo>('/recurring/deployment-info');
}

export async function cancelSubscription(): Promise<CancelSubscriptionResult> {
  return fetchApi<CancelSubscriptionResult>('/recurring/cancel-subscription', {
    method: 'POST',
  });
}

// Version functions

export async function getVersion(): Promise<VersionInfo> {
  return fetchApi<VersionInfo>('/version');
}

export async function checkVersion(clientVersion: string): Promise<VersionCheckResult> {
  return fetchApi<VersionCheckResult>('/version/check', {
    method: 'POST',
    body: JSON.stringify({ client_version: clientVersion }),
  });
}

export async function getChangelogStatus(): Promise<ChangelogStatusResult> {
  return fetchApi<ChangelogStatusResult>('/version/changelog/status');
}

export async function markChangelogRead(): Promise<MarkChangelogReadResult> {
  return fetchApi<MarkChangelogReadResult>('/version/changelog/read', {
    method: 'POST',
  });
}

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

// Release and update functions

export interface Release {
  version: string;
  tag: string;
  name: string;
  published_at: string;
  is_prerelease: boolean;
  html_url: string;
  is_current: boolean;
}

export interface ReleasesResponse {
  current_version: string;
  current_channel: string;
  stable_releases: Release[];
  beta_releases: Release[];
  error?: string;
}

export async function getAvailableReleases(): Promise<ReleasesResponse> {
  return fetchApi<ReleasesResponse>('/version/releases');
}

export interface UpdateInfo {
  deployment_type: 'railway' | 'docker' | 'local';
  current_version: string;
  current_channel: string;
  instructions: {
    steps: string[];
    project_url?: string;
    example_compose?: string;
  };
}

export async function getUpdateInfo(): Promise<UpdateInfo> {
  return fetchApi<UpdateInfo>('/version/update-info');
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

export async function createBackup(reason?: string): Promise<{ success: boolean; backup_path?: string; error?: string }> {
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
