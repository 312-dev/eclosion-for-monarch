/**
 * Window Management
 *
 * Handles BrowserWindow creation, state persistence, and lifecycle.
 */

import { BrowserWindow, shell, app, session, screen } from 'electron';
import path from 'node:path';
import Store from 'electron-store';

// Lazy store initialization to ensure app.setPath('userData') is called first
let store: Store | null = null;
function getStore(): Store {
  store ??= new Store();
  return store;
}

/**
 * Compact window dimensions for loading/login screens.
 * These screens don't need full app width, so we show a smaller, centered window.
 * Height can be dynamically adjusted via setCompactSize() based on content.
 */
const COMPACT_WINDOW = {
  /** Default/initial width */
  width: 550,
  /** Default/initial height (used for loading screen) */
  height: 700,
  /** Minimum width allowed */
  minWidth: 450,
  /** Minimum height allowed */
  minHeight: 500,
  /** Maximum height allowed (content shouldn't need more than this) */
  maxHeight: 1000,
};

/**
 * Default full window dimensions for the main app.
 */
const DEFAULT_FULL_WINDOW = {
  width: 1200,
  height: 800,
  minWidth: 515,
  minHeight: 600,
};

/**
 * Track the current window mode to avoid unnecessary resizes.
 */
let currentWindowMode: 'compact' | 'full' = 'compact';

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

/**
 * Force window to foreground on Windows.
 * Windows prevents apps from stealing focus, so we use the setAlwaysOnTop
 * workaround combined with restore/show/focus to ensure visibility.
 * This is especially important when launched from the installer.
 */
function forceWindowFocus(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  // Restore if minimized
  if (win.isMinimized()) {
    win.restore();
  }
  // Ensure visible
  if (!win.isVisible()) {
    win.show();
  }
  // setAlwaysOnTop trick to bring to front
  win.setAlwaysOnTop(true);
  win.setAlwaysOnTop(false);
  // Request focus
  win.focus();
}

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
 * Starts in compact mode (centered, smaller size) for loading/login screens.
 * Call setWindowMode('full') when the main app is ready.
 */
export async function createWindow(backendPort: number): Promise<BrowserWindow> {
  // Setup Content Security Policy
  setupCSP();

  // Start in compact mode - centered on screen
  // Full bounds will be restored when setWindowMode('full') is called
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Center the compact window on screen
  const x = Math.round((screenWidth - COMPACT_WINDOW.width) / 2);
  const y = Math.round((screenHeight - COMPACT_WINDOW.height) / 2);

  currentWindowMode = 'compact';

  mainWindow = new BrowserWindow({
    x,
    y,
    width: COMPACT_WINDOW.width,
    height: COMPACT_WINDOW.height,
    minWidth: COMPACT_WINDOW.minWidth,
    minHeight: COMPACT_WINDOW.minHeight,
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
    // Windows prevents apps from stealing focus. Use setAlwaysOnTop workaround
    // to ensure window is visible when launched from installer or startup.
    // We need to do this multiple times with delays because the installer may
    // still have focus when the app first becomes ready.
    if (process.platform === 'win32') {
      // Initial focus attempt
      forceWindowFocus(mainWindow);
      // Retry after short delay (installer might still be closing)
      setTimeout(() => forceWindowFocus(mainWindow), 300);
      // Final retry after installer is likely gone
      setTimeout(() => forceWindowFocus(mainWindow), 1000);
    } else {
      mainWindow?.focus();
    }
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

/**
 * Set the window mode (compact or full).
 *
 * - 'compact': Small, centered window for loading/login screens
 * - 'full': Restores previous window bounds (or defaults) for main app
 *
 * This enables a better UX where the app opens as a small centered window
 * during startup, then expands to full size once the main content is ready.
 */
export function setWindowMode(mode: 'compact' | 'full'): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (currentWindowMode === mode) return;

  currentWindowMode = mode;

  if (mode === 'compact') {
    // Switch to compact mode - center on screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const x = Math.round((screenWidth - COMPACT_WINDOW.width) / 2);
    const y = Math.round((screenHeight - COMPACT_WINDOW.height) / 2);

    mainWindow.setMinimumSize(COMPACT_WINDOW.minWidth, COMPACT_WINDOW.minHeight);
    mainWindow.setBounds({
      x,
      y,
      width: COMPACT_WINDOW.width,
      height: COMPACT_WINDOW.height,
    });
  } else {
    // Switch to full mode - restore saved bounds or use defaults
    const savedBounds = getStore().get('windowBounds') as WindowBounds | undefined;
    const bounds = savedBounds ?? {
      width: DEFAULT_FULL_WINDOW.width,
      height: DEFAULT_FULL_WINDOW.height,
    };

    // Update minimum size first
    mainWindow.setMinimumSize(DEFAULT_FULL_WINDOW.minWidth, DEFAULT_FULL_WINDOW.minHeight);

    if (savedBounds?.x !== undefined && savedBounds?.y !== undefined) {
      // Restore exact position if we have it
      mainWindow.setBounds({
        x: savedBounds.x,
        y: savedBounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    } else {
      // No saved position - resize and center
      mainWindow.setSize(bounds.width, bounds.height);
      mainWindow.center();
    }
  }
}

/**
 * Get the current window mode.
 */
export function getWindowMode(): 'compact' | 'full' {
  return currentWindowMode;
}

/**
 * Dynamically resize the compact window based on content height.
 * Only works when in compact mode. The height is clamped to:
 * - Minimum: COMPACT_WINDOW.minHeight
 * - Maximum: min(COMPACT_WINDOW.maxHeight, screenWorkAreaHeight - padding)
 *
 * This allows screens to request their optimal height (e.g., login form with MFA
 * needs more height than the loading screen) while respecting the user's display.
 *
 * @param height - The desired content height in pixels
 * @returns The actual height applied (after clamping)
 */
export function setCompactSize(height: number): number {
  if (!mainWindow || mainWindow.isDestroyed()) return 0;
  if (currentWindowMode !== 'compact') return 0;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Leave some padding from screen edges (40px top + bottom)
  const maxScreenHeight = screenHeight - 80;

  // Clamp height to bounds, respecting both our max and the user's screen
  const clampedHeight = Math.max(
    COMPACT_WINDOW.minHeight,
    Math.min(height, COMPACT_WINDOW.maxHeight, maxScreenHeight)
  );

  // Get current width (maintain it)
  const currentBounds = mainWindow.getBounds();
  const width = currentBounds.width;

  // Center the window with the new height
  const x = Math.round((screenWidth - width) / 2);
  const y = Math.round((screenHeight - clampedHeight) / 2);

  mainWindow.setBounds({
    x,
    y,
    width,
    height: clampedHeight,
  });

  return clampedHeight;
}
