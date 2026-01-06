/**
 * IPC Handlers
 *
 * Handles inter-process communication between main and renderer processes.
 */

import { ipcMain, dialog, app } from 'electron';
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
}
