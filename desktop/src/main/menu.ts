/**
 * Application Menu
 *
 * Sets up the native macOS/Windows application menu bar.
 */

import { Menu, app, shell, clipboard, dialog } from 'electron';
import { getMainWindow, showWindow } from './window';
import { exportDiagnostics, getQuickDebugInfo } from './diagnostics';
import { createBackup, restoreBackup, getBackupWarning, getRestoreWarning } from './backup';
import { lockApp } from './lock-manager';
import { checkForUpdates } from './updater';

/**
 * Callback for sync action (set by createAppMenu).
 */
let syncCallback: (() => Promise<void>) | null = null;

/**
 * Check if the current app version is a beta build.
 * Beta versions contain "beta" in their version string (e.g., "1.1.0-beta.20260104.1").
 */
function isBetaBuild(): boolean {
  return app.getVersion().toLowerCase().includes('beta');
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
 * Create and set the application menu.
 * @param onSync Callback to trigger a sync (optional, enables Sync Now menu item)
 */
export function createAppMenu(onSync?: () => Promise<void>): void {
  syncCallback = onSync || null;
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
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
        ]
      : []),
    // File menu
    {
      label: 'File',
      submenu: [
        ...(!isMac
          ? [
              {
                label: 'Settings',
                accelerator: 'CmdOrCtrl+,',
                click: (): void => {
                  showWindow();
                  const mainWindow = getMainWindow();
                  mainWindow?.webContents.send('navigate', '/settings');
                },
              },
              { type: 'separator' as const },
            ]
          : []),
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
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
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
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        // Developer tools available in development builds and beta releases
        ...(!app.isPackaged || isBetaBuild()
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
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
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
