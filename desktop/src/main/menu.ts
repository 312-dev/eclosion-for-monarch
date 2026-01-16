/**
 * Application Menu
 *
 * Sets up the native macOS application menu bar.
 * Windows/Linux hide the menu bar entirely (no menu bar shown).
 *
 * On macOS, we show a minimal menu before login (just essential app controls)
 * and expand to the full menu after login.
 */

import { Menu, app, shell, clipboard, dialog } from 'electron';
import { getMainWindow, showWindow } from './window';
import { exportDiagnostics, getQuickDebugInfo } from './diagnostics';
import { createBackup, restoreBackup, getBackupWarning, getRestoreWarning } from './backup';
import { lockApp } from './lock-manager';
import { checkForUpdates } from './updater';
import { getStore } from './store';

/**
 * Callback for sync action (set by createAppMenu).
 */
let syncCallback: (() => Promise<void>) | null = null;

/**
 * Track whether we're showing the full menu (post-login) or minimal menu (pre-login).
 */
let isFullMenuActive = false;

/**
 * Check if the current app version is a beta build.
 * Beta builds are identified by:
 * - Version containing "beta" (e.g., "1.1.0-beta.20260104.1") - CI releases
 * - App name containing "Beta" (e.g., "Eclosion (Beta)") - local builds via electron-builder.beta.yml
 * - RELEASE_CHANNEL env var set to "beta" - local builds via npm run dist:beta:*
 */
function isBetaBuild(): boolean {
  return (
    app.getVersion().toLowerCase().includes('beta') ||
    app.getName().toLowerCase().includes('beta') ||
    process.env.RELEASE_CHANNEL === 'beta'
  );
}

/**
 * Check if developer mode is enabled in settings.
 */
function isDeveloperMode(): boolean {
  return getStore().get('settings.developerMode', false);
}

/**
 * Get the documentation URL based on whether this is a beta or stable build.
 * - Beta builds link to beta.eclosion.app/docs (no version path, shows current docs)
 * - Stable builds link to versioned docs matching the app version (e.g., /docs/1.1/)
 */
function getDocsUrl(): string {
  if (isBetaBuild()) {
    return 'https://beta.eclosion.app/docs';
  }
  // Extract major.minor from version (e.g., "1.1.0" -> "1.1")
  const version = app.getVersion();
  const [major, minor] = version.split('.');
  return `https://eclosion.app/docs/${major}.${minor}`;
}

/**
 * Create a minimal menu for the pre-login state (macOS only).
 * This shows only essential app controls: About, Edit (for form input), Window, and basic Help.
 * Windows/Linux don't show any menu bar.
 */
export function createMinimalMenu(): void {
  // Only macOS shows the menu bar
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }

  isFullMenuActive = false;

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS)
    {
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    },
    // Edit menu - needed for form input (copy/paste)
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'pasteAndMatchStyle' as const },
        { role: 'delete' as const },
        { role: 'selectAll' as const },
      ],
    },
    // View menu - only shown in dev/beta for debugging startup issues
    ...(!app.isPackaged || isBetaBuild()
      ? [
          {
            label: 'View',
            submenu: [
              { role: 'reload' as const },
              { role: 'forceReload' as const },
              { role: 'toggleDevTools' as const },
            ],
          },
        ]
      : []),
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        { type: 'separator' as const },
        { role: 'front' as const },
      ],
    },
    // Help menu (minimal)
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Documentation',
          click: async (): Promise<void> => {
            await shell.openExternal(getDocsUrl());
          },
        },
        {
          label: 'Report an Issue',
          click: async (): Promise<void> => {
            await shell.openExternal(
              'https://github.com/312-dev/eclosion/issues'
            );
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create and set the full application menu (post-login).
 * On Windows/Linux, this does nothing (no menu bar shown).
 * @param onSync Callback to trigger a sync (optional, enables Sync Now menu item)
 */
export function createAppMenu(onSync?: () => Promise<void>): void {
  // Only macOS shows the menu bar
  if (process.platform !== 'darwin') {
    syncCallback = onSync || null;
    Menu.setApplicationMenu(null);
    return;
  }

  syncCallback = onSync || null;
  isFullMenuActive = true;

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu
    {
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: (): void => {
            showWindow();
            const mainWindow = getMainWindow();
            mainWindow?.webContents.send('navigate', '/settings');
          },
        },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    },
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Sync Now',
          accelerator: 'CmdOrCtrl+Shift+S',
          enabled: syncCallback !== null,
          click: (): void => {
            if (syncCallback) {
              void syncCallback();
            }
          },
        },
        {
          label: 'Lock',
          accelerator: 'CmdOrCtrl+L',
          click: (): void => {
            lockApp();
          },
        },
        { type: 'separator' },
        {
          label: 'Backup Data...',
          click: async (): Promise<void> => {
            const mainWindow = getMainWindow();
            if (!mainWindow) return;

            // Show warning dialog
            const warning = getBackupWarning();
            const proceed = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Create Backup'],
              defaultId: 1,
              cancelId: 0,
              title: 'Create Backup',
              message: 'Backup includes sensitive data',
              detail: warning,
            });

            if (proceed.response !== 1) return;

            try {
              const result = await createBackup();
              if (result.success && result.path) {
                await dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Backup Created',
                  message: 'Backup created successfully.',
                  detail: `Saved to:\n${result.path}`,
                });
              } else if (result.error) {
                await dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: 'Backup Failed',
                  message: 'Failed to create backup.',
                  detail: result.error,
                });
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              await dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Backup Failed',
                message: 'Failed to create backup.',
                detail: errorMessage,
              });
            }
          },
        },
        {
          label: 'Restore from Backup...',
          click: async (): Promise<void> => {
            const mainWindow = getMainWindow();
            if (!mainWindow) return;

            // Show warning dialog
            const warning = getRestoreWarning();
            const proceed = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Select Backup File'],
              defaultId: 0,
              cancelId: 0,
              title: 'Restore from Backup',
              message: 'This will replace your current data',
              detail: warning,
            });

            if (proceed.response !== 1) return;

            try {
              const result = await restoreBackup();
              if (result.success) {
                const details = [];
                if (result.filesRestored !== undefined) {
                  details.push(`Files restored: ${result.filesRestored}`);
                }
                if (result.settingsRestored) {
                  details.push('Desktop settings restored');
                }
                details.push('\nPlease restart Eclosion for changes to take effect.');

                await dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Restore Complete',
                  message: 'Backup restored successfully.',
                  detail: details.join('\n'),
                });
              } else if (result.error) {
                await dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: 'Restore Failed',
                  message: 'Failed to restore backup.',
                  detail: result.error,
                });
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              await dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Restore Failed',
                message: 'Failed to restore backup.',
                detail: errorMessage,
              });
            }
          },
        },
        { type: 'separator' as const },
        { role: 'close' as const },
      ],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'pasteAndMatchStyle' as const },
        { role: 'delete' as const },
        { role: 'selectAll' as const },
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        // Developer tools available in development builds, beta releases, or when developer mode is enabled
        ...(!app.isPackaged || isBetaBuild() || isDeveloperMode()
          ? [
              { role: 'reload' as const },
              { role: 'forceReload' as const },
              { role: 'toggleDevTools' as const },
              { type: 'separator' as const },
            ]
          : []),
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Toolkit menu
    {
      label: 'Toolkit',
      submenu: [
        {
          label: 'Dashboard',
          click: (): void => {
            showWindow();
            const mainWindow = getMainWindow();
            mainWindow?.webContents.send('navigate', '/dashboard');
          },
        },
        {
          label: 'Recurring Expenses',
          click: (): void => {
            showWindow();
            const mainWindow = getMainWindow();
            mainWindow?.webContents.send('navigate', '/recurring');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Coming Soon',
          enabled: false,
        },
        {
          label: 'Joint Goals',
          enabled: false,
        },
        {
          label: 'Leaderboard',
          enabled: false,
        },
        {
          label: 'Inbox Sync',
          enabled: false,
        },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        { type: 'separator' as const },
        { role: 'front' as const },
        { type: 'separator' as const },
        { role: 'window' as const },
      ],
    },
    // Help menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Documentation',
          click: async (): Promise<void> => {
            await shell.openExternal(getDocsUrl());
          },
        },
        {
          label: 'Report an Issue',
          click: async (): Promise<void> => {
            await shell.openExternal(
              'https://github.com/312-dev/eclosion/issues'
            );
          },
        },
        { type: 'separator' as const },
        {
          label: 'Check for Updates...',
          click: async (): Promise<void> => {
            const mainWindow = getMainWindow();
            const result = await checkForUpdates();
            if (result.updateAvailable && result.version) {
              // Update available - updater will handle the notification
              if (mainWindow) {
                await dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Update Available',
                  message: `Version ${result.version} is available.`,
                  detail: 'The update will be downloaded automatically.',
                });
              }
            } else if (result.error && mainWindow) {
              await dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Update Check Failed',
                message: 'Could not check for updates.',
                detail: result.error,
              });
            } else if (mainWindow) {
              await dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'No Updates',
                message: 'You are running the latest version.',
                detail: `Current version: ${app.getVersion()}`,
              });
            }
          },
        },
        { type: 'separator' as const },
        {
          label: 'Export Diagnostics...',
          click: async (): Promise<void> => {
            try {
              const filePath = await exportDiagnostics();
              if (filePath) {
                const mainWindow = getMainWindow();
                if (mainWindow) {
                  await dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Diagnostics Exported',
                    message: 'Diagnostics exported successfully.',
                    detail: `Saved to:\n${filePath}`,
                  });
                }
              }
            } catch (error) {
              const mainWindow = getMainWindow();
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (mainWindow) {
                await dialog.showMessageBox(mainWindow, {
                  type: 'error',
                  title: 'Export Failed',
                  message: 'Failed to export diagnostics.',
                  detail: errorMessage,
                });
              }
            }
          },
        },
        {
          label: 'Copy Debug Info',
          click: (): void => {
            const info = getQuickDebugInfo();
            clipboard.writeText(info);
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Check if the full menu is currently active (post-login state).
 */
export function isFullMenu(): boolean {
  return isFullMenuActive;
}

/**
 * Get the stored sync callback (for re-creating the menu with sync enabled).
 */
export function getSyncCallback(): (() => Promise<void>) | null {
  return syncCallback;
}

/**
 * Store the sync callback for later use when switching to the full menu.
 * Call this during initialization before the user logs in.
 */
export function setSyncCallback(callback: (() => Promise<void>) | null): void {
  syncCallback = callback;
}
