/**
 * Overlay State Hook
 *
 * Manages state and computed values for the TakeStashOverlay component.
 */

import { useRef, useState, useEffect } from 'react';
import {
  getButtonIconColor,
  getButtonBgColor,
  getStashButtonLabel,
  getStashButtonIconName,
  getInputBorderColor,
  calculateInputWidth,
  parseNumericValue,
  formatDisplayValue,
} from './overlayButtonStyles';

interface UseOverlayStateProps {
  withdrawAvailable: number;
  depositAvailable: number;
  leftToBudget: number;
  rolloverAmount: number;
  isProcessing: boolean;
  onTakeModeChange: ((isTakeMode: boolean, isDippingIntoBudget: boolean) => void) | undefined;
  onStashBudgetChange: ((additionalBudget: number, isOverLimit: boolean) => void) | undefined;
  onInputValueChange: ((hasValue: boolean) => void) | undefined;
}

export function useOverlayState({
  withdrawAvailable,
  depositAvailable,
  leftToBudget,
  rolloverAmount,
  isProcessing,
  onTakeModeChange,
  onStashBudgetChange,
  onInputValueChange,
}: UseOverlayStateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawValue, setRawValue] = useState<string>('');

  // Default to Take mode if nothing available to stash
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
  const availableLeftToBudget = Math.max(0, leftToBudget);
  const availableCashToStash = Math.max(0, depositAvailable);
  const maxStashAmount = availableCashToStash + availableLeftToBudget;

  // Button states
  const withdrawDisabled = withdrawAvailable <= 0;
  const depositDisabled = depositAvailable <= 0 && availableLeftToBudget <= 0;
  const allActionsDisabled = withdrawDisabled && depositDisabled;

  // Calculate additional budget needed from Left to Budget when stashing
  const rawAdditionalBudget = isStashMode ? Math.max(0, numericValue - availableCashToStash) : 0;
  const additionalBudget = Math.min(rawAdditionalBudget, availableLeftToBudget);

  // Validation
  const maxAmount = isTakeMode ? withdrawAvailable : maxStashAmount;
  const isOverLimit = numericValue > maxAmount;
  const isStashOverLimit = isStashMode && isOverLimit && numericValue > 0;

  // Notify parent of stash budget changes
  useEffect(() => {
    onStashBudgetChange?.(additionalBudget, isStashOverLimit);
  }, [additionalBudget, isStashOverLimit, onStashBudgetChange]);

  const canSubmit = numericValue > 0 && !isOverLimit && !isProcessing;
  const inputBorderColor = getInputBorderColor(isTakeMode, isOverLimit);

  // Button label and icon
  const stashButtonLabel = getStashButtonLabel(
    numericValue,
    availableCashToStash,
    availableLeftToBudget
  );
  const stashIconName = getStashButtonIconName(stashButtonLabel);

  // Button colors
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

  return {
    // Refs
    inputRef,
    // State setters
    setRawValue,
    setIsNegative,
    // Computed values
    rawValue,
    isNegative,
    numericValue,
    formattedValue,
    inputWidth,
    isTakeMode,
    isStashMode,
    // Availability
    availableLeftToBudget,
    availableCashToStash,
    maxAmount,
    // Disabled states
    withdrawDisabled,
    depositDisabled,
    allActionsDisabled,
    // Validation
    isOverLimit,
    canSubmit,
    // Styling
    inputBorderColor,
    stashButtonLabel,
    stashIconName,
    stashIconColor,
    stashBgColor,
    takeIconColor,
    takeBgColor,
  };
}
