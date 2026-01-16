/**
 * Month Transition Context
 *
 * Detects when the calendar month changes and triggers auto-sync.
 * Manages transition states: current, syncing, stale, failed.
 *
 * Skipped in demo mode - demo mode always uses current month.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useDemo } from './DemoContext';
import { useIsRateLimited } from './RateLimitContext';
import { useDashboardQuery, useSyncMutation } from '../api/queries';

// ============================================================================
// Types
// ============================================================================

type TransitionState = 'current' | 'syncing' | 'stale' | 'failed';

interface MonthTransitionState {
  /** YYYY-MM of actual current month (from local time) */
  currentCalendarMonth: string;
  /** YYYY-MM of data in dashboard (from backend) */
  dataMonth: string | null;
  /** Current transition state */
  transitionState: TransitionState;
  /** Error message if sync failed */
  syncError: string | null;
}

interface MonthTransitionActions {
  /** Manually trigger month sync */
  triggerMonthSync: () => Promise<void>;
  /** Dismiss error and go to stale state */
  dismissError: () => void;
}

interface MonthTransitionContextValue extends MonthTransitionState, MonthTransitionActions {}

// ============================================================================
// Helpers
// ============================================================================

/** Get current month in YYYY-MM format */
function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Format YYYY-MM to full month name (e.g., "January") */
export function formatMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(
    Number.parseInt(year ?? '2026', 10),
    Number.parseInt(month ?? '1', 10) - 1,
    1
  );
  return date.toLocaleDateString('en-US', { month: 'long' });
}

/** Format YYYY-MM to short month name (e.g., "Jan") */
export function formatMonthShort(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(
    Number.parseInt(year ?? '2026', 10),
    Number.parseInt(month ?? '1', 10) - 1,
    1
  );
  return date.toLocaleDateString('en-US', { month: 'short' });
}

// ============================================================================
// Constants
// ============================================================================

/** How often to check for month changes (1 minute) */
const MONTH_CHECK_INTERVAL_MS = 60 * 1000;

// ============================================================================
// Context
// ============================================================================

const MonthTransitionContext = createContext<MonthTransitionContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function MonthTransitionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const isDemo = useDemo();
  const isRateLimited = useIsRateLimited();
  const { data: dashboard } = useDashboardQuery();
  const syncMutation = useSyncMutation();

  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(getCurrentMonth);
  const [transitionState, setTransitionState] = useState<TransitionState>('current');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Track if we've already attempted a sync for this month transition
  const syncAttemptedRef = useRef(false);

  const dataMonth = dashboard?.data_month ?? null;

  // Check if month has changed (data is stale)
  const isMonthStale = dataMonth !== null && dataMonth !== currentCalendarMonth;

  /**
   * Trigger sync for month transition.
   */
  const triggerMonthSync = useCallback(async () => {
    if (isDemo || isRateLimited) return;

    setTransitionState('syncing');
    setSyncError(null);

    try {
      await syncMutation.mutateAsync();
      // After successful sync, dashboard will refetch and dataMonth will update
      setTransitionState('current');
      syncAttemptedRef.current = false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      setSyncError(message);
      setTransitionState('failed');
    }
  }, [isDemo, isRateLimited, syncMutation]);

  /**
   * Dismiss error and go to stale state.
   */
  const dismissError = useCallback(() => {
    setSyncError(null);
    setTransitionState('stale');
  }, []);

  // Minute-interval check for midnight rollover
  useEffect(() => {
    if (isDemo) return;

    const checkMonth = () => {
      const newMonth = getCurrentMonth();
      if (newMonth !== currentCalendarMonth) {
        setCurrentCalendarMonth(newMonth);
        syncAttemptedRef.current = false; // Reset so we can attempt sync for new month
      }
    };

    const interval = setInterval(checkMonth, MONTH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isDemo, currentCalendarMonth]);

  // Visibility change detection (app focus)
  useEffect(() => {
    if (isDemo) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Check if month changed while app was hidden
        const newMonth = getCurrentMonth();
        if (newMonth !== currentCalendarMonth) {
          setCurrentCalendarMonth(newMonth);
          syncAttemptedRef.current = false; // Reset so we can attempt sync
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isDemo, currentCalendarMonth]);

  // Auto-trigger sync when month becomes stale
  useEffect(() => {
    if (isDemo) return;

    // Only act if month is stale and we're in 'current' state (haven't started transition yet)
    if (isMonthStale && transitionState === 'current') {
      if (!isRateLimited && !syncAttemptedRef.current) {
        // Can sync - trigger it (use requestAnimationFrame to avoid sync setState in effect)
        syncAttemptedRef.current = true;
        requestAnimationFrame(() => {
          void triggerMonthSync();
        });
      } else if (isRateLimited) {
        // Can't sync due to rate limit - show stale state
        requestAnimationFrame(() => {
          setTransitionState('stale');
        });
      }
    }
  }, [isDemo, isMonthStale, transitionState, isRateLimited, triggerMonthSync]);

  // When rate limit clears and we're stale, auto-trigger sync
  useEffect(() => {
    if (isDemo) return;

    if (
      transitionState === 'stale' &&
      !isRateLimited &&
      isMonthStale &&
      !syncAttemptedRef.current
    ) {
      syncAttemptedRef.current = true;
      requestAnimationFrame(() => {
        void triggerMonthSync();
      });
    }
  }, [isDemo, transitionState, isRateLimited, isMonthStale, triggerMonthSync]);

  // Update state when data_month changes (after successful sync)
  useEffect(() => {
    if (dataMonth === currentCalendarMonth && transitionState !== 'current') {
      requestAnimationFrame(() => {
        setTransitionState('current');
        setSyncError(null);
      });
    }
  }, [dataMonth, currentCalendarMonth, transitionState]);

  const value = useMemo<MonthTransitionContextValue>(
    () => ({
      currentCalendarMonth,
      dataMonth,
      transitionState,
      syncError,
      triggerMonthSync,
      dismissError,
    }),
    [currentCalendarMonth, dataMonth, transitionState, syncError, triggerMonthSync, dismissError]
  );

  return (
    <MonthTransitionContext.Provider value={value}>{children}</MonthTransitionContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access month transition state and actions.
 * Must be used within a MonthTransitionProvider.
 */
export function useMonthTransition(): MonthTransitionContextValue {
  const context = useContext(MonthTransitionContext);
  if (!context) {
    throw new Error('useMonthTransition must be used within a MonthTransitionProvider');
  }
  return context;
}

/**
 * Get the data month for display purposes.
 * Returns current month if context not available (e.g., demo mode).
 */
export function useDataMonth(): string {
  const context = useContext(MonthTransitionContext);
  return context?.dataMonth ?? getCurrentMonth();
}
