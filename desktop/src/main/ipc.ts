/**
 * IPC Handlers
 *
 * Handles inter-process communication between main and renderer processes.
 */

import { ipcMain, dialog, app, shell } from 'electron';
import path from 'path';
import { BackendManager } from './backend';
import { getMainWindow } from './window';
import {
  isAutoStartEnabled,
  setAutoStart,
} from './autostart';
import {
  checkForUpdates,
  quitAndInstall,
  getUpdateStatus,
  setUpdateChannel,
  getUpdateChannel,
} from './updater';
import Store from 'electron-store';

const store = new Store();

/**
 * Setup all IPC handlers.
 */
export function setupIpcHandlers(backendManager: BackendManager): void {
  // =========================================================================
  // Backend Communication
  // =========================================================================

  /**
   * Get the port the backend is running on.
   */
  ipcMain.handle('get-backend-port', () => {
    return backendManager.getPort();
  });

  /**
   * Check if backend is running.
   */
  ipcMain.handle('get-backend-status', () => {
    return {
      running: backendManager.isRunning(),
      port: backendManager.getPort(),
    };
  });

  /**
   * Trigger a manual sync.
   */
  ipcMain.handle('trigger-sync', async () => {
    return backendManager.triggerSync();
  });

  // =========================================================================
  // Auto-Start
  // =========================================================================

  /**
   * Get auto-start status.
   */
  ipcMain.handle('get-autostart-status', async () => {
    return isAutoStartEnabled();
  });

  /**
   * Set auto-start state.
   */
  ipcMain.handle('set-autostart', async (_event, enabled: boolean) => {
    return setAutoStart(enabled);
  });

  // =========================================================================
  // Updates
  // =========================================================================

  /**
   * Check for updates.
   */
  ipcMain.handle('check-for-updates', async () => {
    return checkForUpdates();
  });

  /**
   * Get current update status.
   */
  ipcMain.handle('get-update-status', () => {
    return getUpdateStatus();
  });

  /**
   * Set update channel.
   */
  ipcMain.handle('set-update-channel', (_event, channel: 'stable' | 'beta') => {
    setUpdateChannel(channel);
    return getUpdateChannel();
  });

  /**
   * Get update channel.
   */
  ipcMain.handle('get-update-channel', () => {
    return getUpdateChannel();
  });

  /**
   * Quit and install pending update.
   */
  ipcMain.handle('quit-and-install', () => {
    quitAndInstall();
  });

  // =========================================================================
  // Native Dialogs
  // =========================================================================

  /**
   * Show a native confirmation dialog.
   */
  ipcMain.handle(
    'show-confirm-dialog',
    async (
      _event,
      options: {
        title: string;
        message: string;
        detail?: string;
        confirmText?: string;
        cancelText?: string;
      }
    ) => {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return false;
      }
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: [options.cancelText || 'Cancel', options.confirmText || 'Confirm'],
        defaultId: 0,
        cancelId: 0,
        title: options.title,
        message: options.message,
        detail: options.detail,
      });
      return result.response === 1;
    }
  );

  /**
   * Show a native error dialog.
   */
  ipcMain.handle(
    'show-error-dialog',
    async (_event, options: { title: string; content: string }) => {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return;
      }
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: options.title,
        message: options.content,
      });
    }
  );

  // =========================================================================
  // App Info
  // =========================================================================

  /**
   * Get app information.
   */
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
      name: app.getName(),
    };
  });

  /**
   * Check if running in desktop mode.
   */
  ipcMain.handle('is-desktop', () => {
    return true;
  });

  // =========================================================================
  // Desktop Settings
  // =========================================================================

  /**
   * Get desktop-specific settings.
   */
  ipcMain.handle('get-desktop-settings', async () => {
    const autoStart = await isAutoStartEnabled();
    return {
      runInBackground: store.get('runInBackground', false) as boolean,
      showInDock: store.get('showInDock', true) as boolean,
      autoStart,
    };
  });

  /**
   * Set whether to run in background when window is closed.
   */
  ipcMain.handle('set-run-in-background', (_event, enabled: boolean) => {
    store.set('runInBackground', enabled);
    return enabled;
  });

  /**
   * Set dock visibility (macOS only).
   */
  ipcMain.handle('set-show-in-dock', (_event, enabled: boolean) => {
    if (process.platform === 'darwin') {
      store.set('showInDock', enabled);
      if (app.dock) {
        if (enabled) {
          app.dock.show();
        } else {
          app.dock.hide();
        }
      }
    }
    return enabled;
  });

  /**
   * Get the state directory path.
   */
  ipcMain.handle('get-state-dir', () => {
    const appName = 'Eclosion';
    switch (process.platform) {
      case 'darwin':
        return path.join(app.getPath('home'), 'Library', 'Application Support', appName);
      case 'win32':
        return path.join(app.getPath('appData'), appName);
      default:
        return path.join(app.getPath('home'), '.config', appName.toLowerCase());
    }
  });

  /**
   * Reveal the data folder in the system file manager.
   */
  ipcMain.handle('reveal-data-folder', () => {
    const appName = 'Eclosion';
    let stateDir: string;
    switch (process.platform) {
      case 'darwin':
        stateDir = path.join(app.getPath('home'), 'Library', 'Application Support', appName);
        break;
      case 'win32':
        stateDir = path.join(app.getPath('appData'), appName);
        break;
      default:
        stateDir = path.join(app.getPath('home'), '.config', appName.toLowerCase());
    }
    shell.openPath(stateDir);
  });
}
