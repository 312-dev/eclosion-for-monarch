/**
 * Openverse Credentials Storage
 *
 * Manages OAuth2 credentials for the Openverse API.
 * Credentials are auto-generated on first use and stored locally:
 * - Desktop (Electron): Uses safeStorage via IPC
 * - Web: Uses localStorage
 *
 * Each installation gets unique credentials to avoid rate limit collisions.
 */

import type {
  OpenverseCredentials,
  OpenverseAccessToken,
  OpenverseRegisterResponse,
  OpenverseTokenResponse,
} from '../types';
import { isDesktopMode } from './apiBase';

// Storage key for web mode (localStorage)
const STORAGE_KEY = 'eclosion-openverse-credentials';
const TOKEN_STORAGE_KEY = 'eclosion-openverse-token';

// Openverse API endpoints
const OPENVERSE_API = 'https://api.openverse.org/v1';
const REGISTER_ENDPOINT = `${OPENVERSE_API}/auth_tokens/register/`;
const TOKEN_ENDPOINT = `${OPENVERSE_API}/auth_tokens/token/`;

// Cache credentials in memory to avoid repeated storage reads
let cachedCredentials: OpenverseCredentials | null = null;
let cachedToken: OpenverseAccessToken | null = null;

/**
 * Generate a random ID for unique registration.
 */
function generateRandomId(): string {
  // Use crypto.randomUUID if available (modern browsers), fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Get stored credentials from localStorage (web mode).
 */
function getWebCredentials(): OpenverseCredentials | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as OpenverseCredentials;
    }
  } catch {
    // Invalid JSON or storage error
  }
  return null;
}

/**
 * Store credentials in localStorage (web mode).
 */
function setWebCredentials(credentials: OpenverseCredentials): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

/**
 * Get stored access token from localStorage (web mode).
 */
function getWebToken(): OpenverseAccessToken | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as OpenverseAccessToken;
    }
  } catch {
    // Invalid JSON or storage error
  }
  return null;
}

/**
 * Store access token in localStorage (web mode).
 */
function setWebToken(token: OpenverseAccessToken): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
}

/**
 * Get stored credentials (from desktop safeStorage or web localStorage).
 */
export async function getCredentials(): Promise<OpenverseCredentials | null> {
  // Return cached if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  if (isDesktopMode() && globalThis.electron?.openverse) {
    const credentials = await globalThis.electron.openverse.getCredentials();
    if (credentials) {
      cachedCredentials = credentials;
    }
    return credentials;
  }

  // Web mode: use localStorage
  const credentials = getWebCredentials();
  if (credentials) {
    cachedCredentials = credentials;
  }
  return credentials;
}

/**
 * Store credentials (in desktop safeStorage or web localStorage).
 */
export async function storeCredentials(
  credentials: OpenverseCredentials
): Promise<boolean> {
  if (isDesktopMode() && globalThis.electron?.openverse) {
    const success = await globalThis.electron.openverse.storeCredentials(credentials);
    if (success) {
      cachedCredentials = credentials;
    }
    return success;
  }

  // Web mode: use localStorage
  try {
    setWebCredentials(credentials);
    cachedCredentials = credentials;
    return true;
  } catch {
    return false;
  }
}

/**
 * Register with Openverse API to get OAuth2 credentials.
 * This creates a new client application with unique name.
 */
export async function registerWithOpenverse(): Promise<OpenverseCredentials> {
  const randomId = generateRandomId();

  const response = await fetch(REGISTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Eclosion-${randomId}`,
      description: 'Eclosion for Monarch - Goal images',
      email: `eclosion-${randomId}@users.noreply.github.com`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Openverse registration failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as OpenverseRegisterResponse;

  const credentials: OpenverseCredentials = {
    clientId: data.client_id,
    clientSecret: data.client_secret,
    registeredAt: new Date().toISOString(),
  };

  return credentials;
}

/**
 * Get an access token using client credentials.
 * Tokens expire after 12 hours.
 */
export async function getAccessToken(
  credentials: OpenverseCredentials
): Promise<OpenverseAccessToken> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Openverse token request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as OpenverseTokenResponse;

  // Calculate expiration time (token expires_in is in seconds)
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

/**
 * Check if a token is expired or about to expire (within 5 minutes).
 */
function isTokenExpired(token: OpenverseAccessToken): boolean {
  const expiresAt = new Date(token.expiresAt).getTime();
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
  return Date.now() > expiresAt - bufferMs;
}

/**
 * Get a valid access token, refreshing if expired.
 * Returns null if credentials don't exist.
 */
export async function getValidToken(): Promise<string | null> {
  const credentials = await getCredentials();
  if (!credentials) {
    return null;
  }

  // Check cached token first
  if (cachedToken && !isTokenExpired(cachedToken)) {
    return cachedToken.accessToken;
  }

  // Check stored token (web mode only, desktop doesn't persist tokens)
  if (!isDesktopMode()) {
    const storedToken = getWebToken();
    if (storedToken && !isTokenExpired(storedToken)) {
      cachedToken = storedToken;
      return storedToken.accessToken;
    }
  }

  // Need to get a new token
  const newToken = await getAccessToken(credentials);
  cachedToken = newToken;

  // Store in web mode for persistence
  if (!isDesktopMode()) {
    setWebToken(newToken);
  }

  return newToken.accessToken;
}

/**
 * Ensure credentials exist, registering if needed.
 * Returns the credentials (existing or newly created).
 */
export async function ensureCredentials(): Promise<OpenverseCredentials> {
  // Check for existing credentials
  const existing = await getCredentials();
  if (existing) {
    return existing;
  }

  // Register for new credentials
  const credentials = await registerWithOpenverse();

  // Store the new credentials
  await storeCredentials(credentials);

  return credentials;
}

/**
 * Clear cached credentials (useful for testing or logout).
 */
export function clearCredentialsCache(): void {
  cachedCredentials = null;
  cachedToken = null;
}
