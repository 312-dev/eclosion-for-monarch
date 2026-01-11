/**
 * Auth Context
 *
 * Manages authentication state including:
 * - Login/logout flow
 * - Passphrase unlock for encrypted credentials
 * - Auth validation with Monarch API
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  checkAuthStatus,
  validateAuth,
  login as apiLogin,
  logout as apiLogout,
  setPassphrase as apiSetPassphrase,
  unlockCredentials as apiUnlockCredentials,
  updateCredentials as apiUpdateCredentials,
  resetApp as apiResetApp,
} from '../api/client';
import type { LoginResult, SetPassphraseResult, UnlockResult, UpdateCredentialsResult, ResetAppResult } from '../types';

// ============================================================================
// Types
// ============================================================================

/** Reason why the app was locked */
export type LockReason = 'manual' | 'system-lock' | 'idle' | null;

export interface AuthState {
  /** Whether user is authenticated (null = loading) */
  authenticated: boolean | null;
  /** Whether encrypted credentials exist but need passphrase */
  needsUnlock: boolean;
  /** Whether initial auth check is in progress */
  loading: boolean;
  /** Connection/API error if auth check failed */
  error: string | null;
  /** Reason the app was locked (null = app startup, not a lock event) */
  lockReason: LockReason;
}

export interface AuthActions {
  /** Login with email/password/mfa */
  login: (email: string, password: string, mfaSecret?: string) => Promise<LoginResult>;
  /** Lock app and return to unlock screen (preserves credentials) */
  lock: () => void;
  /** Logout and clear credentials */
  logout: () => Promise<void>;
  /** Set passphrase to encrypt credentials */
  setPassphrase: (passphrase: string) => Promise<SetPassphraseResult>;
  /** Unlock encrypted credentials with passphrase (validates against Monarch by default) */
  unlockCredentials: (passphrase: string) => Promise<UnlockResult>;
  /** Update Monarch credentials with same passphrase (used when existing creds are invalid) */
  updateCredentials: (email: string, password: string, passphrase: string, mfaSecret?: string) => Promise<UpdateCredentialsResult>;
  /** Reset app - clear credentials only, preserve preferences */
  resetApp: () => Promise<ResetAppResult>;
  /** Re-check auth status */
  checkAuth: () => Promise<boolean>;
  /** Mark as authenticated (after successful login flow) */
  setAuthenticated: (value: boolean) => void;
  /** Mark as needing unlock */
  setNeedsUnlock: (value: boolean) => void;
}

export interface AuthContextValue extends AuthState, AuthActions {}

// ============================================================================
// Context
// ============================================================================

export const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason>(null);

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
      // Determine user-friendly error message
      let errorMessage = 'Unable to connect to the server';
      if (err instanceof Error) {
        if (err.message.includes('Rate limit')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('ERR_')) {
          errorMessage = 'Unable to connect to the server. Please check if the backend is running.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      setAuthenticated(false);
      return false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string, mfaSecret?: string): Promise<LoginResult> => {
    const result = await apiLogin(email, password, mfaSecret);
    return result;
  }, []);

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
  }, []);

  const setPassphrase = useCallback(async (passphrase: string): Promise<SetPassphraseResult> => {
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
  }, [hasPendingSync]);

  const unlockCredentials = useCallback(async (passphrase: string): Promise<UnlockResult> => {
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
  }, [hasPendingSync]);

  const updateCredentials = useCallback(async (
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
  }, []);

  const resetApp = useCallback(async (): Promise<ResetAppResult> => {
    const result = await apiResetApp();
    if (result.success) {
      setAuthenticated(false);
      setNeedsUnlock(false);
    }
    return result;
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

  const value: AuthContextValue = {
    // State
    authenticated,
    needsUnlock,
    loading,
    error,
    lockReason,
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access auth state and actions.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Check if user is authenticated (convenience hook)
 */
export function useIsAuthenticated(): boolean {
  const { authenticated } = useAuth();
  return authenticated === true;
}

/**
 * Check if auth is still loading
 */
export function useAuthLoading(): boolean {
  const { loading } = useAuth();
  return loading;
}
