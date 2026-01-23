/**
 * StashBufferSlider Component
 *
 * Modern interactive slider for setting a reserved buffer amount.
 * Features:
 * - Tooltip showing value while dragging
 * - Tick marks at intervals
 * - Min/max labels with range endpoints
 * - Highlighted track color
 * - Clean, modern aesthetic
 *
 * The buffer is subtracted from Available to Stash, providing a safety margin.
 * Shows a warning when buffer exceeds both $1,000 AND 20% of total available.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useStashConfigQuery, useUpdateStashConfigMutation, useAvailableToStash } from '../../api/queries';
import { useToast } from '../../context/ToastContext';

interface StashBufferSliderProps {
  /** Callback to open New Stash modal with pre-filled name */
  readonly onCreateEmergencyFund: () => void;
  /** Optional class name for container */
  readonly className?: string;
}

/**
 * Format currency for display (whole dollars, no cents).
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency compactly for tick labels (e.g., $5K, $10K)
 */
function formatCompact(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 1000) {
    const k = amount / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `$${amount}`;
}

/**
 * Generate nice tick values for a given range
 */
function generateTicks(max: number): number[] {
  if (max <= 100) return [0, 25, 50, 75, max];
  if (max <= 500) return [0, 100, 200, 300, 400, max];
  if (max <= 1000) return [0, 250, 500, 750, max];
  if (max <= 5000) return [0, 1000, 2000, 3000, 4000, max];
  if (max <= 10000) return [0, 2500, 5000, 7500, max];
  if (max <= 25000) return [0, 5000, 10000, 15000, 20000, max];
  if (max <= 50000) return [0, 10000, 20000, 30000, 40000, max];
  // For larger values, use 5 evenly spaced ticks
  const step = Math.ceil(max / 4 / 1000) * 1000;
  const ticks = [0];
  for (let i = step; i < max; i += step) {
    ticks.push(i);
  }
  ticks.push(max);
  return ticks;
}

export function StashBufferSlider({ onCreateEmergencyFund, className = '' }: StashBufferSliderProps) {
  const toast = useToast();
  const { data: config } = useStashConfigQuery();
  const updateConfig = useUpdateStashConfigMutation();
  const sliderRef = useRef<HTMLInputElement>(null);

  // Get the available amount WITHOUT buffer applied (bufferAmount defaults to 0)
  const { data: availableData } = useAvailableToStash();

  const currentBuffer = config?.bufferAmount ?? 0;
  const availableBeforeBuffer = availableData?.available ?? 0;

  // Local state for slider value (optimistic update)
  const [localBuffer, setLocalBuffer] = useState(currentBuffer);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate slider max - use available before buffer, minimum of $100 for usability
  const sliderMax = Math.max(availableBeforeBuffer, 100);

  // Calculate fill percentage and tooltip position
  const fillPercent = (localBuffer / sliderMax) * 100;
  // Slight adjustment to center tooltip over thumb (accounts for thumb width)
  const tooltipPosition = fillPercent * 0.98 + 1;

  // Sync local state with config when it changes (and not dragging)
  // This is intentional controlled input syncing - not a cascading render issue
  useEffect(() => {
    if (!isDragging && currentBuffer !== localBuffer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalBuffer(currentBuffer);
    }
  }, [currentBuffer, isDragging, localBuffer]);

  // Debounced save
  const saveBuffer = useCallback(
    async (value: number) => {
      try {
        await updateConfig.mutateAsync({ bufferAmount: value });
      } catch {
        toast.error('Failed to save buffer amount');
        setLocalBuffer(currentBuffer);
      }
    },
    [updateConfig, toast, currentBuffer]
  );

  // Debounce timer ref
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.round(Number(e.target.value));
      setLocalBuffer(value);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        saveBuffer(value);
      }, 500);
      setDebounceTimer(timer);
    },
    [debounceTimer, saveBuffer]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Warning threshold: buffer > $1,000 AND > 20% of available
  const showWarning = useMemo(() => {
    if (availableBeforeBuffer <= 0) return false;
    const bufferPercent = (localBuffer / availableBeforeBuffer) * 100;
    return localBuffer > 1000 && bufferPercent > 20;
  }, [localBuffer, availableBeforeBuffer]);

  // Generate tick marks
  const ticks = useMemo(() => generateTicks(sliderMax), [sliderMax]);

  // Don't show slider if no available funds
  if (availableBeforeBuffer <= 0 && currentBuffer === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* Slider Container */}
      <div className="flex flex-col items-center w-full max-w-md mx-auto">
        <label
          htmlFor="buffer-slider"
          className="text-xs font-medium mb-2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Reserve Buffer
        </label>

        {/* Slider Track Container */}
        <div className="relative w-full px-2">
          {/* Tooltip - only visible while dragging */}
          <div
            className={`absolute -top-10 transform -translate-x-1/2 transition-opacity duration-150 ${
              isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              left: `${tooltipPosition}%`,
            }}
          >
            <div
              className="px-2.5 py-1.5 rounded-lg text-sm font-semibold tabular-nums whitespace-nowrap shadow-lg"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid var(--monarch-border)',
                color: 'var(--monarch-primary)',
              }}
            >
              {formatCurrency(localBuffer)}
            </div>
            {/* Tooltip arrow */}
            <div
              className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid var(--monarch-border)',
                top: '100%',
              }}
            />
          </div>

          {/* Range Slider with custom styling */}
          <div className="relative">
            {/* Background track */}
            <div
              className="absolute top-1/2 left-0 right-0 h-2 rounded-full transform -translate-y-1/2 pointer-events-none"
              style={{
                backgroundColor: 'var(--monarch-bg-hover)',
              }}
            />
            {/* Filled track */}
            <div
              className="absolute top-1/2 left-0 h-2 rounded-full transform -translate-y-1/2 pointer-events-none transition-all duration-75"
              style={{
                width: `${fillPercent}%`,
                backgroundColor: 'var(--monarch-primary)',
              }}
            />
            {/* Native range input */}
            <input
              ref={sliderRef}
              id="buffer-slider"
              type="range"
              min={0}
              max={sliderMax}
              step={10}
              value={localBuffer}
              onChange={handleSliderChange}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="relative w-full h-8 appearance-none bg-transparent cursor-pointer slider-modern"
              aria-label="Reserve buffer amount"
              aria-valuemin={0}
              aria-valuemax={sliderMax}
              aria-valuenow={localBuffer}
              aria-valuetext={formatCurrency(localBuffer)}
            />
          </div>

          {/* Tick marks */}
          <div className="relative w-full h-2 mt-1">
            {ticks.map((tick) => {
              const position = (tick / sliderMax) * 100;
              return (
                <div
                  key={tick}
                  className="absolute w-px h-2 transform -translate-x-1/2"
                  style={{
                    left: `${position}%`,
                    backgroundColor: 'var(--monarch-border)',
                  }}
                />
              );
            })}
          </div>

          {/* Tick labels */}
          <div className="relative w-full mt-1">
            {ticks.map((tick, index) => {
              const position = (tick / sliderMax) * 100;
              // Only show first, last, and middle-ish labels to avoid crowding
              const showLabel = index === 0 || index === ticks.length - 1 || index === Math.floor(ticks.length / 2);
              if (!showLabel) return null;
              return (
                <span
                  key={tick}
                  className="absolute text-xs transform -translate-x-1/2 tabular-nums"
                  style={{
                    left: `${position}%`,
                    color: 'var(--monarch-text-muted)',
                  }}
                >
                  {formatCompact(tick)}
                </span>
              );
            })}
          </div>
        </div>

        {/* Current value display below slider (always visible) */}
        <div
          className="mt-4 text-sm font-medium tabular-nums"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Current: <span style={{ color: 'var(--monarch-primary)' }}>{formatCurrency(localBuffer)}</span>
        </div>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div
          className="mt-4 p-3 rounded-lg flex items-start gap-3 max-w-md mx-auto"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--monarch-warning) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--monarch-warning) 30%, transparent)',
          }}
        >
          <AlertTriangle
            size={18}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--monarch-warning)' }}
          />
          <div className="text-sm" style={{ color: 'var(--monarch-text)' }}>
            <p className="mb-1">
              This buffer is not the same as an emergency fund! It's just peace of mind if all of
              your stashes were depleted you'd have this much left.
            </p>
            <button
              onClick={onCreateEmergencyFund}
              className="font-medium underline hover:no-underline"
              style={{ color: 'var(--monarch-primary)' }}
            >
              Create an emergency fund first if you haven't yet.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
