/**
 * Biometric Authentication Hook
 *
 * Provides React state and methods for biometric authentication
 * (Touch ID on macOS, Windows Hello on Windows).
 *
 * This hook:
 * - Checks biometric availability on mount
 * - Tracks enrollment status
 * - Provides methods for enrollment, authentication, and clearing
 * - Only activates in desktop mode
 */

import { useState, useEffect, useCallback } from 'react';
import { isDesktopMode } from '../utils/apiBase';
import type { BiometricType, BiometricAuthResult } from '../types/electron';

export interface UseBiometricReturn {
  /** Whether biometric authentication is available on this device */
  available: boolean;
  /** Whether biometric authentication is enrolled (passphrase stored + biometric enabled) */
  enrolled: boolean;
  /** Whether passphrase is stored (for sync, regardless of biometric status) */
  passphraseStored: boolean;
  /** Type of biometric available: 'touchId', 'windowsHello', or null */
  type: BiometricType;
  /** User-friendly display name for the biometric type (e.g., "Touch ID") */
  displayName: string;
  /** Whether the initial availability check is still loading */
  loading: boolean;
  /** Authenticate using biometric and retrieve the stored passphrase */
  authenticate: () => Promise<BiometricAuthResult>;
  /** Enroll biometric authentication by storing the passphrase */
  enroll: (passphrase: string) => Promise<boolean>;
  /** Clear biometric enrollment (remove stored passphrase) */
  clear: () => Promise<void>;
  /** Refresh the enrollment status */
  refresh: () => Promise<void>;
}

/**
 * Hook for biometric authentication in desktop mode.
 *
 * @example
 * ```tsx
 * const { available, enrolled, authenticate, enroll } = useBiometric();
 *
 * // Check if biometric is available and enrolled
 * if (available && enrolled) {
 *   const result = await authenticate();
 *   if (result.success && result.passphrase) {
 *     // Use passphrase to unlock
 *   }
 * }
 *
 * // Enroll after passphrase creation
 * if (available && !enrolled) {
 *   await enroll(passphrase);
 * }
 * ```
 */
export function useBiometric(): UseBiometricReturn {
  const [available, setAvailable] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [passphraseStored, setPassphraseStored] = useState(false);
  const [type, setType] = useState<BiometricType>(null);
  const [displayName, setDisplayName] = useState('Biometric');
  const [loading, setLoading] = useState(true);

  // Check biometric status on mount
  useEffect(() => {
    if (!isDesktopMode() || !globalThis.electron?.biometric) {
      setLoading(false);
      return;
    }

    const checkBiometric = async (): Promise<void> => {
      try {
        const biometric = globalThis.electron!.biometric;
        const [isAvailable, isEnrolled, isPassphraseStored, biometricType, name] = await Promise.all([
          biometric.isAvailable(),
          biometric.isEnrolled(),
          biometric.isPassphraseStored(),
          biometric.getType(),
          biometric.getDisplayName(),
        ]);

        setAvailable(isAvailable);
        setEnrolled(isEnrolled);
        setPassphraseStored(isPassphraseStored);
        setType(biometricType);
        setDisplayName(name);
      } catch (error) {
        console.error('Failed to check biometric status:', error);
      } finally {
        setLoading(false);
      }
    };

    void checkBiometric();
  }, []);

  /**
   * Refresh the enrollment status.
   * Call this after enrollment changes.
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!isDesktopMode() || !globalThis.electron?.biometric) {
      return;
    }

    try {
      const [isEnrolled, isPassphraseStored] = await Promise.all([
        globalThis.electron.biometric.isEnrolled(),
        globalThis.electron.biometric.isPassphraseStored(),
      ]);
      setEnrolled(isEnrolled);
      setPassphraseStored(isPassphraseStored);
    } catch (error) {
      console.error('Failed to refresh biometric status:', error);
    }
  }, []);

  /**
   * Authenticate using biometric and retrieve the stored passphrase.
   * If authentication fails due to corrupted enrollment, the backend clears
   * the enrollment and we refresh our local state to reflect that.
   */
  const authenticate = useCallback(async (): Promise<BiometricAuthResult> => {
    if (!isDesktopMode() || !globalThis.electron?.biometric) {
      return {
        success: false,
        error: 'Biometric not available',
      };
    }

    try {
      const result = await globalThis.electron.biometric.authenticate();

      // If auth failed (not due to user cancel), refresh enrollment status
      // The backend may have cleared enrollment due to corrupted data
      if (!result.success && result.error && !result.error.includes('cancel')) {
        const isEnrolled = await globalThis.electron.biometric.isEnrolled();
        setEnrolled(isEnrolled);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Authentication failed';
      return {
        success: false,
        error: errorMsg,
      };
    }
  }, []);

  /**
   * Enroll biometric authentication by storing the passphrase.
   */
  const enroll = useCallback(async (passphrase: string): Promise<boolean> => {
    if (!isDesktopMode() || !globalThis.electron?.biometric) {
      return false;
    }

    try {
      const success = await globalThis.electron.biometric.enroll(passphrase);
      if (success) {
        setEnrolled(true);
      }
      return success;
    } catch (error) {
      console.error('Failed to enroll biometric:', error);
      return false;
    }
  }, []);

  /**
   * Clear biometric enrollment (remove stored passphrase).
   */
  const clear = useCallback(async (): Promise<void> => {
    if (!isDesktopMode() || !globalThis.electron?.biometric) {
      return;
    }

    try {
      await globalThis.electron.biometric.clear();
      setEnrolled(false);
    } catch (error) {
      console.error('Failed to clear biometric enrollment:', error);
    }
  }, []);

  return {
    available,
    enrolled,
    passphraseStored,
    type,
    displayName,
    loading,
    authenticate,
    enroll,
    clear,
    refresh,
  };
}
