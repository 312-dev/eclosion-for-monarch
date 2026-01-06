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

  // Click behavior varies by platform
  tray.on('click', () => {
    toggleWindow();
  });

  // Double-click on Windows
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
