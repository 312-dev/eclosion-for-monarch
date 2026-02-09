/**
 * Sync Types
 *
 * Types for sync operations.
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
