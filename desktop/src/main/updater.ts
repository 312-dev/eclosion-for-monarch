/**
 * Auto-Update Management
 *
 * Handles checking for updates, downloading, and installation.
 * Uses electron-updater with GitHub Releases as the update source.
 *
 * Channel is determined at build time - no runtime switching.
 * Beta builds see only beta prereleases (versions with '-beta' suffix).
 * Stable builds see only stable releases.
 *
 * Auto-update is always enabled - updates are downloaded automatically
 * and the app restarts to install them.
 */

import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app, dialog } from 'electron';
import { showNotification } from './tray';
import { getMainWindow, setIsQuitting } from './window';
import { debugLog } from './logger';

/** Update check timeout for boot (10 seconds) */
const BOOT_UPDATE_TIMEOUT_MS = 10000;

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
 * Auto-download is always enabled - updates install automatically.
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

  // Auto-download is always enabled - forced on for all users
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // CRITICAL: Disable differential downloads to prevent corrupted files.
  // The blockmap-based differential update mechanism can corrupt binary files
  // (especially large extraResources like the Python backend). Force full downloads.
  // Note: v1.0.9 was released to trigger a full re-download for users with corrupted
  // backends from earlier differential updates (the fix only takes effect when the
  // NEW version's updater code runs, so we needed one more release cycle).
  autoUpdater.disableDifferentialDownload = true;

  debugLog(`Build-time channel: ${channel}`, LOG_PREFIX);
  debugLog(`__RELEASE_CHANNEL__ = ${typeof __RELEASE_CHANNEL__ !== 'undefined' ? __RELEASE_CHANNEL__ : 'undefined'}`, LOG_PREFIX);
  debugLog(`autoUpdater.allowPrerelease = ${autoUpdater.allowPrerelease}`, LOG_PREFIX);
  debugLog(`autoUpdater.channel = ${autoUpdater.channel || '(not set, defaults to latest)'}`, LOG_PREFIX);
  debugLog('Auto-download: always enabled', LOG_PREFIX);
  debugLog('Differential download: disabled (full downloads only)', LOG_PREFIX);

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

    notifyRenderer('update-downloaded', info);

    // Show notification that update is ready
    // User will see banner in app and can restart when ready
    showNotification(
      'Update Ready',
      `Version ${info.version} has been downloaded. Restart to install.`
    );
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
  if (!updateDownloaded) {
    debugLog('quitAndInstall called but no update downloaded', LOG_PREFIX);
    notifyRenderer('update-error', { message: 'No update available to install' });
    return;
  }

  try {
    debugLog('Installing update...', LOG_PREFIX);
    // Set isQuitting flag to prevent window close handler from hiding to tray
    // instead of actually quitting. Without this, closeToTray=true would
    // intercept the quit and just hide the window, leaving the app stuck.
    setIsQuitting(true);
    autoUpdater.quitAndInstall(false, true);
  } catch (err) {
    // Reset quitting flag since we're not actually quitting
    setIsQuitting(false);
    const cleanMessage = getCleanErrorMessage(err as Error);
    debugLog(`Failed to install update: ${cleanMessage}`, LOG_PREFIX);
    notifyRenderer('update-error', { message: `Installation failed: ${cleanMessage}` });
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
    setIsQuitting(true);
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
 * Check for updates at boot time with a timeout.
 * If an update is available, it will be downloaded automatically and the app will restart.
 *
 * @returns Object with update status and whether boot should wait
 */
export async function checkForUpdatesOnBoot(): Promise<{
  updateAvailable: boolean;
  version?: string;
  timedOut: boolean;
}> {
  // Don't check in dev mode
  if (!app.isPackaged) {
    debugLog('Skipping boot update check (development mode)', LOG_PREFIX);
    return { updateAvailable: false, timedOut: false };
  }

  debugLog('Checking for updates on boot...', LOG_PREFIX);
  notifyRenderer('boot-checking', { message: 'Checking for updates...' });

  // Create a timeout promise
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    setTimeout(() => {
      debugLog('Boot update check timed out', LOG_PREFIX);
      resolve({ timedOut: true });
    }, BOOT_UPDATE_TIMEOUT_MS);
  });

  // Create the update check promise
  const updatePromise = (async (): Promise<{
    updateAvailable: boolean;
    version?: string;
    timedOut: false;
  }> => {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result?.updateInfo?.version && result.updateInfo.version !== app.getVersion()) {
        debugLog(`Update available on boot: ${result.updateInfo.version}`, LOG_PREFIX);
        // Auto-download is enabled, so it will start downloading automatically
        // The 'update-downloaded' event handler will auto-install
        return {
          updateAvailable: true,
          version: result.updateInfo.version,
          timedOut: false,
        };
      }
      return { updateAvailable: false, timedOut: false };
    } catch (err) {
      const cleanMessage = getCleanErrorMessage(err as Error);
      debugLog(`Boot update check failed: ${cleanMessage}`, LOG_PREFIX);
      return { updateAvailable: false, timedOut: false };
    }
  })();

  // Race between timeout and update check
  const result = await Promise.race([updatePromise, timeoutPromise]);

  if ('timedOut' in result && result.timedOut) {
    return { updateAvailable: false, timedOut: true };
  }

  return result as { updateAvailable: boolean; version?: string; timedOut: false };
}

/**
 * Schedule periodic update checks.
 * Checks every 1 hour by default.
 * Only works in packaged builds (dev mode has no app-update.yml).
 */
export function scheduleUpdateChecks(intervalHours = 1): NodeJS.Timeout | null {
  // Don't schedule updates in dev mode
  if (!app.isPackaged) {
    debugLog('Skipping update check scheduling (development mode)', LOG_PREFIX);
    return null;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Don't check immediately - boot check already ran
  // Just schedule periodic checks
  return setInterval(() => {
    checkForUpdates();
  }, intervalMs);
}
