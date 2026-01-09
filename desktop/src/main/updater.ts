/**
 * Auto-Update Management
 *
 * Handles checking for updates, downloading, and installation.
 * Uses electron-updater with GitHub Releases as the update source.
 *
 * Channel is determined at build time - no runtime switching.
 * Beta builds see all releases (prereleases + stable).
 * Stable builds see only stable releases.
 */

import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app } from 'electron';
import { showNotification } from './tray';
import { getMainWindow } from './window';

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
 * Defaults to 'stable' if not defined (dev builds).
 */
function getBuildTimeChannel(): UpdateChannel {
  if (typeof __RELEASE_CHANNEL__ !== 'undefined' && __RELEASE_CHANNEL__ === 'beta') {
    return 'beta';
  }
  return 'stable';
}

/**
 * Initialize the auto-updater.
 * Channel is determined at build time - beta builds see prereleases.
 */
export function initializeUpdater(): void {
  // Use build-time channel - no runtime switching
  const channel = getBuildTimeChannel();
  const isBeta = channel === 'beta';

  // Beta builds can see prereleases, stable builds cannot
  autoUpdater.allowPrerelease = isBeta;
  autoUpdater.allowDowngrade = false;

  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  console.log(`Update channel: ${channel} (allowPrerelease: ${isBeta})`);

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available:', info.version);
    updateAvailable = true;
    updateInfo = info;
    notifyRenderer('update-available', info);
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log('No update available. Current version:', info.version);
    updateAvailable = false;
    updateInfo = null;
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(1)}%`);
    notifyRenderer('update-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('Update downloaded:', info.version);
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
    console.error('Update error:', cleanMessage);
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
    console.error('Failed to check for updates:', cleanMessage);
    return { updateAvailable: false, error: cleanMessage };
  }
}

/**
 * Download and install the update.
 * This will quit the app and install the update.
 */
export function quitAndInstall(): void {
  if (updateDownloaded) {
    console.log('Installing update...');
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
 * Schedule periodic update checks.
 * Checks every 6 hours by default.
 * Only works in packaged builds (dev mode has no app-update.yml).
 */
export function scheduleUpdateChecks(intervalHours = 6): NodeJS.Timeout | null {
  // Don't schedule updates in dev mode
  if (!app.isPackaged) {
    console.log('Skipping update check scheduling (development mode)');
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
