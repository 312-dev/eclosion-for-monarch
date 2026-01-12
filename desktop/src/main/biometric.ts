/**
 * Biometric Authentication & Credential Storage
 *
 * Two authentication models:
 *
 * 1. Desktop Mode (new, simplified):
 *    - Monarch credentials stored directly in safeStorage
 *    - No encryption passphrase required
 *    - Optional Touch ID protection for unlock
 *
 * 2. Self-hosted Mode (legacy, passphrase-based):
 *    - Uses passphrase to encrypt credentials on server
 *    - Passphrase stored in safeStorage for biometric unlock
 *    - Touch ID retrieves passphrase to decrypt credentials
 *
 * Security model:
 * - All data encrypted using OS-level encryption (Keychain on macOS, DPAPI on Windows)
 * - On macOS: Touch ID prompt can be required to access stored data
 * - On Windows: DPAPI ties encryption to user login session
 * - Credentials never stored in plaintext
 */

import { safeStorage, systemPreferences } from 'electron';
import { getStore } from './store';
import { debugLog } from './logger';

/**
 * Storage key for the encrypted passphrase in electron-store.
 * The value is a base64-encoded encrypted buffer from safeStorage.
 */
const PASSPHRASE_STORAGE_KEY = 'security.encryptedPassphrase' as const;

/**
 * Storage key for tracking biometric enrollment status.
 */
const BIOMETRIC_ENABLED_KEY = 'security.biometricEnabled' as const;

// =============================================================================
// Desktop Mode: Direct Credential Storage (New)
// =============================================================================

/**
 * Storage key for encrypted Monarch credentials in desktop mode.
 * Stores a JSON object with email, password, and optional mfaSecret.
 */
const MONARCH_CREDENTIALS_KEY = 'security.monarchCredentials' as const;

/**
 * Storage key for "Require Touch ID to unlock" setting.
 */
const REQUIRE_TOUCH_ID_KEY = 'security.requireTouchId' as const;

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
  const enabled = getStore().get(BIOMETRIC_ENABLED_KEY, false);
  const hasPassphrase = getStore().has(PASSPHRASE_STORAGE_KEY);

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
    getStore().set(PASSPHRASE_STORAGE_KEY, base64);
    getStore().set(BIOMETRIC_ENABLED_KEY, true);

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
    const base64 = getStore().get(PASSPHRASE_STORAGE_KEY) as string | undefined;
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
  const hasPassphrase = getStore().has(PASSPHRASE_STORAGE_KEY);
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
    getStore().set(PASSPHRASE_STORAGE_KEY, base64);
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
  getStore().delete(PASSPHRASE_STORAGE_KEY);
  getStore().set(BIOMETRIC_ENABLED_KEY, false);
  debugLog('Biometric: Stored passphrase cleared');
}

/**
 * Clear biometric enrollment (remove stored passphrase).
 */
export function clearBiometricEnrollment(): void {
  getStore().delete(PASSPHRASE_STORAGE_KEY);
  getStore().set(BIOMETRIC_ENABLED_KEY, false);
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
    getStore().set(PASSPHRASE_STORAGE_KEY, base64);

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

// =============================================================================
// Desktop Mode: Direct Credential Storage Functions
// =============================================================================

/**
 * Monarch credentials structure for desktop mode.
 */
export interface MonarchCredentials {
  email: string;
  password: string;
  /** TOTP secret (only stored if mfaMode is 'secret') */
  mfaSecret?: string;
  /** MFA mode: 'secret' for TOTP secrets, 'code' for ephemeral 6-digit codes */
  mfaMode?: 'secret' | 'code';
}

/**
 * Result of credential retrieval with optional Touch ID.
 */
export interface CredentialAuthResult {
  success: boolean;
  credentials?: MonarchCredentials;
  error?: string;
}

/**
 * Store Monarch credentials directly in safeStorage (desktop mode).
 * No passphrase required - credentials encrypted by OS keychain.
 *
 * @param credentials The Monarch credentials to store
 * @returns true if storage was successful
 */
export function storeMonarchCredentials(credentials: MonarchCredentials): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    debugLog('Credentials: Cannot store - safeStorage not available');
    return false;
  }

  try {
    // Serialize credentials to JSON and encrypt
    const json = JSON.stringify(credentials);
    const encrypted = safeStorage.encryptString(json);
    const base64 = encrypted.toString('base64');
    getStore().set(MONARCH_CREDENTIALS_KEY, base64);

    debugLog('Credentials: Monarch credentials stored successfully');
    return true;
  } catch (error) {
    debugLog(`Credentials: Failed to store credentials: ${error}`);
    return false;
  }
}

/**
 * Retrieve Monarch credentials from safeStorage (desktop mode).
 * Does NOT prompt for Touch ID - use authenticateAndGetCredentials for that.
 *
 * @returns The stored credentials, or null if not found
 */
export function getMonarchCredentials(): MonarchCredentials | null {
  try {
    const base64 = getStore().get(MONARCH_CREDENTIALS_KEY) as string | undefined;
    if (!base64) {
      debugLog('Credentials: No stored credentials found');
      return null;
    }

    // Decrypt and parse JSON
    const encrypted = Buffer.from(base64, 'base64');
    const json = safeStorage.decryptString(encrypted);
    const credentials = JSON.parse(json) as MonarchCredentials;

    debugLog('Credentials: Retrieved successfully');
    return credentials;
  } catch (error) {
    debugLog(`Credentials: Failed to retrieve: ${error}`);
    return null;
  }
}

/**
 * Check if Monarch credentials are stored (desktop mode).
 */
export function hasMonarchCredentials(): boolean {
  const has = getStore().has(MONARCH_CREDENTIALS_KEY);
  debugLog(`Credentials: hasMonarchCredentials: ${has}`);
  return has;
}

/**
 * Clear stored Monarch credentials (desktop mode).
 * Used for logout or reset.
 */
export function clearMonarchCredentials(): void {
  getStore().delete(MONARCH_CREDENTIALS_KEY);
  debugLog('Credentials: Cleared');
}

/**
 * Get the "Require Touch ID to unlock" setting.
 */
export function getRequireTouchId(): boolean {
  return getStore().get(REQUIRE_TOUCH_ID_KEY, false);
}

/**
 * Set the "Require Touch ID to unlock" setting.
 */
export function setRequireTouchId(required: boolean): void {
  getStore().set(REQUIRE_TOUCH_ID_KEY, required);
  debugLog(`Credentials: Require Touch ID set to ${required}`);
}

/**
 * Authenticate and retrieve credentials with optional Touch ID.
 * If Touch ID is required (setting enabled), prompts for biometric.
 * Otherwise, retrieves credentials directly.
 *
 * @returns Credentials on success, error on failure
 */
export async function authenticateAndGetCredentials(): Promise<CredentialAuthResult> {
  if (!hasMonarchCredentials()) {
    return {
      success: false,
      error: 'No credentials stored',
    };
  }

  const requireTouchId = getRequireTouchId();

  // If Touch ID is required and available, prompt for it
  if (requireTouchId && process.platform === 'darwin') {
    try {
      const canPrompt = systemPreferences.canPromptTouchID();
      if (canPrompt) {
        await systemPreferences.promptTouchID('unlock Eclosion');
        debugLog('Credentials: Touch ID authentication successful');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      debugLog(`Credentials: Touch ID failed: ${errorMsg}`);

      if (errorMsg.includes('cancel') || errorMsg.includes('Cancel')) {
        return {
          success: false,
          error: 'Authentication cancelled',
        };
      }

      return {
        success: false,
        error: 'Touch ID authentication failed',
      };
    }
  }

  // Retrieve credentials
  const credentials = getMonarchCredentials();
  if (!credentials) {
    return {
      success: false,
      error: 'Failed to retrieve credentials',
    };
  }

  return {
    success: true,
    credentials,
  };
}

/**
 * Clear all stored authentication data (both desktop and legacy modes).
 * Used for full logout or factory reset.
 */
export function clearAllAuthData(): void {
  // Clear desktop mode credentials
  getStore().delete(MONARCH_CREDENTIALS_KEY);
  getStore().delete(REQUIRE_TOUCH_ID_KEY);

  // Clear legacy passphrase-based data
  getStore().delete(PASSPHRASE_STORAGE_KEY);
  getStore().set(BIOMETRIC_ENABLED_KEY, false);

  debugLog('Credentials: All auth data cleared');
}
