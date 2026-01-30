/**
 * Tests for useArrowKeyIncrement hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useArrowKeyIncrement, createArrowKeyHandler } from './useArrowKeyIncrement';

const createMockEvent = (key: string, shiftKey = false): React.KeyboardEvent<HTMLInputElement> =>
  ({
    key,
    shiftKey,
    preventDefault: vi.fn(),
  }) as unknown as React.KeyboardEvent<HTMLInputElement>;

describe('useArrowKeyIncrement', () => {
  describe('increment/decrement behavior', () => {
    it('increments value on ArrowUp', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useArrowKeyIncrement({ value: 10, onChange, step: 1 }));

      result.current(createMockEvent('ArrowUp'));
      expect(onChange).toHaveBeenCalledWith(11);
    });

    it('decrements value on ArrowDown', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useArrowKeyIncrement({ value: 10, onChange, step: 1 }));

      result.current(createMockEvent('ArrowDown'));
      expect(onChange).toHaveBeenCalledWith(9);
    });

    it('uses custom step size', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useArrowKeyIncrement({ value: 10, onChange, step: 5 }));

      result.current(createMockEvent('ArrowUp'));
      expect(onChange).toHaveBeenCalledWith(15);
    });

    it('multiplies step by 10 when shift is held', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useArrowKeyIncrement({ value: 10, onChange, step: 1 }));

      result.current(createMockEvent('ArrowUp', true));
      expect(onChange).toHaveBeenCalledWith(20);
    });

    it('uses custom shiftStep when provided', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useArrowKeyIncrement({ value: 10, onChange, step: 1, shiftStep: 100 })
      );

      result.current(createMockEvent('ArrowUp', true));
      expect(onChange).toHaveBeenCalledWith(110);
    });
  });

  describe('constraints', () => {
    it('respects min constraint', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useArrowKeyIncrement({ value: 0, onChange, step: 1, min: 0 })
      );

      result.current(createMockEvent('ArrowDown'));
      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('respects max constraint', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useArrowKeyIncrement({ value: 100, onChange, step: 1, max: 100 })
      );

      result.current(createMockEvent('ArrowUp'));
      expect(onChange).toHaveBeenCalledWith(100);
    });

    it('does not call onChange when disabled', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useArrowKeyIncrement({ value: 10, onChange, step: 1, disabled: true })
      );

      result.current(createMockEvent('ArrowUp'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('non-arrow keys', () => {
    it('ignores non-arrow keys', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useArrowKeyIncrement({ value: 10, onChange, step: 1 }));

      const event = createMockEvent('Enter');
      result.current(event);
      expect(onChange).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});

describe('createArrowKeyHandler', () => {
  it('creates a working handler', () => {
    const onChange = vi.fn();
    const handler = createArrowKeyHandler({ value: 50, onChange, step: 1 });

    handler(createMockEvent('ArrowUp'));
    expect(onChange).toHaveBeenCalledWith(51);
  });

  it('can be called inline in event handlers', () => {
    const onChange = vi.fn();
    const value = 25;

    // This mimics how it's used in components
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const arrowHandler = createArrowKeyHandler({ value, onChange, step: 1 });
      arrowHandler(e);
    };

    handleKeyDown(createMockEvent('ArrowDown'));
    expect(onChange).toHaveBeenCalledWith(24);
  });
});
