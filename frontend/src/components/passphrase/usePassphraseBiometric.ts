import { useState, useCallback, useRef, useEffect } from 'react';
import { useBiometric } from '../../hooks';
import { getErrorMessage } from '../../utils';

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
}

export function usePassphraseBiometric({
  mode,
  autoPromptBiometric,
  unlockCredentials,
  onSuccess,
  onCredentialUpdateNeeded,
  onClearCooldown,
  loading,
}: UsePassphraseBiometricOptions) {
  const biometric = useBiometric();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const biometricAttempted = useRef(false);
  const [biometricWasReset, setBiometricWasReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBiometricUnlock = useCallback(async () => {
    if (biometricLoading || loading) return;

    setBiometricLoading(true);
    setError(null);

    try {
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
  }, [biometric, biometricLoading, loading, unlockCredentials, onSuccess, onCredentialUpdateNeeded, onClearCooldown]);

  // Auto-trigger biometric authentication on mount if enrolled (unlock mode only)
  useEffect(() => {
    if (
      mode === 'unlock' &&
      autoPromptBiometric &&
      biometric.available &&
      biometric.enrolled &&
      !biometric.loading &&
      !biometricAttempted.current
    ) {
      biometricAttempted.current = true;
      void handleBiometricUnlock();
    }
  }, [mode, autoPromptBiometric, biometric.available, biometric.enrolled, biometric.loading, handleBiometricUnlock]);

  const storePassphraseForSync = useCallback(async (passphrase: string): Promise<void> => {
    if (!window.electron?.biometric) return;
    try {
      await window.electron.biometric.storeForSync(passphrase);
    } catch {
      // Don't block unlock flow if storage fails
    }
  }, []);

  const offerBiometricEnrollment = useCallback(
    async (passphrase: string): Promise<void> => {
      if (!window.electron || !biometric.available || biometric.enrolled || biometric.loading) {
        return;
      }

      try {
        const confirmed = await window.electron.showConfirmDialog({
          title: `Enable ${biometric.displayName}?`,
          message: `Would you like to use ${biometric.displayName} to unlock Eclosion in the future?`,
          detail: 'Your passphrase will be securely stored and protected by biometric authentication.',
          confirmText: 'Enable',
          cancelText: 'Not now',
        });

        if (confirmed) {
          const success = await biometric.enroll(passphrase);
          if (!success) {
            await window.electron.showErrorDialog({
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
