import { isDesktopMode } from '../../utils/apiBase';

/** Get cooldown duration based on failed attempts */
export function getCooldownSeconds(failedAttempts: number): number {
  if (failedAttempts <= 3) return 0;
  if (failedAttempts <= 5) return 30;
  return 60;
}

// =========================================================================
// Lockout State Persistence
// =========================================================================

const LOCKOUT_STORAGE_KEY = 'eclosion-login-lockout';

export interface LockoutState {
  failedAttempts: number;
  cooldownUntil: number | null;
}

/**
 * Get the persisted lockout state.
 * Uses electron-store in desktop mode, localStorage in web mode.
 */
export async function getLockoutState(): Promise<LockoutState> {
  if (isDesktopMode() && globalThis.electron?.lockout) {
    const state = await globalThis.electron.lockout.getState();
    return state;
  }

  // Web mode: use localStorage
  try {
    const stored = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as LockoutState;
      // Check if cooldown has expired
      if (state.cooldownUntil && Date.now() > state.cooldownUntil) {
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        return { failedAttempts: 0, cooldownUntil: null };
      }
      return state;
    }
  } catch {
    // Ignore parse errors
  }
  return { failedAttempts: 0, cooldownUntil: null };
}

/**
 * Save the lockout state.
 * Uses electron-store in desktop mode, localStorage in web mode.
 */
export async function setLockoutState(state: LockoutState): Promise<void> {
  if (isDesktopMode() && globalThis.electron?.lockout) {
    await globalThis.electron.lockout.setState(state);
    return;
  }

  // Web mode: use localStorage
  localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Clear the lockout state (on successful login).
 * Uses electron-store in desktop mode, localStorage in web mode.
 */
export async function clearLockoutState(): Promise<void> {
  if (isDesktopMode() && globalThis.electron?.lockout) {
    await globalThis.electron.lockout.clear();
    return;
  }

  // Web mode: use localStorage
  localStorage.removeItem(LOCKOUT_STORAGE_KEY);
}

export interface RequirementCheck {
  label: string;
  met: boolean;
}

export function validatePassphrase(passphrase: string): RequirementCheck[] {
  return [
    { label: 'At least 12 characters', met: passphrase.length >= 12 },
    { label: 'At least 1 uppercase letter', met: /[A-Z]/.test(passphrase) },
    { label: 'At least 1 lowercase letter', met: /[a-z]/.test(passphrase) },
    { label: 'At least 1 number', met: /[0-9]/.test(passphrase) },
    { label: 'At least 1 special character', met: /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/\\`~]/.test(passphrase) },
  ];
}
