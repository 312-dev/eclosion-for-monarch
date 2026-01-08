/**
 * Window Management Tests
 *
 * Smoke tests to verify the window module exports and basic functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadFile: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    webContents: {
      setWindowOpenHandler: vi.fn(),
      send: vi.fn(),
    },
    getBounds: vi.fn(() => ({ x: 0, y: 0, width: 1200, height: 800 })),
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    restore: vi.fn(),
    isMinimized: vi.fn(() => false),
    isVisible: vi.fn(() => true),
  })),
  shell: {
    openExternal: vi.fn(),
  },
  app: {
    getAppPath: () => '/mock/app/path',
  },
  session: {
    defaultSession: {
      webRequest: {
        onHeadersReceived: vi.fn(),
      },
    },
  },
}));

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string, defaultVal: unknown) => defaultVal),
    set: vi.fn(),
  })),
}));

describe('window module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export createWindow function', async () => {
    const windowModule = await import('./window');
    expect(typeof windowModule.createWindow).toBe('function');
  });

  it('should export getMainWindow function', async () => {
    const windowModule = await import('./window');
    expect(typeof windowModule.getMainWindow).toBe('function');
  });

  it('should export showWindow function', async () => {
    const windowModule = await import('./window');
    expect(typeof windowModule.showWindow).toBe('function');
  });

  it('should export hideWindow function', async () => {
    const windowModule = await import('./window');
    expect(typeof windowModule.hideWindow).toBe('function');
  });

  it('should export toggleWindow function', async () => {
    const windowModule = await import('./window');
    expect(typeof windowModule.toggleWindow).toBe('function');
  });

  it('should export navigateTo function', async () => {
    const windowModule = await import('./window');
    expect(typeof windowModule.navigateTo).toBe('function');
  });

  it('should export setIsQuitting function', async () => {
    const windowModule = await import('./window');
    expect(typeof windowModule.setIsQuitting).toBe('function');
  });

  it('should export getIsQuitting function', async () => {
    const windowModule = await import('./window');
    expect(typeof windowModule.getIsQuitting).toBe('function');
  });

  it('getMainWindow should return null initially', async () => {
    const windowModule = await import('./window');
    expect(windowModule.getMainWindow()).toBeNull();
  });

  it('getIsQuitting should return false initially', async () => {
    const windowModule = await import('./window');
    expect(windowModule.getIsQuitting()).toBe(false);
  });
});
