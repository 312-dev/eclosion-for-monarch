/**
 * Window Management
 *
 * Handles BrowserWindow creation, state persistence, and lifecycle.
 */

import { BrowserWindow, shell, app, session, screen } from 'electron';
import path from 'node:path';
import { getStore } from './store';

// Window creation timing for debugging installer launch delays
let windowCreateStart = 0;
function logWindowTiming(event: string): void {
  const elapsed = windowCreateStart > 0 ? Date.now() - windowCreateStart : 0;
  console.log(`[WINDOW +${elapsed}ms] ${event}`);
}

/**
 * Get platform-specific title bar configuration.
 * Extracted to avoid nested ternary in BrowserWindow options.
 */
function getTitleBarConfig(): Electron.BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return { titleBarStyle: 'hiddenInset' };
  }
  if (process.platform === 'win32') {
    return {
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#1e1e2e', // --monarch-bg-card
        symbolColor: '#cdd6f4', // --monarch-text-light
        height: 32,
      },
    };
  }
  // Linux and other platforms: use native title bar
  return { titleBarStyle: 'default' };
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
  windowCreateStart = Date.now();
  logWindowTiming('createWindow() called');

  // Setup Content Security Policy
  logWindowTiming('Setting up CSP');
  setupCSP();
  logWindowTiming('CSP configured');

  // Start in compact mode - centered on screen
  // Full bounds will be restored when setWindowMode('full') is called
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Center the compact window on screen
  const x = Math.round((screenWidth - COMPACT_WINDOW.width) / 2);
  const y = Math.round((screenHeight - COMPACT_WINDOW.height) / 2);

  currentWindowMode = 'compact';

  logWindowTiming('Creating BrowserWindow');
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
     * Windows: Uses 'hidden' with titleBarOverlay for modern frameless look:
     * - Native window controls (minimize/maximize/close) overlaid on content
     * - Similar to VS Code, Edge, and other modern Windows apps
     * - Requires right padding in header to avoid control overlap
     *   (see AppHeader.tsx: paddingRight when isWindowsElectron)
     *
     * Linux: Uses 'default' for native appearance:
     * - Standard title bar with native window controls
     * - Varies by desktop environment, native is more reliable
     */
    ...getTitleBarConfig(),
    backgroundColor: '#1a1a2e',
    // show: true is the default - window appears immediately for native focus behavior
  });
  logWindowTiming('BrowserWindow created');

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

  // Register ready-to-show handler for logging and potential future "start minimized" feature.
  // Since show:true is default, the window is already visible by the time this fires.
  mainWindow.once('ready-to-show', () => {
    logWindowTiming('ready-to-show event fired');
    // Window is already visible due to show:true default.
    // This handler is kept for potential future startMinimized support:
    // const startMinimized = getStore().get('desktop.startMinimized', false);
    // if (startMinimized) mainWindow?.hide();
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
  logWindowTiming('Calling loadFile');
  await mainWindow.loadFile(frontendPath, {
    query: { _backendPort: String(backendPort) },
  });
  logWindowTiming('loadFile completed');

  // Handle close - always hide to tray instead of quitting
  // The app runs in both the dock/taskbar AND the system tray/menu bar
  mainWindow.on('close', (event) => {
    // Always save window bounds regardless of close behavior
    const currentBounds = mainWindow?.getBounds();
    if (currentBounds) {
      getStore().set('windowBounds', currentBounds);
    }

    if (!isQuitting) {
      // Hide to tray instead of quitting (dock stays visible)
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Handle minimize - use default behavior (minimize to dock/taskbar)
  // No custom handling needed since we always show in both dock and tray

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
 * Bring window to foreground when re-activating (tray click, hotkey, dock click, etc.)
 * Uses native Electron APIs for cross-platform focus handling.
 */
export function bringToForeground(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  // Restore if minimized
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  // Use app.focus() with steal:true for reliable cross-platform focus
  // This is the recommended approach for re-activation scenarios
  app.focus({ steal: true });

  // Ensure window is visible and focused
  mainWindow.show();
  mainWindow.focus();
}

/**
 * Show the main window and focus it.
 */
export function showWindow(): void {
  bringToForeground();
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
