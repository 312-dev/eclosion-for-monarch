/**
 * IPC Handlers Tests
 *
 * Smoke tests to verify the IPC module exports and handler setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron modules
const mockHandle = vi.fn();

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockHandle,
  },
  dialog: {
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
  },
  app: {
    getVersion: () => '1.0.0',
    getName: () => 'Eclosion',
    isPackaged: false,
    getPath: (name: string) => {
      if (name === 'home') return '/mock/home';
      if (name === 'appData') return '/mock/appData';
      return '/mock/path';
    },
  },
  shell: {
    openPath: vi.fn(),
  },
}));

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string, defaultVal: unknown) => defaultVal),
    set: vi.fn(),
  })),
}));

vi.mock('./window', () => ({
  getMainWindow: vi.fn(() => null),
}));

vi.mock('./autostart', () => ({
  isAutoStartEnabled: vi.fn().mockReturnValue(false),
  setAutoStart: vi.fn().mockReturnValue(true),
}));

vi.mock('./updater', () => ({
  checkForUpdates: vi.fn().mockResolvedValue({ updateAvailable: false }),
  quitAndInstall: vi.fn(),
  getUpdateStatus: vi.fn(() => ({
    updateAvailable: false,
    updateDownloaded: false,
    updateInfo: null,
    currentVersion: '1.0.0',
    channel: 'stable',
  })),
  setUpdateChannel: vi.fn(),
  getUpdateChannel: vi.fn(() => 'stable'),
}));

describe('IPC module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export setupIpcHandlers function', async () => {
    const ipcModule = await import('./ipc');
    expect(typeof ipcModule.setupIpcHandlers).toBe('function');
  });

  it('should register IPC handlers when called', async () => {
    const ipcModule = await import('./ipc');

    // Create a mock BackendManager
    const mockBackendManager = {
      getPort: vi.fn(() => 5001),
      isRunning: vi.fn(() => true),
      triggerSync: vi.fn().mockResolvedValue({ success: true }),
    };

    ipcModule.setupIpcHandlers(mockBackendManager as never);

    // Verify that handle was called multiple times for different channels
    expect(mockHandle).toHaveBeenCalled();

    // Check that expected IPC channels were registered
    const registeredChannels = mockHandle.mock.calls.map((call) => call[0]);
    expect(registeredChannels).toContain('get-backend-port');
    expect(registeredChannels).toContain('get-backend-status');
    expect(registeredChannels).toContain('trigger-sync');
    expect(registeredChannels).toContain('get-autostart-status');
    expect(registeredChannels).toContain('set-autostart');
    expect(registeredChannels).toContain('check-for-updates');
    expect(registeredChannels).toContain('get-update-status');
    expect(registeredChannels).toContain('get-app-info');
    expect(registeredChannels).toContain('is-desktop');
    expect(registeredChannels).toContain('get-desktop-settings');
  });
});
