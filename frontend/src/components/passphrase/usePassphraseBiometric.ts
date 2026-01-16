import { useState, useCallback, useRef, useEffect } from 'react';
import { useBiometric } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { isDesktopMode } from '../../utils/apiBase';

interface UnlockResult {
  success: boolean;
  error?: string;
  needs_credential_update?: boolean;
  unlock_success?: boolean;
}

interface UsePassphraseBiometricOptions {
  mode: 'create' | 'unlock';
  autoPromptBiometric: boolean;
  unlockCredentials: (passphrase: string) => Promise<UnlockResult>;
  onSuccess: () => void;
  onCredentialUpdateNeeded?: (passphrase: string) => void;
  onClearCooldown: () => void;
  loading: boolean;
  /** Auth state setter for desktop mode - called on Touch ID success */
  setAuthenticated?: (value: boolean) => void;
  /** Auth state setter for desktop mode - called on Touch ID success */
  setNeedsUnlock?: (value: boolean) => void;
}

export function usePassphraseBiometric({
  mode,
  autoPromptBiometric,
  unlockCredentials,
  onSuccess,
  onCredentialUpdateNeeded,
  onClearCooldown,
  loading,
  setAuthenticated,
  setNeedsUnlock,
}: UsePassphraseBiometricOptions) {
  const biometric = useBiometric();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const biometricAttempted = useRef(false);
  const [biometricWasReset, setBiometricWasReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Desktop mode: Track if Touch ID is required
  const [requireTouchId, setRequireTouchId] = useState(false);
  useEffect(() => {
    if (isDesktopMode() && globalThis.electron?.credentials) {
      globalThis.electron.credentials.getRequireTouchId().then(setRequireTouchId);
    }
  }, []);

  // eslint-disable-next-line sonarjs/cognitive-complexity -- Biometric unlock handles desktop/web modes, Touch ID, passphrase decryption, and error recovery
  const handleBiometricUnlock = useCallback(async () => {
    if (biometricLoading || loading) return;

    setBiometricLoading(true);
    setError(null);

    try {
      // Desktop mode: Use credentials.authenticate() which prompts Touch ID
      // and returns credentials directly (no passphrase involved)
      if (isDesktopMode() && globalThis.electron?.credentials) {
        const result = await globalThis.electron.credentials.authenticate();
        if (result.success) {
          // Update auth state - the useEffect in UnlockPage will handle navigation
          // Note: We don't call onSuccess() here because React state updates are async.
          // If we navigate immediately, ProtectedRoute still sees old state and redirects back.
          // The useEffect watching authenticated/needsUnlock will navigate when state updates.
          setAuthenticated?.(true);
          setNeedsUnlock?.(false);
          onClearCooldown();
          // Don't call onSuccess() - let useEffect handle navigation after state updates
        } else if (result.error) {
          if (!result.error.includes('cancel')) {
            setError(result.error);
          }
        }
        return;
      }

      // Legacy mode: Use passphrase-based biometric authentication
      const result = await biometric.authenticate();
      if (result.success && result.passphrase) {
        const unlockResult = await unlockCredentials(result.passphrase);
        if (unlockResult.success) {
          onClearCooldown();
          onSuccess();
        } else if (unlockResult.needs_credential_update && unlockResult.unlock_success) {
          onClearCooldown();
          onCredentialUpdateNeeded?.(result.passphrase);
        } else {
          setError(unlockResult.error || 'Failed to unlock');
        }
      } else if (result.error) {
        if (!result.error.includes('cancel')) {
          if (result.error.includes('reset') || !biometric.enrolled) {
            setBiometricWasReset(true);
          }
          setError(result.error);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBiometricLoading(false);
    }
  }, [
    biometric,
    biometricLoading,
    loading,
    unlockCredentials,
    onSuccess,
    onCredentialUpdateNeeded,
    onClearCooldown,
    setAuthenticated,
    setNeedsUnlock,
  ]);

  // Auto-trigger biometric authentication on mount if enrolled/enabled (unlock mode only)
  // Check both requireTouchId (desktop mode) and biometric.enrolled (legacy mode)
  useEffect(() => {
    if (
      mode === 'unlock' &&
      autoPromptBiometric &&
      biometric.available &&
      (requireTouchId || biometric.enrolled) &&
      !biometric.loading &&
      !biometricAttempted.current
    ) {
      biometricAttempted.current = true;
      void handleBiometricUnlock();
    }
  }, [
    mode,
    autoPromptBiometric,
    biometric.available,
    biometric.enrolled,
    biometric.loading,
    requireTouchId,
    handleBiometricUnlock,
  ]);

  const storePassphraseForSync = useCallback(async (passphrase: string): Promise<void> => {
    if (!globalThis.electron?.biometric) return;
    try {
      await globalThis.electron.biometric.storeForSync(passphrase);
    } catch {
      // Don't block unlock flow if storage fails
    }
  }, []);

  const offerBiometricEnrollment = useCallback(
    async (passphrase: string): Promise<void> => {
      if (!globalThis.electron || !biometric.available || biometric.enrolled || biometric.loading) {
        return;
      }

      try {
        const confirmed = await globalThis.electron.showConfirmDialog({
          title: `Enable ${biometric.displayName}?`,
          message: `Would you like to use ${biometric.displayName} to unlock Eclosion in the future?`,
          detail:
            'Your passphrase will be securely stored and protected by biometric authentication.',
          confirmText: 'Enable',
          cancelText: 'Not now',
        });

        if (confirmed) {
          const success = await biometric.enroll(passphrase);
          if (!success) {
            await globalThis.electron.showErrorDialog({
              title: 'Enrollment Failed',
              content: `Could not enable ${biometric.displayName}. You can try again from Settings.`,
            });
          }
        }
      } catch {
        // Don't block unlock flow if dialog fails
      }
    },
    [biometric]
  );

  return {
    biometric,
    biometricLoading,
    biometricWasReset,
    biometricError: error,
    clearBiometricError: () => setError(null),
    handleBiometricUnlock,
    storePassphraseForSync,
    offerBiometricEnrollment,
  };
}
