/**
 * useAsyncAction Hook
 *
 * Simple hook for wrapping async actions with loading state.
 * More lightweight than useAsync when you don't need to store
 * the result or error - just need loading state.
 *
 * Usage:
 *   const { execute, loading } = useAsyncAction();
 *   <button onClick={() => execute(() => saveItem(id))} disabled={loading}>
 *     {loading ? 'Saving...' : 'Save'}
 *   </button>
 */

import { useState, useCallback, useRef } from 'react';

export interface UseAsyncActionReturn {
  /** Execute an async action with loading state */
  execute: <T>(action: () => Promise<T>) => Promise<T | undefined>;
  /** Whether an action is currently in progress */
  loading: boolean;
}

/**
 * Hook for executing async actions with loading state tracking.
 *
 * Unlike useAsync, this hook doesn't store the result - it's designed
 * for fire-and-forget actions where you just need to track loading state.
 *
 * @returns Object with execute function and loading state
 */
export function useAsyncAction(): UseAsyncActionReturn {
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const execute = useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true);
    try {
      const result = await action();
      return result;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  return { execute, loading };
}
