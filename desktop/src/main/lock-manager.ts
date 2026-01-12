/**
 * Lock Manager
 *
 * Manages app locking behavior based on user preferences.
 * Supports locking on system lock events or after idle time.
 *
 * Lock triggers:
 * - 'system-lock': Lock when the system locks (default, like 1Password)
 * - 'idle-X': Lock after X minutes of system idle
 * - 'never': Never auto-lock (user must manually lock)
 */

import { powerMonitor, BrowserWindow } from 'electron';
import { getStore, type LockTrigger } from './store';
import { debugLog } from './logger';

// Re-export LockTrigger from store for backwards compatibility
export type { LockTrigger } from './store';

/**
 * Storage key for lock trigger setting.
 */
const LOCK_TRIGGER_KEY = 'security.lockTrigger' as const;

/**
 * Default lock trigger.
 */
const DEFAULT_LOCK_TRIGGER: LockTrigger = 'system-lock';

/**
 * Idle check interval in milliseconds.
 * Check every 30 seconds for idle time.
 */
const IDLE_CHECK_INTERVAL = 30_000;

/**
 * Callback invoked when the app should lock.
 */
type LockCallback = () => void;

/**
 * Active idle check interval.
 */
let idleCheckInterval: NodeJS.Timeout | null = null;

/**
 * Callback to invoke when app locks.
 */
let onLockCallback: LockCallback | null = null;

/**
 * Reference to main window for sending lock events.
 */
let mainWindowRef: BrowserWindow | null = null;

/**
 * Whether the lock manager is initialized.
 */
let isInitialized = false;

/**
 * Get the current lock trigger setting.
 */
export function getLockTrigger(): LockTrigger {
  return getStore().get(LOCK_TRIGGER_KEY, DEFAULT_LOCK_TRIGGER);
}

/**
 * Set the lock trigger setting.
 * Restarts idle detection if needed.
 */
export function setLockTrigger(trigger: LockTrigger): void {
  const oldTrigger = getLockTrigger();
  getStore().set(LOCK_TRIGGER_KEY, trigger);
  debugLog(`Lock trigger changed: ${oldTrigger} -> ${trigger}`);

  // Restart idle detection if needed
  if (isInitialized) {
    stopIdleDetection();
    if (trigger.startsWith('idle-')) {
      startIdleDetection();
    }
  }
}

/**
 * Get the idle minutes from the lock trigger.
 * Returns null if trigger is not an idle trigger.
 */
function getIdleMinutes(): number | null {
  const trigger = getLockTrigger();
  if (!trigger.startsWith('idle-')) {
    return null;
  }
  return parseInt(trigger.split('-')[1], 10);
}

/**
 * Start idle detection.
 * Periodically checks system idle time and triggers lock if threshold exceeded.
 */
function startIdleDetection(): void {
  const idleMinutes = getIdleMinutes();
  if (idleMinutes === null) {
    debugLog('Lock: Idle detection not started (not an idle trigger)');
    return;
  }

  debugLog(`Lock: Starting idle detection (${idleMinutes} minutes)`);

  idleCheckInterval = setInterval(() => {
    const idleSeconds = powerMonitor.getSystemIdleTime();
    const thresholdSeconds = idleMinutes * 60;

    if (idleSeconds >= thresholdSeconds) {
      debugLog(`Lock: Idle threshold reached (${idleSeconds}s >= ${thresholdSeconds}s)`);
      triggerLock('idle');
      // Don't re-trigger until user becomes active again
      // The interval will keep checking, but we only lock once
    }
  }, IDLE_CHECK_INTERVAL);
}

/**
 * Stop idle detection.
 */
function stopIdleDetection(): void {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
    debugLog('Lock: Idle detection stopped');
  }
}

/**
 * Trigger app lock.
 * @param reason The reason for locking (for logging)
 */
function triggerLock(reason: 'system-lock' | 'idle' | 'manual'): void {
  debugLog(`Lock: Triggering lock (reason: ${reason})`);

  // Invoke callback if set
  if (onLockCallback) {
    onLockCallback();
  }

  // Notify renderer to show unlock screen
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('app:locked', { reason });
  }
}

/**
 * Handle system lock screen event.
 */
function handleSystemLock(): void {
  const trigger = getLockTrigger();
  if (trigger === 'system-lock') {
    debugLog('Lock: System lock detected');
    triggerLock('system-lock');
  }
}

/**
 * Initialize the lock manager.
 * Call this during app initialization.
 *
 * @param mainWindow Reference to the main BrowserWindow
 * @param onLock Optional callback invoked when app locks
 */
export function initializeLockManager(
  mainWindow: BrowserWindow,
  onLock?: LockCallback
): void {
  if (isInitialized) {
    debugLog('Lock: Already initialized');
    return;
  }

  mainWindowRef = mainWindow;
  onLockCallback = onLock || null;

  const trigger = getLockTrigger();
  debugLog(`Lock: Initializing with trigger: ${trigger}`);

  // Setup system lock event listener
  powerMonitor.on('lock-screen', handleSystemLock);

  // Start idle detection if needed
  if (trigger.startsWith('idle-')) {
    startIdleDetection();
  }

  isInitialized = true;
  debugLog('Lock: Manager initialized');
}

/**
 * Cleanup the lock manager.
 * Call this during app cleanup.
 */
export function cleanupLockManager(): void {
  debugLog('Lock: Cleaning up');

  powerMonitor.removeListener('lock-screen', handleSystemLock);
  stopIdleDetection();

  mainWindowRef = null;
  onLockCallback = null;
  isInitialized = false;
}

/**
 * Manually trigger app lock.
 * Can be called from menu or hotkey.
 */
export function lockApp(): void {
  triggerLock('manual');
}

/**
 * Update the main window reference.
 * Call this if the window is recreated.
 */
export function updateMainWindowRef(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;
}

/**
 * Get available lock trigger options with display labels.
 */
export function getLockTriggerOptions(): Array<{ value: LockTrigger; label: string }> {
  return [
    { value: 'system-lock', label: 'When system locks' },
    { value: 'idle-1', label: 'After 1 minute idle' },
    { value: 'idle-5', label: 'After 5 minutes idle' },
    { value: 'idle-15', label: 'After 15 minutes idle' },
    { value: 'idle-30', label: 'After 30 minutes idle' },
    { value: 'never', label: 'Never (always unlocked)' },
  ];
}
