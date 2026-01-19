/**
 * Eclosion Desktop - Main Entry Point
 *
 * This is the main process entry point for the Electron application.
 * It orchestrates the backend, window, tray, and update systems.
 */

import { app, dialog, powerMonitor } from 'electron';
import * as path from 'node:path';
import { getAppDisplayName, getAppFolderName, getAppFolderNameLower, isBetaBuild } from './beta';

// ============================================================================
// STARTUP TIMING INSTRUMENTATION
// Captures detailed timing for debugging installer launch delays
// ============================================================================
const STARTUP_TIME = Date.now();
const startupTimings: Array<{ event: string; elapsed: number; timestamp: string }> = [];

function logStartupTiming(event: string): void {
  const elapsed = Date.now() - STARTUP_TIME;
  const timestamp = new Date().toISOString();
  startupTimings.push({ event, elapsed, timestamp });
  // Log immediately to console (captured by electron-log)
  console.log(`[STARTUP +${elapsed}ms] ${event}`);
}

logStartupTiming('Module load started');

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

logStartupTiming('App paths configured');

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
  updateHealthStatus,
  isAuthError,
  isRateLimitError,
  showReauthNotification,
} from './tray';
import { setupIpcHandlers, createLoadingReadyPromise } from './ipc';
import { initializeUpdater, scheduleUpdateChecks, offerUpdateOnStartupFailure, checkForUpdatesOnBoot } from './updater';
import { createMinimalMenu, setSyncCallback } from './menu';
import {
  registerDeepLinkProtocol,
  setupDeepLinkHandlers,
  handleInitialDeepLink,
  getDeepLinkFromArgs,
  handleDeepLink,
} from './deeplinks';
import { recordMilestone, finalizeStartupMetrics } from './startup-metrics';
import { initializeLockManager, cleanupLockManager, updateMainWindowRef, getLockTrigger } from './lock-manager';
import {
  getStoredPassphrase,
  getMonarchCredentials,
  hasMonarchCredentials,
  isPassphraseStored,
  clearStoredPassphrase,
} from './biometric';
import { setPendingSync } from './sync-pending';
import {
  initializeAutoBackup,
  checkAndRunDailyBackup,
  cleanupAutoBackup,
} from './auto-backup';
import { migrateSettings } from './settings-migration';
import { checkAndRepairBackend } from './integrity';

/**
 * Check if the app is running from a macOS DMG volume mount.
 * DMG volumes are read-only and cause backend failures.
 *
 * @returns Object with isVolume flag and the volume path if detected
 */
function checkRunningFromVolume(): { isVolume: boolean; volumePath?: string } {
  if (process.platform !== 'darwin') {
    return { isVolume: false };
  }

  const appPath = app.getAppPath();
  const resourcesPath = process.resourcesPath || appPath;

  // Check if either path starts with /Volumes/
  // This indicates the app is being run directly from a mounted DMG
  if (appPath.startsWith('/Volumes/') || resourcesPath.startsWith('/Volumes/')) {
    const pathToCheck = resourcesPath.startsWith('/Volumes/') ? resourcesPath : appPath;
    // Extract the volume name (e.g., "/Volumes/Eclosion (Beta) 1.2.6-arm64")
    const volumeMatch = /^\/Volumes\/[^/]+/.exec(pathToCheck);
    return {
      isVolume: true,
      volumePath: volumeMatch ? volumeMatch[0] : '/Volumes',
    };
  }

  return { isVolume: false };
}

// Single instance lock - prevent multiple instances
debugLog('Requesting single instance lock...');
logStartupTiming('Requesting single instance lock');
const gotTheLock = app.requestSingleInstanceLock();
logStartupTiming(`Single instance lock result: ${gotTheLock}`);
debugLog(`Got lock: ${gotTheLock}`);

if (gotTheLock) {
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
} else {
  debugLog('Another instance is already running - quitting');
  app.quit();
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

  // Handle negative values (clock skew or future timestamps) gracefully
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
  logStartupTiming('initialize() called');
  debugLog('Initialize function called');
  debugLog(`Version: ${app.getVersion()}`);
  debugLog(`Platform: ${process.platform}`);
  debugLog(`Arch: ${process.arch}`);

  addBreadcrumb({ category: 'lifecycle', message: 'App initializing' });

  try {
    // Run settings migrations early, before any settings are read
    logStartupTiming('Running settings migrations');
    migrateSettings();

    // Register deep link protocol (eclosion://)
    logStartupTiming('Registering deep link protocol');
    registerDeepLinkProtocol();
    logStartupTiming('Deep link protocol registered');

    // Initialize backend manager
    debugLog('Creating BackendManager...');
    logStartupTiming('Creating BackendManager');
    backendManager = new BackendManager();
    logStartupTiming('BackendManager created');
    debugLog('BackendManager created');

    // Setup IPC handlers (needed before window creation)
    debugLog('Setting up IPC handlers...');
    logStartupTiming('Setting up IPC handlers');
    setupIpcHandlers(backendManager);
    logStartupTiming('IPC handlers ready');
    debugLog('IPC handlers set up');

    // Create the loading ready promise BEFORE creating the window
    // This allows us to wait for the loading screen to render before starting heavy work
    const loadingReady = createLoadingReadyPromise();

    // Create main window IMMEDIATELY after IPC is ready
    // This ensures the loading screen appears as fast as possible
    // Other initialization (tray, hotkeys, etc.) happens in parallel below
    console.log('Creating main window...');
    logStartupTiming('Creating main window (awaiting)');
    await createWindow(BACKEND_NOT_READY_PORT);
    logStartupTiming('Main window created and shown');
    recordMilestone('windowCreated');

    // Wait for loading screen to signal it's rendered (with 5s timeout fallback)
    // This guarantees the user sees the loading UI before any potential freeze from heavy work
    logStartupTiming('Waiting for loading screen ready signal');
    const loadingTimeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
    await Promise.race([loadingReady, loadingTimeout]);
    logStartupTiming('Loading screen ready (or timeout)');

    // --- Everything below runs while the loading screen is visible ---

    // Check backend integrity and repair if corrupted
    // This repairs backends corrupted by electron-updater differential updates
    logStartupTiming('Checking backend integrity');
    const mainWindowForIntegrity = getMainWindow();
    const integrityOk = await checkAndRepairBackend((message, progress) => {
      // Send status to loading screen via the same channel as backend startup
      if (mainWindowForIntegrity && !mainWindowForIntegrity.isDestroyed()) {
        mainWindowForIntegrity.webContents.send('backend-startup-status', {
          phase: 'initializing',
          message,
          progress,
        });
      }
    });
    if (!integrityOk) {
      debugLog('Backend integrity check failed - cannot continue');
      app.quit();
      return;
    }
    logStartupTiming('Backend integrity check passed');

    // Initialize auto-backup manager
    logStartupTiming('Initializing auto-backup');
    initializeAutoBackup(backendManager);

    // Clean up old passphrase-based credentials if new mode isn't set up yet
    // This handles the upgrade path: users need to log in fresh with the new simplified flow
    if (!hasMonarchCredentials() && isPassphraseStored()) {
      debugLog('Cleaning up old passphrase-based credentials (upgrade to new auth flow)');
      clearStoredPassphrase();
    }

    // Initialize auto-updater (only in packaged builds - dev mode has no app-update.yml)
    if (app.isPackaged) {
      debugLog('Initializing updater...');
      logStartupTiming('Initializing updater');
      initializeUpdater();
      logStartupTiming('Updater initialized');
      debugLog('Updater initialized');

      // Check for updates on boot with 10-second timeout
      // If update found, it will auto-download and auto-install (app restarts)
      logStartupTiming('Checking for updates on boot');
      const bootUpdateResult = await checkForUpdatesOnBoot();
      logStartupTiming(`Boot update check complete: ${bootUpdateResult.updateAvailable ? 'update available' : 'no update'}`);

      if (bootUpdateResult.updateAvailable) {
        debugLog(`Update ${bootUpdateResult.version} found on boot - downloading...`);
        // The updater will auto-download and auto-install, restarting the app
        // We don't need to wait here - the app will restart when download completes
      }
    } else {
      debugLog('Skipping updater initialization (development mode)');
    }

    // Initialize dock visibility (macOS menu bar mode)
    logStartupTiming('Initializing dock visibility');
    initializeDockVisibility();

    // Create minimal application menu (pre-login state, macOS only)
    // Full menu is activated after successful login via IPC
    // Store the sync callback so it's available when switching to full menu
    logStartupTiming('Creating minimal menu');
    setSyncCallback(handleSyncClick);
    createMinimalMenu();

    // Create system tray
    console.log('Creating system tray...');
    logStartupTiming('Creating system tray');
    createTray(handleSyncClick);
    logStartupTiming('System tray created');

    // Setup deep link handlers (for eclosion:// URLs)
    logStartupTiming('Setting up deep link handlers');
    setupDeepLinkHandlers(handleSyncClick);

    // Initialize lock manager (handles auto-lock on system lock or idle)
    logStartupTiming('Initializing lock manager');
    const mainWindow = getMainWindow();
    if (mainWindow) {
      initializeLockManager(mainWindow);
    }

    // Setup power monitor for sleep/wake handling
    logStartupTiming('Setting up power monitor');
    setupPowerMonitor();

    // Schedule periodic update checks (only in packaged builds)
    if (app.isPackaged) {
      updateCheckInterval = scheduleUpdateChecks(6); // Check every 6 hours
    }

    // Handle deep link if app was opened via eclosion:// URL
    handleInitialDeepLink();

    logStartupTiming('Primary initialization complete - starting backend');

    // Start Python backend in background (doesn't block window display)
    debugLog('Starting backend in background...');
    recordMilestone('backendStarting');
    startBackendAndInitialize().catch(async (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      debugLog(`Backend startup failed: ${errorMessage}`);

      // If startup failed and there's a pending update, offer to install it
      // This gives users a way to recover from startup bugs via updates
      const installingUpdate = await offerUpdateOnStartupFailure();
      if (installingUpdate) {
        debugLog('Installing update to attempt recovery from startup failure');
      }
      // Otherwise error is handled by the backend manager's event emission
    });

    addBreadcrumb({ category: 'lifecycle', message: 'Window created, backend starting in background' });
    console.log('Window initialization complete, backend starting...');

    // Log startup timing summary for debugging installer launch delays
    logStartupTiming('initialize() returning');
    console.log('\n========== STARTUP TIMING SUMMARY ==========');
    for (const timing of startupTimings) {
      console.log(`  ${timing.elapsed.toString().padStart(5)}ms - ${timing.event}`);
    }
    console.log('=============================================\n');
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
 * Notify renderer about rate limit error.
 */
function notifyRendererRateLimited(): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('monarch-rate-limited', {
      retryAfter: 60,
    });
  }
}

/**
 * Notify renderer that MFA is required.
 */
function notifyRendererMfaRequired(email: string, mfaMode: string): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auth:mfa-required', {
      email,
      mfaMode,
    });
  }
}

interface SessionRestoreResult {
  sessionRestored: boolean;
  mfaRequired: boolean;
  rateLimited: boolean;
}

/**
 * Attempt to restore session from stored credentials.
 * Handles rate limiting and MFA requirements.
 */
async function tryRestoreSession(): Promise<SessionRestoreResult> {
  const result: SessionRestoreResult = {
    sessionRestored: false,
    mfaRequired: false,
    rateLimited: false,
  };

  if (!hasMonarchCredentials()) {
    return result;
  }

  const credentials = getMonarchCredentials();
  if (!credentials) {
    return result;
  }

  debugLog('Restoring session from stored credentials...');
  const restoreResult = await backendManager.restoreSession(credentials);

  if (restoreResult.success) {
    debugLog('Session restored successfully');
    result.sessionRestored = true;
    return result;
  }

  debugLog(`Session restore failed: ${restoreResult.error}`);

  if (isRateLimitError(restoreResult.error)) {
    debugLog('Rate limited during session restore - will notify renderer');
    result.rateLimited = true;
    notifyRendererRateLimited();
  } else if (restoreResult.mfaRequired) {
    debugLog('MFA required for session restore - will prompt user');
    result.mfaRequired = true;
    notifyRendererMfaRequired(credentials.email, credentials.mfaMode || 'code');
  }

  return result;
}

/**
 * Check if sync is needed and run it if so.
 * Updates tray status on successful sync.
 */
async function checkAndRunStartupSync(sessionRestored: boolean): Promise<void> {
  const passphrase = sessionRestored ? undefined : getStoredPassphrase();
  const syncResult = await backendManager.checkSyncNeeded(passphrase ?? undefined);

  if (syncResult.synced && syncResult.success) {
    const syncTime = new Date().toLocaleTimeString();
    updateTrayMenu(handleSyncClick, `Last sync: ${syncTime}`);
    updateHealthStatus(true, syncTime);
  }
  // Sync failures on startup are silent - user can check tray status or sync manually
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

  // Fetch last sync time and update tray
  const lastSyncIso = await backendManager.fetchLastSyncTime();
  if (lastSyncIso) {
    const syncStatus = `Last sync: ${formatRelativeTime(lastSyncIso)}`;
    updateTrayMenu(handleSyncClick, syncStatus);
    updateHealthStatus(true, formatRelativeTime(lastSyncIso));
  }

  // Check if auto-lock is enabled - if so, don't restore session automatically
  // User will need to unlock via the UnlockPage
  const lockTrigger = getLockTrigger();
  const autoLockEnabled = lockTrigger !== 'never';
  const hasCredentials = hasMonarchCredentials();

  if (autoLockEnabled && hasCredentials) {
    debugLog(`Auto-lock enabled (${lockTrigger}) - starting locked, skipping session restore`);
    // Session will be restored when user unlocks via the UnlockPage
    // The frontend will detect this state via checkAuth and show unlock screen
    return;
  }

  // Restore session from stored credentials
  const { sessionRestored, mfaRequired, rateLimited } = await tryRestoreSession();

  // Check if sync is needed (skip if MFA is required or rate limited)
  if (!mfaRequired && !rateLimited) {
    await checkAndRunStartupSync(sessionRestored);
  }

  // Check if daily backup is needed (runs in background, doesn't block startup)
  if (sessionRestored) {
    void checkAndRunDailyBackup();
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
    updateTrayMenu(handleSyncClick, `Last sync: ${syncTime}`);
    updateHealthStatus(true, syncTime);
  } else if (isRateLimitError(result.error)) {
    // Rate limited - notify renderer to show banner
    debugLog('Rate limited during sync - notifying renderer');
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('monarch-rate-limited', {
        retryAfter: 60,
      });
    }
  } else if (isAuthError(result.error)) {
    // Auth error (session expired, MFA needed) - show reauth notification
    showReauthNotification();
  }
  // Other sync failures are silent - tray status and in-app toasts handle feedback
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

        // Update tray status if sync was triggered and succeeded
        if (result.synced && result.success) {
          const syncTime = new Date().toLocaleTimeString();
          updateTrayMenu(handleSyncClick, `Last sync: ${syncTime}`);
          updateHealthStatus(true, syncTime);
        }
        // Wake sync failures are silent - user can check tray status or sync manually
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

  // Cleanup lock manager
  cleanupLockManager();

  // Cleanup auto-backup
  cleanupAutoBackup();

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
  logStartupTiming('app.ready event fired');
  recordMilestone('appReady');

  // Check if running from a DMG volume mount (macOS)
  // This must happen before any initialization that requires write access
  const volumeCheck = checkRunningFromVolume();
  if (volumeCheck.isVolume) {
    debugLog(`App is running from volume mount: ${volumeCheck.volumePath}`);
    dialog.showErrorBox(
      'Move to Applications',
      'Eclosion cannot run directly from the disk image.\n\n' +
        'Please drag the Eclosion app to your Applications folder (or another location on your drive), ' +
        'then eject the disk image and launch from the new location.\n\n' +
        'This is required because the app needs write access to store your settings and data.'
    );
    app.exit(1);
    return;
  }

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
  const mainWindow = getMainWindow();
  if (mainWindow) {
    showWindow();
  } else {
    // Recreate window if it was closed
    await createWindow(backendManager.getPort());
    // Update lock manager with new window reference
    const newWindow = getMainWindow();
    if (newWindow) {
      updateMainWindowRef(newWindow);
    }
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
