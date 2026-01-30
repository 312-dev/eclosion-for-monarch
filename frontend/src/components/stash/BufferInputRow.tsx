/**
 * BufferInputRow
 *
 * Editable buffer input row for the breakdown tooltip.
 * Shows a warning when buffer exceeds $2,000 or 50% of available.
 *
 * Manages its own local state during typing to prevent parent re-renders
 * that would cause focus loss. Debounces saves to the backend.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { createArrowKeyHandler } from '../../hooks/useArrowKeyIncrement';

interface BufferInputRowProps {
  readonly availableBeforeBuffer: number;
  /** Saved buffer value from config */
  readonly savedBuffer: number;
  /** Callback to save the buffer value (debounced internally) */
  readonly onSave: (value: number) => Promise<void>;
  /** Running total after buffer is applied (shown in muted text) */
  readonly runningTotal?: number;
}

export function BufferInputRow({
  availableBeforeBuffer,
  savedBuffer,
  onSave,
  runningTotal,
}: BufferInputRowProps) {
  // Local state for typing - prevents parent re-renders during input
  const [localValue, setLocalValue] = useState(savedBuffer);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with saved value when it changes externally
  useEffect(() => {
    setLocalValue(savedBuffer);
  }, [savedBuffer]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Warning threshold: buffer > $2,000 OR > 50% of available
  const showWarning = useMemo(() => {
    if (availableBeforeBuffer <= 0) return false;
    const bufferPercent = (localValue / availableBeforeBuffer) * 100;
    return localValue > 2000 || bufferPercent > 50;
  }, [localValue, availableBeforeBuffer]);

  const formattedBuffer = localValue === 0 ? '' : localValue.toLocaleString();

  const handleValueUpdate = useCallback(
    (newValue: number) => {
      // Cap at available amount (before buffer)
      const cappedValue = Math.min(newValue, Math.max(0, availableBeforeBuffer));

      // Update local state immediately (no parent re-render)
      setLocalValue(cappedValue);

      // Debounce save to backend
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSave(cappedValue);
      }, 500);
    },
    [availableBeforeBuffer, onSave]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replaceAll(/\D/g, '');
      const value = rawValue === '' ? 0 : Math.max(0, Number.parseInt(rawValue, 10));
      handleValueUpdate(value);
    },
    [handleValueUpdate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const arrowHandler = createArrowKeyHandler({
        value: localValue,
        onChange: handleValueUpdate,
        step: 1,
        min: 0,
        max: Math.max(0, availableBeforeBuffer),
      });
      arrowHandler(e);
    },
    [localValue, handleValueUpdate, availableBeforeBuffer]
  );

  // Format running total for display
  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(Math.round(amount));
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absAmount);
    return amount < 0 ? `-${formatted}` : formatted;
  };

  return (
    <div className="flex justify-between items-center gap-2">
      <span className="flex-1" style={{ color: 'var(--monarch-text-muted)' }}>
        Reserved buffer
      </span>
      <div className="flex items-center gap-1.5" style={{ minWidth: '4.5rem' }}>
        {showWarning && (
          <Tooltip
            content={
              <div className="max-w-xs">
                <p className="font-medium mb-1">This is not an emergency fund</p>
                <p>
                  The buffer is just peace of mind—if all your stashes were depleted, you'd have
                  this much left. Create a dedicated Stash or Monarch Goal for your emergency fund
                  instead.
                </p>
              </div>
            }
            side="left"
          >
            <span className="cursor-help">
              <AlertTriangle size={12} style={{ color: 'var(--monarch-warning)' }} />
            </span>
          </Tooltip>
        )}
        <div className="relative">
          <span
            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-sm flex items-center gap-0.5"
            style={{ color: showWarning ? 'var(--monarch-warning)' : 'var(--monarch-red)' }}
          >
            <span>-</span>
            <span>$</span>
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={formattedBuffer}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className="w-20 pl-7 pr-2 py-0.5 text-sm text-right rounded tabular-nums"
            style={{
              backgroundColor: 'var(--monarch-tooltip-input-bg)',
              border: '1px solid var(--monarch-tooltip-border)',
              color: showWarning ? 'var(--monarch-warning)' : 'var(--monarch-red)',
            }}
            aria-label="Reserved buffer amount"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      {runningTotal !== undefined && (
        <span
          className="tabular-nums text-right text-sm"
          style={{ color: 'var(--monarch-text-muted)', minWidth: '4.5rem', opacity: 0.7 }}
        >
          {formatAmount(runningTotal)}
        </span>
      )}
    </div>
  );
}
