/**
 * Take/Stash Overlay
 *
 * Overlay displayed on stash cards for withdraw/deposit operations.
 * Features a single input with mode-aware styling (negative = withdraw, positive = deposit).
 */

import {
  useRef,
  useState,
  useCallback,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
  type PointerEvent,
} from 'react';
import { Icons } from '../icons';
import { Tooltip } from '../ui/Tooltip';

interface TakeStashOverlayProps {
  /** Stash item ID */
  readonly itemId: string;
  /** Item name for accessibility */
  readonly itemName: string;
  /** Available amount for withdrawal (rollover only) */
  readonly withdrawAvailable: number;
  /** Available amount for deposit (from Cash to Stash pool) */
  readonly depositAvailable: number;
  /** Callback when user confirms withdrawal */
  readonly onTake: (amount: number) => void;
  /** Callback when user confirms deposit */
  readonly onStash: (amount: number) => void;
  /** Callback to cancel/close the overlay */
  readonly onCancel: () => void;
  /** Whether an action is currently processing */
  readonly isProcessing?: boolean;
  /** Whether this is shown in distribution mode (persistent) vs hover mode */
  readonly isDistributionMode?: boolean;
  /** Current budgeted amount for the item (used for tooltip when withdraw is disabled) */
  readonly budgetedAmount?: number;
}

export function TakeStashOverlay({
  itemId: _itemId, // Reserved for future use (e.g., tracking pending operations)
  itemName,
  withdrawAvailable,
  depositAvailable,
  onTake,
  onStash,
  onCancel,
  isProcessing = false,
  isDistributionMode: _isDistributionMode = false,
  budgetedAmount = 0,
}: TakeStashOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawValue, setRawValue] = useState<string>('');
  const [isNegative, setIsNegative] = useState(false);

  // Parse numeric value from raw input
  const numericValue = rawValue === '' ? 0 : Number.parseInt(rawValue, 10);

  // Calculate display value with formatting
  const formattedValue = numericValue > 0 ? numericValue.toLocaleString('en-US') : '';

  // Calculate input width
  const digitCount = rawValue.length;
  const commaCount = Math.floor((digitCount - 1) / 3);
  const inputWidth = Math.min(10, Math.max(2, digitCount + commaCount * 0.3));

  // Determine current mode based on sign
  const isTakeMode = isNegative;
  const isStashMode = !isNegative;

  // Validation
  const maxAmount = isTakeMode ? withdrawAvailable : depositAvailable;
  const isOverLimit = numericValue > maxAmount;
  const canSubmit = numericValue > 0 && !isOverLimit && !isProcessing;

  // Derive error message from current state (no setState in effect)
  const error = useMemo(() => {
    if (!isOverLimit) return null;
    return isTakeMode
      ? `Cannot exceed available balance of $${withdrawAvailable.toLocaleString()}`
      : `Cannot exceed available funds of $${depositAvailable.toLocaleString()}`;
  }, [isOverLimit, isTakeMode, withdrawAvailable, depositAvailable]);

  // Input border color based on mode
  const modeColor = isTakeMode ? '#f97316' : '#22c55e';
  const inputBorderColor = error ? '#ef4444' : modeColor;

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Check for negative sign at start
    if (input.startsWith('-')) {
      setIsNegative(true);
      // Extract digits only (ignore the negative sign for storage)
      const digitsOnly = input.slice(1).replaceAll(/\D/g, '');
      setRawValue(digitsOnly);
    } else {
      // Extract digits only
      const digitsOnly = input.replaceAll(/\D/g, '');
      setRawValue(digitsOnly);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Handle minus key to toggle withdraw mode
      if (e.key === '-') {
        e.preventDefault();
        setIsNegative(true);
        return;
      }

      // Backspace with empty input in negative mode -> switch to positive
      if (e.key === 'Backspace' && rawValue === '' && isNegative) {
        e.preventDefault();
        setIsNegative(false);
        return;
      }

      if (e.key === 'Enter' && canSubmit) {
        e.preventDefault();
        if (isTakeMode) {
          onTake(numericValue);
        } else {
          onStash(numericValue);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [canSubmit, isTakeMode, numericValue, onTake, onStash, onCancel, rawValue, isNegative]
  );

  const handleFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  const handleTakeClick = useCallback(() => {
    // If already in withdraw mode with a valid amount, submit
    if (isTakeMode && canSubmit) {
      onTake(numericValue);
      return;
    }

    // Otherwise, toggle to withdraw mode (add negative sign)
    setIsNegative(true);
    inputRef.current?.focus();
  }, [isTakeMode, canSubmit, numericValue, onTake]);

  const handleStashClick = useCallback(() => {
    // If already in deposit mode with a valid amount, submit
    if (isStashMode && canSubmit) {
      onStash(numericValue);
      return;
    }

    // Otherwise, toggle to deposit mode (remove negative sign)
    setIsNegative(false);
    inputRef.current?.focus();
  }, [isStashMode, canSubmit, numericValue, onStash]);

  // Button styles
  const withdrawDisabled = withdrawAvailable <= 0;
  const depositDisabled = depositAvailable <= 0;

  // Show tooltip when withdraw is disabled but there's a positive budgeted amount
  const showTakeTooltip = withdrawDisabled && budgetedAmount > 0;

  const getButtonStyles = (_isActive: boolean, isDisabled: boolean) => {
    if (isDisabled) {
      return {
        opacity: 1,
        cursor: 'not-allowed',
      };
    }
    return {
      opacity: 1,
      cursor: 'pointer',
    };
  };

  // Stop drag events from propagating to the parent grid
  const stopDragPropagation = useCallback((e: MouseEvent | TouchEvent | PointerEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      onMouseDown={stopDragPropagation}
      onTouchStart={stopDragPropagation}
      onPointerDown={stopDragPropagation}
    >
      <fieldset className="flex flex-col items-center gap-2 p-3 border-0" data-no-dnd="true">
        <legend className="sr-only">Take or deposit funds for {itemName}</legend>

        {/* Input container - solid background, no focus ring */}
        <div
          className="relative flex items-center justify-center px-4 py-2 rounded-lg"
          style={{
            backgroundColor: '#1a1a1a',
            border: `1px solid ${inputBorderColor}`,
          }}
        >
          <span className="text-xl font-semibold" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {isNegative && '-'}$
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={formattedValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="0"
            disabled={isProcessing}
            aria-label={`${isTakeMode ? 'Take' : 'Stash'} amount for ${itemName}`}
            className="focus-none min-w-8 text-xl font-semibold bg-transparent outline-none focus-visible:outline-none text-white placeholder:text-white/40 tabular-nums text-right disabled:opacity-50"
            style={{ width: `${inputWidth}ch` }}
          />
        </div>

        {/* Error message */}
        {error && <span className="text-sm text-red-400 text-center max-w-48">{error}</span>}

        {/* Action buttons - horizontal layout */}
        <div className="flex items-center gap-1.5">
          {/* Take button */}
          <Tooltip
            content="You must reduce budgeted amount to free up further funds."
            disabled={!showTakeTooltip}
            side="bottom"
          >
            <button
              type="button"
              onClick={handleTakeClick}
              disabled={withdrawDisabled || isProcessing}
              className="flex flex-col items-start px-4 py-2 rounded-lg transition-all focus-visible:outline-none"
              style={{
                backgroundColor: isTakeMode ? '#78350f' : '#333',
                ...getButtonStyles(isTakeMode, withdrawDisabled),
              }}
              aria-label={`Take from ${itemName}`}
            >
              <span
                className={`text-sm font-medium ${isTakeMode ? 'text-orange-300' : 'text-white/60'}`}
              >
                Take
              </span>
              <span className={`text-xs ${isTakeMode ? 'text-orange-300/70' : 'text-white/40'}`}>
                ${withdrawAvailable.toLocaleString()} stash
              </span>
            </button>
          </Tooltip>

          {/* Vertical divider */}
          <div className="w-px h-6 bg-white/30" />

          {/* Stash button */}
          <button
            type="button"
            onClick={handleStashClick}
            disabled={depositDisabled || isProcessing}
            className="flex flex-col items-start px-4 py-2 rounded-lg transition-all focus-visible:outline-none"
            style={{
              backgroundColor: isStashMode ? '#14532d' : '#333',
              ...getButtonStyles(isStashMode, depositDisabled),
            }}
            aria-label={`Stash to ${itemName}`}
          >
            <span
              className={`text-sm font-medium ${isStashMode ? 'text-green-300' : 'text-white/60'}`}
            >
              Stash
            </span>
            <span className={`text-xs ${isStashMode ? 'text-green-300/70' : 'text-white/40'}`}>
              ${depositAvailable.toLocaleString()} cash
            </span>
          </button>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <Icons.Spinner size={24} className="text-white" />
          </div>
        )}
      </fieldset>
    </div>
  );
}
