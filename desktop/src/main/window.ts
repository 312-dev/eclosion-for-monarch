/**
 * Window Management
 *
 * Handles BrowserWindow creation, state persistence, and lifecycle.
 */

import { BrowserWindow, shell, app, session } from 'electron';
import path from 'path';
import Store from 'electron-store';

const store = new Store();

/**
 * Setup Content Security Policy headers for renderer security.
 */
function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'", // Tailwind uses inline styles
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*",
          ].join('; '),
        ],
      },
    });
  });
}

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
  // Setup Content Security Policy
  setupCSP();

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

  // Handle close - behavior depends on runInBackground setting
  mainWindow.on('close', (event) => {
    // Save window bounds regardless of close behavior
    const currentBounds = mainWindow?.getBounds();
    if (currentBounds) {
      store.set('windowBounds', currentBounds);
    }

    if (!isQuitting) {
      const runInBackground = store.get('runInBackground', false) as boolean;
      if (runInBackground) {
        // Hide to tray instead of quitting
        event.preventDefault();
        mainWindow?.hide();
      }
      // If runInBackground is false, allow the window to close normally
      // which will trigger app quit via window-all-closed handler
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
