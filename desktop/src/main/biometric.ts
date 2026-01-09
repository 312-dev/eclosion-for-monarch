/**
 * Biometric Authentication
 *
 * Provides biometric unlock functionality using Touch ID (macOS) and Windows Hello.
 * Uses Electron's safeStorage API to securely store the user's passphrase,
 * encrypted by the operating system's credential manager (Keychain/DPAPI).
 *
 * Security model:
 * - Passphrase is encrypted using OS-level encryption (Keychain on macOS, DPAPI on Windows)
 * - On macOS: Touch ID prompt required to access stored passphrase
 * - On Windows: DPAPI ties encryption to user login session
 * - Passphrase is never stored in plaintext
 */

import { safeStorage, systemPreferences } from 'electron';
import Store from 'electron-store';
import { debugLog } from './logger';

const store = new Store();

/**
 * Storage key for the encrypted passphrase in electron-store.
 * The value is a base64-encoded encrypted buffer from safeStorage.
 */
const PASSPHRASE_STORAGE_KEY = 'security.encryptedPassphrase';

/**
 * Storage key for tracking biometric enrollment status.
 */
const BIOMETRIC_ENABLED_KEY = 'security.biometricEnabled';

/**
 * Biometric type available on this device.
 */
export type BiometricType = 'touchId' | 'windowsHello' | null;

/**
 * Result of a biometric authentication attempt.
 */
export interface BiometricAuthResult {
  success: boolean;
  passphrase?: string;
  error?: string;
}

/**
 * Check if biometric authentication is available on this device.
 *
 * - macOS: Checks if Touch ID hardware is present
 * - Windows: Checks if safeStorage encryption is available (DPAPI)
 */
export function isBiometricAvailable(): boolean {
  // First check if safeStorage is available (required for passphrase storage)
  if (!safeStorage.isEncryptionAvailable()) {
    debugLog('Biometric: safeStorage encryption not available');
    return false;
  }

  if (process.platform === 'darwin') {
    // macOS: Check for Touch ID capability
    try {
      const canPrompt = systemPreferences.canPromptTouchID();
      debugLog(`Biometric: Touch ID available: ${canPrompt}`);
      return canPrompt;
    } catch (error) {
      debugLog(`Biometric: Error checking Touch ID: ${error}`);
      return false;
    }
  }

  if (process.platform === 'win32') {
    // Windows: safeStorage uses DPAPI which is tied to user login
    // This provides user-level protection without additional biometric prompt
    debugLog('Biometric: Windows DPAPI available');
    return true;
  }

  // Linux: safeStorage support varies by desktop environment
  // For now, we'll allow it if safeStorage is available
  if (process.platform === 'linux') {
    debugLog('Biometric: Linux safeStorage available');
    return true;
  }

  return false;
}

/**
 * Get the type of biometric authentication available.
 */
export function getBiometricType(): BiometricType {
  if (!isBiometricAvailable()) {
    return null;
  }

  if (process.platform === 'darwin') {
    return 'touchId';
  }

  if (process.platform === 'win32') {
    return 'windowsHello';
  }

  // Linux falls back to general "secure storage" without biometric prompt
  return null;
}

/**
 * Check if biometric authentication is enrolled (passphrase is stored).
 */
export function isBiometricEnrolled(): boolean {
  const enabled = store.get(BIOMETRIC_ENABLED_KEY, false) as boolean;
  const hasPassphrase = store.has(PASSPHRASE_STORAGE_KEY);

  debugLog(`Biometric: Enrolled check - enabled: ${enabled}, hasPassphrase: ${hasPassphrase}`);

  return enabled && hasPassphrase;
}

/**
 * Enroll biometric authentication by storing the passphrase securely.
 *
 * @param passphrase The user's passphrase to store
 * @returns true if enrollment was successful
 */
export function enrollBiometric(passphrase: string): boolean {
  if (!isBiometricAvailable()) {
    debugLog('Biometric: Cannot enroll - biometric not available');
    return false;
  }

  try {
    // Encrypt the passphrase using OS-level encryption
    const encrypted = safeStorage.encryptString(passphrase);

    // Store as base64 string (electron-store can't store Buffer directly)
    const base64 = encrypted.toString('base64');
    store.set(PASSPHRASE_STORAGE_KEY, base64);
    store.set(BIOMETRIC_ENABLED_KEY, true);

    debugLog('Biometric: Enrollment successful');
    return true;
  } catch (error) {
    debugLog(`Biometric: Enrollment failed: ${error}`);
    return false;
  }
}

/**
 * Authenticate using biometric and retrieve the stored passphrase.
 *
 * On macOS, this will prompt for Touch ID.
 * On Windows, DPAPI decryption is automatic (tied to user session).
 */
export async function authenticateWithBiometric(): Promise<BiometricAuthResult> {
  if (!isBiometricEnrolled()) {
    return {
      success: false,
      error: 'Biometric authentication not set up',
    };
  }

  try {
    // On macOS, prompt for Touch ID before retrieving the passphrase
    if (process.platform === 'darwin') {
      try {
        await systemPreferences.promptTouchID('unlock Eclosion');
        debugLog('Biometric: Touch ID authentication successful');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        debugLog(`Biometric: Touch ID authentication failed: ${errorMsg}`);

        // Check if user cancelled
        if (errorMsg.includes('cancel') || errorMsg.includes('Cancel')) {
          return {
            success: false,
            error: 'Authentication cancelled',
          };
        }

        return {
          success: false,
          error: 'Touch ID authentication failed. Please use your passphrase.',
        };
      }
    }

    // Retrieve and decrypt the passphrase
    const passphrase = getStoredPassphrase();
    if (!passphrase) {
      // Clear corrupted enrollment so user can re-enroll after manual unlock
      // This typically happens when the app's keychain entry changed (e.g., app rename)
      debugLog('Biometric: Clearing corrupted enrollment - passphrase retrieval failed');
      clearBiometricEnrollment();
      return {
        success: false,
        error: 'Touch ID setup was reset. Please unlock with your passphrase and re-enable Touch ID in settings.',
      };
    }

    return {
      success: true,
      passphrase,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    debugLog(`Biometric: Authentication error: ${errorMsg}`);
    return {
      success: false,
      error: 'Biometric authentication failed',
    };
  }
}

/**
 * Get the stored passphrase without prompting for biometric.
 * Used internally after biometric authentication succeeds.
 *
 * WARNING: Only call this after successful biometric authentication
 * or when the app is in a trusted state (e.g., auto-sync).
 */
export function getStoredPassphrase(): string | null {
  try {
    const base64 = store.get(PASSPHRASE_STORAGE_KEY) as string | undefined;
    if (!base64) {
      debugLog('Biometric: No stored passphrase found');
      return null;
    }

    // Convert from base64 and decrypt
    const encrypted = Buffer.from(base64, 'base64');
    const passphrase = safeStorage.decryptString(encrypted);

    debugLog('Biometric: Passphrase retrieved successfully');
    return passphrase;
  } catch (error) {
    debugLog(`Biometric: Failed to retrieve passphrase: ${error}`);
    return null;
  }
}

/**
 * Check if a passphrase is stored in secure storage.
 * This is true regardless of whether biometric unlock is enabled.
 * Used to determine if auto-sync can work.
 */
export function isPassphraseStored(): boolean {
  const hasPassphrase = store.has(PASSPHRASE_STORAGE_KEY);
  debugLog(`Biometric: isPassphraseStored: ${hasPassphrase}`);
  return hasPassphrase;
}

/**
 * Store passphrase for background sync without enabling biometric unlock.
 * This allows auto-sync to work while the user still types their passphrase to unlock.
 *
 * @param passphrase The user's passphrase to store
 * @returns true if storage was successful
 */
export function storePassphraseForSync(passphrase: string): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    debugLog('Biometric: Cannot store passphrase - safeStorage not available');
    return false;
  }

  try {
    const encrypted = safeStorage.encryptString(passphrase);
    const base64 = encrypted.toString('base64');
    store.set(PASSPHRASE_STORAGE_KEY, base64);
    // Note: We do NOT set BIOMETRIC_ENABLED_KEY here - that's only for biometric unlock

    debugLog('Biometric: Passphrase stored for sync');
    return true;
  } catch (error) {
    debugLog(`Biometric: Failed to store passphrase: ${error}`);
    return false;
  }
}

/**
 * Clear stored passphrase (for logout/reset).
 * Also clears biometric enrollment if enabled.
 */
export function clearStoredPassphrase(): void {
  store.delete(PASSPHRASE_STORAGE_KEY);
  store.set(BIOMETRIC_ENABLED_KEY, false);
  debugLog('Biometric: Stored passphrase cleared');
}

/**
 * Clear biometric enrollment (remove stored passphrase).
 */
export function clearBiometricEnrollment(): void {
  store.delete(PASSPHRASE_STORAGE_KEY);
  store.set(BIOMETRIC_ENABLED_KEY, false);
  debugLog('Biometric: Enrollment cleared');
}

/**
 * Update the stored passphrase (e.g., when user changes their passphrase).
 * Works whether passphrase was stored for sync or biometric unlock.
 *
 * @param newPassphrase The new passphrase to store
 * @returns true if update was successful
 */
export function updateStoredPassphrase(newPassphrase: string): boolean {
  if (!isPassphraseStored()) {
    debugLog('Biometric: Cannot update - no passphrase stored');
    return false;
  }

  try {
    const encrypted = safeStorage.encryptString(newPassphrase);
    const base64 = encrypted.toString('base64');
    store.set(PASSPHRASE_STORAGE_KEY, base64);

    debugLog('Biometric: Passphrase updated successfully');
    return true;
  } catch (error) {
    debugLog(`Biometric: Failed to update passphrase: ${error}`);
    return false;
  }
}

/**
 * Get a user-friendly name for the biometric type.
 */
export function getBiometricDisplayName(): string {
  const type = getBiometricType();
  switch (type) {
    case 'touchId':
      return 'Touch ID';
    case 'windowsHello':
      return 'Windows Hello';
    default:
      return 'Biometric';
  }
}
