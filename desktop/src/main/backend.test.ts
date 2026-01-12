/**
 * Backend Manager Tests
 *
 * Smoke tests to verify the BackendManager class structure and logic.
 * These tests mock Electron APIs since they're not available in the test environment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron modules before importing
vi.mock('electron', () => ({
  app: {
    getAppPath: () => '/mock/app/path',
    getPath: (name: string) => {
      if (name === 'home') return '/mock/home';
      if (name === 'appData') return '/mock/appData';
      return '/mock/path';
    },
  },
  dialog: {
    showErrorBox: vi.fn(),
  },
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}));

vi.mock('get-port', () => ({
  default: vi.fn(() => Promise.resolve(5001)),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    appendFileSync: vi.fn(),
  },
}));

describe('BackendManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable', async () => {
    const { BackendManager } = await import('./backend');
    expect(BackendManager).toBeDefined();
    expect(typeof BackendManager).toBe('function');
  });

  it('should create an instance', async () => {
    const { BackendManager } = await import('./backend');
    const manager = new BackendManager();
    expect(manager).toBeInstanceOf(BackendManager);
  });

  it('should have required methods', async () => {
    const { BackendManager } = await import('./backend');
    const manager = new BackendManager();

    expect(typeof manager.start).toBe('function');
    expect(typeof manager.stop).toBe('function');
    expect(typeof manager.getPort).toBe('function');
    expect(typeof manager.isRunning).toBe('function');
    expect(typeof manager.triggerSync).toBe('function');
    expect(typeof manager.checkSyncNeeded).toBe('function');
    expect(typeof manager.isStartupComplete).toBe('function');
  });

  it('should extend EventEmitter', async () => {
    const { BackendManager } = await import('./backend');
    const { EventEmitter } = await import('node:events');
    const manager = new BackendManager();

    expect(manager).toBeInstanceOf(EventEmitter);
    expect(typeof manager.on).toBe('function');
    expect(typeof manager.emit).toBe('function');
  });

  it('should report startup not complete initially', async () => {
    const { BackendManager } = await import('./backend');
    const manager = new BackendManager();
    expect(manager.isStartupComplete()).toBe(false);
  });

  it('should return port 0 before starting', async () => {
    const { BackendManager } = await import('./backend');
    const manager = new BackendManager();
    expect(manager.getPort()).toBe(0);
  });

  it('should report not running initially', async () => {
    const { BackendManager } = await import('./backend');
    const manager = new BackendManager();
    expect(manager.isRunning()).toBe(false);
  });
});
