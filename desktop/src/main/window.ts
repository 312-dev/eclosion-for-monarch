/**
 * Window Management
 *
 * Handles BrowserWindow creation, state persistence, and lifecycle.
 */

import { BrowserWindow, shell, app, session, screen, nativeTheme } from 'electron';
import path from 'node:path';
import contextMenu from 'electron-context-menu';
import { getStore } from './store';

/**
 * Check if developer context menu should be enabled.
 * Returns true if: in dev mode, beta build, or developer mode setting is enabled.
 */
function shouldEnableDevContextMenu(): boolean {
  if (!app.isPackaged) return true;
  if (
    app.getVersion().toLowerCase().includes('beta') ||
    app.getName().toLowerCase().includes('beta') ||
    process.env.RELEASE_CHANNEL === 'beta'
  ) {
    return true;
  }
  return getStore().get('settings.developerMode', false);
}

// Window creation timing for debugging installer launch delays
let windowCreateStart = 0;
function logWindowTiming(event: string): void {
  const elapsed = windowCreateStart > 0 ? Date.now() - windowCreateStart : 0;
  console.log(`[WINDOW +${elapsed}ms] ${event}`);
}

/**
 * Background colors matching the frontend theme (see frontend/src/index.css).
 * Used for the native window background before web content loads.
 */
const THEME_COLORS = {
  light: '#f5f5f4', // --monarch-bg-page (light mode)
  dark: '#1a1918', // --monarch-bg-page (dark mode)
} as const;

/**
 * Get the appropriate background color based on system dark mode preference.
 */
function getThemeBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? THEME_COLORS.dark : THEME_COLORS.light;
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
 * In dev mode, CSP is relaxed to allow Vite HMR and dev server connections.
 */
function setupCSP(): void {
  const isDev = !app.isPackaged;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Skip strict CSP in dev mode to allow Vite HMR
    if (isDev) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

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
            // Allow backend API, GitHub raw for ideas.json fallback, GitHub API for beta changelog, jsDelivr for emoji data, Openverse for image search, and eclosion.app for updates
            "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:* https://raw.githubusercontent.com https://api.github.com https://cdn.jsdelivr.net https://api.openverse.org https://eclosion.app",
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
  isMaximized?: boolean;
  isFullScreen?: boolean;
}

/**
 * Get the display where the window currently is, or the display nearest the cursor.
 * Prefers the window's current display for multi-monitor awareness.
 * Falls back to cursor position when no window exists yet.
 */
function getCurrentDisplay(): Electron.Display {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return screen.getDisplayMatching(mainWindow.getBounds());
  }
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

/**
 * Validate and clamp window bounds to ensure they're on a visible display.
 * Handles cases where a saved position references a now-disconnected monitor
 * or where the saved size exceeds the current display's work area.
 */
function ensureBoundsOnScreen(bounds: Electron.Rectangle): Electron.Rectangle {
  const display = screen.getDisplayMatching(bounds);
  const workArea = display.workArea;

  // Clamp size to work area
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);

  // Clamp position so window stays within work area
  const x = Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - width));
  const y = Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - height));

  return { x, y, width, height };
}

/**
 * Save current window bounds and state to the store.
 * Only saves in full mode. When maximized/fullscreen, preserves the last
 * normal bounds and only updates the state flags.
 */
function saveBounds(): void {
  if (!mainWindow || mainWindow.isDestroyed() || currentWindowMode !== 'full') return;

  const isMaximized = mainWindow.isMaximized();
  const isFullScreen = mainWindow.isFullScreen();

  if (isMaximized || isFullScreen) {
    // Don't overwrite normal bounds with maximized/fullscreen dimensions.
    // Only update the state flags on previously saved bounds.
    const existing = getStore().get('windowBounds') as WindowBounds | undefined;
    if (existing) {
      getStore().set('windowBounds', { ...existing, isMaximized, isFullScreen });
    }
  } else {
    const bounds = mainWindow.getBounds();
    getStore().set('windowBounds', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: false,
      isFullScreen: false,
    });
  }
}

/**
 * Debounced version of saveBounds for resize/move events.
 * Prevents excessive store writes during drag operations.
 */
let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveBounds(): void {
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(saveBounds, 500);
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

  // Start in compact mode - centered on the current display
  // Full bounds will be restored when setWindowMode('full') is called
  const display = getCurrentDisplay();
  const workArea = display.workArea;

  // Center the compact window on the current display (using workArea for correct
  // multi-monitor offsets — workAreaSize lacks x/y position)
  const x = workArea.x + Math.round((workArea.width - COMPACT_WINDOW.width) / 2);
  const y = workArea.y + Math.round((workArea.height - COMPACT_WINDOW.height) / 2);

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
    backgroundColor: getThemeBackgroundColor(),
    // show: true is the default - window appears immediately for native focus behavior
  });
  logWindowTiming('BrowserWindow created');

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

  // Enable right-click context menu with developer tools when:
  // - In dev mode, beta build, or developer mode setting is enabled
  // - OR DevTools is currently open
  contextMenu({
    window: mainWindow,
    showSaveImageAs: true,
    showCopyImageAddress: true,
    showInspectElement: true,
    showSelectAll: false,
    showSearchWithGoogle: false,
    shouldShowMenu: (_event, params) => {
      // Always show if there's text selected or in an editable field
      if (params.selectionText || params.isEditable) return true;
      // Otherwise, only show dev tools menu when dev mode is enabled or DevTools is open
      const devToolsOpen = mainWindow?.webContents.isDevToolsOpened() ?? false;
      return devToolsOpen || shouldEnableDevContextMenu();
    },
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

  // Load the frontend - from Vite dev server in dev mode, bundled files in production
  const isDev = !app.isPackaged;

  if (isDev) {
    // Dev mode: load from Vite dev server for hot reload
    // Port is set by dev.sh via DEV_VITE_PORT environment variable
    const vitePort = process.env.DEV_VITE_PORT || '5174';
    const devUrl = `http://localhost:${vitePort}?_backendPort=${backendPort}`;
    logWindowTiming(`Loading from Vite dev server on port ${vitePort}`);
    await mainWindow.loadURL(devUrl);
    logWindowTiming('loadURL completed');
  } else {
    // Production: load from bundled files
    const frontendPath = path.join(
      process.resourcesPath || app.getAppPath(),
      'frontend',
      'index.html'
    );
    logWindowTiming('Calling loadFile');
    await mainWindow.loadFile(frontendPath, {
      query: { _backendPort: String(backendPort) },
    });
    logWindowTiming('loadFile completed');
  }

  // Save bounds on resize and move (debounced) so we don't lose state on crash
  mainWindow.on('resize', debouncedSaveBounds);
  mainWindow.on('move', debouncedSaveBounds);

  // Handle display topology changes — move window on-screen if its display was removed
  screen.on('display-removed', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (currentWindowMode !== 'full') return;

    const bounds = mainWindow.getBounds();
    const validBounds = ensureBoundsOnScreen(bounds);

    if (
      bounds.x !== validBounds.x ||
      bounds.y !== validBounds.y ||
      bounds.width !== validBounds.width ||
      bounds.height !== validBounds.height
    ) {
      mainWindow.setBounds(validBounds);
    }
  });

  // Handle close - always hide to tray instead of quitting
  // The app runs in both the dock/taskbar AND the system tray/menu bar
  mainWindow.on('close', (event) => {
    // Flush any pending debounced save and do a final save.
    // saveBounds() handles mode checks and maximize/fullscreen state internally.
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
    saveBounds();

    if (!isQuitting) {
      // Hide to tray instead of quitting (dock stays visible)
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Handle minimize - use default behavior (minimize to dock/taskbar)
  // No custom handling needed since we always show in both dock and tray

  mainWindow.on('closed', () => {
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
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
    // Switch to compact mode - center on the current display
    const display = getCurrentDisplay();
    const workArea = display.workArea;
    const x = workArea.x + Math.round((workArea.width - COMPACT_WINDOW.width) / 2);
    const y = workArea.y + Math.round((workArea.height - COMPACT_WINDOW.height) / 2);

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
      // Validate saved bounds against current display topology.
      // Handles disconnected monitors and resolution changes.
      const validBounds = ensureBoundsOnScreen({
        x: savedBounds.x,
        y: savedBounds.y,
        width: bounds.width,
        height: bounds.height,
      });
      mainWindow.setBounds(validBounds);
    } else {
      // No saved position - resize and center on current display
      mainWindow.setSize(bounds.width, bounds.height);
      mainWindow.center();
    }

    // Restore maximized/fullscreen state after setting base bounds
    if (savedBounds?.isMaximized) {
      mainWindow.maximize();
    } else if (savedBounds?.isFullScreen) {
      mainWindow.setFullScreen(true);
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

  const display = getCurrentDisplay();
  const workArea = display.workArea;

  // Leave some padding from screen edges (40px top + bottom)
  const maxScreenHeight = workArea.height - 80;

  // Clamp height to bounds, respecting both our max and the user's screen
  const clampedHeight = Math.max(
    COMPACT_WINDOW.minHeight,
    Math.min(height, COMPACT_WINDOW.maxHeight, maxScreenHeight)
  );

  // Get current width (maintain it)
  const currentBounds = mainWindow.getBounds();
  const width = currentBounds.width;

  // Center the window with the new height on the current display
  const x = workArea.x + Math.round((workArea.width - width) / 2);
  const y = workArea.y + Math.round((workArea.height - clampedHeight) / 2);

  mainWindow.setBounds({
    x,
    y,
    width,
    height: clampedHeight,
  });

  return clampedHeight;
}
