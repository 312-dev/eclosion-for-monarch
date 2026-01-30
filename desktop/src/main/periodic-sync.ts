/**
 * Periodic Sync Manager
 *
 * Manages interval-based automatic sync while the app is running.
 * Uses setInterval in the Electron main process to trigger syncs
 * at user-configured intervals.
 */

import Store from 'electron-store';
import fs from 'node:fs';
import path from 'node:path';
import type { BackendManager } from './backend';
import { getStoredPassphrase } from './biometric';
import { updateTrayMenu, updateHealthStatus, isAuthError, showReauthNotification } from './tray';
import { debugLog as log } from './logger';
import { getStateDir } from './paths';

// Wrapper to add [PeriodicSync] prefix to all log messages
function debugLog(msg: string): void {
  log(msg, '[PeriodicSync]');
}

// Lazy store initialization to ensure app.setPath('userData') is called first
let store: Store | null = null;
function getStore(): Store {
  store ??= new Store();
  return store;
}

// Store keys for periodic sync settings
const PERIODIC_SYNC_ENABLED_KEY = 'periodicSync.enabled';
const PERIODIC_SYNC_INTERVAL_KEY = 'periodicSync.intervalMinutes';

// Lock file to prevent concurrent syncs
const SYNC_LOCK_FILE = 'sync.lock';

// Available interval options (in minutes)
export const PERIODIC_SYNC_INTERVALS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
];

// Default interval: 30 minutes
const DEFAULT_INTERVAL_MINUTES = 30;

// State
let syncTimer: NodeJS.Timeout | null = null;
let backendManagerRef: BackendManager | null = null;
let syncClickHandler: (() => Promise<void>) | null = null;
let isSyncing = false;

/**
 * Get the path to the sync lock file.
 */
function getLockFilePath(): string {
  return path.join(getStateDir(), SYNC_LOCK_FILE);
}

/**
 * Check if a sync is currently in progress (via lock file).
 */
function isSyncLocked(): boolean {
  const lockPath = getLockFilePath();
  if (!fs.existsSync(lockPath)) {
    return false;
  }

  // Check if lock file is stale (older than 10 minutes)
  try {
    const stats = fs.statSync(lockPath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs > 10 * 60 * 1000) {
      // Lock is stale, remove it
      debugLog('Removing stale lock file');
      fs.unlinkSync(lockPath);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire the sync lock.
 */
function acquireLock(): boolean {
  if (isSyncLocked()) {
    return false;
  }

  try {
    const lockPath = getLockFilePath();
    fs.writeFileSync(lockPath, JSON.stringify({
      pid: process.pid,
      timestamp: new Date().toISOString(),
      source: 'periodic-sync',
    }));
    return true;
  } catch (error) {
    debugLog(`Failed to acquire lock: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Release the sync lock.
 */
function releaseLock(): void {
  try {
    const lockPath = getLockFilePath();
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (error) {
    debugLog(`Failed to release lock: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get current periodic sync settings.
 */
export function getPeriodicSyncSettings(): { enabled: boolean; intervalMinutes: number } {
  return {
    enabled: getStore().get(PERIODIC_SYNC_ENABLED_KEY, false) as boolean,
    intervalMinutes: getStore().get(PERIODIC_SYNC_INTERVAL_KEY, DEFAULT_INTERVAL_MINUTES) as number,
  };
}

/**
 * Set periodic sync enabled state.
 */
export function setPeriodicSyncEnabled(enabled: boolean): void {
  getStore().set(PERIODIC_SYNC_ENABLED_KEY, enabled);

  if (enabled) {
    const { intervalMinutes } = getPeriodicSyncSettings();
    startPeriodicSync(intervalMinutes);
  } else {
    stopPeriodicSync();
  }
}

/**
 * Set periodic sync interval.
 */
export function setPeriodicSyncInterval(intervalMinutes: number): void {
  // Validate interval
  if (!PERIODIC_SYNC_INTERVALS.some((i) => i.value === intervalMinutes)) {
    debugLog(`Invalid interval: ${intervalMinutes}, using default`);
    intervalMinutes = DEFAULT_INTERVAL_MINUTES;
  }

  getStore().set(PERIODIC_SYNC_INTERVAL_KEY, intervalMinutes);

  // Restart timer if enabled
  const { enabled } = getPeriodicSyncSettings();
  if (enabled && syncTimer) {
    stopPeriodicSync();
    startPeriodicSync(intervalMinutes);
  }
}

/**
 * Execute a periodic sync.
 */
async function executePeriodicSync(): Promise<void> {
  if (!backendManagerRef) {
    debugLog('No backend manager available');
    return;
  }

  if (isSyncing) {
    debugLog('Sync already in progress, skipping');
    return;
  }

  // Check lock file (prevents conflict with background sync CLI)
  if (isSyncLocked()) {
    debugLog('Sync locked by another process, skipping');
    return;
  }

  // Get passphrase from secure storage
  const passphrase = getStoredPassphrase();
  if (!passphrase) {
    debugLog('No passphrase available, skipping sync');
    return;
  }

  // Acquire lock
  if (!acquireLock()) {
    debugLog('Failed to acquire lock, skipping');
    return;
  }

  isSyncing = true;
  debugLog('Starting periodic sync');

  try {
    const result = await backendManagerRef.triggerSync(passphrase);

    if (result.success) {
      const syncTime = new Date().toLocaleTimeString();
      debugLog(`Periodic sync completed at ${syncTime}`);

      // Update tray menu (no notification - background syncs are silent)
      if (syncClickHandler) {
        updateTrayMenu(syncClickHandler);
      }
      updateHealthStatus(true, syncTime);
    } else {
      debugLog(`Periodic sync failed: ${result.error}`);
      // Check if this is an auth error (session expired, MFA needed)
      if (isAuthError(result.error)) {
        // Show reauth notification - user needs to provide MFA code
        showReauthNotification();
      }
      // Don't show generic notification for other periodic sync failures to avoid spam
      // User can check tray status or manually sync if needed
    }
  } catch (error) {
    debugLog(`Periodic sync error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isSyncing = false;
    releaseLock();
  }
}

/**
 * Start the periodic sync timer.
 */
export function startPeriodicSync(intervalMinutes: number): void {
  // Stop existing timer if any
  stopPeriodicSync();

  if (!backendManagerRef) {
    debugLog('Cannot start periodic sync: no backend manager');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  debugLog(`Starting periodic sync with interval: ${intervalMinutes} minutes`);

  syncTimer = setInterval(() => {
    void executePeriodicSync();
  }, intervalMs);

  // Don't sync immediately - let the user's configured interval apply
  // The startup sync and wake sync already handle immediate sync needs
}

/**
 * Stop the periodic sync timer.
 */
export function stopPeriodicSync(): void {
  if (syncTimer) {
    debugLog('Stopping periodic sync');
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

/**
 * Check if periodic sync is running.
 */
export function isPeriodicSyncRunning(): boolean {
  return syncTimer !== null;
}

/**
 * Initialize periodic sync with backend manager and sync handler.
 * Call this after backend manager is ready.
 */
export function initializePeriodicSync(
  backendManager: BackendManager,
  onSyncClick: () => Promise<void>
): void {
  backendManagerRef = backendManager;
  syncClickHandler = onSyncClick;

  const { enabled, intervalMinutes } = getPeriodicSyncSettings();
  debugLog(`Initialized. Enabled: ${enabled}, Interval: ${intervalMinutes}m`);

  if (enabled) {
    startPeriodicSync(intervalMinutes);
  }
}

/**
 * Cleanup periodic sync on app shutdown.
 */
export function cleanupPeriodicSync(): void {
  stopPeriodicSync();
  backendManagerRef = null;
  syncClickHandler = null;

  // Release any stale lock
  releaseLock();
}

/**
 * Get available interval options.
 */
export function getPeriodicSyncIntervals(): Array<{ value: number; label: string }> {
  return PERIODIC_SYNC_INTERVALS;
}
