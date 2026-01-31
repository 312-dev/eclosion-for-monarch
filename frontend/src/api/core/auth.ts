/**
 * Auth API Functions
 *
 * Authentication-related API calls.
 */

import type {
  AuthStatus,
  LoginResult,
  SetPassphraseResult,
  UnlockResult,
  UpdateCredentialsResult,
  ResetAppResult,
} from '../../types';
import { fetchApi } from './fetchApi';

export async function checkAuthStatus(): Promise<AuthStatus> {
  return fetchApi<AuthStatus>('/auth/status');
}

export async function validateAuth(): Promise<AuthStatus> {
  return fetchApi<AuthStatus>('/auth/validate');
}

export async function login(
  email: string,
  password: string,
  mfaSecret?: string,
  mfaMode: 'secret' | 'code' = 'secret'
): Promise<LoginResult> {
  return fetchApi<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      mfa_secret: mfaSecret || '',
      mfa_mode: mfaMode,
    }),
  });
}

export async function setPassphrase(passphrase: string): Promise<SetPassphraseResult> {
  return fetchApi<SetPassphraseResult>('/auth/set-passphrase', {
    method: 'POST',
    body: JSON.stringify({ passphrase }),
  });
}

export async function unlockCredentials(
  passphrase: string,
  validate: boolean = true
): Promise<UnlockResult> {
  return fetchApi<UnlockResult>('/auth/unlock', {
    method: 'POST',
    body: JSON.stringify({ passphrase, validate }),
  });
}

export async function updateCredentials(
  email: string,
  password: string,
  passphrase: string,
  mfaSecret?: string
): Promise<UpdateCredentialsResult> {
  return fetchApi<UpdateCredentialsResult>('/auth/update-credentials', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      passphrase,
      mfa_secret: mfaSecret || '',
    }),
  });
}

export async function resetApp(): Promise<ResetAppResult> {
  return fetchApi<ResetAppResult>('/auth/reset-app', {
    method: 'POST',
  });
}

export async function lockCredentials(): Promise<void> {
  await fetchApi('/auth/lock', { method: 'POST' });
}

export async function logout(): Promise<void> {
  await fetchApi('/auth/logout', { method: 'POST' });
}

export interface ReauthResult {
  success: boolean;
  error?: string;
}

export async function reauthenticate(mfaCode: string): Promise<ReauthResult> {
  return fetchApi<ReauthResult>('/auth/reauthenticate', {
    method: 'POST',
    body: JSON.stringify({ mfa_code: mfaCode }),
  });
}

/**
 * Desktop mode login result.
 */
export interface DesktopLoginResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Desktop mode login: validate credentials and establish session directly.
 * No passphrase required - credentials stored in Electron's safeStorage.
 * Automatically includes the notes encryption key for Notes feature support.
 */
export async function desktopLogin(
  email: string,
  password: string,
  mfaSecret?: string,
  mfaMode: 'secret' | 'code' = 'secret'
): Promise<DesktopLoginResult> {
  // Get or create the notes encryption key from Electron's secure storage
  // This is needed for the Notes feature to encrypt note content
  const notesKey = await globalThis.electron?.credentials.getNotesKey();

  return fetchApi<DesktopLoginResult>('/auth/desktop-login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      mfa_secret: mfaSecret || '',
      mfa_mode: mfaMode,
      notes_key: notesKey || '',
    }),
  });
}

/**
 * Save for remote result.
 */
export interface SaveForRemoteResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Save current session credentials encrypted with a passphrase for remote access.
 * Called when desktop user enables remote access for the first time.
 *
 * @param passphrase - User's encryption passphrase for remote access
 * @param notesKey - Desktop's notes encryption key (ensures tunnel users can decrypt notes)
 */
export async function saveForRemote(
  passphrase: string,
  notesKey?: string
): Promise<SaveForRemoteResult> {
  return fetchApi<SaveForRemoteResult>('/auth/save-for-remote', {
    method: 'POST',
    body: JSON.stringify({ passphrase, notes_key: notesKey }),
  });
}

/**
 * Remote unlock result - includes lockout handling.
 */
export interface RemoteUnlockResult {
  success: boolean;
  error?: string;
  locked_out?: boolean;
  retry_after?: number;
}

/**
 * Unlock remote access with the desktop passphrase.
 * Used by remote users (accessing via tunnel) to authenticate.
 */
export async function remoteUnlock(passphrase: string): Promise<RemoteUnlockResult> {
  return fetchApi<RemoteUnlockResult>('/auth/remote-unlock', {
    method: 'POST',
    body: JSON.stringify({ passphrase }),
  });
}
