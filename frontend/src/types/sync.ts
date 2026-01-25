/**
 * Sync Types
 *
 * Types for sync operations and auto-sync functionality.
 */

export interface Settings {
  auto_sync_new: boolean;
}

export interface SyncResult {
  success: boolean;
  categories_created: number;
  categories_updated: number;
  categories_deactivated: number;
  errors: string[];
}

export interface AllocateResult {
  success: boolean;
  previous_budget?: number;
  allocated?: number;
  new_budget?: number;
  error?: string;
}

export interface ResetAppResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AutoSyncStatus {
  enabled: boolean;
  interval_minutes: number;
  next_run: string | null;
  last_sync: string | null;
  last_sync_success: boolean | null;
  last_sync_error: string | null;
  consent_acknowledged: boolean;
  is_foreground: boolean;
}

export interface EnableAutoSyncResult {
  success: boolean;
  interval_minutes?: number;
  next_run?: string;
  error?: string;
}

export interface DisableAutoSyncResult {
  success: boolean;
  error?: string;
}
