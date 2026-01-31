/**
 * Remote Unlock Hook
 *
 * Handles remote unlock functionality with server-side lockout.
 * Used by PassphrasePrompt when in remoteMode.
 */

import { useState, useEffect, useCallback } from 'react';
import { remoteUnlock as remoteUnlockApi } from '../../api/core/auth';

interface UseRemoteUnlockOptions {
  onSuccess: () => void;
  setError: (error: string | null) => void;
  setPassphrase: (passphrase: string) => void;
}

interface UseRemoteUnlockResult {
  serverLockoutSeconds: number;
  isServerLockedOut: boolean;
  handleRemoteUnlockSubmit: (passphrase: string) => Promise<void>;
  formatTime: (seconds: number) => string;
}

export function useRemoteUnlock({
  onSuccess,
  setError,
  setPassphrase,
}: UseRemoteUnlockOptions): UseRemoteUnlockResult {
  const [serverLockoutSeconds, setServerLockoutSeconds] = useState(0);

  // Server-side lockout countdown
  useEffect(() => {
    if (serverLockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setServerLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [serverLockoutSeconds, setError]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  }, []);

  const handleRemoteUnlockSubmit = useCallback(
    async (passphrase: string) => {
      const result = await remoteUnlockApi(passphrase);
      if (result.success) {
        onSuccess();
      } else {
        if (result.locked_out && result.retry_after) {
          setServerLockoutSeconds(result.retry_after);
        }
        setError(result.error || 'Invalid passphrase');
        setPassphrase('');
      }
    },
    [onSuccess, setError, setPassphrase]
  );

  return {
    serverLockoutSeconds,
    isServerLockedOut: serverLockoutSeconds > 0,
    handleRemoteUnlockSubmit,
    formatTime,
  };
}
