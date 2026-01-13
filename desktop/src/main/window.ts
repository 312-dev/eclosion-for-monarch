/**
 * Window Management
 *
 * Handles BrowserWindow creation, state persistence, and lifecycle.
 */

import { BrowserWindow, shell, app, session } from 'electron';
import path from 'node:path';
import Store from 'electron-store';

// Lazy store initialization to ensure app.setPath('userData') is called first
let store: Store | null = null;
function getStore(): Store {
  store ??= new Store();
  return store;
}

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
            "img-src 'self' data: https:", // Allow external images (icons, etc.)
            "font-src 'self' data:",
            // Allow backend API, GitHub raw for ideas.json fallback, and GitHub API for beta changelog
            "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:* https://raw.githubusercontent.com https://api.github.com",
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
  const bounds = getStore().get('windowBounds', {
    width: 1200,
    height: 800,
  }) as WindowBounds;

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 515,
    minHeight: 600,
    title: 'Eclosion',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    /**
     * Title Bar Styling - Platform-Specific Design
     *
     * macOS: Uses 'hiddenInset' for a modern, integrated look:
     * - Traffic lights (close/minimize/maximize) are inset into the window content
     * - Creates a seamless header that blends app branding with window chrome
     * - Standard for modern macOS apps (Slack, Discord, VS Code, Notion)
     * - Requires extra padding in header component to avoid traffic light overlap
     *   (see AppShell.tsx: paddingLeft when isMacOSElectron)
     *
     * Windows/Linux: Uses 'default' for native appearance:
     * - Standard title bar with native window controls (minimize/maximize/close)
     * - Matches OS conventions and user expectations
     * - Better accessibility with native control behavior
     *
     * Why not use 'hiddenInset' everywhere?
     * - Windows: Requires custom window controls (more code, less accessible)
     * - Linux: Varies by desktop environment, native is more reliable
     * - Each platform has different conventions for window chrome
     */
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

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent page title from updating window title (keeps dock menu showing "Eclosion")
  // Must be registered BEFORE loadFile to catch the initial title update
  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  /**
   * Backend Port Communication Architecture
   *
   * The backend runs on a dynamically-assigned port (5001-5100 range). The frontend
   * needs this port to make API requests. We use two complementary mechanisms:
   *
   * 1. **Query Parameter** (passed here): The port is embedded in the URL as
   *    `?_backendPort=5001`. This makes the port visible for debugging and provides
   *    a synchronous access path before IPC is fully initialized.
   *
   * 2. **IPC Handler** (in ipc.ts): The `get-backend-port` handler allows the
   *    renderer to request the port asynchronously. This is the primary mechanism
   *    used by the frontend (see frontend/src/utils/apiBase.ts).
   *
   * Why this design?
   * - IPC is preferred because it's the standard Electron pattern for main↔renderer
   *   communication and works reliably after the preload script loads.
   * - The query parameter serves as a fallback/debug mechanism and allows inspection
   *   of the port without developer tools.
   * - Both mechanisms are kept for resilience; if IPC fails during startup, the
   *   query parameter could be used as a fallback (though currently not implemented).
   */
  await mainWindow.loadFile(frontendPath, {
    query: { _backendPort: String(backendPort) },
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle close - behavior depends on menuBarMode setting
  mainWindow.on('close', (event) => {
    // Save window bounds regardless of close behavior
    const currentBounds = mainWindow?.getBounds();
    if (currentBounds) {
      getStore().set('windowBounds', currentBounds);
    }

    if (!isQuitting) {
      const menuBarMode = getStore().get('menuBarMode', false) as boolean;
      if (menuBarMode) {
        // Hide to tray instead of quitting
        event.preventDefault();
        mainWindow?.hide();
      }
      // If menuBarMode is false, allow the window to close normally
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
