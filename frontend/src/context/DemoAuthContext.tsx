/**
 * Demo Auth Context
 *
 * Provides mock authentication state for demo mode.
 * Always returns authenticated=true and all auth actions are no-ops.
 * Uses the same AuthContext as the real AuthProvider so components
 * using useAuth() work seamlessly in demo mode.
 */

import { useMemo, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import type {
  LoginResult,
  SetPassphraseResult,
  UnlockResult,
  UpdateCredentialsResult,
  ResetAppResult,
} from '../types';

// ============================================================================
// Mock Implementations
// ============================================================================

const mockLogin = async (): Promise<LoginResult> => ({
  success: true,
  needs_passphrase: false,
});

const mockLogout = async (): Promise<void> => {
  // No-op in demo mode
};

const mockSetPassphrase = async (): Promise<SetPassphraseResult> => ({
  success: true,
});

const mockUnlockCredentials = async (): Promise<UnlockResult> => ({
  success: true,
  unlock_success: true,
  validation_success: true,
});

const mockUpdateCredentials = async (): Promise<UpdateCredentialsResult> => ({
  success: true,
});

const mockResetApp = async (): Promise<ResetAppResult> => ({
  success: true,
  message: 'Demo mode - reset not performed',
});

const mockCheckAuth = async (): Promise<boolean> => true;

const mockSetAuthenticated = (): void => {
  // No-op in demo mode
};

const mockSetNeedsUnlock = (): void => {
  // No-op in demo mode
};

// ============================================================================
// Provider
// ============================================================================

export function DemoAuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const value = useMemo(
    () => ({
      // State - always authenticated
      authenticated: true as boolean | null,
      needsUnlock: false,
      loading: false,
      error: null as string | null,
      // Actions - all no-ops or return success
      login: mockLogin,
      logout: mockLogout,
      setPassphrase: mockSetPassphrase,
      unlockCredentials: mockUnlockCredentials,
      updateCredentials: mockUpdateCredentials,
      resetApp: mockResetApp,
      checkAuth: mockCheckAuth,
      setAuthenticated: mockSetAuthenticated,
      setNeedsUnlock: mockSetNeedsUnlock,
    }),
    []
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
