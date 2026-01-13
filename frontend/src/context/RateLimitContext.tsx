/**
 * Rate Limit Context
 *
 * Manages global rate limit state when Monarch API returns 429.
 * Provides:
 * - Rate limit status tracking
 * - Automatic ping checks to detect when rate limit clears
 * - Hook for components to check if actions should be disabled
 *
 * Two scenarios feed into this context:
 * 1. Startup rate limit: Desktop main process sends IPC event
 * 2. Mid-session rate limit: fetchApi emits custom DOM event on 429
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useDemo } from './DemoContext';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitState {
  /** Whether we are currently rate limited */
  isRateLimited: boolean;
  /** When the rate limit was first encountered */
  rateLimitedAt: Date | null;
  /** Estimated seconds until rate limit clears (from Retry-After header) */
  retryAfter: number | null;
  /** Next scheduled ping time */
  nextPingAt: Date | null;
}

export interface RateLimitActions {
  /** Mark as rate limited (called when 429 received) */
  setRateLimited: (retryAfter?: number) => void;
  /** Clear rate limit state (called when ping succeeds) */
  clearRateLimit: () => void;
  /** Manually trigger a ping check */
  triggerPing: () => Promise<void>;
}

export interface RateLimitContextValue extends RateLimitState, RateLimitActions {}

// ============================================================================
// Constants
// ============================================================================

/** Ping interval to check if rate limit has cleared (5 minutes) */
const PING_INTERVAL_MS = 5 * 60 * 1000;

/** Custom event name emitted by fetchApi on 429 */
const RATE_LIMIT_EVENT = 'monarch-rate-limited';

/** localStorage key for persisting rate limit state */
const STORAGE_KEY = 'eclosion-rate-limit';

/** Default cooldown duration if no retry-after provided (5 minutes) */
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

interface PersistedRateLimitState {
  rateLimitedAt: number; // timestamp
  retryAfter: number | null; // seconds
}

/**
 * Load persisted rate limit state from localStorage.
 * Returns null if no valid state exists or if the cooldown has expired.
 */
function loadPersistedState(): PersistedRateLimitState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: PersistedRateLimitState = JSON.parse(stored);
    const cooldownMs = parsed.retryAfter ? parsed.retryAfter * 1000 : DEFAULT_COOLDOWN_MS;
    const expiresAt = parsed.rateLimitedAt + cooldownMs;

    // If cooldown has expired, clear storage and return null
    if (Date.now() > expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Save rate limit state to localStorage.
 */
function persistState(rateLimitedAt: Date, retryAfter: number | null): void {
  const state: PersistedRateLimitState = {
    rateLimitedAt: rateLimitedAt.getTime(),
    retryAfter,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Clear persisted rate limit state.
 */
function clearPersistedState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================================
// Context
// ============================================================================

const RateLimitContext = createContext<RateLimitContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function RateLimitProvider({ children }: Readonly<{ children: ReactNode }>) {
  const isDemo = useDemo();

  // Initialize state from localStorage if available
  const [isRateLimited, setIsRateLimited] = useState(() => {
    if (isDemo) return false;
    return loadPersistedState() !== null;
  });
  const [rateLimitedAt, setRateLimitedAt] = useState<Date | null>(() => {
    if (isDemo) return null;
    const persisted = loadPersistedState();
    return persisted ? new Date(persisted.rateLimitedAt) : null;
  });
  const [retryAfter, setRetryAfter] = useState<number | null>(() => {
    if (isDemo) return null;
    const persisted = loadPersistedState();
    return persisted?.retryAfter ?? null;
  });
  const [nextPingAt, setNextPingAt] = useState<Date | null>(() => {
    if (isDemo) return null;
    const persisted = loadPersistedState();
    return persisted ? new Date(Date.now() + PING_INTERVAL_MS) : null;
  });

  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Ping the Monarch health endpoint to check if rate limit has cleared.
   */
  const pingMonarch = useCallback(async () => {
    // Don't ping in demo mode
    if (isDemo) return;

    try {
      const response = await fetch('/health/monarch', {
        credentials: 'include',
      });

      if (response.ok) {
        // Rate limit cleared
        setIsRateLimited(false);
        setRateLimitedAt(null);
        setRetryAfter(null);
        setNextPingAt(null);
        clearPersistedState();

        // In desktop mode, trigger sync since session may have failed during startup
        // This will re-validate credentials and establish the Monarch session
        if (globalThis.electron?.triggerSync) {
          globalThis.electron.triggerSync().catch(() => {
            // Sync errors are handled by main process notifications
          });
        }
      } else if (response.status === 429) {
        // Still rate limited - update retry info
        const data = await response.json().catch(() => ({}));
        if (data.retry_after) {
          setRetryAfter(data.retry_after);
        }
        setNextPingAt(new Date(Date.now() + PING_INTERVAL_MS));
      }
      // Other errors: keep current state, will retry on next interval
    } catch {
      // Network error - keep rate limit state, will retry on next interval
      setNextPingAt(new Date(Date.now() + PING_INTERVAL_MS));
    }
  }, [isDemo]);

  /**
   * Mark the app as rate limited.
   * Called when fetchApi receives 429 or desktop IPC notifies.
   */
  const setRateLimitedFn = useCallback((retryAfterSeconds?: number) => {
    // Don't set rate limit in demo mode
    if (isDemo) return;

    const now = new Date();
    setIsRateLimited(true);
    setRateLimitedAt(now);
    if (retryAfterSeconds) {
      setRetryAfter(retryAfterSeconds);
    }
    setNextPingAt(new Date(Date.now() + PING_INTERVAL_MS));

    // Persist to survive app restarts
    persistState(now, retryAfterSeconds ?? null);
  }, [isDemo]);

  /**
   * Clear rate limit state.
   * Called when ping succeeds or user manually clears.
   */
  const clearRateLimit = useCallback(() => {
    setIsRateLimited(false);
    setRateLimitedAt(null);
    setRetryAfter(null);
    setNextPingAt(null);
    clearPersistedState();
  }, []);

  // Set up ping interval when rate limited
  useEffect(() => {
    if (isRateLimited && !isDemo) {
      // Start pinging
      pingIntervalRef.current = setInterval(pingMonarch, PING_INTERVAL_MS);

      return () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };
    }
  }, [isRateLimited, isDemo, pingMonarch]);

  // Listen for rate limit events from fetchApi (mid-session rate limits)
  useEffect(() => {
    const handleRateLimitEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ retryAfter: number; endpoint: string }>;
      setRateLimitedFn(customEvent.detail.retryAfter);
    };

    globalThis.addEventListener(RATE_LIMIT_EVENT, handleRateLimitEvent);
    return () => {
      globalThis.removeEventListener(RATE_LIMIT_EVENT, handleRateLimitEvent);
    };
  }, [setRateLimitedFn]);

  // Listen for rate limit events from Electron IPC (startup rate limits)
  useEffect(() => {
    if (!globalThis.electron?.rateLimit?.onRateLimited) return;

    const unsubscribe = globalThis.electron.rateLimit.onRateLimited((data: { retryAfter: number }) => {
      setRateLimitedFn(data.retryAfter);
    });

    return () => {
      unsubscribe();
    };
  }, [setRateLimitedFn]);

  const value = useMemo<RateLimitContextValue>(() => ({
    // State
    isRateLimited,
    rateLimitedAt,
    retryAfter,
    nextPingAt,
    // Actions
    setRateLimited: setRateLimitedFn,
    clearRateLimit,
    triggerPing: pingMonarch,
  }), [isRateLimited, rateLimitedAt, retryAfter, nextPingAt, setRateLimitedFn, clearRateLimit, pingMonarch]);

  return (
    <RateLimitContext.Provider value={value}>
      {children}
    </RateLimitContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access rate limit state and actions.
 * Must be used within a RateLimitProvider.
 */
export function useRateLimit(): RateLimitContextValue {
  const context = useContext(RateLimitContext);
  if (!context) {
    throw new Error('useRateLimit must be used within a RateLimitProvider');
  }
  return context;
}

/**
 * Convenience hook to check if rate limited.
 * Returns false if not in a RateLimitProvider (e.g., demo mode outside provider).
 */
export function useIsRateLimited(): boolean {
  const context = useContext(RateLimitContext);
  return context?.isRateLimited ?? false;
}
