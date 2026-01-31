/**
 * Passphrase Submit Handlers Hook
 *
 * Extracted submit handlers for PassphrasePrompt to reduce component size.
 */

import { useCallback } from 'react';
import { getErrorMessage } from '../../utils';

interface SubmitHandlersOptions {
  passphrase: string;
  mode: 'create' | 'unlock';
  remoteMode: boolean;
  isValid: boolean;
  loading: boolean;
  failedAttempts: number;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFailedAttempts: (fn: (prev: number) => number) => void;
  startCooldown: (attempts: number) => void;
  clearCooldown: () => void;
  savePassphrase: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
  unlockCredentials: (
    passphrase: string
  ) => Promise<{
    success: boolean;
    error?: string;
    needs_credential_update?: boolean;
    unlock_success?: boolean;
  }>;
  storePassphraseForSync: (passphrase: string) => Promise<void>;
  offerBiometricEnrollment: (passphrase: string) => Promise<void>;
  onSuccess: () => void;
  onCredentialUpdateNeeded: ((passphrase: string) => void) | undefined;
  remoteUnlockSubmit: (passphrase: string) => Promise<void>;
}

export function usePassphraseSubmit({
  passphrase,
  mode,
  remoteMode,
  isValid,
  loading,
  failedAttempts,
  setLoading,
  setError,
  setFailedAttempts,
  startCooldown,
  clearCooldown,
  savePassphrase,
  unlockCredentials,
  storePassphraseForSync,
  offerBiometricEnrollment,
  onSuccess,
  onCredentialUpdateNeeded,
  remoteUnlockSubmit,
}: SubmitHandlersOptions) {
  const handleCreateSubmit = useCallback(async () => {
    const result = await savePassphrase(passphrase);
    if (result.success) {
      await storePassphraseForSync(passphrase);
      await offerBiometricEnrollment(passphrase);
      onSuccess();
    } else {
      setError(result.error || 'Failed to set passphrase');
    }
  }, [
    passphrase,
    savePassphrase,
    storePassphraseForSync,
    offerBiometricEnrollment,
    onSuccess,
    setError,
  ]);

  const handleLocalUnlockSubmit = useCallback(async () => {
    const result = await unlockCredentials(passphrase);
    if (result.success) {
      clearCooldown();
      await storePassphraseForSync(passphrase);
      await offerBiometricEnrollment(passphrase);
      onSuccess();
    } else if (result.needs_credential_update && result.unlock_success) {
      clearCooldown();
      await storePassphraseForSync(passphrase);
      onCredentialUpdateNeeded?.(passphrase);
    } else {
      setFailedAttempts((prev) => prev + 1);
      startCooldown(failedAttempts + 1);
      setError(result.error || 'Invalid passphrase');
    }
  }, [
    passphrase,
    unlockCredentials,
    clearCooldown,
    storePassphraseForSync,
    offerBiometricEnrollment,
    onSuccess,
    onCredentialUpdateNeeded,
    setFailedAttempts,
    startCooldown,
    failedAttempts,
    setError,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || loading) return;
      setLoading(true);
      setError(null);
      try {
        if (mode === 'create') {
          await handleCreateSubmit();
        } else if (remoteMode) {
          await remoteUnlockSubmit(passphrase);
        } else {
          await handleLocalUnlockSubmit();
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [
      isValid,
      loading,
      setLoading,
      setError,
      mode,
      remoteMode,
      handleCreateSubmit,
      remoteUnlockSubmit,
      passphrase,
      handleLocalUnlockSubmit,
    ]
  );

  return { handleSubmit };
}
