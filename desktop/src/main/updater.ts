/**
 * Auto-Update Management
 *
 * Handles checking for updates, downloading, and installation.
 * Uses electron-updater with GitHub Releases as the update source.
 */

import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app } from 'electron';
import Store from 'electron-store';
import { showNotification } from './tray';
import { getMainWindow } from './window';

const store = new Store();

// Update channels
type UpdateChannel = 'stable' | 'beta';

let updateAvailable = false;
let updateDownloaded = false;
let updateInfo: UpdateInfo | null = null;

/**
 * Initialize the auto-updater.
 */
export function initializeUpdater(): void {
  // Configure update channel from stored preference
  const channel = store.get('updateChannel', 'stable') as UpdateChannel;
  setUpdateChannel(channel);

  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

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
    console.error('Update error:', err);
    notifyRenderer('update-error', { message: err.message });
  });
}

/**
 * Set the update channel (stable or beta).
 */
export function setUpdateChannel(channel: UpdateChannel): void {
  store.set('updateChannel', channel);
  autoUpdater.channel = channel;
  console.log(`Update channel set to: ${channel}`);
}

/**
 * Get the current update channel.
 */
export function getUpdateChannel(): UpdateChannel {
  return store.get('updateChannel', 'stable') as UpdateChannel;
}

/**
 * Check for updates.
 */
export async function checkForUpdates(): Promise<{ updateAvailable: boolean; version?: string }> {
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
    console.error('Failed to check for updates:', err);
    return { updateAvailable: false };
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
 */
export function scheduleUpdateChecks(intervalHours = 6): NodeJS.Timeout {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Check immediately on startup
  checkForUpdates();

  // Then check periodically
  return setInterval(() => {
    checkForUpdates();
  }, intervalMs);
}
