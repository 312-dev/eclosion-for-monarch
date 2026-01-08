/**
 * Vitest Setup File
 *
 * Mocks electron and other dependencies for testing.
 */

import { vi } from 'vitest';

// Mock electron module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/${name}`),
    getName: vi.fn(() => 'eclosion-desktop'),
    getVersion: vi.fn(() => '1.0.0'),
    setAsDefaultProtocolClient: vi.fn(() => true),
    removeAsDefaultProtocolClient: vi.fn(() => true),
    on: vi.fn(),
    quit: vi.fn(),
    isPackaged: false,
  },
  BrowserWindow: vi.fn(() => ({
    loadURL: vi.fn(),
    webContents: {
      send: vi.fn(),
      openDevTools: vi.fn(),
    },
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    isVisible: vi.fn(() => true),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    on: vi.fn(),
  })),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  dialog: {
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 })),
    showOpenDialog: vi.fn(() => Promise.resolve({ canceled: true, filePaths: [] })),
    showSaveDialog: vi.fn(() => Promise.resolve({ canceled: true, filePath: undefined })),
  },
  shell: {
    openExternal: vi.fn(() => Promise.resolve()),
    openPath: vi.fn(() => Promise.resolve('')),
  },
  Menu: {
    buildFromTemplate: vi.fn(() => ({})),
    setApplicationMenu: vi.fn(),
  },
  Tray: vi.fn(() => ({
    setContextMenu: vi.fn(),
    setToolTip: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  })),
  nativeImage: {
    createFromPath: vi.fn(() => ({})),
  },
  globalShortcut: {
    register: vi.fn(() => true),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
    isRegistered: vi.fn(() => false),
  },
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
    })),
  },
}));

// Mock @sentry/electron/main
vi.mock('@sentry/electron/main', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: vi.fn(() => ({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(() => false),
      store: {},
    })),
  };
});
