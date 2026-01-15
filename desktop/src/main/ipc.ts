/**
 * IPC Handlers
 *
 * Handles inter-process communication between main and renderer processes.
 */

import { ipcMain, dialog, app, shell, clipboard } from 'electron';
import { BackendManager, type BackendStartupStatus } from './backend';
import { getMainWindow, setWindowMode, getWindowMode, setCompactSize } from './window';
import {
  isAutoStartEnabled,
  setAutoStart,
} from './autostart';
import {
  getAutoBackupSettings,
  setAutoBackupEnabled,
  setAutoBackupRetention,
  setAutoBackupScheduledTime,
  selectBackupFolder,
  executeAutoBackup,
  listBackups,
  restoreFromBackup,
  getBackupInfo,
  getRetentionOptions,
  type AutoBackupSettings,
  type BackupFileInfo,
  type BackupResult,
  type RestoreResult,
} from './auto-backup';
import {
  checkForUpdates,
  quitAndInstall,
  getUpdateStatus,
  getUpdateChannel,
  isAutoUpdateEnabled,
  setAutoUpdateEnabled,
  downloadUpdate,
} from './updater';
import { exportDiagnostics, getQuickDebugInfo } from './diagnostics';
import { createBackup, restoreBackup, getBackupWarning, getRestoreWarning } from './backup';
import {
  getAllHotkeyConfigs,
  setHotkeyConfig,
  validateShortcut,
  resetHotkeysToDefaults,
  type HotkeyAction,
  type HotkeyConfig,
} from './hotkeys';
import {
  getOnboardingData,
  completeOnboarding,
  resetOnboarding,
} from './onboarding';
import {
  isBiometricAvailable,
  getBiometricType,
  isBiometricEnrolled,
  enrollBiometric,
  authenticateWithBiometric,
  clearBiometricEnrollment,
  getStoredPassphrase,
  getBiometricDisplayName,
  isPassphraseStored,
  storePassphraseForSync,
  // Desktop mode: direct credential storage
  storeMonarchCredentials,
  getMonarchCredentials,
  hasMonarchCredentials,
  clearMonarchCredentials,
  getRequireTouchId,
  setRequireTouchId,
  authenticateAndGetCredentials,
  clearAllAuthData,
  promptTouchIdForSetup,
  validateCredentialsFallback,
  getOrCreateNotesKey,
  type MonarchCredentials,
} from './biometric';
import {
  getLockTrigger,
  setLockTrigger,
  getLockTriggerOptions,
  lockApp,
  type LockTrigger,
} from './lock-manager';
import {
  hasPendingSync,
  clearPendingSync,
  setPendingSync,
} from './sync-pending';
import {
  getFormattedMetrics,
  clearMetricsHistory,
} from './startup-metrics';
import {
  showFactoryResetDialog,
  getCleanupInstructions,
} from './cleanup';
import { getStateDir } from './paths';
import { getAllLogFiles, getLogDir, debugLog } from './logger';
import { getHealthStatus, updateTrayMenuSyncStatus } from './tray';
import { getStore } from './store';
import * as fs from 'node:fs';
import * as path from 'node:path';

// =========================================================================
// Loading Screen Ready Signal
// =========================================================================

let loadingReadyResolve: (() => void) | null = null;
let loadingReadyPromise: Promise<void> | null = null;

/**
 * Create a promise that resolves when the loading screen signals it's ready.
 * Call this BEFORE creating the window, then await the returned promise
 * after the window is created to ensure the loading screen is visible
 * before starting heavy background work.
 */
export function createLoadingReadyPromise(): Promise<void> {
  if (!loadingReadyPromise) {
    loadingReadyPromise = new Promise((resolve) => {
      loadingReadyResolve = resolve;
    });
  }
  return loadingReadyPromise;
}

/**
 * Reset the loading ready promise (e.g., after app restart).
 */
export function resetLoadingReadyPromise(): void {
  loadingReadyPromise = null;
  loadingReadyResolve = null;
}

/**
 * Setup all IPC handlers.
 */
export function setupIpcHandlers(backendManager: BackendManager): void {
  // =========================================================================
  // Loading Screen Ready Signal
  // =========================================================================

  /**
   * Handle loading screen ready signal from renderer.
   * Resolves the promise created by createLoadingReadyPromise().
   */
  ipcMain.on('loading-screen-ready', () => {
    debugLog('Loading screen ready signal received');
    if (loadingReadyResolve) {
      loadingReadyResolve();
      loadingReadyResolve = null;
    }
  });

  // =========================================================================
  // Backend Communication
  // =========================================================================

  /**
   * Forward backend startup status events to the renderer.
   */
  backendManager.on('startup-status', (status: BackendStartupStatus) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backend-startup-status', status);
    }
  });

  /**
   * Get the port the backend is running on.
   */
  ipcMain.handle('get-backend-port', () => {
    return backendManager.getPort();
  });

  /**
   * Get the runtime secret for API authentication.
   * This secret must be included in the X-Desktop-Secret header for all API requests.
   */
  ipcMain.handle('get-desktop-secret', () => {
    return backendManager.getDesktopSecret();
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
   * Check if backend startup has completed.
   * Used by frontend to determine if it should show loading screen.
   */
  ipcMain.handle('get-backend-startup-complete', () => {
    return backendManager.isStartupComplete();
  });

  /**
   * Trigger a manual sync.
   */
  ipcMain.handle('trigger-sync', async () => {
    return backendManager.triggerSync();
  });

  /**
   * Get current backend health status.
   */
  ipcMain.handle('get-health-status', () => {
    return getHealthStatus();
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
   * Get update channel (build-time determined, no switching).
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

  /**
   * Check if auto-update is enabled.
   */
  ipcMain.handle('get-auto-update-enabled', () => {
    return isAutoUpdateEnabled();
  });

  /**
   * Enable or disable auto-update.
   */
  ipcMain.handle('set-auto-update-enabled', (_event, enabled: boolean) => {
    setAutoUpdateEnabled(enabled);
    return enabled;
  });

  /**
   * Manually download an available update.
   * Use when auto-update is disabled but user wants to update.
   */
  ipcMain.handle('download-update', async () => {
    return downloadUpdate();
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
  ipcMain.handle('get-desktop-settings', () => {
    const store = getStore();

    return {
      launchAtLogin: store.get('desktop.launchAtLogin', false),
      startMinimized: store.get('desktop.startMinimized', false),
      minimizeToTray: store.get('desktop.minimizeToTray', true),
      closeToTray: store.get('desktop.closeToTray', true),
      showInDock: store.get('desktop.showInDock', true),
      showInTaskbar: store.get('desktop.showInTaskbar', true),
      globalShortcut: store.get('desktop.globalShortcut', 'CommandOrControl+Shift+E'),
    };
  });

  /**
   * Set a single desktop setting.
   *
   * Handles side effects for settings that require immediate action:
   * - launchAtLogin: Updates OS login items
   * - showInDock: Shows/hides dock icon (macOS)
   * - globalShortcut: Re-registers the toggle-window hotkey
   */
  ipcMain.handle(
    'set-desktop-setting',
    (_event, key: string, value: boolean | string): boolean => {
      const store = getStore();

      // Validate key is a known desktop setting
      const validKeys = [
        'launchAtLogin',
        'startMinimized',
        'minimizeToTray',
        'closeToTray',
        'showInDock',
        'showInTaskbar',
        'globalShortcut',
      ];
      if (!validKeys.includes(key)) {
        debugLog(`Invalid desktop setting key: ${key}`);
        return false;
      }

      // Update the store
      const storeKey = `desktop.${key}` as keyof import('./store').StoreSchema;
      store.set(storeKey, value);
      debugLog(`Set desktop setting: ${key} = ${value}`);

      // Handle side effects
      switch (key) {
        case 'launchAtLogin':
          // Update OS login items
          app.setLoginItemSettings({ openAtLogin: value as boolean });
          debugLog(`Updated login item settings: openAtLogin = ${value}`);
          break;

        case 'showInDock':
          // macOS: Show/hide dock icon
          if (process.platform === 'darwin' && app.dock) {
            if (value) {
              app.dock.show();
            } else {
              app.dock.hide();
              // Re-focus window after dock hide (macOS loses focus as side effect)
              getMainWindow()?.focus();
            }
            debugLog(`Updated dock visibility: ${value}`);
          }
          break;

        case 'globalShortcut':
          // Re-register the toggle-window hotkey with new shortcut
          // The globalShortcut setting is specifically for the toggle-window action
          setHotkeyConfig('toggle-window', {
            enabled: true,
            accelerator: value as string,
          });
          debugLog(`Updated globalShortcut to: ${value}`);
          break;
      }

      return true;
    }
  );

  /**
   * Get the state directory path.
   */
  ipcMain.handle('get-state-dir', () => {
    return getStateDir();
  });

  /**
   * Reveal the data folder in the system file manager.
   */
  ipcMain.handle('reveal-data-folder', () => {
    shell.openPath(getStateDir());
  });

  // =========================================================================
  // Diagnostics
  // =========================================================================

  /**
   * Export diagnostics bundle to a file.
   */
  ipcMain.handle('export-diagnostics', async () => {
    return exportDiagnostics();
  });

  /**
   * Copy quick debug info to clipboard.
   */
  ipcMain.handle('copy-debug-info', () => {
    const info = getQuickDebugInfo();
    clipboard.writeText(info);
    return info;
  });

  // =========================================================================
  // Log Viewer
  // =========================================================================

  /**
   * Get list of available log files.
   */
  ipcMain.handle('get-log-files', () => {
    const logDir = getLogDir();
    const logFiles = getAllLogFiles();
    const backendLogPath = path.join(logDir, 'backend.log');

    const files: Array<{ name: string; path: string; size: number; modified: string }> = [];

    // Add main process logs
    for (const logFile of logFiles) {
      try {
        const stats = fs.statSync(logFile);
        files.push({
          name: path.basename(logFile),
          path: logFile,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
      } catch {
        // File might have been rotated away
      }
    }

    // Add backend log if it exists
    if (fs.existsSync(backendLogPath)) {
      try {
        const stats = fs.statSync(backendLogPath);
        files.push({
          name: 'backend.log',
          path: backendLogPath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
      } catch {
        // Ignore
      }
    }

    return files;
  });

  /**
   * Read log file contents.
   * Returns the last N lines to avoid loading huge files.
   */
  ipcMain.handle(
    'read-log-file',
    (_event, filePath: string, options?: { lines?: number; search?: string }) => {
      const maxLines = options?.lines ?? 500;
      const searchTerm = options?.search?.toLowerCase();

      // Security: Only allow reading from the log directory
      const logDir = getLogDir();
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(logDir)) {
        return { error: 'Access denied: File is not in the log directory' };
      }

      try {
        if (!fs.existsSync(filePath)) {
          return { error: 'File not found' };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        let lines = content.split('\n');

        // Filter by search term if provided
        if (searchTerm) {
          lines = lines.filter((line) => line.toLowerCase().includes(searchTerm));
        }

        // Take last N lines
        if (lines.length > maxLines) {
          lines = lines.slice(-maxLines);
        }

        return {
          content: lines.join('\n'),
          totalLines: content.split('\n').length,
          displayedLines: lines.length,
          truncated: content.split('\n').length > maxLines,
        };
      } catch (error) {
        return { error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}` };
      }
    }
  );

  // =========================================================================
  // Backup & Restore
  // =========================================================================

  /**
   * Create a backup of all application data and settings.
   */
  ipcMain.handle('create-backup', async () => {
    return createBackup();
  });

  /**
   * Restore application data and settings from a backup file.
   */
  ipcMain.handle('restore-backup', async () => {
    return restoreBackup();
  });

  /**
   * Get the warning message for creating a backup.
   */
  ipcMain.handle('get-backup-warning', () => {
    return getBackupWarning();
  });

  /**
   * Get the warning message for restoring a backup.
   */
  ipcMain.handle('get-restore-warning', () => {
    return getRestoreWarning();
  });

  // =========================================================================
  // Global Hotkeys
  // =========================================================================

  /**
   * Get all hotkey configurations.
   */
  ipcMain.handle('get-hotkey-configs', () => {
    return getAllHotkeyConfigs();
  });

  /**
   * Set a hotkey configuration.
   */
  ipcMain.handle('set-hotkey-config', (_event, action: HotkeyAction, config: HotkeyConfig) => {
    return setHotkeyConfig(action, config);
  });

  /**
   * Validate a keyboard shortcut.
   */
  ipcMain.handle('validate-shortcut', (_event, accelerator: string, currentAction?: HotkeyAction) => {
    return validateShortcut(accelerator, currentAction);
  });

  /**
   * Reset hotkeys to defaults.
   */
  ipcMain.handle('reset-hotkeys', () => {
    resetHotkeysToDefaults();
  });

  // =========================================================================
  // Onboarding
  // =========================================================================

  /**
   * Get onboarding data (whether to show, steps, version).
   */
  ipcMain.handle('get-onboarding-data', () => {
    return getOnboardingData();
  });

  /**
   * Mark onboarding as complete.
   */
  ipcMain.handle('complete-onboarding', () => {
    completeOnboarding();
  });

  /**
   * Reset onboarding (for testing or re-showing).
   */
  ipcMain.handle('reset-onboarding', () => {
    resetOnboarding();
  });

  // =========================================================================
  // Startup Metrics
  // =========================================================================

  /**
   * Get startup performance metrics.
   */
  ipcMain.handle('get-startup-metrics', () => {
    return getFormattedMetrics();
  });

  /**
   * Clear startup metrics history.
   */
  ipcMain.handle('clear-startup-metrics', () => {
    clearMetricsHistory();
  });

  // =========================================================================
  // Data Cleanup
  // =========================================================================

  /**
   * Show factory reset dialog and perform reset if confirmed.
   */
  ipcMain.handle('show-factory-reset-dialog', async () => {
    return showFactoryResetDialog();
  });

  /**
   * Get cleanup instructions for the current platform.
   */
  ipcMain.handle('get-cleanup-instructions', () => {
    return getCleanupInstructions();
  });

  // =========================================================================
  // Biometric Authentication
  // =========================================================================

  /**
   * Check if biometric authentication is available on this device.
   */
  ipcMain.handle('biometric:is-available', () => {
    return isBiometricAvailable();
  });

  /**
   * Get the type of biometric authentication available.
   */
  ipcMain.handle('biometric:get-type', () => {
    return getBiometricType();
  });

  /**
   * Get a user-friendly display name for the biometric type.
   */
  ipcMain.handle('biometric:get-display-name', () => {
    return getBiometricDisplayName();
  });

  /**
   * Check if biometric authentication is enrolled (passphrase stored).
   */
  ipcMain.handle('biometric:is-enrolled', () => {
    return isBiometricEnrolled();
  });

  /**
   * Enroll biometric authentication by storing the passphrase securely.
   */
  ipcMain.handle('biometric:enroll', (_event, passphrase: string) => {
    return enrollBiometric(passphrase);
  });

  /**
   * Authenticate using biometric and retrieve the stored passphrase.
   */
  ipcMain.handle('biometric:authenticate', async () => {
    return authenticateWithBiometric();
  });

  /**
   * Clear biometric enrollment (remove stored passphrase).
   */
  ipcMain.handle('biometric:clear', () => {
    clearBiometricEnrollment();
  });

  /**
   * Get the stored passphrase without prompting for biometric.
   * Used for auto-sync when biometric is enrolled.
   */
  ipcMain.handle('biometric:get-stored-passphrase', () => {
    return getStoredPassphrase();
  });

  /**
   * Check if a passphrase is stored (for sync, regardless of biometric status).
   */
  ipcMain.handle('biometric:is-passphrase-stored', () => {
    return isPassphraseStored();
  });

  /**
   * Store passphrase for background sync (without enabling biometric unlock).
   */
  ipcMain.handle('biometric:store-for-sync', (_event, passphrase: string) => {
    return storePassphraseForSync(passphrase);
  });

  /**
   * Prompt Touch ID during setup to verify user can use it.
   * Does NOT store anything - just verifies biometric works.
   */
  ipcMain.handle('biometric:prompt-for-setup', async () => {
    return promptTouchIdForSetup();
  });

  /**
   * Validate credentials for fallback authentication when Touch ID fails.
   * Compares against stored credentials (works offline).
   */
  ipcMain.handle('biometric:validate-fallback', (_event, email: string, password: string) => {
    return validateCredentialsFallback(email, password);
  });

  // =========================================================================
  // Desktop Mode: Direct Credential Storage
  // =========================================================================

  /**
   * Store Monarch credentials directly (desktop mode).
   */
  ipcMain.handle('credentials:store', (_event, credentials: MonarchCredentials) => {
    return storeMonarchCredentials(credentials);
  });

  /**
   * Get stored Monarch credentials (desktop mode).
   */
  ipcMain.handle('credentials:get', () => {
    return getMonarchCredentials();
  });

  /**
   * Check if Monarch credentials are stored (desktop mode).
   */
  ipcMain.handle('credentials:has', () => {
    return hasMonarchCredentials();
  });

  /**
   * Clear stored Monarch credentials (desktop mode).
   */
  ipcMain.handle('credentials:clear', () => {
    clearMonarchCredentials();
  });

  /**
   * Get the "Require Touch ID to unlock" setting.
   */
  ipcMain.handle('credentials:get-require-touch-id', () => {
    return getRequireTouchId();
  });

  /**
   * Set the "Require Touch ID to unlock" setting.
   */
  ipcMain.handle('credentials:set-require-touch-id', (_event, required: boolean) => {
    setRequireTouchId(required);
  });

  /**
   * Authenticate and get credentials with optional Touch ID.
   */
  ipcMain.handle('credentials:authenticate', async () => {
    return authenticateAndGetCredentials();
  });

  /**
   * Clear all auth data (both desktop and legacy modes).
   */
  ipcMain.handle('credentials:clear-all', () => {
    clearAllAuthData();
  });

  /**
   * Get or create the notes encryption key (desktop mode).
   * Used to encrypt notes content on the backend.
   */
  ipcMain.handle('credentials:get-notes-key', () => {
    return getOrCreateNotesKey();
  });

  // =========================================================================
  // Lock Management
  // =========================================================================

  /**
   * Get the current lock trigger setting.
   */
  ipcMain.handle('lock:get-trigger', () => {
    return getLockTrigger();
  });

  /**
   * Set the lock trigger setting.
   */
  ipcMain.handle('lock:set-trigger', (_event, trigger: LockTrigger) => {
    setLockTrigger(trigger);
  });

  /**
   * Get available lock trigger options with labels.
   */
  ipcMain.handle('lock:get-options', () => {
    return getLockTriggerOptions();
  });

  /**
   * Manually lock the app.
   */
  ipcMain.handle('lock:lock-app', () => {
    lockApp();
  });

  // =========================================================================
  // Pending Sync (for menu-triggered sync when locked)
  // =========================================================================

  /**
   * Check if there's a pending sync waiting for authentication.
   */
  ipcMain.handle('sync:has-pending', () => {
    return hasPendingSync();
  });

  /**
   * Clear the pending sync state.
   */
  ipcMain.handle('sync:clear-pending', () => {
    clearPendingSync();
  });

  /**
   * Execute pending sync after authentication.
   * Called by renderer after successful login/unlock with passphrase.
   */
  ipcMain.handle('sync:execute-pending', async (_event, passphrase: string) => {
    if (!hasPendingSync()) {
      return { success: false, error: 'No pending sync' };
    }

    // Clear pending state
    setPendingSync(false);

    // Trigger sync with the provided passphrase
    const result = await backendManager.triggerSync(passphrase);
    return result;
  });

  /**
   * Notify main process that a sync completed (called by renderer after API sync).
   * Updates the tray menu to show the correct sync time.
   * The tray module handles periodic refresh to keep the "X ago" display current.
   */
  ipcMain.handle('sync:notify-completed', (_event, lastSyncIso: string) => {
    updateTrayMenuSyncStatus(lastSyncIso);
  });

  // =========================================================================
  // MFA Re-authentication (for session restore)
  // =========================================================================

  /**
   * Submit MFA code to complete session restore.
   * Used when session restore fails due to MFA requirement (e.g., 6-digit code users on restart).
   */
  ipcMain.handle(
    'auth:submit-mfa-code',
    async (_event, mfaCode: string, mfaMode: 'secret' | 'code') => {
      // Get stored credentials
      const credentials = getMonarchCredentials();
      if (!credentials) {
        return { success: false, error: 'No stored credentials' };
      }

      // Attempt to restore session with the new MFA code
      const result = await backendManager.restoreSession({
        email: credentials.email,
        password: credentials.password,
        mfaSecret: mfaCode,
        mfaMode,
      });

      return result;
    }
  );

  // =========================================================================
  // Lockout State (failed login attempts)
  // =========================================================================

  /**
   * Get current lockout state.
   */
  ipcMain.handle('lockout:get-state', () => {
    return {
      failedAttempts: getStore().get('lockout.failedAttempts', 0),
      cooldownUntil: getStore().get('lockout.cooldownUntil', null),
    };
  });

  /**
   * Set lockout state.
   */
  ipcMain.handle(
    'lockout:set-state',
    (_event, state: { failedAttempts: number; cooldownUntil: number | null }) => {
      getStore().set('lockout.failedAttempts', state.failedAttempts);
      getStore().set('lockout.cooldownUntil', state.cooldownUntil);
    }
  );

  /**
   * Clear lockout state.
   */
  ipcMain.handle('lockout:clear', () => {
    getStore().delete('lockout.failedAttempts');
    getStore().delete('lockout.cooldownUntil');
  });

  // =========================================================================
  // Auto-Backup
  // =========================================================================

  /**
   * Get current auto-backup settings.
   */
  ipcMain.handle('auto-backup:get-settings', (): AutoBackupSettings => {
    return getAutoBackupSettings();
  });

  /**
   * Set auto-backup enabled state.
   */
  ipcMain.handle('auto-backup:set-enabled', (_event, enabled: boolean): void => {
    setAutoBackupEnabled(enabled);
  });

  /**
   * Open folder selection dialog and set backup folder.
   * Returns the selected path or null if cancelled.
   */
  ipcMain.handle('auto-backup:select-folder', async (): Promise<string | null> => {
    return selectBackupFolder();
  });

  /**
   * Set retention period in days.
   */
  ipcMain.handle('auto-backup:set-retention', (_event, days: number): void => {
    setAutoBackupRetention(days);
  });

  /**
   * Set scheduled backup time (HH:MM format, 24-hour).
   */
  ipcMain.handle('auto-backup:set-scheduled-time', (_event, time: string): void => {
    setAutoBackupScheduledTime(time);
  });

  /**
   * Get available retention options.
   */
  ipcMain.handle('auto-backup:get-retention-options', (): Array<{ value: number; label: string }> => {
    return getRetentionOptions();
  });

  /**
   * Run a manual backup now (creates timestamped backup that won't be auto-cleaned).
   */
  ipcMain.handle('auto-backup:run-now', async (): Promise<BackupResult> => {
    return executeAutoBackup(true);
  });

  /**
   * List available backups in the configured folder.
   */
  ipcMain.handle('auto-backup:list-backups', (): BackupFileInfo[] => {
    return listBackups();
  });

  /**
   * Open the backup folder in the system file manager.
   */
  ipcMain.handle('auto-backup:open-folder', (): void => {
    const settings = getAutoBackupSettings();
    if (settings.folderPath) {
      shell.openPath(settings.folderPath);
    }
  });

  /**
   * Get backup file info for preview.
   */
  ipcMain.handle(
    'auto-backup:get-info',
    (_event, filePath: string): { valid: boolean; version?: number; createdAt?: string; error?: string } => {
      return getBackupInfo(filePath);
    }
  );

  /**
   * Restore from a backup file.
   * If passphrase is not provided, uses current Monarch credentials.
   */
  ipcMain.handle(
    'auto-backup:restore',
    async (_event, filePath: string, passphrase?: string): Promise<RestoreResult> => {
      return restoreFromBackup(filePath, passphrase);
    }
  );

  // =========================================================================
  // Window Mode (compact/full)
  // =========================================================================

  /**
   * Set the window mode (compact or full).
   * - 'compact': Small, centered window for loading/login screens
   * - 'full': Restores previous window bounds for main app
   */
  ipcMain.handle('window:set-mode', (_event, mode: 'compact' | 'full') => {
    setWindowMode(mode);
  });

  /**
   * Get the current window mode.
   */
  ipcMain.handle('window:get-mode', () => {
    return getWindowMode();
  });

  /**
   * Dynamically resize the compact window based on content height.
   * Only works in compact mode. Returns the actual height applied (after clamping).
   */
  ipcMain.handle('window:set-compact-size', (_event, height: number) => {
    return setCompactSize(height);
  });

  // =========================================================================
  // Menu Management (macOS only)
  // =========================================================================

  /**
   * Switch to the full application menu (after login).
   * On Windows/Linux this is a no-op since menu bar is hidden.
   */
  ipcMain.handle('menu:set-full', async () => {
    // Import dynamically to avoid circular dependency
    const { createAppMenu, getSyncCallback } = await import('./menu');
    createAppMenu(getSyncCallback() ?? undefined);
  });

  /**
   * Switch to the minimal application menu (after logout/lock).
   * On Windows/Linux this is a no-op since menu bar is hidden.
   */
  ipcMain.handle('menu:set-minimal', async () => {
    const { createMinimalMenu } = await import('./menu');
    createMinimalMenu();
  });
}
