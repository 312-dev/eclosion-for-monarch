/**
 * useAnimatedValue Hook
 *
 * Smoothly animates a numeric value when it changes.
 * Uses requestAnimationFrame for smooth 60fps animations.
 *
 * @example
 * const animatedBalance = useAnimatedValue(balance, { duration: 500 });
 * return <span>{formatCurrency(animatedBalance)}</span>;
 */

import { useState, useEffect, useRef } from 'react';

interface UseAnimatedValueOptions {
  /** Animation duration in milliseconds (default: 400) */
  duration?: number;
}

/**
 * Easing function: ease-out cubic for natural deceleration
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Hook that animates a numeric value smoothly when it changes.
 *
 * @param targetValue - The value to animate toward
 * @param options - Configuration options
 * @returns The current animated value (updates every frame during animation)
 */
export function useAnimatedValue(
  targetValue: number,
  options: UseAnimatedValueOptions = {}
): number {
  const { duration = 400 } = options;

  // Initialize display value to target (no animation on mount)
  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationRef = useRef<number | null>(null);
  const previousTargetRef = useRef(targetValue);
  // Track start value in a ref to avoid dependency issues
  const startValueRef = useRef(targetValue);

  useEffect(() => {
    const previousTarget = previousTargetRef.current;
    previousTargetRef.current = targetValue;

    // Skip if value hasn't changed or is NaN/invalid
    if (previousTarget === targetValue || !Number.isFinite(targetValue)) {
      // If target is now valid but display is stale, snap to it
      if (Number.isFinite(targetValue) && !Number.isFinite(displayValue)) {
        setDisplayValue(targetValue);
      }
      return;
    }

    // Cancel any existing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    // Use current display value as start point (captured in ref for stability)
    const startValue = Number.isFinite(displayValue) ? displayValue : targetValue;
    startValueRef.current = startValue;
    const delta = targetValue - startValue;

    // Skip animation if there's no meaningful change
    if (Math.abs(delta) < 1) {
      setDisplayValue(targetValue);
      return;
    }

    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      startTime ??= currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue = startValueRef.current + delta * easedProgress;
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly on the target
        setDisplayValue(targetValue);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // Note: displayValue intentionally omitted to prevent re-triggering during animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetValue, duration]);

  return displayValue;
}
