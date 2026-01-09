/**
 * IPC Handlers
 *
 * Handles inter-process communication between main and renderer processes.
 */

import { ipcMain, dialog, app, shell, clipboard } from 'electron';
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
  getUpdateChannel,
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
import { getAllLogFiles, getLogDir } from './logger';
import { getHealthStatus } from './tray';
import Store from 'electron-store';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
    const autoStart = isAutoStartEnabled();
    return {
      menuBarMode: store.get('menuBarMode', false) as boolean,
      autoStart,
    };
  });

  /**
   * Set menu bar mode (macOS: run in background + hide from dock).
   *
   * When enabled:
   * - App stays running in system tray when window is closed
   * - On macOS, hides from the Dock (menu bar only app)
   *
   * When disabled:
   * - App quits when window is closed
   * - On macOS, shows in the Dock
   */
  ipcMain.handle('set-menu-bar-mode', (_event, enabled: boolean) => {
    store.set('menuBarMode', enabled);
    // On macOS, also control dock visibility
    if (process.platform === 'darwin' && app.dock) {
      if (enabled) {
        app.dock.hide();
      } else {
        app.dock.show();
      }
    }
    return enabled;
  });

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
}
