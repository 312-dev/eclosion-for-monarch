/**
 * Background Sync Platform Dispatcher
 *
 * Provides a unified API for installing/uninstalling OS-level scheduled tasks
 * that run sync when the app is closed.
 *
 * Dispatches to platform-specific implementations:
 * - macOS: Launch Agent (launchd)
 * - Windows: Task Scheduler
 * - Linux: systemd user timer
 */

import { app } from 'electron';
import Store from 'electron-store';
import { debugLog as log } from '../logger';

// Platform-specific implementations
import * as macos from './macos';
import * as windows from './windows';
import * as linux from './linux';

// Wrapper to add [BackgroundSync] prefix to all log messages
function debugLog(msg: string): void {
  log(msg, '[BackgroundSync]');
}

const store = new Store();

// Store keys for background sync settings
const BACKGROUND_SYNC_ENABLED_KEY = 'backgroundSync.enabled';
const BACKGROUND_SYNC_INTERVAL_KEY = 'backgroundSync.intervalMinutes';

// Available interval options for background sync (longer than periodic sync)
export const BACKGROUND_SYNC_INTERVALS = [
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 360, label: '6 hours' },
];

// Default interval: 2 hours
const DEFAULT_INTERVAL_MINUTES = 120;

/**
 * Get the platform-specific implementation.
 */
function getPlatformImpl(): typeof macos | typeof windows | typeof linux | null {
  switch (process.platform) {
    case 'darwin':
      return macos;
    case 'win32':
      return windows;
    case 'linux':
      return linux;
    default:
      debugLog(`Unsupported platform: ${process.platform}`);
      return null;
  }
}

/**
 * Get the path to the sync CLI executable.
 */
export function getSyncCliPath(): string {
  const resourcesPath = process.resourcesPath || app.getAppPath();
  const syncCliDir = `${resourcesPath}/sync-cli`;

  if (process.platform === 'win32') {
    return `${syncCliDir}/eclosion-sync.exe`;
  }
  return `${syncCliDir}/eclosion-sync`;
}

/**
 * Get current background sync settings.
 */
export function getBackgroundSyncSettings(): { enabled: boolean; intervalMinutes: number } {
  return {
    enabled: store.get(BACKGROUND_SYNC_ENABLED_KEY, false) as boolean,
    intervalMinutes: store.get(BACKGROUND_SYNC_INTERVAL_KEY, DEFAULT_INTERVAL_MINUTES) as number,
  };
}

/**
 * Check if background sync is installed.
 */
export async function isBackgroundSyncInstalled(): Promise<boolean> {
  const impl = getPlatformImpl();
  if (!impl) return false;

  try {
    return await impl.isInstalled();
  } catch (error) {
    debugLog(`Error checking install status: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Install background sync scheduled task.
 *
 * @param intervalMinutes Sync interval in minutes
 */
export async function installBackgroundSync(intervalMinutes: number): Promise<boolean> {
  const impl = getPlatformImpl();
  if (!impl) {
    debugLog('Platform not supported');
    return false;
  }

  // Validate interval
  if (!BACKGROUND_SYNC_INTERVALS.some((i) => i.value === intervalMinutes)) {
    debugLog(`Invalid interval: ${intervalMinutes}, using default`);
    intervalMinutes = DEFAULT_INTERVAL_MINUTES;
  }

  try {
    debugLog(`Installing background sync with interval: ${intervalMinutes} minutes`);
    const syncCliPath = getSyncCliPath();
    await impl.install(intervalMinutes, syncCliPath);

    // Save settings
    store.set(BACKGROUND_SYNC_ENABLED_KEY, true);
    store.set(BACKGROUND_SYNC_INTERVAL_KEY, intervalMinutes);

    debugLog('Background sync installed successfully');
    return true;
  } catch (error) {
    debugLog(`Failed to install: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Uninstall background sync scheduled task.
 */
export async function uninstallBackgroundSync(): Promise<boolean> {
  const impl = getPlatformImpl();
  if (!impl) return true; // Nothing to uninstall

  try {
    debugLog('Uninstalling background sync');
    await impl.uninstall();

    // Clear settings
    store.set(BACKGROUND_SYNC_ENABLED_KEY, false);

    debugLog('Background sync uninstalled successfully');
    return true;
  } catch (error) {
    debugLog(`Failed to uninstall: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Update background sync interval.
 *
 * @param intervalMinutes New sync interval in minutes
 */
export async function updateBackgroundSyncInterval(intervalMinutes: number): Promise<boolean> {
  const { enabled } = getBackgroundSyncSettings();
  if (!enabled) {
    // Just update the stored interval without installing
    store.set(BACKGROUND_SYNC_INTERVAL_KEY, intervalMinutes);
    return true;
  }

  // Reinstall with new interval
  return installBackgroundSync(intervalMinutes);
}

/**
 * Get available interval options.
 */
export function getBackgroundSyncIntervals(): Array<{ value: number; label: string }> {
  return BACKGROUND_SYNC_INTERVALS;
}

/**
 * Check if the platform supports background sync.
 */
export function isPlatformSupported(): boolean {
  return getPlatformImpl() !== null;
}
