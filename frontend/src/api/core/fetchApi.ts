/**
 * Core API Utilities
 *
 * Shared fetch wrapper and error classes for the API client.
 */

import { getApiBaseSync, getDesktopSecret, initializeApiBase, isDesktopMode } from '../../utils/apiBase';

// Track initialization state for desktop mode
let apiBaseInitialized = false;

/**
 * Get the API base URL.
 * - Web mode: returns empty string (relative URLs)
 * - Desktop mode: returns http://127.0.0.1:{port}
 */
function getApiBase(): string {
  return getApiBaseSync();
}

/**
 * Initialize the API for desktop mode.
 * Must be called during app startup before making API calls.
 */
export async function initializeApi(): Promise<void> {
  if (isDesktopMode() && !apiBaseInitialized) {
    await initializeApiBase();
    apiBaseInitialized = true;
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthRequiredError';
  }
}

export class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number = 60, message?: string) {
    super(message || `Monarch Money API rate limit reached. Please wait ${retryAfter}s before retrying.`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Track in-flight requests to deduplicate concurrent calls
const inFlightRequests = new Map<string, Promise<unknown>>();

// Track rate limit state per endpoint
const rateLimitState = new Map<string, { until: number }>();

/**
 * Core fetch wrapper with error handling, deduplication, and rate limiting.
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const method = options?.method || 'GET';
  const requestKey = `${method}:${endpoint}`;

  // Check if we're currently rate limited for this endpoint
  const rateLimited = rateLimitState.get(endpoint);
  if (rateLimited && Date.now() < rateLimited.until) {
    const waitSeconds = Math.ceil((rateLimited.until - Date.now()) / 1000);
    throw new RateLimitError(waitSeconds);
  }

  // For GET requests, deduplicate concurrent calls to the same endpoint
  if (method === 'GET') {
    const existing = inFlightRequests.get(requestKey);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const requestPromise = (async () => {
    try {
      // Build headers, including desktop secret if in Electron mode
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add desktop secret header for API authentication in Electron mode
      const desktopSecret = getDesktopSecret();
      if (desktopSecret) {
        headers['X-Desktop-Secret'] = desktopSecret;
      }

      const response = await fetch(`${getApiBase()}${endpoint}`, {
        credentials: 'include',
        headers,
        ...options,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = Number.parseInt(response.headers.get('Retry-After') || '60', 10);
          rateLimitState.set(endpoint, { until: Date.now() + (retryAfter * 1000) });
          const errorBody = await response.json().catch(() => ({}));
          throw new RateLimitError(retryAfter, errorBody.error);
        }

        const error = await response.json().catch(() => ({}));
        if (error.auth_required || response.status === 401) {
          throw new AuthRequiredError();
        }
        throw new Error(error.error || `API error: ${response.status}`);
      }

      return response.json();
    } finally {
      if (method === 'GET') {
        inFlightRequests.delete(requestKey);
      }
    }
  })();

  if (method === 'GET') {
    inFlightRequests.set(requestKey, requestPromise);
  }

  return requestPromise;
}

/**
 * Fetch a blob response (for file downloads).
 */
export async function fetchBlob(endpoint: string): Promise<Blob> {
  // Build headers, including desktop secret if in Electron mode
  const headers: Record<string, string> = {};
  const desktopSecret = getDesktopSecret();
  if (desktopSecret) {
    headers['X-Desktop-Secret'] = desktopSecret;
  }

  const response = await fetch(`${getApiBase()}${endpoint}`, {
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return response.blob();
}
