/**
 * Eclosion Desktop - Main Entry Point
 *
 * This is the main process entry point for the Electron application.
 * It orchestrates the backend, window, tray, and update systems.
 */

import { app, dialog, powerMonitor } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BackendManager } from './backend';

// Debug logging to file
const debugLogPath = path.join(app.getPath('home'), 'eclosion-debug.log');
function debugLog(msg: string): void {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} - ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(debugLogPath, line);
  } catch {
    // Ignore write errors
  }
}

// Initialize debug log
try {
  fs.writeFileSync(debugLogPath, `=== Eclosion Debug Log Started ===\n`);
  debugLog(`App starting...`);
  debugLog(`app.getPath('home'): ${app.getPath('home')}`);
  debugLog(`process.resourcesPath: ${process.resourcesPath}`);
} catch (e) {
  console.error('Failed to initialize debug log:', e);
}
import {
  createWindow,
  getMainWindow,
  showWindow,
  setIsQuitting,
} from './window';
import {
  createTray,
  updateTrayMenu,
  destroyTray,
  initializeDockVisibility,
  showNotification,
} from './tray';
import { setupIpcHandlers } from './ipc';
import { initializeUpdater, scheduleUpdateChecks } from './updater';

// Single instance lock - prevent multiple instances
debugLog('Requesting single instance lock...');
const gotTheLock = app.requestSingleInstanceLock();
debugLog(`Got lock: ${gotTheLock}`);

if (!gotTheLock) {
  debugLog('Another instance is already running - quitting');
  app.quit();
} else {
  // Handle second instance - focus existing window
  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Backend manager instance
let backendManager: BackendManager;
let updateCheckInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the application.
 */
async function initialize(): Promise<void> {
  debugLog('Initialize function called');
  debugLog(`Version: ${app.getVersion()}`);
  debugLog(`Platform: ${process.platform}`);
  debugLog(`Arch: ${process.arch}`);

  try {
    // Initialize backend manager
    debugLog('Creating BackendManager...');
    backendManager = new BackendManager();
    debugLog('BackendManager created');

    // Setup IPC handlers
    debugLog('Setting up IPC handlers...');
    setupIpcHandlers(backendManager);
    debugLog('IPC handlers set up');

    // Initialize auto-updater
    debugLog('Initializing updater...');
    initializeUpdater();
    debugLog('Updater initialized');

    // Start Python backend
    debugLog('Starting backend...');
    await backendManager.start();
    debugLog(`Backend started on port ${backendManager.getPort()}`);

    // Initialize dock visibility (macOS menu bar mode)
    initializeDockVisibility();

    // Create main window
    console.log('Creating main window...');
    await createWindow(backendManager.getPort());

    // Create system tray
    console.log('Creating system tray...');
    createTray(handleSyncClick);

    // Setup power monitor for sleep/wake handling
    setupPowerMonitor();

    // Schedule periodic update checks
    updateCheckInterval = scheduleUpdateChecks(6); // Check every 6 hours

    console.log('Initialization complete');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to initialize:', errorMessage);

    dialog.showErrorBox(
      'Startup Error',
      `Failed to start Eclosion: ${errorMessage}\n\nPlease try restarting the application.`
    );

    app.quit();
  }
}

/**
 * Handle sync button click from tray menu.
 */
async function handleSyncClick(): Promise<void> {
  const result = await backendManager.triggerSync();
  if (result.success) {
    showNotification('Sync Complete', 'Your recurring expenses are up to date.');
    updateTrayMenu(handleSyncClick, `Last sync: ${new Date().toLocaleTimeString()}`);
  } else {
    showNotification('Sync Failed', result.error || 'Please check your connection and try again.');
  }
}

/**
 * Setup power monitor for sleep/wake handling.
 */
function setupPowerMonitor(): void {
  // Handle system resume from sleep
  powerMonitor.on('resume', async () => {
    console.log('System resumed from sleep');

    // Check if sync is needed after wake
    try {
      if (backendManager.isRunning()) {
        await backendManager.checkSyncNeeded();
      }
    } catch (error) {
      console.error('Resume handler error:', error);
      debugLog(`Resume handler error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Handle system suspend
  powerMonitor.on('suspend', () => {
    console.log('System suspending');
  });

  // Handle lock screen (optional: could pause sync)
  powerMonitor.on('lock-screen', () => {
    console.log('Screen locked');
  });

  powerMonitor.on('unlock-screen', () => {
    console.log('Screen unlocked');
  });
}

/**
 * Cleanup and shutdown.
 */
async function cleanup(): Promise<void> {
  console.log('Cleaning up...');

  // Stop update checks
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }

  // Destroy tray
  destroyTray();

  // Stop backend
  if (backendManager) {
    await backendManager.stop();
  }

  console.log('Cleanup complete');
}

// ============================================================================
// App Lifecycle Events
// ============================================================================

// App ready - initialize
app.on('ready', async () => {
  try {
    await initialize();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debugLog(`FATAL: Initialization failed: ${errorMessage}`);
    dialog.showErrorBox('Startup Failed', `Failed to start Eclosion: ${errorMessage}`);
    app.exit(1);
  }
});

// Handle window-all-closed
app.on('window-all-closed', () => {
  // On macOS, apps typically stay running in the menu bar
  // On other platforms, we also keep running in the system tray
  // Don't quit unless explicitly requested
});

// Handle activate (macOS dock click)
app.on('activate', () => {
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    // Recreate window if it was closed
    createWindow(backendManager.getPort());
  } else {
    showWindow();
  }
});

// Handle before-quit - cleanup
app.on('before-quit', async (event) => {
  // Prevent default to allow async cleanup
  event.preventDefault();

  setIsQuitting(true);
  await cleanup();

  // Now actually quit
  app.exit(0);
});

// Handle will-quit (final cleanup)
app.on('will-quit', () => {
  console.log('App will quit');
});

// ============================================================================
// Error Handling
// ============================================================================

// Handle uncaught exceptions - exit gracefully to avoid corrupted state
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  debugLog(`CRASH: Uncaught exception: ${error.message}\n${error.stack || ''}`);

  dialog.showErrorBox(
    'Eclosion Crashed',
    `An unexpected error occurred: ${error.message}\n\nThe application will restart.`
  );

  // Attempt graceful cleanup and restart
  try {
    await cleanup();
  } catch {
    // Ignore cleanup errors
  }

  app.relaunch();
  app.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  console.error('Unhandled rejection:', reason);
  debugLog(`WARNING: Unhandled promise rejection: ${errorMessage}`);
});
