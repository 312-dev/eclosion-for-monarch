/**
 * Application Menu
 *
 * Sets up the native macOS/Windows application menu bar.
 */

import { Menu, app, shell } from 'electron';
import { getMainWindow, showWindow } from './window';

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
 * - Stable builds link to eclosion.app/docs (versioned docs site)
 */
function getDocsUrl(): string {
  return isBetaBuild()
    ? 'https://beta.eclosion.app/docs'
    : 'https://eclosion.app/docs';
}

/**
 * Create and set the application menu.
 */
export function createAppMenu(): void {
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
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
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
              'https://github.com/GraysonCAdams/eclosion-for-monarch/issues'
            );
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
