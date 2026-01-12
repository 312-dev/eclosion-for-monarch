/**
 * Eclosion Desktop - Main Entry Point
 *
 * This is the main process entry point for the Electron application.
 * It orchestrates the backend, window, tray, and update systems.
 */

import { app, dialog, powerMonitor } from 'electron';
import * as path from 'node:path';
import { getAppDisplayName, getAppFolderName, getAppFolderNameLower, isBetaBuild } from './beta';

// Set the display name for menus (overrides package.json "name")
// Must happen before any modules that use app.name are imported
app.setName(getAppDisplayName());

// Set userData path to isolate beta from production installations
// This affects electron-store and other Electron internals
// Must happen before any modules that use userData are imported
const userDataPath = ((): string => {
  switch (process.platform) {
    case 'darwin':
      return path.join(app.getPath('home'), 'Library', 'Application Support', getAppFolderName());
    case 'win32':
      return path.join(app.getPath('appData'), getAppFolderName());
    default: // Linux
      return path.join(app.getPath('home'), '.config', getAppFolderNameLower());
  }
})();
app.setPath('userData', userDataPath);

// Log beta status for debugging
if (isBetaBuild()) {
  console.log('Running as Eclosion (Beta)');
  console.log(`userData path: ${userDataPath}`);
}

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
  isAuthError,
  showReauthNotification,
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
import { initializeLockManager, cleanupLockManager, updateMainWindowRef } from './lock-manager';
import {
  getStoredPassphrase,
  getMonarchCredentials,
  hasMonarchCredentials,
  isPassphraseStored,
  clearStoredPassphrase,
} from './biometric';
import { setPendingSync } from './sync-pending';

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
 * Port value passed to createWindow() when the backend is not yet ready.
 * The frontend uses this to know it should show the loading screen.
 */
const BACKEND_NOT_READY_PORT = 0;

/**
 * Format an ISO timestamp as a relative time string.
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Initialize the application.
 * Creates the window immediately for fast perceived startup, then starts backend in parallel.
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

    // Setup IPC handlers (needed before window creation)
    debugLog('Setting up IPC handlers...');
    setupIpcHandlers(backendManager);
    debugLog('IPC handlers set up');

    // Clean up old passphrase-based credentials if new mode isn't set up yet
    // This handles the upgrade path: users need to log in fresh with the new simplified flow
    if (!hasMonarchCredentials() && isPassphraseStored()) {
      debugLog('Cleaning up old passphrase-based credentials (upgrade to new auth flow)');
      clearStoredPassphrase();
    }

    // Initialize auto-updater (only in packaged builds - dev mode has no app-update.yml)
    if (app.isPackaged) {
      debugLog('Initializing updater...');
      initializeUpdater();
      debugLog('Updater initialized');
    } else {
      debugLog('Skipping updater initialization (development mode)');
    }

    // Initialize dock visibility (macOS menu bar mode)
    initializeDockVisibility();

    // Create main window IMMEDIATELY (before backend starts)
    // The frontend will show a loading screen while backend initializes
    console.log('Creating main window...');
    await createWindow(BACKEND_NOT_READY_PORT);
    recordMilestone('windowCreated');

    // Create application menu (adds Settings, Sync, Lock to menu bar)
    createAppMenu(handleSyncClick);

    // Create system tray
    console.log('Creating system tray...');
    createTray(handleSyncClick);

    // Initialize global hotkeys
    initializeHotkeys(handleSyncClick);

    // Setup deep link handlers (for eclosion:// URLs)
    setupDeepLinkHandlers(handleSyncClick);

    // Initialize lock manager (handles auto-lock on system lock or idle)
    const mainWindow = getMainWindow();
    if (mainWindow) {
      initializeLockManager(mainWindow);
    }

    // Setup power monitor for sleep/wake handling
    setupPowerMonitor();

    // Schedule periodic update checks (only in packaged builds)
    if (app.isPackaged) {
      updateCheckInterval = scheduleUpdateChecks(6); // Check every 6 hours
    }

    // Handle deep link if app was opened via eclosion:// URL
    handleInitialDeepLink();

    // Start Python backend in background (doesn't block window display)
    debugLog('Starting backend in background...');
    recordMilestone('backendStarting');
    startBackendAndInitialize().catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      debugLog(`Backend startup failed: ${errorMessage}`);
      // Error is handled by the backend manager's event emission
    });

    addBreadcrumb({ category: 'lifecycle', message: 'Window created, backend starting in background' });
    console.log('Window initialization complete, backend starting...');
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
 * Start the backend and complete initialization once it's ready.
 * This runs in the background while the window displays the loading screen.
 */
async function startBackendAndInitialize(): Promise<void> {
  // Start Python backend
  await backendManager.start();
  recordMilestone('backendStarted');
  debugLog(`Backend started on port ${backendManager.getPort()}`);

  // Fetch last sync time and check if sync is needed on startup
  const lastSyncIso = await backendManager.fetchLastSyncTime();
  if (lastSyncIso) {
    const syncStatus = `Last sync: ${formatRelativeTime(lastSyncIso)}`;
    updateTrayMenu(handleSyncClick, syncStatus);
    updateHealthStatus(true, formatRelativeTime(lastSyncIso));
  }

  // Desktop auto-sync: restore session and sync if needed
  // New mode: credentials stored directly in safeStorage
  // Legacy mode: passphrase stored in safeStorage (for self-hosted)
  let sessionRestored = false;
  let mfaRequired = false;

  if (hasMonarchCredentials()) {
    // New desktop mode: restore session from stored credentials
    const credentials = getMonarchCredentials();
    if (credentials) {
      debugLog('Restoring session from stored credentials...');
      const restoreResult = await backendManager.restoreSession(credentials);
      if (restoreResult.success) {
        debugLog('Session restored successfully');
        sessionRestored = true;
      } else {
        debugLog(`Session restore failed: ${restoreResult.error}`);

        // Check if MFA is required (session expired for 6-digit code users)
        if (restoreResult.mfaRequired) {
          debugLog('MFA required for session restore - will prompt user');
          mfaRequired = true;

          // Notify renderer that MFA is needed
          const mainWindow = getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('auth:mfa-required', {
              email: credentials.email,
              mfaMode: credentials.mfaMode || 'code',
            });
          }
        }
      }
    }
  }

  // Check if sync is needed (skip if MFA is required - user must authenticate first)
  // New mode: credentials already in session (no passphrase needed)
  // Legacy mode: pass the passphrase to unlock
  if (!mfaRequired) {
    const passphrase = sessionRestored ? undefined : getStoredPassphrase();
    const syncResult = await backendManager.checkSyncNeeded(passphrase ?? undefined);
    if (syncResult.synced) {
      if (syncResult.success) {
        const syncTime = new Date().toLocaleTimeString();
        showNotification('Synced on Startup', 'Your recurring expenses are up to date.');
        updateTrayMenu(handleSyncClick, `Last sync: ${syncTime}`);
        updateHealthStatus(true, syncTime);
      } else {
        showNotification('Sync Failed', syncResult.error || 'Unable to sync. Please try again later.');
      }
    }
  }

  // Record startup metrics
  recordMilestone('initialized');
  finalizeStartupMetrics(app.getVersion());

  addBreadcrumb({ category: 'lifecycle', message: 'App initialized successfully' });
  console.log('Backend initialization complete');
}

/**
 * Handle sync button click from tray/menu.
 * If no passphrase is available, shows the window and waits for auth.
 */
async function handleSyncClick(): Promise<void> {
  addBreadcrumb({ category: 'sync', message: 'Manual sync triggered' });

  // Get passphrase from secure storage for sync (if biometric is enrolled)
  const passphrase = getStoredPassphrase();

  if (!passphrase) {
    // No passphrase stored - need user to authenticate first
    debugLog('Sync: No passphrase available, requesting auth');
    setPendingSync(true);

    // Show the window and notify renderer to sync after auth
    showWindow();
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sync:pending');
    }
    return;
  }

  // Passphrase available - proceed with sync
  const result = await backendManager.triggerSync(passphrase);
  if (result.success) {
    const syncTime = new Date().toLocaleTimeString();
    showNotification('Sync Complete', 'Your recurring expenses are up to date.');
    updateTrayMenu(handleSyncClick, `Last sync: ${syncTime}`);
    updateHealthStatus(true, syncTime);
  } else if (isAuthError(result.error)) {
    // Auth error (session expired, MFA needed) - show reauth notification
    showReauthNotification();
  } else {
    showNotification('Sync Failed', result.error || 'Unable to sync. Please try again later.');
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
        // Desktop auto-sync: if passphrase is stored in keychain, sync based on interval
        const passphrase = getStoredPassphrase();
        const result = await backendManager.checkSyncNeeded(passphrase ?? undefined);

        // Show feedback if a sync was triggered
        if (result.synced) {
          if (result.success) {
            const syncTime = new Date().toLocaleTimeString();
            showNotification('Synced After Wake', 'Your recurring expenses are up to date.');
            updateTrayMenu(handleSyncClick, `Last sync: ${syncTime}`);
            updateHealthStatus(true, syncTime);
          } else {
            showNotification('Sync Failed', result.error || 'Unable to sync. Please try again later.');
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

  // Cleanup lock manager
  cleanupLockManager();

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
app.on('activate', async () => {
  let mainWindow = getMainWindow();
  if (!mainWindow) {
    // Recreate window if it was closed
    await createWindow(backendManager.getPort());
    // Update lock manager with new window reference
    mainWindow = getMainWindow();
    if (mainWindow) {
      updateMainWindowRef(mainWindow);
    }
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
