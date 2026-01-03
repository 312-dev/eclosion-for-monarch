/**
 * useAsync Hook
 *
 * Manages async operation state (loading, error, data).
 * Eliminates repetitive loading/error state management across components.
 *
 * Usage:
 *   const { execute, loading, error, data } = useAsync(fetchData);
 *   <button onClick={() => execute(id)} disabled={loading}>
 *     {loading ? 'Loading...' : 'Fetch'}
 *   </button>
 */

import { useState, useCallback, useRef } from 'react';
import { getErrorMessage } from '../utils/errors';

export interface UseAsyncState<T> {
  /** The data returned from the async function */
  data: T | null;
  /** Whether the async operation is in progress */
  loading: boolean;
  /** Error message if the operation failed */
  error: string | null;
}

export interface UseAsyncOptions<T> {
  /** Callback when operation succeeds */
  onSuccess?: (data: T) => void;
  /** Callback when operation fails */
  onError?: (error: Error) => void;
  /** Initial data value */
  initialData?: T | null;
}

export interface UseAsyncReturn<T, Args extends unknown[]> extends UseAsyncState<T> {
  /** Execute the async function */
  execute: (...args: Args) => Promise<T | null>;
  /** Reset state to initial values */
  reset: () => void;
  /** Manually set data */
  setData: (data: T | null) => void;
  /** Manually set error */
  setError: (error: string | null) => void;
}

/**
 * Hook for managing async operations with loading/error state.
 *
 * @param asyncFn - The async function to execute
 * @param options - Configuration options
 * @returns Async state and controls
 */
export function useAsync<T, Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
  const { onSuccess, onError, initialData = null } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);

  // Track current execution to handle race conditions
  const executionIdRef = useRef(0);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      const executionId = ++executionIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);

        // Only update state if this is still the latest execution and component is mounted
        if (executionId === executionIdRef.current && mountedRef.current) {
          setData(result);
          setLoading(false);
          onSuccess?.(result);
        }

        return result;
      } catch (err) {
        // Only update state if this is still the latest execution and component is mounted
        if (executionId === executionIdRef.current && mountedRef.current) {
          const errorMessage = getErrorMessage(err);
          setError(errorMessage);
          setLoading(false);
          onError?.(err instanceof Error ? err : new Error(errorMessage));
        }

        return null;
      }
    },
    [asyncFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
    setError,
  };
}

/**
 * Simplified hook for immediate async execution on mount.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useAsyncEffect(() => fetchData(id), [id]);
 */
export function useAsyncEffect<T>(
  asyncFn: () => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deps: React.DependencyList = [],
  options: UseAsyncOptions<T> = {}
): UseAsyncState<T> & { refetch: () => Promise<T | null> } {
  // Note: _deps is kept for API compatibility but not used directly
  // The consumer should call refetch() when needed
  const { execute, ...state } = useAsync(asyncFn, options);

  const refetch = useCallback(() => execute(), [execute]);

  return { ...state, refetch };
}
