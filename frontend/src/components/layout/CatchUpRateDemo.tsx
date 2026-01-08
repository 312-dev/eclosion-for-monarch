/**
 * CatchUpRateDemo - Animated demo for the catch-up rate tour step
 *
 * Smoothly animates budget value up and down, triggering natural status
 * changes at thresholds. Uses internal state only - no real data mutations.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getStatusLabel, getStatusStyles } from '../../utils';
import type { ItemStatus } from '../../types';

// Budget animation configuration
const MIN_BUDGET = 80;
const TARGET_BUDGET = 120; // Threshold for "on_track"
const MAX_BUDGET = 150;
const HOLD_DURATION = 1500; // Hold at min/max for 1.5 seconds
const ANIMATION_SPEED = 40; // ms per dollar change

// Calculate status based on current budget
function getStatusFromBudget(budget: number): ItemStatus {
  if (budget < TARGET_BUDGET) return 'behind';
  if (budget > TARGET_BUDGET) return 'ahead';
  return 'on_track';
}

// Calculate progress percentage based on budget
function getProgressFromBudget(budget: number): number {
  // Map budget range to progress (40% at min, 95% at max)
  const range = MAX_BUDGET - MIN_BUDGET;
  const normalized = (budget - MIN_BUDGET) / range;
  return Math.round(40 + normalized * 55);
}

export function CatchUpRateDemo() {
  const [budget, setBudget] = useState(MIN_BUDGET);
  const [direction, setDirection] = useState<'up' | 'down' | 'hold'>('hold');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Schedule direction change after hold period
  const scheduleDirectionChange = useCallback((nextDirection: 'up' | 'down') => {
    setDirection('hold');
    timeoutRef.current = setTimeout(
      () => setDirection(nextDirection),
      HOLD_DURATION
    );
  }, []);

  useEffect(() => {
    // Start animation after initial hold
    timeoutRef.current = setTimeout(() => setDirection('up'), HOLD_DURATION);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (direction === 'hold') return;

    const interval = setInterval(() => {
      setBudget((prev) => {
        if (direction === 'up') {
          if (prev >= MAX_BUDGET) {
            scheduleDirectionChange('down');
            return MAX_BUDGET;
          }
          return prev + 1;
        } else {
          if (prev <= MIN_BUDGET) {
            scheduleDirectionChange('up');
            return MIN_BUDGET;
          }
          return prev - 1;
        }
      });
    }, ANIMATION_SPEED);

    return () => clearInterval(interval);
  }, [direction, scheduleDirectionChange]);

  const status = getStatusFromBudget(budget);
  const progress = getProgressFromBudget(budget);
  const styles = getStatusStyles(status, true);

  return (
    <div>
      {/* Explanation text */}
      <div
        style={{
          fontWeight: 600,
          marginBottom: '8px',
          color: 'var(--monarch-text-dark)',
        }}
      >
        Budget &amp; Status
      </div>
      <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', margin: '0 0 16px 0' }}>
        Your budgeted amount determines your status. Watch as it changes:
      </p>

      {/* Demo visual */}
      <div
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Budget input mock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            borderRadius: '4px',
            padding: '4px 8px',
            minWidth: '80px',
          }}
        >
          <span style={{ color: 'var(--monarch-text-dark)', fontWeight: 500 }}>$</span>
          <span
            style={{
              color: 'var(--monarch-text-dark)',
              fontWeight: 500,
              marginLeft: '2px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {budget}
          </span>
        </div>

        {/* Status badge */}
        <span
          style={{
            display: 'inline-flex',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '9999px',
            backgroundColor: styles.bg,
            color: styles.color,
            transition: 'background-color 150ms ease, color 150ms ease',
            minWidth: '70px',
            justifyContent: 'center',
          }}
        >
          {getStatusLabel(status, true)}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          marginTop: '12px',
          backgroundColor: 'var(--monarch-border)',
          borderRadius: '4px',
          height: '6px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '4px',
            backgroundColor: styles.color,
            width: `${progress}%`,
            transition: 'background-color 150ms ease',
          }}
        />
      </div>

      {/* Progress label */}
      <div
        style={{
          marginTop: '6px',
          fontSize: '11px',
          color: 'var(--monarch-text-muted)',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {progress}% funded
      </div>

      {/* Target indicator */}
      <div
        style={{
          marginTop: '10px',
          fontSize: '10px',
          color: 'var(--monarch-text-muted)',
          textAlign: 'center',
        }}
      >
        Target: ${TARGET_BUDGET}/mo
      </div>
    </div>
  );
}
