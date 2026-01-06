/**
 * Preload Script
 *
 * Runs in the renderer process before the web content loads.
 * Provides a secure bridge between the renderer and main processes.
 * Uses contextBridge to expose a limited API without enabling full Node.js access.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Electron API exposed to the renderer process.
 */
const electronAPI = {
  // =========================================================================
  // Backend Communication
  // =========================================================================

  /**
   * Get the port the backend is running on.
   */
  getBackendPort: (): Promise<number> => ipcRenderer.invoke('get-backend-port'),

  /**
   * Get backend status (running and port).
   */
  getBackendStatus: (): Promise<{ running: boolean; port: number }> =>
    ipcRenderer.invoke('get-backend-status'),

  /**
   * Trigger a manual sync.
   */
  triggerSync: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('trigger-sync'),

  // =========================================================================
  // Auto-Start
  // =========================================================================

  /**
   * Get auto-start status.
   */
  getAutoStartStatus: (): Promise<boolean> => ipcRenderer.invoke('get-autostart-status'),

  /**
   * Set auto-start state.
   */
  setAutoStart: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('set-autostart', enabled),

  // =========================================================================
  // Updates
  // =========================================================================

  /**
   * Check for updates.
   */
  checkForUpdates: (): Promise<{ updateAvailable: boolean; version?: string }> =>
    ipcRenderer.invoke('check-for-updates'),

  /**
   * Get current update status.
   */
  getUpdateStatus: (): Promise<{
    updateAvailable: boolean;
    updateDownloaded: boolean;
    updateInfo: unknown;
    currentVersion: string;
    channel: 'stable' | 'beta';
  }> => ipcRenderer.invoke('get-update-status'),

  /**
   * Set update channel.
   */
  setUpdateChannel: (channel: 'stable' | 'beta'): Promise<'stable' | 'beta'> =>
    ipcRenderer.invoke('set-update-channel', channel),

  /**
   * Get update channel.
   */
  getUpdateChannel: (): Promise<'stable' | 'beta'> => ipcRenderer.invoke('get-update-channel'),

  /**
   * Quit and install pending update.
   */
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('quit-and-install'),

  /**
   * Listen for update events.
   */
  onUpdateAvailable: (callback: (info: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: unknown): void => callback(info);
    ipcRenderer.on('updater:update-available', handler);
    return () => ipcRenderer.removeListener('updater:update-available', handler);
  },

  onUpdateDownloaded: (callback: (info: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: unknown): void => callback(info);
    ipcRenderer.on('updater:update-downloaded', handler);
    return () => ipcRenderer.removeListener('updater:update-downloaded', handler);
  },

  onUpdateProgress: (callback: (progress: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown): void =>
      callback(progress);
    ipcRenderer.on('updater:update-progress', handler);
    return () => ipcRenderer.removeListener('updater:update-progress', handler);
  },

  onUpdateError: (callback: (error: { message: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: { message: string }): void =>
      callback(error);
    ipcRenderer.on('updater:update-error', handler);
    return () => ipcRenderer.removeListener('updater:update-error', handler);
  },

  // =========================================================================
  // Native Dialogs
  // =========================================================================

  /**
   * Show a native confirmation dialog.
   */
  showConfirmDialog: (options: {
    title: string;
    message: string;
    detail?: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> => ipcRenderer.invoke('show-confirm-dialog', options),

  /**
   * Show a native error dialog.
   */
  showErrorDialog: (options: { title: string; content: string }): Promise<void> =>
    ipcRenderer.invoke('show-error-dialog', options),

  // =========================================================================
  // App Info
  // =========================================================================

  /**
   * Get app information.
   */
  getAppInfo: (): Promise<{
    version: string;
    platform: string;
    arch: string;
    isPackaged: boolean;
    name: string;
  }> => ipcRenderer.invoke('get-app-info'),

  /**
   * Check if running in desktop mode.
   */
  isDesktop: (): Promise<boolean> => ipcRenderer.invoke('is-desktop'),

  // =========================================================================
  // Navigation (from main process)
  // =========================================================================

  /**
   * Listen for navigation requests from the main process.
   */
  onNavigate: (callback: (path: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string): void => callback(path);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Log that preload script has loaded
console.log('Preload script loaded');
