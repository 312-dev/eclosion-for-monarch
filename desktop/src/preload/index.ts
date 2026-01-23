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
   * Get auto-update enabled setting.
   */
  getAutoUpdateEnabled: (): Promise<boolean> => ipcRenderer.invoke('get-auto-update-enabled'),

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
   * Get desktop-specific settings.
   */
  getDesktopSettings: (): Promise<{
    launchAtLogin: boolean;
    startMinimized: boolean;
    showInTaskbar: boolean;
  }> => ipcRenderer.invoke('get-desktop-settings'),

  /**
   * Set a single desktop setting.
   * Handles side effects for launchAtLogin and showInDock.
   */
  setDesktopSetting: (key: string, value: boolean | string): Promise<boolean> =>
    ipcRenderer.invoke('set-desktop-setting', key, value),

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
  // Diagnostics
  // =========================================================================

  /**
   * Get shareable diagnostics for email support.
   * Returns redacted (PII-stripped) diagnostics suitable for email body.
   */
  getShareableDiagnostics: (): Promise<string> =>
    ipcRenderer.invoke('get-shareable-diagnostics'),

  /**
   * Open email with diagnostics attachment.
   * On macOS: Opens Mail with attachment via AppleScript.
   * On other platforms: Saves file and opens it for manual attachment.
   */
  openEmailWithDiagnostics: (
    subject: string,
    recipient: string
  ): Promise<{
    success: boolean;
    method: 'native' | 'manual';
    filePath?: string;
    filename?: string;
    error?: string;
  }> => ipcRenderer.invoke('open-email-with-diagnostics', subject, recipient),

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
     * Validate password for fallback authentication when Touch ID fails.
     * Compares against stored credentials (works offline).
     */
    validateFallback: (password: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('biometric:validate-fallback', password),
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
     * Get the "Require biometric to unlock" setting.
     */
    getRequireBiometric: (): Promise<boolean> =>
      ipcRenderer.invoke('credentials:get-require-biometric'),

    /**
     * Set the "Require biometric to unlock" setting.
     */
    setRequireBiometric: (required: boolean): Promise<void> =>
      ipcRenderer.invoke('credentials:set-require-biometric', required),

    /**
     * Authenticate and get credentials with optional biometric.
     * If "Require biometric" is enabled, prompts for Touch ID/Windows Hello.
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

    /**
     * Get or create the notes encryption key.
     * Used to encrypt notes content on the backend in desktop mode.
     */
    getNotesKey: (): Promise<string> => ipcRenderer.invoke('credentials:get-notes-key'),
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
      scheduledTime: string;
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
     * Set scheduled backup time (HH:MM format, 24-hour).
     */
    setScheduledTime: (time: string): Promise<void> =>
      ipcRenderer.invoke('auto-backup:set-scheduled-time', time),

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

  // =========================================================================
  // Loading Screen Signal
  // =========================================================================

  /**
   * Signal to main process that the loading screen is visible and rendered.
   * This allows the main process to wait for the UI to be ready before starting
   * heavy background work (backend, migrations, etc.).
   */
  signalLoadingReady: (): void => ipcRenderer.send('loading-screen-ready'),

  // =========================================================================
  // Window Mode (compact/full)
  // =========================================================================

  /**
   * Window mode API for switching between compact and full window sizes.
   * - 'compact': Small, centered window for loading/login screens
   * - 'full': Restores previous window bounds for main app
   */
  windowMode: {
    /**
     * Set the window mode.
     * Call setMode('full') when the main app content is ready.
     */
    setMode: (mode: 'compact' | 'full'): Promise<void> =>
      ipcRenderer.invoke('window:set-mode', mode),

    /**
     * Get the current window mode.
     */
    getMode: (): Promise<'compact' | 'full'> => ipcRenderer.invoke('window:get-mode'),

    /**
     * Dynamically resize the compact window based on content height.
     * Only works in compact mode. The height is clamped to min/max bounds
     * and respects the user's screen size.
     * @param height - The desired content height in pixels
     * @returns The actual height applied (after clamping)
     */
    setCompactSize: (height: number): Promise<number> =>
      ipcRenderer.invoke('window:set-compact-size', height),
  },

  // =========================================================================
  // Menu Management (macOS only)
  // =========================================================================

  /**
   * Menu API for switching between minimal and full application menus.
   * On macOS, shows minimal menu before login, full menu after.
   * On Windows/Linux, no menu bar is shown.
   */
  menu: {
    /**
     * Switch to the full application menu (after login).
     * Shows all menu options: File, Edit, View, Toolkit, Window, Help.
     */
    setFull: (): Promise<void> => ipcRenderer.invoke('menu:set-full'),

    /**
     * Switch to the minimal application menu (after logout/lock).
     * Shows only essential options: About, Edit, Window, basic Help.
     */
    setMinimal: (): Promise<void> => ipcRenderer.invoke('menu:set-minimal'),
  },

  // =========================================================================
  // Bookmarks
  // =========================================================================

  /**
   * Bookmark sync API for reading browser bookmarks.
   * Supports Chrome, Edge, Brave, and Safari.
   */
  bookmarks: {
    /**
     * Detect installed browsers with accessible bookmark files.
     */
    detectBrowsers: (): Promise<
      Array<{
        type: 'chrome' | 'edge' | 'brave' | 'safari';
        displayName: string;
        bookmarkFilePath: string;
        accessible: boolean;
        permissionStatus: 'granted' | 'denied' | 'not_required' | 'unknown';
        error?: string;
      }>
    > => ipcRenderer.invoke('bookmarks:detect-browsers'),

    /**
     * Get the full bookmark tree for a browser.
     */
    getBookmarkTree: (
      browserType: 'chrome' | 'edge' | 'brave' | 'safari'
    ): Promise<{
      id: string;
      name: string;
      type: 'url' | 'folder';
      url?: string;
      dateAdded?: string;
      parentId?: string;
      children?: unknown[];
    } | null> => ipcRenderer.invoke('bookmarks:get-tree', browserType),

    /**
     * Get flat list of folders for selection UI.
     */
    getFolders: (
      browserType: 'chrome' | 'edge' | 'brave' | 'safari'
    ): Promise<
      Array<{
        id: string;
        name: string;
        path: string;
        bookmarkCount: number;
        subfolderCount: number;
      }>
    > => ipcRenderer.invoke('bookmarks:get-folders', browserType),

    /**
     * Get hierarchical folder tree for selection UI.
     */
    getFolderTree: (
      browserType: 'chrome' | 'edge' | 'brave' | 'safari'
    ): Promise<
      Array<{
        id: string;
        name: string;
        bookmarkCount: number;
        totalBookmarkCount: number;
        children: unknown[];
      }>
    > => ipcRenderer.invoke('bookmarks:get-folder-tree', browserType),

    /**
     * Request permission to access bookmarks (mainly for Safari on macOS).
     */
    requestPermission: (
      browserType: 'chrome' | 'edge' | 'brave' | 'safari'
    ): Promise<{
      granted: boolean;
      requiresManualGrant: boolean;
      instructions?: string;
    }> => ipcRenderer.invoke('bookmarks:request-permission', browserType),

    /**
     * Save sync configuration for a browser.
     */
    saveConfig: (config: {
      browserType: 'chrome' | 'edge' | 'brave' | 'safari';
      selectedFolderIds: string[];
      enabled: boolean;
      lastSyncAt?: string;
    }): Promise<void> => ipcRenderer.invoke('bookmarks:save-config', config),

    /**
     * Get all sync configurations.
     */
    getConfigs: (): Promise<
      Array<{
        browserType: 'chrome' | 'edge' | 'brave' | 'safari';
        selectedFolderIds: string[];
        enabled: boolean;
        lastSyncAt?: string;
      }>
    > => ipcRenderer.invoke('bookmarks:get-configs'),

    /**
     * Perform sync for a specific browser, optionally filtering to specific folders.
     */
    sync: (
      browserType: 'chrome' | 'edge' | 'brave' | 'safari',
      folderIds?: string[]
    ): Promise<{
      success: boolean;
      changes: Array<{
        changeType: 'added' | 'modified' | 'deleted';
        bookmark: {
          id: string;
          name: string;
          type: 'url' | 'folder';
          url?: string;
          dateAdded?: string;
          parentId?: string;
        };
        previousName?: string;
        previousUrl?: string;
      }>;
      totalBookmarks: number;
      syncedAt: string;
      error?: string;
    }> => ipcRenderer.invoke('bookmarks:sync', browserType, folderIds),

    /**
     * Perform sync for all enabled browsers.
     */
    syncAll: (): Promise<
      Array<{
        browserType: 'chrome' | 'edge' | 'brave' | 'safari';
        success: boolean;
        changes: unknown[];
        totalBookmarks: number;
        syncedAt: string;
        error?: string;
      }>
    > => ipcRenderer.invoke('bookmarks:sync-all'),

    /**
     * Start watching bookmark files for changes.
     */
    startWatcher: (): Promise<void> => ipcRenderer.invoke('bookmarks:start-watcher'),

    /**
     * Stop watching bookmark files.
     */
    stopWatcher: (): Promise<void> => ipcRenderer.invoke('bookmarks:stop-watcher'),

    /**
     * Listen for bookmark change events from the watcher.
     */
    onBookmarkChange: (
      callback: (change: {
        browserType: 'chrome' | 'edge' | 'brave' | 'safari';
        changeType: 'added' | 'modified' | 'deleted';
        bookmark: {
          id: string;
          name: string;
          type: 'url' | 'folder';
          url?: string;
          dateAdded?: string;
          parentId?: string;
        };
        previousName?: string;
        previousUrl?: string;
      }) => void
    ): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        change: {
          browserType: 'chrome' | 'edge' | 'brave' | 'safari';
          changeType: 'added' | 'modified' | 'deleted';
          bookmark: {
            id: string;
            name: string;
            type: 'url' | 'folder';
            url?: string;
            dateAdded?: string;
            parentId?: string;
          };
          previousName?: string;
          previousUrl?: string;
        }
      ): void => callback(change);
      ipcRenderer.on('bookmark-change', handler);
      return () => ipcRenderer.removeListener('bookmark-change', handler);
    },
  },

  // =========================================================================
  // Stash
  // =========================================================================

  /**
   * Stash feature API for custom image storage.
   */
  stash: {
    /**
     * Save a custom image for a stash item.
     * Accepts base64-encoded image data and stores it locally.
     * @param itemId - The stash item ID
     * @param base64Data - The image as base64 (with or without data URL prefix)
     */
    saveImage: (
      itemId: string,
      base64Data: string
    ): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('stash:save-image', itemId, base64Data),

    /**
     * Delete a custom image for a stash item.
     * @param imagePath - The full path to the image file
     */
    deleteImage: (imagePath: string): Promise<boolean> =>
      ipcRenderer.invoke('stash:delete-image', imagePath),

    /**
     * Get the file:// URL for displaying a local image.
     * @param imagePath - The full path to the image file
     */
    getImageUrl: (imagePath: string): Promise<string> =>
      ipcRenderer.invoke('stash:get-image-url', imagePath),
  },

  /**
   * Openverse API for image search credential storage.
   */
  openverse: {
    /**
     * Get stored Openverse OAuth2 credentials.
     * Returns null if no credentials are stored.
     */
    getCredentials: (): Promise<{
      clientId: string;
      clientSecret: string;
      registeredAt: string;
    } | null> => ipcRenderer.invoke('openverse:get-credentials'),

    /**
     * Store Openverse OAuth2 credentials securely.
     * Uses OS-level encryption (Keychain on macOS, DPAPI on Windows).
     */
    storeCredentials: (credentials: {
      clientId: string;
      clientSecret: string;
      registeredAt: string;
    }): Promise<boolean> => ipcRenderer.invoke('openverse:store-credentials', credentials),

    /**
     * Clear stored Openverse credentials.
     */
    clearCredentials: (): Promise<void> => ipcRenderer.invoke('openverse:clear-credentials'),
  },

  // =========================================================================
  // Developer Mode
  // =========================================================================

  /**
   * Get developer mode setting.
   * When enabled, View menu shows Reload, Force Reload, and Toggle DevTools.
   */
  getDeveloperMode: (): Promise<boolean> => ipcRenderer.invoke('get-developer-mode'),

  /**
   * Set developer mode setting.
   * Rebuilds the menu to show/hide developer tools.
   */
  setDeveloperMode: (enabled: boolean): Promise<boolean> =>
    ipcRenderer.invoke('set-developer-mode', enabled),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

// Log that preload script has loaded
console.log('Preload script loaded');
