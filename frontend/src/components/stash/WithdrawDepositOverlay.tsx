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
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
  type PointerEvent,
} from 'react';
import { Icons } from '../icons';
import { createArrowKeyHandler } from '../../hooks/useArrowKeyIncrement';
import {
  getButtonIconColor,
  getButtonBgColor,
  getStashButtonLabel,
  getStashButtonIconName,
  getAvailableAmountText,
  processInputChange,
  getModeSwitchFromKey,
  getInputBorderColor,
  calculateInputWidth,
  parseNumericValue,
  formatDisplayValue,
} from './overlayButtonStyles';

interface TakeStashOverlayProps {
  /** Stash item ID */
  readonly itemId: string;
  /** Item name for accessibility */
  readonly itemName: string;
  /** Current balance of the stash item */
  readonly currentBalance: number;
  /** Available amount for withdrawal (rollover + budget) */
  readonly withdrawAvailable: number;
  /** Available amount for deposit (from Cash to Stash pool) */
  readonly depositAvailable: number;
  /** Left to Budget amount that can be used for additional stashing */
  readonly leftToBudget?: number;
  /** Rollover amount (stashed cash) - withdrawals exceeding this dip into budget */
  readonly rolloverAmount: number;
  /** Callback when user confirms withdrawal */
  readonly onTake: (amount: number) => void;
  /** Callback when user confirms deposit */
  readonly onStash: (amount: number) => void;
  /** Callback to cancel/close the overlay */
  readonly onCancel: () => void;
  /** Callback when Take mode state or amount changes */
  readonly onTakeModeChange?: (isTakeMode: boolean, isDippingIntoBudget: boolean) => void;
  /** Callback when Stash mode is drawing from Left to Budget */
  readonly onStashBudgetChange?: (additionalBudget: number, isOverLimit: boolean) => void;
  /** Callback when input value changes (for keeping overlay open) */
  readonly onInputValueChange?: (hasValue: boolean) => void;
  /** Whether an action is currently processing */
  readonly isProcessing?: boolean;
  /** Whether this is shown in distribution mode (persistent) vs hover mode */
  readonly isDistributionMode?: boolean;
}

export function TakeStashOverlay({
  itemId: _itemId, // Reserved for future use (e.g., tracking pending operations)
  itemName,
  currentBalance: _currentBalance, // Reserved for future use (e.g., display or validation)
  withdrawAvailable,
  depositAvailable,
  leftToBudget = 0,
  rolloverAmount,
  onTake,
  onStash,
  onCancel,
  onTakeModeChange,
  onStashBudgetChange,
  onInputValueChange,
  isProcessing = false,
  isDistributionMode: _isDistributionMode = false,
}: TakeStashOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawValue, setRawValue] = useState<string>('');

  // Default to Take mode if nothing available to stash
  // Use clamped values so negative Cash to Stash doesn't reduce Left to Budget availability
  const maxStashAvailable = Math.max(0, depositAvailable) + Math.max(0, leftToBudget);
  const [isNegative, setIsNegative] = useState(maxStashAvailable <= 0);

  // Parse numeric value from raw input
  const numericValue = parseNumericValue(rawValue);
  const formattedValue = formatDisplayValue(numericValue);
  const inputWidth = calculateInputWidth(rawValue);

  // Determine current mode based on sign
  const isTakeMode = isNegative;
  const isStashMode = !isNegative;

  // Calculate if current Take amount would dip into the budget
  const isDippingIntoBudget = isTakeMode && numericValue > rolloverAmount;

  // Notify parent of Take mode changes
  useEffect(() => {
    onTakeModeChange?.(isTakeMode, isDippingIntoBudget);
  }, [isTakeMode, isDippingIntoBudget, onTakeModeChange]);

  // Notify parent when input has a value (to keep overlay open)
  useEffect(() => {
    onInputValueChange?.(numericValue > 0);
  }, [numericValue, onInputValueChange]);

  // Calculate max stash amount (Cash to Stash + Left to Budget)
  // Don't let negative Cash to Stash reduce the available Left to Budget
  const availableLeftToBudget = Math.max(0, leftToBudget);
  const availableCashToStash = Math.max(0, depositAvailable);
  const maxStashAmount = availableCashToStash + availableLeftToBudget;

  // Button styles - withdrawAvailable now includes both rollover + budget
  const withdrawDisabled = withdrawAvailable <= 0;
  // Stash is enabled if EITHER Cash to Stash OR Left to Budget is positive
  const depositDisabled = depositAvailable <= 0 && availableLeftToBudget <= 0;
  // When neither Take nor Stash/Budget is available, disable everything
  const allActionsDisabled = withdrawDisabled && depositDisabled;

  // Calculate additional budget needed from Left to Budget when stashing
  // Cap at available Left to Budget so we don't show amounts beyond what's available
  // When Cash to Stash is negative/zero, ALL stash amount comes from Left to Budget
  const rawAdditionalBudget = isStashMode ? Math.max(0, numericValue - availableCashToStash) : 0;
  const additionalBudget = Math.min(rawAdditionalBudget, availableLeftToBudget);

  // Validation - use combined limit for stash mode
  const maxAmount = isTakeMode ? withdrawAvailable : maxStashAmount;
  const isOverLimit = numericValue > maxAmount;
  // Only flag as over limit when user has actually typed an amount
  const isStashOverLimit = isStashMode && isOverLimit && numericValue > 0;

  // Notify parent of stash budget changes (including over-limit state)
  useEffect(() => {
    onStashBudgetChange?.(additionalBudget, isStashOverLimit);
  }, [additionalBudget, isStashOverLimit, onStashBudgetChange]);
  const canSubmit = numericValue > 0 && !isOverLimit && !isProcessing;

  // Input border color based on mode
  const inputBorderColor = getInputBorderColor(isTakeMode, isOverLimit);

  // Determine stash button label based on funding source
  const stashButtonLabel = getStashButtonLabel(
    numericValue,
    availableCashToStash,
    availableLeftToBudget
  );
  const stashIconName = getStashButtonIconName(stashButtonLabel);

  // Pre-compute button colors to simplify JSX
  const stashIconColor = getButtonIconColor({
    isDisabled: depositDisabled,
    isActive: isStashMode,
    mode: 'stash',
  });
  const stashBgColor = getButtonBgColor({
    isDisabled: depositDisabled,
    isActive: isStashMode,
    mode: 'stash',
  });
  const takeIconColor = getButtonIconColor({
    isDisabled: withdrawDisabled,
    isActive: isTakeMode,
    mode: 'take',
  });
  const takeBgColor = getButtonBgColor({
    isDisabled: withdrawDisabled,
    isActive: isTakeMode,
    mode: 'take',
  });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { newIsNegative, digitsOnly } = processInputChange(
        e.target.value,
        withdrawDisabled,
        depositDisabled
      );
      if (newIsNegative !== null) {
        setIsNegative(newIsNegative);
      }
      setRawValue(digitsOnly);
    },
    [withdrawDisabled, depositDisabled]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Handle sign keys and backspace to toggle modes
      const modeSwitch = getModeSwitchFromKey(
        e.key,
        rawValue,
        isNegative,
        withdrawDisabled,
        depositDisabled
      );
      if (modeSwitch !== null) {
        e.preventDefault();
        setIsNegative(modeSwitch);
        return;
      }

      // Handle Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      // Handle Enter submission
      if (e.key === 'Enter' && canSubmit) {
        e.preventDefault();
        (isTakeMode ? onTake : onStash)(numericValue);
        setRawValue('');
        return;
      }

      // Handle arrow key increment/decrement
      const arrowDisabled = isProcessing || allActionsDisabled;
      createArrowKeyHandler({
        value: numericValue,
        onChange: (newValue) => setRawValue(newValue === 0 ? '' : String(newValue)),
        step: 1,
        min: 0,
        max: maxAmount,
        disabled: arrowDisabled,
      })(e);
    },
    [
      canSubmit,
      isTakeMode,
      numericValue,
      onTake,
      onStash,
      onCancel,
      rawValue,
      isNegative,
      maxAmount,
      isProcessing,
      allActionsDisabled,
      withdrawDisabled,
      depositDisabled,
    ]
  );

  const handleFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, []);

  const handleTakeClick = useCallback(() => {
    // If already in Take mode with a valid amount, submit
    const canTake =
      isTakeMode && numericValue > 0 && numericValue <= withdrawAvailable && !isProcessing;
    if (canTake) {
      onTake(numericValue);
      setRawValue(''); // Clear input after submission
      return;
    }

    // Otherwise, switch to Take mode first (requires second click to submit)
    setIsNegative(true);
    inputRef.current?.focus();
  }, [isTakeMode, numericValue, withdrawAvailable, isProcessing, onTake]);

  const handleStashClick = useCallback(() => {
    // If already in Stash mode with a valid amount, submit
    const canDeposit =
      isStashMode && numericValue > 0 && numericValue <= depositAvailable && !isProcessing;
    if (canDeposit) {
      onStash(numericValue);
      setRawValue(''); // Clear input after submission
      return;
    }

    // Otherwise, switch to Stash mode first (requires second click to submit)
    setIsNegative(false);
    inputRef.current?.focus();
  }, [isStashMode, numericValue, depositAvailable, isProcessing, onStash]);

  const getButtonStyles = (_isActive: boolean, isDisabled: boolean) => ({
    opacity: 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
  });

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
          className={`relative flex items-center justify-center px-4 py-2 rounded-lg ${allActionsDisabled ? 'opacity-50' : ''}`}
          style={{
            backgroundColor: 'var(--overlay-input-bg)',
            border: `1px solid ${allActionsDisabled ? 'var(--overlay-divider)' : inputBorderColor}`,
          }}
        >
          <span
            className={`text-xl font-semibold ${allActionsDisabled ? 'cursor-not-allowed' : ''}`}
            style={{ color: 'var(--overlay-text-muted)' }}
          >
            {isNegative ? '-' : '+'}$
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
            disabled={isProcessing || allActionsDisabled}
            aria-label={`${isTakeMode ? 'Take' : 'Stash'} amount for ${itemName}`}
            className="focus-none min-w-8 text-xl font-semibold bg-transparent outline-none focus-visible:outline-none tabular-nums text-right disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ width: `${inputWidth}ch`, color: 'var(--overlay-input-text)' }}
          />
        </div>

        {/* Available amount indicator - static amounts, red when exceeded */}
        <div
          className="text-xs tabular-nums"
          style={{ color: isOverLimit ? 'var(--monarch-error)' : 'var(--overlay-text-muted)' }}
        >
          {getAvailableAmountText({
            isTakeMode,
            withdrawAvailable,
            availableCashToStash,
            availableLeftToBudget,
          })}
        </div>

        {/* Action buttons - horizontal layout */}
        <div className="flex items-center gap-1.5">
          {/* Stash button - green hue (muted when inactive, grey when disabled) */}
          <button
            type="button"
            onClick={handleStashClick}
            disabled={depositDisabled || isProcessing}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all focus-visible:outline-none"
            style={{
              backgroundColor: stashBgColor,
              ...getButtonStyles(isStashMode, depositDisabled),
            }}
            aria-label={`Stash to ${itemName}`}
          >
            {/* Icon varies based on label */}
            {stashIconName === 'CircleFadingPlus' && (
              <Icons.CircleFadingPlus size={16} style={{ color: stashIconColor }} />
            )}
            {stashIconName === 'ArrowsUpFromLine' && (
              <Icons.ArrowsUpFromLine size={16} style={{ color: stashIconColor }} />
            )}
            {stashIconName === 'BanknoteArrowUp' && (
              <Icons.BanknoteArrowUp size={16} style={{ color: stashIconColor }} />
            )}
            <span className="text-sm font-medium" style={{ color: stashIconColor }}>
              {stashButtonLabel}
            </span>
          </button>

          {/* Vertical divider */}
          <div className="w-px h-6" style={{ backgroundColor: 'var(--overlay-divider)' }} />

          {/* Take button - orange hue (muted when inactive, grey when disabled) */}
          <button
            type="button"
            onClick={handleTakeClick}
            disabled={withdrawDisabled || isProcessing}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all focus-visible:outline-none"
            style={{
              backgroundColor: takeBgColor,
              ...getButtonStyles(isTakeMode, withdrawDisabled),
            }}
            aria-label={`Take from ${itemName}`}
          >
            <Icons.BanknoteArrowDown size={16} style={{ color: takeIconColor }} />
            <span className="text-sm font-medium" style={{ color: takeIconColor }}>
              Take
            </span>
          </button>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--overlay-bg)' }}
          >
            <Icons.Spinner size={24} style={{ color: 'var(--overlay-text)' }} />
          </div>
        )}
      </fieldset>
    </div>
  );
}
