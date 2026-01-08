/**
 * System Tray
 *
 * Manages the system tray icon and context menu.
 */

import { Tray, Menu, nativeImage, app, Notification } from 'electron';
import path from 'path';
import { getMainWindow, showWindow, toggleWindow, setIsQuitting } from './window';
import Store from 'electron-store';

const store = new Store();

let tray: Tray | null = null;

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
 */
function getTrayIconPath(): string {
  const assetsPath = path.join(__dirname, '../../assets/tray');

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
   * The click behavior intentionally varies by platform to match user expectations:
   *
   * - **macOS & Linux**: Single click toggles window visibility. This is the standard
   *   behavior for menu bar apps on macOS. Linux follows the same pattern since most
   *   desktop environments (GNOME, KDE) behave similarly.
   *
   * - **Windows**: Single click toggles window, BUT double-click is also supported
   *   to show/focus the window. Windows users traditionally expect double-click on
   *   tray icons to open the associated application (like double-clicking a shortcut).
   *
   * Note: Right-click opens the context menu on all platforms (handled automatically
   * by Electron via setContextMenu).
   *
   * Why not unify? Platform conventions differ significantly:
   * - macOS menu bar apps rarely support double-click
   * - Windows tray apps almost always support double-click
   * - Matching platform expectations improves usability
   */
  tray.on('click', () => {
    toggleWindow();
  });

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

  const runInBackground = store.get('runInBackground', false) as boolean;
  const showInDock = store.get('showInDock', true) as boolean;

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
      label: 'Run in Background',
      type: 'checkbox' as const,
      checked: runInBackground,
      click: (menuItem: Electron.MenuItem): void => {
        store.set('runInBackground', menuItem.checked);
      },
    },
    // "Show in Dock" is macOS-only because:
    // - macOS has a distinct dock API (app.dock.show/hide) allowing "menu bar only" apps
    // - Windows has no equivalent - apps show in taskbar when running, no hide API
    // - Linux behavior varies by desktop environment (GNOME, KDE, etc.)
    ...(process.platform === 'darwin'
      ? [
          {
            label: 'Show in Dock',
            type: 'checkbox' as const,
            checked: showInDock,
            click: (menuItem: Electron.MenuItem): void => {
              store.set('showInDock', menuItem.checked);
              updateDockVisibility(!menuItem.checked);
            },
          },
        ]
      : []),
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
    // Use showInDock setting (default true = show dock)
    const showInDock = store.get('showInDock', true) as boolean;
    updateDockVisibility(!showInDock);
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
 * Destroy the tray icon.
 */
export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
