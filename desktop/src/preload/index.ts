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

  /**
   * Get current backend health status.
   */
  getHealthStatus: (): Promise<{ running: boolean; lastSync?: string }> =>
    ipcRenderer.invoke('get-health-status'),

  /**
   * Listen for backend status changes.
   */
  onBackendStatusChanged: (
    callback: (status: { running: boolean; lastSync?: string; timestamp: string }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      status: { running: boolean; lastSync?: string; timestamp: string }
    ): void => callback(status);
    ipcRenderer.on('backend-status-changed', handler);
    return () => ipcRenderer.removeListener('backend-status-changed', handler);
  },

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

  // =========================================================================
  // Desktop Settings
  // =========================================================================

  /**
   * Get desktop-specific settings (run in background, show in dock, auto-start).
   */
  getDesktopSettings: (): Promise<{
    runInBackground: boolean;
    showInDock: boolean;
    autoStart: boolean;
  }> => ipcRenderer.invoke('get-desktop-settings'),

  /**
   * Set whether to run in background when window is closed.
   */
  setRunInBackground: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('set-run-in-background', enabled),

  /**
   * Set dock visibility (macOS only).
   */
  setShowInDock: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('set-show-in-dock', enabled),

  /**
   * Get the state directory path.
   */
  getStateDir: (): Promise<string> => ipcRenderer.invoke('get-state-dir'),

  /**
   * Reveal the data folder in the system file manager.
   */
  revealDataFolder: (): Promise<void> => ipcRenderer.invoke('reveal-data-folder'),

  // =========================================================================
  // Log Viewer
  // =========================================================================

  /**
   * Get list of available log files.
   */
  getLogFiles: (): Promise<
    Array<{ name: string; path: string; size: number; modified: string }>
  > => ipcRenderer.invoke('get-log-files'),

  /**
   * Read log file contents.
   */
  readLogFile: (
    filePath: string,
    options?: { lines?: number; search?: string }
  ): Promise<{
    content?: string;
    totalLines?: number;
    displayedLines?: number;
    truncated?: boolean;
    error?: string;
  }> => ipcRenderer.invoke('read-log-file', filePath, options),

  // =========================================================================
  // Backup & Restore
  // =========================================================================

  /**
   * Create a backup of all application data and settings.
   */
  createBackup: (): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('create-backup'),

  /**
   * Restore application data and settings from a backup file.
   */
  restoreBackup: (): Promise<{
    success: boolean;
    error?: string;
    filesRestored?: number;
    settingsRestored?: boolean;
  }> => ipcRenderer.invoke('restore-backup'),

  /**
   * Get the warning message for creating a backup.
   */
  getBackupWarning: (): Promise<string> => ipcRenderer.invoke('get-backup-warning'),

  /**
   * Get the warning message for restoring a backup.
   */
  getRestoreWarning: (): Promise<string> => ipcRenderer.invoke('get-restore-warning'),

  // =========================================================================
  // Global Hotkeys
  // =========================================================================

  /**
   * Get all hotkey configurations.
   */
  getHotkeyConfigs: (): Promise<Record<string, { enabled: boolean; accelerator: string }>> =>
    ipcRenderer.invoke('get-hotkey-configs'),

  /**
   * Set a hotkey configuration.
   */
  setHotkeyConfig: (
    action: string,
    config: { enabled: boolean; accelerator: string }
  ): Promise<boolean> => ipcRenderer.invoke('set-hotkey-config', action, config),

  /**
   * Validate a keyboard shortcut.
   */
  validateShortcut: (accelerator: string, currentAction?: string): Promise<string | null> =>
    ipcRenderer.invoke('validate-shortcut', accelerator, currentAction),

  /**
   * Reset hotkeys to defaults.
   */
  resetHotkeys: (): Promise<void> => ipcRenderer.invoke('reset-hotkeys'),

  // =========================================================================
  // Onboarding
  // =========================================================================

  /**
   * Get onboarding data (whether to show, steps, version).
   */
  getOnboardingData: (): Promise<{
    shouldShow: boolean;
    steps: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      tip?: string;
    }>;
    version: number;
  }> => ipcRenderer.invoke('get-onboarding-data'),

  /**
   * Mark onboarding as complete.
   */
  completeOnboarding: (): Promise<void> => ipcRenderer.invoke('complete-onboarding'),

  /**
   * Reset onboarding (for testing or re-showing).
   */
  resetOnboarding: (): Promise<void> => ipcRenderer.invoke('reset-onboarding'),

  // =========================================================================
  // Startup Metrics
  // =========================================================================

  /**
   * Get startup performance metrics.
   */
  getStartupMetrics: (): Promise<{
    current: {
      totalStartup: number;
      appReady: number;
      backendStart: number;
      windowCreate: number;
      postWindow: number;
      timestamp: string;
      version: string;
    } | null;
    average: {
      totalStartup?: number;
      appReady?: number;
      backendStart?: number;
      windowCreate?: number;
      postWindow?: number;
    } | null;
    history: Array<{
      id: string;
      totalStartup: number;
      appReady: number;
      backendStart: number;
      windowCreate: number;
      postWindow: number;
      timestamp: string;
      version: string;
    }>;
  }> => ipcRenderer.invoke('get-startup-metrics'),

  /**
   * Clear startup metrics history.
   */
  clearStartupMetrics: (): Promise<void> => ipcRenderer.invoke('clear-startup-metrics'),

  // =========================================================================
  // Data Cleanup
  // =========================================================================

  /**
   * Show factory reset dialog and perform reset if confirmed.
   */
  showFactoryResetDialog: (): Promise<{
    confirmed: boolean;
    result?: {
      success: boolean;
      filesDeleted: string[];
      errors: string[];
    };
  }> => ipcRenderer.invoke('show-factory-reset-dialog'),

  /**
   * Get cleanup instructions for the current platform.
   */
  getCleanupInstructions: (): Promise<{
    platform: string;
    dataPath: string;
    instructions: string;
  }> => ipcRenderer.invoke('get-cleanup-instructions'),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Log that preload script has loaded
console.log('Preload script loaded');
