/**
 * Pending Sync Manager
 *
 * Tracks when a sync is requested from the menu but needs to wait
 * for user authentication before proceeding.
 */

import { debugLog } from './logger';

/**
 * Track if there's a pending sync waiting for authentication.
 */
let pendingSyncAfterAuth = false;

/**
 * Set pending sync state.
 */
export function setPendingSync(pending: boolean): void {
  pendingSyncAfterAuth = pending;
  debugLog(`Sync: Pending sync set to ${pending}`);
}

/**
 * Check if there's a pending sync waiting for auth.
 */
export function hasPendingSync(): boolean {
  return pendingSyncAfterAuth;
}

/**
 * Clear pending sync state (e.g., if user cancels).
 */
export function clearPendingSync(): void {
  pendingSyncAfterAuth = false;
  debugLog('Sync: Pending sync cleared');
}
