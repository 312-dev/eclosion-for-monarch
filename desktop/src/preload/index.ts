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
   * Get the runtime secret for API authentication.
   * Must be included in X-Desktop-Secret header for all API requests.
   */
  getDesktopSecret: (): Promise<string> => ipcRenderer.invoke('get-desktop-secret'),

  /**
   * Get backend status (running and port).
   */
  getBackendStatus: (): Promise<{ running: boolean; port: number }> =>
    ipcRenderer.invoke('get-backend-status'),

  /**
   * Check if backend startup has completed.
   */
  isBackendStartupComplete: (): Promise<boolean> =>
    ipcRenderer.invoke('get-backend-startup-complete'),

  /**
   * Listen for backend startup status updates.
   */
  onBackendStartupStatus: (
    callback: (status: {
      phase: 'initializing' | 'spawning' | 'waiting_for_health' | 'ready' | 'failed';
      message: string;
      progress: number;
      error?: string;
    }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      status: {
        phase: 'initializing' | 'spawning' | 'waiting_for_health' | 'ready' | 'failed';
        message: string;
        progress: number;
        error?: string;
      }
    ): void => callback(status);
    ipcRenderer.on('backend-startup-status', handler);
    return () => ipcRenderer.removeListener('backend-startup-status', handler);
  },

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
   * Get update channel (build-time determined, no switching).
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
   * Get desktop-specific settings (menu bar mode, auto-start).
   */
  getDesktopSettings: (): Promise<{
    menuBarMode: boolean;
    autoStart: boolean;
  }> => ipcRenderer.invoke('get-desktop-settings'),

  /**
   * Set menu bar mode (run in background + hide from dock on macOS).
   */
  setMenuBarMode: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('set-menu-bar-mode', enabled),

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

  // =========================================================================
  // Biometric Authentication
  // =========================================================================

  /**
   * Biometric authentication API for Touch ID (macOS) and Windows Hello.
   */
  biometric: {
    /**
     * Check if biometric authentication is available on this device.
     */
    isAvailable: (): Promise<boolean> => ipcRenderer.invoke('biometric:is-available'),

    /**
     * Get the type of biometric authentication available.
     */
    getType: (): Promise<'touchId' | 'windowsHello' | null> =>
      ipcRenderer.invoke('biometric:get-type'),

    /**
     * Get a user-friendly display name for the biometric type.
     */
    getDisplayName: (): Promise<string> => ipcRenderer.invoke('biometric:get-display-name'),

    /**
     * Check if biometric authentication is enrolled (passphrase stored).
     */
    isEnrolled: (): Promise<boolean> => ipcRenderer.invoke('biometric:is-enrolled'),

    /**
     * Enroll biometric authentication by storing the passphrase securely.
     */
    enroll: (passphrase: string): Promise<boolean> =>
      ipcRenderer.invoke('biometric:enroll', passphrase),

    /**
     * Authenticate using biometric and retrieve the stored passphrase.
     */
    authenticate: (): Promise<{
      success: boolean;
      passphrase?: string;
      error?: string;
    }> => ipcRenderer.invoke('biometric:authenticate'),

    /**
     * Clear biometric enrollment (remove stored passphrase).
     */
    clear: (): Promise<void> => ipcRenderer.invoke('biometric:clear'),

    /**
     * Get the stored passphrase without prompting for biometric.
     * Used for auto-sync when biometric is enrolled.
     */
    getStoredPassphrase: (): Promise<string | null> =>
      ipcRenderer.invoke('biometric:get-stored-passphrase'),

    /**
     * Check if a passphrase is stored (for sync, regardless of biometric status).
     */
    isPassphraseStored: (): Promise<boolean> =>
      ipcRenderer.invoke('biometric:is-passphrase-stored'),

    /**
     * Store passphrase for background sync (without enabling biometric unlock).
     */
    storeForSync: (passphrase: string): Promise<boolean> =>
      ipcRenderer.invoke('biometric:store-for-sync', passphrase),

    /**
     * Prompt Touch ID during setup to verify user can use it.
     * Does NOT store anything - just verifies biometric works.
     */
    promptForSetup: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('biometric:prompt-for-setup'),

    /**
     * Validate credentials for fallback authentication when Touch ID fails.
     * Compares against stored credentials (works offline).
     */
    validateFallback: (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('biometric:validate-fallback', email, password),
  },

  // =========================================================================
  // Desktop Mode: Direct Credential Storage
  // =========================================================================

  /**
   * Credential storage API for desktop mode.
   * Stores Monarch credentials directly in OS keychain (no passphrase needed).
   */
  credentials: {
    /**
     * Store Monarch credentials in secure storage.
     */
    store: (credentials: {
      email: string;
      password: string;
      mfaSecret?: string;
      mfaMode?: 'secret' | 'code';
    }): Promise<boolean> => ipcRenderer.invoke('credentials:store', credentials),

    /**
     * Get stored Monarch credentials.
     */
    get: (): Promise<{
      email: string;
      password: string;
      mfaSecret?: string;
      mfaMode?: 'secret' | 'code';
    } | null> => ipcRenderer.invoke('credentials:get'),

    /**
     * Check if Monarch credentials are stored.
     */
    has: (): Promise<boolean> => ipcRenderer.invoke('credentials:has'),

    /**
     * Clear stored Monarch credentials.
     */
    clear: (): Promise<void> => ipcRenderer.invoke('credentials:clear'),

    /**
     * Get the "Require Touch ID to unlock" setting.
     */
    getRequireTouchId: (): Promise<boolean> =>
      ipcRenderer.invoke('credentials:get-require-touch-id'),

    /**
     * Set the "Require Touch ID to unlock" setting.
     */
    setRequireTouchId: (required: boolean): Promise<void> =>
      ipcRenderer.invoke('credentials:set-require-touch-id', required),

    /**
     * Authenticate and get credentials with optional Touch ID.
     * If "Require Touch ID" is enabled, prompts for biometric.
     */
    authenticate: (): Promise<{
      success: boolean;
      credentials?: {
        email: string;
        password: string;
        mfaSecret?: string;
      };
      error?: string;
    }> => ipcRenderer.invoke('credentials:authenticate'),

    /**
     * Clear all auth data (both desktop and legacy modes).
     */
    clearAll: (): Promise<void> => ipcRenderer.invoke('credentials:clear-all'),
  },

  // =========================================================================
  // Lock Management
  // =========================================================================

  /**
   * Lock management API for configuring auto-lock behavior.
   */
  lock: {
    /**
     * Get the current lock trigger setting.
     */
    getTrigger: (): Promise<string> => ipcRenderer.invoke('lock:get-trigger'),

    /**
     * Set the lock trigger setting.
     */
    setTrigger: (trigger: string): Promise<void> =>
      ipcRenderer.invoke('lock:set-trigger', trigger),

    /**
     * Get available lock trigger options with labels.
     */
    getOptions: (): Promise<Array<{ value: string; label: string }>> =>
      ipcRenderer.invoke('lock:get-options'),

    /**
     * Manually lock the app.
     */
    lockApp: (): Promise<void> => ipcRenderer.invoke('lock:lock-app'),

    /**
     * Listen for app lock events from the main process.
     */
    onLocked: (callback: (data: { reason: string }) => void): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { reason: string }
      ): void => callback(data);
      ipcRenderer.on('app:locked', handler);
      return () => ipcRenderer.removeListener('app:locked', handler);
    },
  },

  // =========================================================================
  // Pending Sync (for menu-triggered sync when locked)
  // =========================================================================

  /**
   * Pending sync API for handling sync requests that require authentication first.
   */
  pendingSync: {
    /**
     * Check if there's a pending sync waiting for authentication.
     */
    hasPending: (): Promise<boolean> => ipcRenderer.invoke('sync:has-pending'),

    /**
     * Clear the pending sync state.
     */
    clearPending: (): Promise<void> => ipcRenderer.invoke('sync:clear-pending'),

    /**
     * Execute pending sync after authentication.
     * Call this after successful login/unlock with the passphrase.
     */
    executePending: (passphrase: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync:execute-pending', passphrase),

    /**
     * Listen for pending sync requests from the main process.
     * Triggered when user clicks "Sync Now" from menu while locked.
     */
    onSyncPending: (callback: () => void): (() => void) => {
      const handler = (): void => callback();
      ipcRenderer.on('sync:pending', handler);
      return () => ipcRenderer.removeListener('sync:pending', handler);
    },

    /**
     * Notify main process that a sync completed.
     * Updates the tray menu to show the correct sync time.
     * Call this after a successful sync from the frontend.
     */
    notifyCompleted: (lastSyncIso: string): Promise<void> =>
      ipcRenderer.invoke('sync:notify-completed', lastSyncIso),
  },

  // =========================================================================
  // Re-authentication
  // =========================================================================

  /**
   * Re-authentication API for handling expired MFA sessions.
   */
  reauth: {
    /**
     * Listen for re-authentication requests from the main process.
     * Triggered when sync fails due to expired MFA session.
     */
    onNeedsReauth: (callback: () => void): (() => void) => {
      const handler = (): void => callback();
      ipcRenderer.on('needs-reauth', handler);
      return () => ipcRenderer.removeListener('needs-reauth', handler);
    },

    /**
     * Listen for MFA required events during session restore.
     * Triggered when stored credentials need MFA re-entry (e.g., 6-digit code users on restart).
     */
    onMfaRequired: (
      callback: (data: { email: string; mfaMode: 'secret' | 'code' }) => void
    ): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { email: string; mfaMode: 'secret' | 'code' }
      ): void => callback(data);
      ipcRenderer.on('auth:mfa-required', handler);
      return () => ipcRenderer.removeListener('auth:mfa-required', handler);
    },

    /**
     * Submit MFA code to complete session restore.
     * Used when session restore requires MFA re-entry.
     */
    submitMfaCode: (
      mfaCode: string,
      mfaMode: 'secret' | 'code'
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('auth:submit-mfa-code', mfaCode, mfaMode),
  },

  // =========================================================================
  // Rate Limiting
  // =========================================================================

  /**
   * Rate limit API for handling Monarch API rate limiting.
   */
  rateLimit: {
    /**
     * Listen for rate limit events from the main process.
     * Triggered when Monarch API returns 429 during session restore or sync.
     */
    onRateLimited: (callback: (data: { retryAfter: number }) => void): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { retryAfter: number }
      ): void => callback(data);
      ipcRenderer.on('monarch-rate-limited', handler);
      return () => ipcRenderer.removeListener('monarch-rate-limited', handler);
    },
  },

  // =========================================================================
  // Lockout State (failed login attempts)
  // =========================================================================

  /**
   * Lockout state API for persisting failed login attempts across sessions.
   */
  lockout: {
    /**
     * Get current lockout state.
     */
    getState: (): Promise<{ failedAttempts: number; cooldownUntil: number | null }> =>
      ipcRenderer.invoke('lockout:get-state'),

    /**
     * Set lockout state.
     */
    setState: (state: { failedAttempts: number; cooldownUntil: number | null }): Promise<void> =>
      ipcRenderer.invoke('lockout:set-state', state),

    /**
     * Clear lockout state (reset failed attempts).
     */
    clear: (): Promise<void> => ipcRenderer.invoke('lockout:clear'),
  },

  // =========================================================================
  // Periodic Sync (scheduled sync while app is running)
  // =========================================================================

  /**
   * Periodic sync API for configuring scheduled sync intervals.
   */
  periodicSync: {
    /**
     * Get current periodic sync settings.
     */
    getSettings: (): Promise<{ enabled: boolean; intervalMinutes: number }> =>
      ipcRenderer.invoke('periodic-sync:get-settings'),

    /**
     * Get available sync interval options.
     */
    getIntervals: (): Promise<Array<{ value: number; label: string }>> =>
      ipcRenderer.invoke('periodic-sync:get-intervals'),

    /**
     * Enable or disable periodic sync.
     */
    setEnabled: (enabled: boolean): Promise<{ enabled: boolean; intervalMinutes: number }> =>
      ipcRenderer.invoke('periodic-sync:set-enabled', enabled),

    /**
     * Set the sync interval.
     */
    setInterval: (intervalMinutes: number): Promise<{ enabled: boolean; intervalMinutes: number }> =>
      ipcRenderer.invoke('periodic-sync:set-interval', intervalMinutes),
  },

  // =========================================================================
  // Background Sync (sync when app is closed)
  // =========================================================================

  /**
   * Background sync API for configuring system-level scheduled sync.
   */
  backgroundSync: {
    /**
     * Get current background sync status.
     */
    getStatus: (): Promise<{ installed: boolean; intervalMinutes: number }> =>
      ipcRenderer.invoke('background-sync:get-status'),

    /**
     * Get available sync interval options.
     */
    getIntervals: (): Promise<Array<{ value: number; label: string }>> =>
      ipcRenderer.invoke('background-sync:get-intervals'),

    /**
     * Enable background sync with the specified interval.
     */
    enable: (
      intervalMinutes: number,
      passphrase: string
    ): Promise<{ success: boolean; intervalMinutes?: number; error?: string }> =>
      ipcRenderer.invoke('background-sync:enable', intervalMinutes, passphrase),

    /**
     * Disable background sync.
     */
    disable: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('background-sync:disable'),

    /**
     * Set the sync interval (must be enabled first).
     */
    setInterval: (
      intervalMinutes: number
    ): Promise<{ success: boolean; intervalMinutes?: number; error?: string }> =>
      ipcRenderer.invoke('background-sync:set-interval', intervalMinutes),
  },

  // =========================================================================
  // Auto-Backup
  // =========================================================================

  /**
   * Auto-backup API for managing encrypted daily backups.
   */
  autoBackup: {
    /**
     * Get current auto-backup settings.
     */
    getSettings: (): Promise<{
      enabled: boolean;
      folderPath: string | null;
      retentionDays: number;
      lastBackupDate: string | null;
    }> => ipcRenderer.invoke('auto-backup:get-settings'),

    /**
     * Enable or disable auto-backup.
     */
    setEnabled: (enabled: boolean): Promise<void> =>
      ipcRenderer.invoke('auto-backup:set-enabled', enabled),

    /**
     * Open folder selection dialog.
     * Returns the selected path or null if cancelled.
     */
    selectFolder: (): Promise<string | null> =>
      ipcRenderer.invoke('auto-backup:select-folder'),

    /**
     * Open the backup folder in the system file manager.
     */
    openFolder: (): Promise<void> => ipcRenderer.invoke('auto-backup:open-folder'),

    /**
     * Set retention period in days.
     */
    setRetention: (days: number): Promise<void> =>
      ipcRenderer.invoke('auto-backup:set-retention', days),

    /**
     * Get available retention options.
     */
    getRetentionOptions: (): Promise<Array<{ value: number; label: string }>> =>
      ipcRenderer.invoke('auto-backup:get-retention-options'),

    /**
     * Run a backup now.
     */
    runNow: (): Promise<{ success: boolean; filePath?: string; error?: string }> =>
      ipcRenderer.invoke('auto-backup:run-now'),

    /**
     * List available backups in the configured folder.
     */
    listBackups: (): Promise<
      Array<{
        filename: string;
        filePath: string;
        date: string;
        createdAt: string;
        sizeBytes: number;
      }>
    > => ipcRenderer.invoke('auto-backup:list-backups'),

    /**
     * Get backup file info for preview.
     */
    getInfo: (
      filePath: string
    ): Promise<{ valid: boolean; version?: number; createdAt?: string; error?: string }> =>
      ipcRenderer.invoke('auto-backup:get-info', filePath),

    /**
     * Restore from a backup file.
     * If passphrase is not provided, uses current Monarch credentials.
     */
    restore: (
      filePath: string,
      passphrase?: string
    ): Promise<{
      success: boolean;
      needsCredentials: boolean;
      imported?: Record<string, boolean>;
      warnings?: string[];
      error?: string;
    }> => ipcRenderer.invoke('auto-backup:restore', filePath, passphrase),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Log that preload script has loaded
console.log('Preload script loaded');
