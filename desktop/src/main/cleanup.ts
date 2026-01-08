/**
 * Data Cleanup Utilities
 *
 * Provides functionality to reset/clear app data. Used for:
 * - In-app "Reset All Data" option
 * - Uninstall cleanup (Windows via NSIS script)
 * - macOS manual cleanup instructions
 */

import { dialog, shell } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getStateDir, getLogsDir } from './paths';
import { debugLog } from './logger';
import Store from 'electron-store';

const store = new Store();

/**
 * Files and directories to clean up.
 */
const DATA_FILES = [
  'credentials.json',
  'mm_session.pickle',
  'tracker_state.json',
  'security_events.db',
];

/**
 * Result of a cleanup operation.
 */
export interface CleanupResult {
  success: boolean;
  filesDeleted: string[];
  errors: string[];
}

/**
 * Delete a file if it exists.
 */
function deleteFile(filePath: string): { deleted: boolean; error?: string } {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { deleted: true };
    }
    return { deleted: false };
  } catch (error) {
    return {
      deleted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a directory and all its contents recursively.
 */
function deleteDirectory(dirPath: string): { deleted: boolean; error?: string } {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return { deleted: true };
    }
    return { deleted: false };
  } catch (error) {
    return {
      deleted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clear all application data (credentials, session, state).
 * Does NOT delete desktop settings or logs.
 */
export function clearAppData(): CleanupResult {
  debugLog('Clearing application data...');

  const stateDir = getStateDir();
  const result: CleanupResult = {
    success: true,
    filesDeleted: [],
    errors: [],
  };

  for (const filename of DATA_FILES) {
    const filePath = path.join(stateDir, filename);
    const { deleted, error } = deleteFile(filePath);

    if (deleted) {
      result.filesDeleted.push(filename);
      debugLog(`Deleted: ${filename}`);
    }

    if (error) {
      result.errors.push(`${filename}: ${error}`);
      result.success = false;
    }
  }

  debugLog(`App data cleared: ${result.filesDeleted.length} files deleted`);
  return result;
}

/**
 * Clear all logs.
 */
export function clearLogs(): CleanupResult {
  debugLog('Clearing logs...');

  const logsDir = getLogsDir();
  const result: CleanupResult = {
    success: true,
    filesDeleted: [],
    errors: [],
  };

  const { deleted, error } = deleteDirectory(logsDir);

  if (deleted) {
    result.filesDeleted.push('logs directory');
    debugLog('Deleted logs directory');
  }

  if (error) {
    result.errors.push(`logs: ${error}`);
    result.success = false;
  }

  return result;
}

/**
 * Clear desktop settings (electron-store).
 */
export function clearDesktopSettings(): void {
  debugLog('Clearing desktop settings...');
  store.clear();
  debugLog('Desktop settings cleared');
}

/**
 * Perform a complete factory reset.
 * Clears all data, logs, and settings.
 */
export function factoryReset(): CleanupResult {
  debugLog('Performing factory reset...');

  const appDataResult = clearAppData();
  const logsResult = clearLogs();

  // Clear settings
  clearDesktopSettings();

  // Combine results
  const result: CleanupResult = {
    success: appDataResult.success && logsResult.success,
    filesDeleted: [...appDataResult.filesDeleted, ...logsResult.filesDeleted, 'settings'],
    errors: [...appDataResult.errors, ...logsResult.errors],
  };

  debugLog(`Factory reset complete: ${result.filesDeleted.length} items deleted`);
  return result;
}

/**
 * Show factory reset confirmation dialog.
 * Returns true if user confirmed and reset was performed.
 */
export async function showFactoryResetDialog(): Promise<{ confirmed: boolean; result?: CleanupResult }> {
  const mainWindow = await import('./window').then((m) => m.getMainWindow());

  const confirmOptions: Electron.MessageBoxOptions = {
    type: 'warning',
    buttons: ['Cancel', 'Reset All Data'],
    defaultId: 0,
    cancelId: 0,
    title: 'Reset All Data',
    message: 'Are you sure you want to reset all data?',
    detail:
      'This will delete:\n' +
      '• Your Monarch Money credentials\n' +
      '• Session data\n' +
      '• Tracker state and settings\n' +
      '• All logs\n' +
      '• Desktop preferences\n\n' +
      'You will need to sign in again after restarting the app.\n\n' +
      'This action cannot be undone.',
  };

  const response = mainWindow
    ? await dialog.showMessageBox(mainWindow, confirmOptions)
    : await dialog.showMessageBox(confirmOptions);

  if (response.response !== 1) {
    return { confirmed: false };
  }

  const result = factoryReset();

  if (result.success) {
    const successOptions: Electron.MessageBoxOptions = {
      type: 'info',
      title: 'Reset Complete',
      message: 'All data has been reset.',
      detail: 'Please restart Eclosion to complete the reset.',
    };
    if (mainWindow) {
      await dialog.showMessageBox(mainWindow, successOptions);
    } else {
      await dialog.showMessageBox(successOptions);
    }
  } else {
    const errorOptions: Electron.MessageBoxOptions = {
      type: 'warning',
      title: 'Reset Partially Complete',
      message: 'Some files could not be deleted.',
      detail: `Errors:\n${result.errors.join('\n')}`,
    };
    if (mainWindow) {
      await dialog.showMessageBox(mainWindow, errorOptions);
    } else {
      await dialog.showMessageBox(errorOptions);
    }
  }

  return { confirmed: true, result };
}

/**
 * Get cleanup instructions for the current platform.
 */
export function getCleanupInstructions(): {
  platform: string;
  dataPath: string;
  instructions: string;
} {
  const stateDir = getStateDir();
  const platform = process.platform;

  let instructions: string;

  switch (platform) {
    case 'darwin':
      instructions =
        'To completely remove Eclosion and its data:\n\n' +
        '1. Quit Eclosion if running\n' +
        '2. Move Eclosion.app to Trash\n' +
        '3. Delete the data folder:\n' +
        `   ${stateDir}\n\n` +
        'Or use Finder:\n' +
        '1. Open Finder\n' +
        '2. Go > Go to Folder...\n' +
        '3. Enter: ~/Library/Application Support/Eclosion\n' +
        '4. Delete the Eclosion folder';
      break;

    case 'win32':
      instructions =
        'To completely remove Eclosion and its data:\n\n' +
        '1. Use "Add or Remove Programs" to uninstall\n' +
        '2. When prompted, choose to delete app data\n\n' +
        'Or manually delete the data folder:\n' +
        `   ${stateDir}`;
      break;

    default: // Linux
      instructions =
        'To completely remove Eclosion and its data:\n\n' +
        '1. Remove the application package (AppImage/deb/rpm)\n' +
        '2. Delete the configuration folder:\n' +
        `   ${stateDir}\n\n` +
        'Commands:\n' +
        `   rm -rf "${stateDir}"`;
  }

  return {
    platform,
    dataPath: stateDir,
    instructions,
  };
}

/**
 * Reveal data folder in file manager (for manual cleanup).
 */
export function revealDataFolderForCleanup(): void {
  const stateDir = getStateDir();
  shell.openPath(stateDir);
}
