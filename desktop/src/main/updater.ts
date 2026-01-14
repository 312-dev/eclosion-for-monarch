/**
 * Auto-Update Management
 *
 * Handles checking for updates, downloading, and installation.
 * Uses electron-updater with GitHub Releases as the update source.
 *
 * Channel is determined at build time - no runtime switching.
 * Beta builds see only beta prereleases (versions with '-beta' suffix).
 * Stable builds see only stable releases.
 */

import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app, dialog } from 'electron';
import { showNotification } from './tray';
import { getMainWindow } from './window';
import { getStore } from './store';
import { debugLog } from './logger';

const LOG_PREFIX = '[Updater]';

// Update channels
type UpdateChannel = 'stable' | 'beta';

let updateAvailable = false;
let updateDownloaded = false;
let updateInfo: UpdateInfo | null = null;

/**
 * Extract a clean, user-friendly error message from an electron-updater error.
 * These errors can contain entire HTTP response bodies, headers, and cookies
 * which makes them enormous and exposes sensitive data.
 */
function getCleanErrorMessage(err: Error): string {
  const message = err.message || 'Unknown error';

  // Common error patterns and their user-friendly messages
  if (message.includes('net::ERR_INTERNET_DISCONNECTED') || message.includes('ENOTFOUND')) {
    return 'Unable to check for updates: No internet connection';
  }
  if (message.includes('net::ERR_CONNECTION_REFUSED')) {
    return 'Unable to check for updates: Connection refused';
  }
  if (message.includes('net::ERR_CONNECTION_TIMED_OUT') || message.includes('ETIMEDOUT')) {
    return 'Unable to check for updates: Connection timed out';
  }
  if (message.includes('404') || message.includes('Not Found')) {
    return 'Unable to check for updates: Release not found';
  }
  if (message.includes('403') || message.includes('Forbidden')) {
    return 'Unable to check for updates: Access denied';
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return 'Unable to check for updates: Rate limited, please try again later';
  }
  // Missing app-update.yml - happens with development builds
  if (message.includes('ENOENT') && message.includes('app-update.yml')) {
    return 'Updates are not available for this build. Please download the latest release from the official website.';
  }

  // If the message is very long (likely contains HTTP response), truncate it
  // and extract just the first meaningful part
  if (message.length > 200) {
    // Try to find a sensible truncation point
    const firstLine = message.split('\n')[0];
    if (firstLine.length <= 200) {
      return firstLine;
    }
    // Truncate at 200 chars
    return message.substring(0, 200) + '...';
  }

  return message;
}

/**
 * Get the build-time release channel.
 * - 'beta' if RELEASE_CHANNEL=beta at build time
 * - 'beta' if RELEASE_CHANNEL=dev (development builds see beta releases)
 * - 'stable' otherwise (explicit RELEASE_CHANNEL=stable or undefined)
 */
function getBuildTimeChannel(): UpdateChannel {
  if (typeof __RELEASE_CHANNEL__ !== 'undefined') {
    // Beta and dev builds both use beta channel
    // Dev builds should see beta releases since developers want to test prereleases
    if (__RELEASE_CHANNEL__ === 'beta' || __RELEASE_CHANNEL__ === 'dev') {
      return 'beta';
    }
  }
  return 'stable';
}

/**
 * Initialize the auto-updater.
 * Channel is determined at build time - beta builds see only prereleases.
 */
export function initializeUpdater(): void {
  // Use build-time channel - no runtime switching
  const channel = getBuildTimeChannel();
  const isBeta = channel === 'beta';

  // Beta builds should only see beta releases, not stable releases
  // Setting allowPrerelease=true alone would include ALL releases (stable + beta)
  // Setting channel='beta' filters to only versions containing '-beta'
  autoUpdater.allowPrerelease = isBeta;
  if (isBeta) {
    autoUpdater.channel = 'beta';
  }
  autoUpdater.allowDowngrade = false;

  // Configure auto-updater
  // Auto-download is disabled by default - user must opt-in via settings
  const autoUpdateEnabled = getStore().get('autoUpdateEnabled', false);
  autoUpdater.autoDownload = autoUpdateEnabled;
  autoUpdater.autoInstallOnAppQuit = autoUpdateEnabled;

  debugLog(`Build-time channel: ${channel}`, LOG_PREFIX);
  debugLog(`__RELEASE_CHANNEL__ = ${typeof __RELEASE_CHANNEL__ !== 'undefined' ? __RELEASE_CHANNEL__ : 'undefined'}`, LOG_PREFIX);
  debugLog(`autoUpdater.allowPrerelease = ${autoUpdater.allowPrerelease}`, LOG_PREFIX);
  debugLog(`autoUpdater.channel = ${autoUpdater.channel || '(not set, defaults to latest)'}`, LOG_PREFIX);
  debugLog(`Auto-download: ${autoUpdateEnabled ? 'enabled' : 'disabled'}`, LOG_PREFIX);

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    debugLog('Checking for updates...', LOG_PREFIX);
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    const isBetaVersion = info.version.includes('-beta');
    debugLog(`Update available: ${info.version}`, LOG_PREFIX);
    debugLog(`  Is beta version: ${isBetaVersion}`, LOG_PREFIX);
    debugLog(`  Current channel setting: ${autoUpdater.channel || 'latest'}`, LOG_PREFIX);
    debugLog(`  Auto-download: ${autoUpdater.autoDownload}`, LOG_PREFIX);
    updateAvailable = true;
    updateInfo = info;
    notifyRenderer('update-available', info);
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    debugLog(`No update available. Current version: ${info.version}`, LOG_PREFIX);
    updateAvailable = false;
    updateInfo = null;
  });

  autoUpdater.on('download-progress', (progress) => {
    debugLog(`Download progress: ${progress.percent.toFixed(1)}% (${progress.transferred}/${progress.total} bytes, ${Math.round(progress.bytesPerSecond / 1024)} KB/s)`, LOG_PREFIX);
    notifyRenderer('update-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    debugLog(`Update downloaded: ${info.version}`, LOG_PREFIX);
    updateDownloaded = true;
    updateInfo = info;

    // Show notification
    showNotification(
      'Update Ready',
      `Version ${info.version} is ready to install. Restart Eclosion to apply the update.`
    );

    notifyRenderer('update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    // Extract a clean, user-friendly error message
    // electron-updater errors can contain huge HTTP response bodies
    const cleanMessage = getCleanErrorMessage(err);
    debugLog(`Update error: ${cleanMessage}`, LOG_PREFIX);
    notifyRenderer('update-error', { message: cleanMessage });
  });
}

/**
 * Get the current update channel.
 * Returns the build-time channel (no runtime switching).
 */
export function getUpdateChannel(): UpdateChannel {
  return getBuildTimeChannel();
}

/**
 * Check if auto-update is enabled.
 * When disabled, updates are still checked for and displayed, but not auto-downloaded.
 */
export function isAutoUpdateEnabled(): boolean {
  return getStore().get('autoUpdateEnabled', false);
}

/**
 * Enable or disable auto-update.
 * When enabled, updates are automatically downloaded and installed on quit.
 * When disabled, updates are shown but must be manually downloaded.
 */
export function setAutoUpdateEnabled(enabled: boolean): void {
  getStore().set('autoUpdateEnabled', enabled);
  autoUpdater.autoDownload = enabled;
  autoUpdater.autoInstallOnAppQuit = enabled;
  debugLog(`Auto-update ${enabled ? 'enabled' : 'disabled'}`, LOG_PREFIX);
}

/**
 * Manually download an available update.
 * Use this when auto-update is disabled but the user wants to update.
 */
export async function downloadUpdate(): Promise<{ success: boolean; error?: string }> {
  if (!updateAvailable || !updateInfo) {
    return { success: false, error: 'No update available' };
  }

  if (updateDownloaded) {
    return { success: true }; // Already downloaded
  }

  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    const cleanMessage = getCleanErrorMessage(err as Error);
    debugLog(`Failed to download update: ${cleanMessage}`, LOG_PREFIX);
    return { success: false, error: cleanMessage };
  }
}

/**
 * Check for updates.
 */
export async function checkForUpdates(): Promise<{ updateAvailable: boolean; version?: string; error?: string }> {
  // Don't attempt to check for updates in dev mode (no app-update.yml exists)
  if (!app.isPackaged) {
    return {
      updateAvailable: false,
      error: 'Updates are not available in development mode'
    };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      return {
        updateAvailable: result.updateInfo.version !== app.getVersion(),
        version: result.updateInfo.version,
      };
    }
    return { updateAvailable: false };
  } catch (err) {
    const cleanMessage = getCleanErrorMessage(err as Error);
    debugLog(`Failed to check for updates: ${cleanMessage}`, LOG_PREFIX);
    return { updateAvailable: false, error: cleanMessage };
  }
}

/**
 * Download and install the update.
 * This will quit the app and install the update.
 */
export function quitAndInstall(): void {
  if (updateDownloaded) {
    debugLog('Installing update...', LOG_PREFIX);
    autoUpdater.quitAndInstall(false, true);
  }
}

/**
 * Get current update status.
 */
export function getUpdateStatus(): {
  updateAvailable: boolean;
  updateDownloaded: boolean;
  updateInfo: UpdateInfo | null;
  currentVersion: string;
  channel: UpdateChannel;
} {
  return {
    updateAvailable,
    updateDownloaded,
    updateInfo,
    currentVersion: app.getVersion(),
    channel: getUpdateChannel(),
  };
}

/**
 * Notify the renderer process about update events.
 */
function notifyRenderer(event: string, data: unknown): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(`updater:${event}`, data);
  }
}

/**
 * Check if there's a pending update and offer to install it.
 * Used when startup fails - gives user a way to potentially fix the issue.
 *
 * @returns true if user chose to install update (app will quit), false otherwise
 */
export async function offerUpdateOnStartupFailure(): Promise<boolean> {
  if (!updateDownloaded || !updateInfo) {
    return false;
  }

  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Restart & Update', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: 'Update Available',
    message: `Startup failed, but an update is available (v${updateInfo.version})`,
    detail: 'This update may fix the startup issue. Would you like to install it now?',
  });

  if (result.response === 0) {
    debugLog('User chose to install update after startup failure', LOG_PREFIX);
    autoUpdater.quitAndInstall(false, true);
    return true;
  }

  return false;
}

/**
 * Check if an update has been downloaded and is ready to install.
 */
export function hasDownloadedUpdate(): boolean {
  return updateDownloaded;
}

/**
 * Schedule periodic update checks.
 * Checks every 6 hours by default.
 * Only works in packaged builds (dev mode has no app-update.yml).
 */
export function scheduleUpdateChecks(intervalHours = 6): NodeJS.Timeout | null {
  // Don't schedule updates in dev mode
  if (!app.isPackaged) {
    debugLog('Skipping update check scheduling (development mode)', LOG_PREFIX);
    return null;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Check immediately on startup
  checkForUpdates();

  // Then check periodically
  return setInterval(() => {
    checkForUpdates();
  }, intervalMs);
}
