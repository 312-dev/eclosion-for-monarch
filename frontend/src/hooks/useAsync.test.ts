import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsync } from './useAsync';

describe('useAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with loading false and no data or error', () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('can have initial data', () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn, { initialData: 'initial' }));

      expect(result.current.data).toBe('initial');
    });
  });

  describe('execute', () => {
    it('sets loading to true during execution', async () => {
      let resolvePromise: (value: string) => void;
      const asyncFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useAsync(asyncFn));

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!('result');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('stores successful result in data', async () => {
      const asyncFn = vi.fn().mockResolvedValue('success');
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('success');
      expect(result.current.error).toBeNull();
    });

    it('stores error message on failure', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('Something went wrong'));
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('Something went wrong');
      expect(result.current.data).toBeNull();
    });

    it('passes arguments to async function', async () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute('arg1', 'arg2');
      });

      expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('returns the result from execute', async () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn));

      let executeResult: string | null = null;
      await act(async () => {
        executeResult = await result.current.execute();
      });

      expect(executeResult).toBe('result');
    });

    it('returns null on error', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('error'));
      const { result } = renderHook(() => useAsync(asyncFn));

      let executeResult: string | null = 'not-null';
      await act(async () => {
        executeResult = await result.current.execute();
      });

      expect(executeResult).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('calls onSuccess callback on success', async () => {
      const onSuccess = vi.fn();
      const asyncFn = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn, { onSuccess }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledWith('result');
    });

    it('calls onError callback on failure', async () => {
      const onError = vi.fn();
      const error = new Error('error');
      const asyncFn = vi.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useAsync(asyncFn, { onError }));

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('reset', () => {
    it('resets state to initial values', async () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn, { initialData: 'initial' }));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('result');

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBe('initial');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setData and setError', () => {
    it('allows manually setting data', () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn));

      act(() => {
        result.current.setData('manual data');
      });

      expect(result.current.data).toBe('manual data');
    });

    it('allows manually setting error', () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsync(asyncFn));

      act(() => {
        result.current.setError('manual error');
      });

      expect(result.current.error).toBe('manual error');
    });
  });

  describe('race condition handling', () => {
    it('only uses result from the latest execution', async () => {
      const resolvers: Array<(value: string) => void> = [];
      const asyncFn = vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolvers.push(resolve);
          })
      );

      const { result } = renderHook(() => useAsync(asyncFn));

      // Start two executions
      act(() => {
        result.current.execute();
      });

      act(() => {
        result.current.execute();
      });

      expect(resolvers.length).toBe(2);

      // Resolve the second one first
      await act(async () => {
        resolvers[1]('second');
      });

      await waitFor(() => {
        expect(result.current.data).toBe('second');
      });

      // Now resolve the first one
      await act(async () => {
        resolvers[0]('first');
      });

      // Data should still be 'second', not 'first'
      expect(result.current.data).toBe('second');
    });
  });

  describe('error handling edge cases', () => {
    it('handles string errors', async () => {
      const asyncFn = vi.fn().mockRejectedValue('String error');
      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('String error');
    });

    it('clears previous error on new execution', async () => {
      const asyncFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('success');

      const { result } = renderHook(() => useAsync(asyncFn));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('error');

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toBe('success');
    });
  });
});
