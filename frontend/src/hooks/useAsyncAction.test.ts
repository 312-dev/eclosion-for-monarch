/**
 * Tests for useAsyncAction hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncAction } from './useAsyncAction';

describe('useAsyncAction', () => {
  it('should initialize with loading=false', () => {
    const { result } = renderHook(() => useAsyncAction());

    expect(result.current.loading).toBe(false);
  });

  it('should set loading=true while action is in progress', async () => {
    const { result } = renderHook(() => useAsyncAction());

    let resolvePromise: () => void;
    const action = () =>
      new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

    act(() => {
      result.current.execute(action);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should return the result of the action', async () => {
    const { result } = renderHook(() => useAsyncAction());

    const action = async () => 'test-result';

    let actionResult: string | undefined;
    await act(async () => {
      actionResult = await result.current.execute(action);
    });

    expect(actionResult).toBe('test-result');
  });

  it('should set loading=false even if action throws', async () => {
    const { result } = renderHook(() => useAsyncAction());

    const action = async () => {
      throw new Error('Test error');
    };

    await act(async () => {
      try {
        await result.current.execute(action);
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('should handle multiple sequential actions', async () => {
    const { result } = renderHook(() => useAsyncAction());

    const action1 = vi.fn().mockResolvedValue('result1');
    const action2 = vi.fn().mockResolvedValue('result2');

    await act(async () => {
      await result.current.execute(action1);
    });

    expect(action1).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.execute(action2);
    });

    expect(action2).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
  });

  it('should maintain stable execute function reference', () => {
    const { result, rerender } = renderHook(() => useAsyncAction());

    const firstExecute = result.current.execute;
    rerender();
    const secondExecute = result.current.execute;

    expect(firstExecute).toBe(secondExecute);
  });
});
