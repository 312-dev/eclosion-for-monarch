/**
 * useArrowKeyIncrement - Hook for arrow key increment/decrement on numeric inputs
 *
 * Provides keyboard handler for ArrowUp/ArrowDown to increment/decrement values.
 * Supports configurable step sizes and shift modifier for larger increments.
 */

import { useCallback } from 'react';

export interface ArrowKeyIncrementOptions {
  /** Current numeric value */
  value: number;
  /** Callback to update the value */
  onChange: (newValue: number) => void;
  /** Step size for normal increments (default: 1) */
  step?: number;
  /** Step size when shift key is held (default: 10x step) */
  shiftStep?: number;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
}

/**
 * Hook that returns a keydown handler for arrow key increment/decrement.
 *
 * @example
 * ```tsx
 * const handleArrowKey = useArrowKeyIncrement({
 *   value: amount,
 *   onChange: setAmount,
 *   step: 1,
 *   min: 0,
 * });
 *
 * <input onKeyDown={handleArrowKey} ... />
 * ```
 */
export function useArrowKeyIncrement({
  value,
  onChange,
  step = 1,
  shiftStep,
  min,
  max,
  disabled = false,
}: ArrowKeyIncrementOptions): (e: React.KeyboardEvent<HTMLInputElement>) => void {
  return useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      const isUp = e.key === 'ArrowUp';
      const isDown = e.key === 'ArrowDown';

      if (!isUp && !isDown) return;

      e.preventDefault();

      // Calculate effective step - shift key multiplies by 10 (or uses custom shiftStep)
      const effectiveStep = e.shiftKey ? (shiftStep ?? step * 10) : step;

      // Calculate new value
      let newValue = isUp ? value + effectiveStep : value - effectiveStep;

      // Apply constraints
      if (min !== undefined && newValue < min) {
        newValue = min;
      }
      if (max !== undefined && newValue > max) {
        newValue = max;
      }

      // For integer steps, ensure we get an integer result
      if (Number.isInteger(step) && Number.isInteger(effectiveStep)) {
        newValue = Math.round(newValue);
      }

      onChange(newValue);
    },
    [value, onChange, step, shiftStep, min, max, disabled]
  );
}

/**
 * Combines an existing keydown handler with arrow key increment handling.
 * The existing handler is called first, then arrow key handling if not prevented.
 *
 * @example
 * ```tsx
 * const handleKeyDown = combineWithArrowKeyHandler(
 *   existingKeyDownHandler,
 *   { value: amount, onChange: setAmount }
 * );
 * ```
 */
export function combineWithArrowKeyHandler(
  existingHandler: ((e: React.KeyboardEvent<HTMLInputElement>) => void) | undefined,
  options: ArrowKeyIncrementOptions
): (e: React.KeyboardEvent<HTMLInputElement>) => void {
  const arrowHandler = createArrowKeyHandler(options);

  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Call existing handler first
    existingHandler?.(e);

    // Then handle arrow keys (only if not already handled by existing handler)
    if (!e.defaultPrevented) {
      arrowHandler(e);
    }
  };
}

/**
 * Non-hook version for use in callbacks or when hook rules don't apply.
 * Creates a fresh handler each call - use useArrowKeyIncrement for memoized version.
 */
export function createArrowKeyHandler(
  options: ArrowKeyIncrementOptions
): (e: React.KeyboardEvent<HTMLInputElement>) => void {
  const { value, onChange, step = 1, shiftStep, min, max, disabled = false } = options;

  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    const isUp = e.key === 'ArrowUp';
    const isDown = e.key === 'ArrowDown';

    if (!isUp && !isDown) return;

    e.preventDefault();

    const effectiveStep = e.shiftKey ? (shiftStep ?? step * 10) : step;
    let newValue = isUp ? value + effectiveStep : value - effectiveStep;

    if (min !== undefined && newValue < min) {
      newValue = min;
    }
    if (max !== undefined && newValue > max) {
      newValue = max;
    }

    if (Number.isInteger(step) && Number.isInteger(effectiveStep)) {
      newValue = Math.round(newValue);
    }

    onChange(newValue);
  };
}
