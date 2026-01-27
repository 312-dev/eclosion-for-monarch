/* eslint-disable max-lines -- Auth context manages complex state machine with multiple authentication paths */
/** Auth Context - manages authentication state including login, unlock, and validation. */
import { createContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  checkAuthStatus,
  validateAuth,
  login as apiLogin,
  logout as apiLogout,
  setPassphrase as apiSetPassphrase,
  unlockCredentials as apiUnlockCredentials,
  updateCredentials as apiUpdateCredentials,
  resetApp as apiResetApp,
  reauthenticate as apiReauthenticate,
} from '../api/client';
import type { LockReason, MfaRequiredData, AuthContextValue } from './authTypes';
import type {
  LoginResult,
  SetPassphraseResult,
  UnlockResult,
  UpdateCredentialsResult,
  ResetAppResult,
} from '../types';
import type { ReauthResult } from '../api/client';

// Re-export types for consumers
export type {
  LockReason,
  MfaRequiredData,
  AuthState,
  AuthActions,
  AuthContextValue,
} from './authTypes';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [syncBlocked, setSyncBlocked] = useState(false);
  const [mfaRequiredData, setMfaRequiredData] = useState<MfaRequiredData | null>(null);
  const [showSessionExpiredOverlay, setShowSessionExpiredOverlay] = useState(false);
  // Track if user was previously authenticated (for distinguishing session expiry from initial login)
  const wasAuthenticated = useRef(false);

  // eslint-disable-next-line sonarjs/cognitive-complexity -- Auth state machine with multiple paths and error handling
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      // First check auth status (fast, no API validation)
      const status = await checkAuthStatus();

      if (status.needs_unlock) {
        // Encrypted credentials exist but need passphrase
        setNeedsUnlock(true);
        setAuthenticated(false);
        return false;
      }

      if (!status.authenticated && !status.has_stored_credentials) {
        // Backend has no stored credentials, but check if desktop app has them
        // This happens when auto-lock is enabled - session isn't restored on startup
        if (globalThis.electron?.credentials) {
          const hasElectronCreds = await globalThis.electron.credentials.has();
          if (hasElectronCreds) {
            // Desktop mode with stored credentials but no session - show unlock
            setNeedsUnlock(true);
            setAuthenticated(false);
            return false;
          }
        }
        // No credentials at all, need to login
        setAuthenticated(false);
        return false;
      }

      // Credentials are unlocked, validate with Monarch API
      const validated = await validateAuth();
      setAuthenticated(validated.authenticated);
      setNeedsUnlock(false);
      return validated.authenticated;
    } catch (err) {
      const isRateLimitErr = err instanceof Error && err.message.includes('Rate limit');

      // In desktop mode with stored credentials, rate limits mean credentials are known-good
      // (they worked before), so allow the app to load with rate limit banner instead of ErrorPage
      if (isRateLimitErr && globalThis.electron?.credentials) {
        const hasCredentials = await globalThis.electron.credentials.has();
        if (hasCredentials) {
          // Don't set error - let the app load with rate limit banner
          // The RateLimitContext will handle showing the banner via IPC event
          setAuthenticated(true);
          setNeedsUnlock(false);
          return true;
        }
      }

      // Determine user-friendly error message
      const isDesktop = !!globalThis.electron;
      let errorMessage = isDesktop
        ? 'Unable to connect to Eclosion. Please restart the app or try again.'
        : 'Unable to connect to the server';
      if (err instanceof Error) {
        if (isRateLimitErr) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('ERR_')
        ) {
          errorMessage = isDesktop
            ? 'Unable to connect to Eclosion. Please restart the app or try again.'
            : 'Unable to connect to the server. Please check if the backend is running.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      setAuthenticated(false);
      return false;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string, mfaSecret?: string): Promise<LoginResult> => {
      const result = await apiLogin(email, password, mfaSecret);
      return result;
    },
    []
  );

  const lock = useCallback(() => {
    // Lock the app - user will need to enter passphrase to unlock
    // This preserves credentials, just requires re-authentication
    setAuthenticated(false);
    setNeedsUnlock(true);
    setLockReason('manual');

    // Trigger Electron lock if available (desktop app)
    globalThis.electron?.lock?.lockApp();
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAuthenticated(false);
    setNeedsUnlock(false);

    // In desktop mode, also clear stored credentials from Electron's safeStorage
    if (globalThis.electron?.credentials) {
      await globalThis.electron.credentials.clearAll();
    }

    // Switch back to minimal menu (macOS only, no-op on Windows/Linux)
    globalThis.electron?.menu?.setMinimal().catch(() => {
      // Ignore errors - menu is a UX enhancement, not critical
    });
  }, []);

  const setPassphrase = useCallback(
    async (passphrase: string): Promise<SetPassphraseResult> => {
      const result = await apiSetPassphrase(passphrase);
      if (result.success) {
        setAuthenticated(true);
        setNeedsUnlock(false);
        setLockReason(null);

        // Execute pending sync if one was requested from menu
        if (hasPendingSync && globalThis.electron?.pendingSync) {
          setHasPendingSync(false);
          globalThis.electron.pendingSync.executePending(passphrase).catch(() => {
            // Sync errors are handled by main process notifications
          });
        }
      }
      return result;
    },
    [hasPendingSync]
  );

  const unlockCredentials = useCallback(
    async (passphrase: string): Promise<UnlockResult> => {
      // Always validate against Monarch when unlocking
      const result = await apiUnlockCredentials(passphrase, true);
      if (result.success) {
        setAuthenticated(true);
        setNeedsUnlock(false);
        setLockReason(null);

        // Execute pending sync if one was requested from menu
        if (hasPendingSync && globalThis.electron?.pendingSync) {
          setHasPendingSync(false);
          globalThis.electron.pendingSync.executePending(passphrase).catch(() => {
            // Sync errors are handled by main process notifications
          });
        }
      }
      // If unlock_success but not validation_success, caller should handle credential update
      return result;
    },
    [hasPendingSync]
  );

  const updateCredentials = useCallback(
    async (
      email: string,
      password: string,
      passphrase: string,
      mfaSecret?: string
    ): Promise<UpdateCredentialsResult> => {
      const result = await apiUpdateCredentials(email, password, passphrase, mfaSecret);
      if (result.success) {
        setAuthenticated(true);
        setNeedsUnlock(false);
      }
      return result;
    },
    []
  );

  const resetApp = useCallback(async (): Promise<ResetAppResult> => {
    const result = await apiResetApp();
    if (result.success) {
      setAuthenticated(false);
      setNeedsUnlock(false);

      // In desktop mode, also clear stored credentials from Electron's safeStorage
      if (globalThis.electron?.credentials) {
        await globalThis.electron.credentials.clearAll();
      }
    }
    return result;
  }, []);

  const reauthenticate = useCallback(async (mfaCode: string): Promise<ReauthResult> => {
    const result = await apiReauthenticate(mfaCode);
    if (result.success) {
      setNeedsReauth(false);
      setSyncBlocked(false);
    }
    return result;
  }, []);

  const triggerReauth = useCallback(() => {
    setNeedsReauth(true);
    setSyncBlocked(true);
  }, []);

  const clearSyncBlocked = useCallback(() => {
    setSyncBlocked(false);
  }, []);

  const clearMfaRequired = useCallback(() => {
    setMfaRequiredData(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setLoading(false);
    };
    init();
  }, [checkAuth]);

  // Listen for app lock events from Electron (desktop only)
  useEffect(() => {
    if (!globalThis.electron?.lock?.onLocked) return;

    const unsubscribe = globalThis.electron.lock.onLocked((data) => {
      // Only lock if we're currently authenticated
      if (authenticated) {
        setAuthenticated(false);
        setNeedsUnlock(true);
        // Track the reason so we know whether to auto-prompt biometric
        setLockReason(data.reason as LockReason);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [authenticated]);

  // Listen for pending sync requests from menu (desktop only)
  // This is triggered when user clicks "Sync Now" from menu while locked
  useEffect(() => {
    if (!globalThis.electron?.pendingSync?.onSyncPending) return;

    const unsubscribe = globalThis.electron.pendingSync.onSyncPending(() => {
      setHasPendingSync(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen for re-authentication requests from desktop (session expired)
  useEffect(() => {
    if (!globalThis.electron?.reauth?.onNeedsReauth) return;

    const unsubscribe = globalThis.electron.reauth.onNeedsReauth(() => {
      // Trigger reauth flow - show modal and block sync
      setNeedsReauth(true);
      setSyncBlocked(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen for MFA required events from desktop (6-digit code users on restart)
  useEffect(() => {
    if (!globalThis.electron?.reauth?.onMfaRequired) return;

    const unsubscribe = globalThis.electron.reauth.onMfaRequired((data) => {
      // Store the MFA required data to show the re-auth prompt
      setMfaRequiredData(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Track when user becomes authenticated so we can detect session expiry
  useEffect(() => {
    if (authenticated === true) {
      wasAuthenticated.current = true;
    }
  }, [authenticated]);

  // Listen for auth-required events from API calls (e.g., 401 responses)
  // This handles the case where local auth succeeds but Monarch token is expired
  useEffect(() => {
    const handleAuthRequired = () => {
      // If user was previously authenticated, show the session expired overlay
      // instead of redirecting to login page (better UX - preserves current state)
      if (wasAuthenticated.current) {
        setShowSessionExpiredOverlay(true);
        return;
      }

      // Mark as not authenticated to trigger redirect to login/unlock
      setAuthenticated(false);
      // If we're in desktop mode with stored credentials, go to unlock screen
      // Otherwise, go to login screen (handled by ProtectedRoute)
      if (globalThis.electron?.credentials) {
        setNeedsUnlock(true);
      }
    };

    globalThis.addEventListener('auth-required', handleAuthRequired);
    return () => {
      globalThis.removeEventListener('auth-required', handleAuthRequired);
    };
  }, []);

  const dismissSessionExpiredOverlay = useCallback(() => {
    setShowSessionExpiredOverlay(false);
  }, []);

  const value: AuthContextValue = {
    // State
    authenticated,
    needsUnlock,
    loading,
    error,
    lockReason,
    needsReauth,
    syncBlocked,
    mfaRequiredData,
    showSessionExpiredOverlay,
    // Actions
    login,
    lock,
    logout,
    setPassphrase,
    unlockCredentials,
    updateCredentials,
    resetApp,
    checkAuth,
    setAuthenticated,
    setNeedsUnlock,
    reauthenticate,
    triggerReauth,
    clearSyncBlocked,
    clearMfaRequired,
    dismissSessionExpiredOverlay,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Re-export hooks
export { useAuth, useIsAuthenticated, useAuthLoading } from './useAuthHooks';
