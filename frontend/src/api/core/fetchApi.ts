/**
 * Core API Utilities
 *
 * Shared fetch wrapper and error classes for the API client.
 */

const API_BASE = '';

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
      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
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
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return response.blob();
}
