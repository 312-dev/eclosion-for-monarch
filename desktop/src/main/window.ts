/**
 * Window Management
 *
 * Handles BrowserWindow creation, state persistence, and lifecycle.
 */

import { BrowserWindow, shell, app } from 'electron';
import path from 'path';
import Store from 'electron-store';

const store = new Store();

let mainWindow: BrowserWindow | null = null;

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

// Track if we're quitting the app (vs hiding to tray)
let isQuitting = false;

export function setIsQuitting(value: boolean): void {
  isQuitting = value;
}

export function getIsQuitting(): boolean {
  return isQuitting;
}

/**
 * Create the main application window.
 */
export async function createWindow(backendPort: number): Promise<BrowserWindow> {
  // Restore window bounds from previous session
  const bounds = store.get('windowBounds', {
    width: 1200,
    height: 800,
  }) as WindowBounds;

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 800,
    minHeight: 600,
    title: 'Eclosion',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    // Platform-specific styling
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a1a2e',
    show: false, // Don't show until ready
  });

  // Load the frontend
  const frontendPath = path.join(
    process.resourcesPath || app.getAppPath(),
    'frontend',
    'index.html'
  );

  // Load frontend with backend port as query parameter
  await mainWindow.loadFile(frontendPath, {
    query: { _backendPort: String(backendPort) },
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle close - minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();

      // Save window bounds
      const currentBounds = mainWindow?.getBounds();
      if (currentBounds) {
        store.set('windowBounds', currentBounds);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * Get the main window instance.
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Show the main window and focus it.
 */
export function showWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * Hide the main window.
 */
export function hideWindow(): void {
  mainWindow?.hide();
}

/**
 * Toggle window visibility.
 */
export function toggleWindow(): void {
  if (mainWindow?.isVisible()) {
    hideWindow();
  } else {
    showWindow();
  }
}

/**
 * Navigate to a specific path in the app.
 */
export function navigateTo(routePath: string): void {
  mainWindow?.webContents.send('navigate', routePath);
}
