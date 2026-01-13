/**
 * System Tray
 *
 * Manages the system tray icon and context menu.
 */

import { Tray, Menu, nativeImage, app, Notification } from 'electron';
import path from 'path';
import { getMainWindow, showWindow, toggleWindow, setIsQuitting } from './window';
import Store from 'electron-store';

// Lazy store initialization to ensure app.setPath('userData') is called first
let store: Store | null = null;
function getStore(): Store {
  store ??= new Store();
  return store;
}

let tray: Tray | null = null;

// Store the sync click handler for use by updateTrayMenuSyncStatus
let storedSyncClickHandler: (() => Promise<void>) | null = null;

// Store the last sync ISO timestamp for periodic refresh
let lastSyncIsoTimestamp: string | null = null;

// Timer for periodic tray menu refresh
let trayRefreshTimer: ReturnType<typeof setInterval> | null = null;

// Track current health status for tooltip updates
interface HealthStatus {
  backendRunning: boolean;
  lastSync?: string;
  lastHealthCheck?: Date;
}

const currentHealth: HealthStatus = {
  backendRunning: false,
};

/**
 * Format an ISO timestamp to a relative time string (e.g., "5m ago").
 */
function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Build the tooltip string based on current health status.
 */
function buildTooltip(): string {
  const parts = ['Eclosion'];

  if (currentHealth.backendRunning) {
    parts.push('Backend: Running');
  } else {
    parts.push('Backend: Stopped');
  }

  if (currentHealth.lastSync) {
    parts.push(`Last sync: ${currentHealth.lastSync}`);
  }

  return parts.join('\n');
}

/**
 * Update the tray tooltip with current status.
 */
function updateTooltip(): void {
  if (!tray) return;
  tray.setToolTip(buildTooltip());
}

/**
 * Update backend health status (called by backend health check).
 * Emits an IPC event to the renderer so the UI can show offline indicator.
 */
export function updateHealthStatus(running: boolean, lastSync?: string): void {
  const previousState = currentHealth.backendRunning;
  currentHealth.backendRunning = running;
  currentHealth.lastHealthCheck = new Date();
  if (lastSync !== undefined) {
    currentHealth.lastSync = lastSync;
  }
  updateTooltip();

  // Emit event to renderer if status changed
  if (previousState !== running) {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('backend-status-changed', {
        running,
        lastSync: currentHealth.lastSync,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/**
 * Get current backend health status.
 */
export function getHealthStatus(): { running: boolean; lastSync?: string } {
  return {
    running: currentHealth.backendRunning,
    lastSync: currentHealth.lastSync,
  };
}

/**
 * Get the path to the tray icon based on platform.
 *
 * In dev mode: assets are at ../../assets/tray relative to dist/main/
 * In packaged mode: assets are in extraResources at process.resourcesPath/assets/tray
 */
function getTrayIconPath(): string {
  const assetsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets/tray')
    : path.join(__dirname, '../../assets/tray');

  if (process.platform === 'darwin') {
    // macOS uses template images for automatic dark/light mode adaptation
    return path.join(assetsPath, 'iconTemplate.png');
  } else if (process.platform === 'win32') {
    return path.join(assetsPath, 'tray.ico');
  }
  return path.join(assetsPath, 'tray.png');
}

/**
 * Create the system tray icon.
 */
export function createTray(onSyncClick: () => Promise<void>): void {
  // Store the handler for later use by updateTrayMenuSyncStatus
  storedSyncClickHandler = onSyncClick;

  const iconPath = getTrayIconPath();

  // Create icon (handle missing icon gracefully)
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
    // For macOS, mark as template image for automatic dark/light mode
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }
  } catch {
    // If icon not found, create an empty icon
    icon = nativeImage.createEmpty();
    console.warn('Tray icon not found:', iconPath);
  }

  tray = new Tray(icon);
  tray.setToolTip('Eclosion');

  // Build and set context menu
  updateTrayMenu(onSyncClick);

  /**
   * Tray Click Behavior - Platform Differences
   *
   * - **macOS**: No click handler. Clicking the menu bar icon shows the context menu
   *   (handled automatically by Electron via setContextMenu). This is the standard
   *   behavior for macOS menu bar apps - they show a dropdown menu, not toggle windows.
   *
   * - **Windows**: Single click toggles window visibility. Double-click also opens
   *   the window. Windows users expect tray icons to respond to clicks.
   *
   * - **Linux**: Single click toggles window. Follows Windows-style behavior since
   *   most desktop environments (GNOME, KDE) work this way.
   *
   * Note: Right-click opens the context menu on all platforms (handled automatically
   * by Electron via setContextMenu).
   */
  if (process.platform !== 'darwin') {
    tray.on('click', () => {
      toggleWindow();
    });
  }

  // Windows users expect double-click to open apps from tray
  if (process.platform === 'win32') {
    tray.on('double-click', () => {
      showWindow();
    });
  }
}

/**
 * Update the tray context menu.
 */
export function updateTrayMenu(
  onSyncClick: () => Promise<void>,
  syncStatus?: string
): void {
  if (!tray) return;

  const menuBarMode = getStore().get('menuBarMode', false) as boolean;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Eclosion',
      click: (): void => showWindow(),
    },
    { type: 'separator' },
    {
      label: 'Sync Now',
      click: async (): Promise<void> => {
        await onSyncClick();
      },
    },
    {
      label: syncStatus || 'Last sync: Never',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: (): void => {
        showWindow();
        const mainWindow = getMainWindow();
        mainWindow?.webContents.send('navigate', '/settings');
      },
    },
    { type: 'separator' },
    {
      label: process.platform === 'darwin' ? 'Menu Bar Mode' : 'Run in Background',
      type: 'checkbox' as const,
      checked: menuBarMode,
      click: (menuItem: Electron.MenuItem): void => {
        getStore().set('menuBarMode', menuItem.checked);
        // On macOS, also update dock visibility
        if (process.platform === 'darwin') {
          updateDockVisibility(menuItem.checked);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Eclosion',
      click: (): void => {
        setIsQuitting(true);
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Refresh the tray menu with the current relative time.
 * Called periodically to keep the "X ago" display up to date.
 */
function refreshTrayMenuTime(): void {
  if (!tray || !storedSyncClickHandler || !lastSyncIsoTimestamp) return;

  const timeAgo = formatRelativeTime(lastSyncIsoTimestamp);
  const syncStatus = `Last sync: ${timeAgo}`;
  updateTrayMenu(storedSyncClickHandler, syncStatus);
  updateHealthStatus(true, timeAgo);
}

/**
 * Start or restart the periodic refresh timer for the tray menu.
 * Refreshes every 30 seconds to keep the "X ago" display in sync with the app header.
 */
function startTrayRefreshTimer(): void {
  // Clear existing timer if any
  if (trayRefreshTimer) {
    clearInterval(trayRefreshTimer);
  }

  // Refresh every 30 seconds (same as frontend SyncButton)
  trayRefreshTimer = setInterval(refreshTrayMenuTime, 30000);
}

/**
 * Update tray menu sync status from an ISO timestamp.
 * Stores the timestamp and starts periodic refresh to keep time display current.
 */
export function updateTrayMenuSyncStatus(isoTimestamp: string): void {
  if (!tray || !storedSyncClickHandler) return;

  // Store the ISO timestamp for periodic refresh
  lastSyncIsoTimestamp = isoTimestamp;

  // Update immediately
  refreshTrayMenuTime();

  // Start/restart the refresh timer
  startTrayRefreshTimer();
}

/**
 * Update dock visibility on macOS based on menu bar mode.
 */
function updateDockVisibility(menuBarMode: boolean): void {
  if (process.platform === 'darwin' && app.dock) {
    if (menuBarMode) {
      app.dock.hide();
    } else {
      app.dock.show();
    }
  }
}

/**
 * Initialize dock visibility from stored preference.
 */
export function initializeDockVisibility(): void {
  if (process.platform === 'darwin') {
    // Use menuBarMode setting (default false = show in dock)
    const menuBarMode = getStore().get('menuBarMode', false) as boolean;
    updateDockVisibility(menuBarMode);
  }
}

/**
 * Show a native notification.
 */
export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: false,
    });

    notification.on('click', () => {
      showWindow();
    });

    notification.show();
  }
}

/**
 * Check if an error message indicates an auth/MFA failure.
 */
export function isAuthError(errorMessage: string | undefined): boolean {
  if (!errorMessage) return false;
  const lowerError = errorMessage.toLowerCase();
  return (
    lowerError.includes('mfa') ||
    lowerError.includes('multi-factor') ||
    lowerError.includes('2fa') ||
    lowerError.includes('session') ||
    lowerError.includes('expired') ||
    lowerError.includes('authentication') ||
    lowerError.includes('unauthorized')
  );
}

/**
 * Check if an error message indicates a rate limit.
 */
export function isRateLimitError(errorMessage: string | undefined): boolean {
  if (!errorMessage) return false;
  const lowerError = errorMessage.toLowerCase();
  return (
    lowerError.includes('rate limit') ||
    lowerError.includes('rate_limit') ||
    lowerError.includes('ratelimit') ||
    lowerError.includes('429') ||
    lowerError.includes('too many requests')
  );
}

/**
 * Show a re-authentication notification.
 * When clicked, opens the app and sends an IPC event to trigger the reauth modal.
 */
export function showReauthNotification(): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'Re-authentication Required',
      body: 'Your Monarch session has expired. Click to enter your MFA code.',
      silent: false,
    });

    notification.on('click', () => {
      showWindow();
      // Send IPC event to trigger reauth modal in the frontend
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('needs-reauth');
      }
    });

    notification.show();
  }
}

/**
 * Destroy the tray icon and clean up resources.
 */
export function destroyTray(): void {
  // Clean up the refresh timer
  if (trayRefreshTimer) {
    clearInterval(trayRefreshTimer);
    trayRefreshTimer = null;
  }

  tray?.destroy();
  tray = null;
}
