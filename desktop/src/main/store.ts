/**
 * Centralized Electron Store Module
 *
 * Provides a typed store instance for all electron-store operations.
 * Uses lazy initialization to ensure app.setPath('userData') is called first.
 *
 * NOTE: electron-store v11+ is pure ESM with stricter TypeScript generics.
 * This module defines the schema type for proper TypeScript support.
 */

import Store from 'electron-store';

// Re-define types here to avoid circular dependencies
// These must match the types in hotkeys.ts and lock-manager.ts

/**
 * Hotkey configuration structure.
 */
export interface HotkeyConfig {
  enabled: boolean;
  accelerator: string;
}

/**
 * Lock trigger options.
 */
export type LockTrigger =
  | 'system-lock'
  | 'idle-1'
  | 'idle-5'
  | 'idle-15'
  | 'idle-30'
  | 'never';

/**
 * Startup metrics entry structure.
 */
export interface MetricsHistoryEntry {
  /** Unique ID for this entry */
  id: string;
  /** Total time from process start to fully initialized (ms) */
  totalStartup: number;
  /** Time from process start to app ready (ms) */
  appReady: number;
  /** Time to start the backend (ms) */
  backendStart: number;
  /** Time to create the window (ms) */
  windowCreate: number;
  /** Time from window create to fully initialized (ms) */
  postWindow: number;
  /** ISO timestamp of when this metric was recorded */
  timestamp: string;
  /** App version */
  version: string;
}

/**
 * Store schema type definition.
 *
 * This defines all keys and their types used in the electron-store.
 * The schema uses dot-notation for nested keys.
 */
export interface StoreSchema {
  // Index signature for compatibility with Record<string, unknown>
  [key: string]: unknown;

  // Desktop settings
  menuBarMode: boolean;

  // Security settings
  'security.encryptedPassphrase': string;
  'security.biometricEnabled': boolean;
  'security.monarchCredentials': string;
  'security.requireTouchId': boolean;
  'security.lockTrigger': LockTrigger;

  // Hotkeys (individual keys)
  'hotkeys.toggle-window': HotkeyConfig;
  'hotkeys.trigger-sync': HotkeyConfig;
  // Parent key for deletion
  hotkeys: Record<string, HotkeyConfig>;

  // Onboarding
  'onboarding.complete': boolean;
  'onboarding.version': number;

  // Startup metrics
  'startup.metricsHistory': MetricsHistoryEntry[];

  // Lockout state
  'lockout.failedAttempts': number;
  'lockout.cooldownUntil': number | null;
}

/**
 * Typed store instance.
 */
export type TypedStore = Store<StoreSchema>;

/**
 * Singleton store instance.
 */
let storeInstance: TypedStore | null = null;

/**
 * Get the typed store instance.
 *
 * Uses lazy initialization to ensure app.setPath('userData') is called first.
 * This is important for beta build isolation where userData path is modified.
 *
 * @returns The typed electron-store instance
 */
export function getStore(): TypedStore {
  storeInstance ??= new Store<StoreSchema>();
  return storeInstance;
}

/**
 * Reset the store instance (for testing).
 */
export function resetStoreInstance(): void {
  storeInstance = null;
}
