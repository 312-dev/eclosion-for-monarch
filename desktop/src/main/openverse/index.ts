/**
 * Openverse Module
 *
 * IPC handlers for Openverse API credential storage.
 * Credentials are encrypted using Electron's safeStorage and stored in electron-store.
 */

import { ipcMain, safeStorage } from 'electron';
import { getStore } from '../store';
import { debugLog } from '../logger';

// Storage key in electron-store
const OPENVERSE_CREDENTIALS_KEY = 'api.openverseCredentials';

/**
 * Openverse OAuth2 credentials structure.
 */
export interface OpenverseCredentials {
  clientId: string;
  clientSecret: string;
  registeredAt: string;
}

/**
 * Get stored Openverse credentials.
 * Returns null if no credentials are stored or decryption fails.
 */
export function getOpenverseCredentials(): OpenverseCredentials | null {
  const base64 = getStore().get(OPENVERSE_CREDENTIALS_KEY) as string | undefined;
  if (!base64) {
    return null;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    debugLog('Openverse: safeStorage not available for decryption');
    return null;
  }

  try {
    const encrypted = Buffer.from(base64, 'base64');
    const decrypted = safeStorage.decryptString(encrypted);
    return JSON.parse(decrypted) as OpenverseCredentials;
  } catch (error) {
    debugLog(`Openverse: Failed to decrypt credentials: ${error}`);
    return null;
  }
}

/**
 * Store Openverse credentials securely.
 * Returns true if successful, false if encryption is not available.
 */
export function storeOpenverseCredentials(credentials: OpenverseCredentials): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    debugLog('Openverse: Cannot store credentials - safeStorage not available');
    return false;
  }

  try {
    const json = JSON.stringify(credentials);
    const encrypted = safeStorage.encryptString(json);
    const base64 = encrypted.toString('base64');
    getStore().set(OPENVERSE_CREDENTIALS_KEY, base64);

    debugLog('Openverse: Credentials stored successfully');
    return true;
  } catch (error) {
    debugLog(`Openverse: Failed to store credentials: ${error}`);
    return false;
  }
}

/**
 * Clear stored Openverse credentials.
 */
export function clearOpenverseCredentials(): void {
  getStore().delete(OPENVERSE_CREDENTIALS_KEY);
  debugLog('Openverse: Credentials cleared');
}

/**
 * Setup Openverse-related IPC handlers.
 * Call this from the main process initialization.
 */
export function setupOpenverseIpcHandlers(): void {
  /**
   * Get stored Openverse credentials.
   */
  ipcMain.handle(
    'openverse:get-credentials',
    (): OpenverseCredentials | null => {
      return getOpenverseCredentials();
    }
  );

  /**
   * Store Openverse credentials.
   */
  ipcMain.handle(
    'openverse:store-credentials',
    (_event, credentials: OpenverseCredentials): boolean => {
      return storeOpenverseCredentials(credentials);
    }
  );

  /**
   * Clear stored Openverse credentials.
   */
  ipcMain.handle('openverse:clear-credentials', (): void => {
    clearOpenverseCredentials();
  });
}
