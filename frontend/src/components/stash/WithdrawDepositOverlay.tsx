/**
 * Take/Stash Overlay
 *
 * Overlay displayed on stash cards for withdraw/deposit operations.
 * Features a single input with mode-aware styling (negative = withdraw, positive = deposit).
 */

import {
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
  type PointerEvent,
} from 'react';
import { Icons } from '../icons';
import { createArrowKeyHandler } from '../../hooks/useArrowKeyIncrement';
import {
  getAvailableAmountText,
  processInputChange,
  getModeSwitchFromKey,
} from './overlayButtonStyles';
import { OverlayActionButtons } from './OverlayActionButtons';
import { OverlayInputSection } from './OverlayInputSection';
import { useOverlayState } from './useOverlayState';

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
  const state = useOverlayState({
    withdrawAvailable,
    depositAvailable,
    leftToBudget,
    rolloverAmount,
    isProcessing,
    onTakeModeChange,
    onStashBudgetChange,
    onInputValueChange,
  });

  const {
    inputRef,
    setRawValue,
    setIsNegative,
    rawValue,
    isNegative,
    numericValue,
    formattedValue,
    inputWidth,
    isTakeMode,
    isStashMode,
    availableLeftToBudget,
    availableCashToStash,
    maxAmount,
    withdrawDisabled,
    depositDisabled,
    allActionsDisabled,
    isOverLimit,
    canSubmit,
    inputBorderColor,
    stashButtonLabel,
    stashIconName,
    stashIconColor,
    stashBgColor,
    takeIconColor,
    takeBgColor,
  } = state;

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
    [withdrawDisabled, depositDisabled, setIsNegative, setRawValue]
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
      setIsNegative,
      setRawValue,
    ]
  );

  const handleFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, [inputRef]);

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
  }, [
    isTakeMode,
    numericValue,
    withdrawAvailable,
    isProcessing,
    onTake,
    inputRef,
    setIsNegative,
    setRawValue,
  ]);

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
  }, [
    isStashMode,
    numericValue,
    depositAvailable,
    isProcessing,
    onStash,
    inputRef,
    setIsNegative,
    setRawValue,
  ]);

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

        {/* Input and available amount display */}
        <OverlayInputSection
          inputRef={inputRef}
          allActionsDisabled={allActionsDisabled}
          inputBorderColor={inputBorderColor}
          isNegative={isNegative}
          formattedValue={formattedValue}
          inputWidth={inputWidth}
          isProcessing={isProcessing}
          isTakeMode={isTakeMode}
          itemName={itemName}
          isOverLimit={isOverLimit}
          availableAmountText={getAvailableAmountText({
            isTakeMode,
            withdrawAvailable,
            availableCashToStash,
            availableLeftToBudget,
          })}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />

        {/* Action buttons */}
        <OverlayActionButtons
          stashButtonLabel={stashButtonLabel}
          stashIconName={stashIconName}
          stashIconColor={stashIconColor}
          stashBgColor={stashBgColor}
          takeIconColor={takeIconColor}
          takeBgColor={takeBgColor}
          isStashMode={isStashMode}
          isTakeMode={isTakeMode}
          depositDisabled={depositDisabled}
          withdrawDisabled={withdrawDisabled}
          isProcessing={isProcessing}
          itemName={itemName}
          onStashClick={handleStashClick}
          onTakeClick={handleTakeClick}
        />

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
