/**
 * Eclosion Desktop - Main Entry Point
 *
 * This is the main process entry point for the Electron application.
 * It orchestrates the backend, window, tray, and update systems.
 */

import { app, dialog, powerMonitor } from 'electron';

// Initialize Sentry as early as possible (before other imports that might crash)
import { initSentry, captureException, addBreadcrumb, isSentryEnabled } from './sentry';
initSentry();

import { BackendManager } from './backend';
import { debugLog, initLogSession, getLogDir } from './logger';

// Initialize log session
initLogSession();
debugLog('App starting...');
debugLog(`Sentry: ${isSentryEnabled() ? 'enabled' : 'disabled'}`);
debugLog(`Log directory: ${getLogDir()}`);
debugLog(`app.getPath('home'): ${app.getPath('home')}`);
debugLog(`process.resourcesPath: ${process.resourcesPath}`);
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
  updateHealthStatus,
} from './tray';
import { setupIpcHandlers } from './ipc';
import { initializeUpdater, scheduleUpdateChecks } from './updater';
import { createAppMenu } from './menu';
import { initializeHotkeys, unregisterAllHotkeys } from './hotkeys';
import {
  registerDeepLinkProtocol,
  setupDeepLinkHandlers,
  handleInitialDeepLink,
  getDeepLinkFromArgs,
  handleDeepLink,
} from './deeplinks';
import { recordMilestone, finalizeStartupMetrics } from './startup-metrics';

// Single instance lock - prevent multiple instances
debugLog('Requesting single instance lock...');
const gotTheLock = app.requestSingleInstanceLock();
debugLog(`Got lock: ${gotTheLock}`);

if (!gotTheLock) {
  debugLog('Another instance is already running - quitting');
  app.quit();
} else {
  // Handle second instance - focus existing window and handle deep links
  app.on('second-instance', (_event, commandLine) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }

    // Check if opened via deep link
    const deepLink = getDeepLinkFromArgs(commandLine);
    if (deepLink) {
      debugLog(`Second instance deep link: ${deepLink}`);
      void handleDeepLink(deepLink);
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

  addBreadcrumb({ category: 'lifecycle', message: 'App initializing' });

  try {
    // Register deep link protocol (eclosion://)
    registerDeepLinkProtocol();

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
    recordMilestone('backendStarting');
    await backendManager.start();
    recordMilestone('backendStarted');
    debugLog(`Backend started on port ${backendManager.getPort()}`);

    // Initialize dock visibility (macOS menu bar mode)
    initializeDockVisibility();

    // Create main window
    console.log('Creating main window...');
    await createWindow(backendManager.getPort());
    recordMilestone('windowCreated');

    // Create application menu (adds Settings to macOS app menu)
    createAppMenu();

    // Create system tray
    console.log('Creating system tray...');
    createTray(handleSyncClick);

    // Initialize global hotkeys
    initializeHotkeys(handleSyncClick);

    // Setup deep link handlers (for eclosion:// URLs)
    setupDeepLinkHandlers(handleSyncClick);

    // Setup power monitor for sleep/wake handling
    setupPowerMonitor();

    // Schedule periodic update checks
    updateCheckInterval = scheduleUpdateChecks(6); // Check every 6 hours

    // Handle deep link if app was opened via eclosion:// URL
    handleInitialDeepLink();

    // Record startup metrics
    recordMilestone('initialized');
    finalizeStartupMetrics(app.getVersion());

    addBreadcrumb({ category: 'lifecycle', message: 'App initialized successfully' });
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
  addBreadcrumb({ category: 'sync', message: 'Manual sync triggered' });
  const result = await backendManager.triggerSync();
  if (result.success) {
    const syncTime = new Date().toLocaleTimeString();
    showNotification('Sync Complete', 'Your recurring expenses are up to date.');
    updateTrayMenu(handleSyncClick, `Last sync: ${syncTime}`);
    updateHealthStatus(true, syncTime);
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
    addBreadcrumb({ category: 'lifecycle', message: 'System resumed from sleep' });

    // Check if sync is needed after wake
    try {
      if (backendManager.isRunning()) {
        const result = await backendManager.checkSyncNeeded();

        // Show feedback if a sync was triggered
        if (result.synced) {
          if (result.success) {
            const syncTime = new Date().toLocaleTimeString();
            showNotification('Synced After Wake', 'Your recurring expenses are up to date.');
            updateTrayMenu(handleSyncClick, `Last sync: ${syncTime}`);
            updateHealthStatus(true, syncTime);
          } else {
            showNotification('Sync Failed', result.error || 'Automatic sync after wake failed.');
          }
        }
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

  // Unregister global hotkeys
  unregisterAllHotkeys();

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
  recordMilestone('appReady');
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

  // Report to Sentry before crashing
  captureException(error, { fatal: true });

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

  // Report to Sentry
  if (reason instanceof Error) {
    captureException(reason);
  }
});
