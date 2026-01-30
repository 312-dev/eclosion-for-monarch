/**
 * Helper functions for WithdrawDepositOverlay button styling
 */

type ButtonMode = 'stash' | 'take';
type StashButtonLabel = 'Stash' | 'Budget' | 'Stash & Budget';

interface ButtonColorParams {
  isDisabled: boolean;
  isActive: boolean;
  mode: ButtonMode;
}

/**
 * Get the icon color for a button based on its state
 */
export function getButtonIconColor({ isDisabled, isActive, mode }: ButtonColorParams): string {
  if (isDisabled) {
    return 'var(--overlay-text-muted)';
  }

  const activeColor =
    mode === 'stash' ? 'var(--overlay-btn-text-stash)' : 'var(--overlay-btn-text-take)';

  if (isActive) {
    return activeColor;
  }

  return `color-mix(in srgb, ${activeColor} 50%, var(--overlay-btn-text))`;
}

/**
 * Get the background color for a button based on its state
 */
export function getButtonBgColor({ isDisabled, isActive, mode }: ButtonColorParams): string {
  if (isDisabled) {
    return 'var(--overlay-btn-bg)';
  }

  const activeBgVar =
    mode === 'stash' ? 'var(--overlay-btn-bg-active-stash)' : 'var(--overlay-btn-bg-active-take)';

  if (isActive) {
    return activeBgVar;
  }

  return `color-mix(in srgb, ${activeBgVar} 15%, var(--overlay-btn-bg))`;
}

/**
 * Determine the stash button label based on funding source availability
 */
export function getStashButtonLabel(
  numericValue: number,
  availableCashToStash: number,
  availableLeftToBudget: number
): StashButtonLabel {
  // Only Cash to Stash available (no Left to Budget)
  if (availableCashToStash > 0 && availableLeftToBudget === 0) {
    return 'Stash';
  }

  // Only Left to Budget available (no Cash to Stash)
  if (availableCashToStash === 0 && availableLeftToBudget > 0) {
    return 'Budget';
  }

  // Both available - show based on amount entered
  if (availableCashToStash > 0 && availableLeftToBudget > 0) {
    // No amount entered yet - default to Stash (will draw from Cash to Stash first)
    if (numericValue <= 0) {
      return 'Stash';
    }

    // Amount would draw from both sources
    if (numericValue > availableCashToStash) {
      return 'Stash & Budget';
    }

    // Amount fits within Cash to Stash
    return 'Stash';
  }

  // Nothing available - default label
  return 'Stash';
}

/**
 * Get the icon name for the stash button based on its label
 */
export function getStashButtonIconName(
  label: StashButtonLabel
): 'CircleFadingPlus' | 'ArrowsUpFromLine' | 'BanknoteArrowUp' {
  switch (label) {
    case 'Budget':
      return 'CircleFadingPlus';
    case 'Stash & Budget':
      return 'ArrowsUpFromLine';
    default:
      return 'BanknoteArrowUp';
  }
}

interface AvailableAmountTextParams {
  isTakeMode: boolean;
  withdrawAvailable: number;
  availableCashToStash: number;
  availableLeftToBudget: number;
}

/**
 * Generate the available amount indicator text
 */
export function getAvailableAmountText({
  isTakeMode,
  withdrawAvailable,
  availableCashToStash,
  availableLeftToBudget,
}: AvailableAmountTextParams): string {
  if (isTakeMode) {
    return `$${withdrawAvailable.toLocaleString()} withdrawable`;
  }

  const parts: string[] = [];

  if (availableCashToStash > 0) {
    parts.push(`$${availableCashToStash.toLocaleString()} stashable`);
  }

  if (availableLeftToBudget > 0) {
    parts.push(`$${availableLeftToBudget.toLocaleString()} budgetable`);
  }

  if (parts.length === 0) {
    return 'No funds available';
  }

  return parts.join(' · ');
}

interface ProcessInputResult {
  newIsNegative: boolean | null;
  digitsOnly: string;
}

/**
 * Process input and detect sign changes for mode switching.
 * Returns null for newIsNegative if no mode change should occur.
 */
export function processInputChange(
  input: string,
  withdrawDisabled: boolean,
  depositDisabled: boolean
): ProcessInputResult {
  let newIsNegative: boolean | null = null;
  let processedInput = input;

  if (input.startsWith('-') && !withdrawDisabled) {
    newIsNegative = true;
    processedInput = input.slice(1);
  } else if (input.startsWith('+') && !depositDisabled) {
    newIsNegative = false;
    processedInput = input.slice(1);
  }

  return {
    newIsNegative,
    digitsOnly: processedInput.replaceAll(/\D/g, ''),
  };
}

/**
 * Determine if a keypress should trigger a mode switch.
 * Returns the new isNegative value, or null if no switch should occur.
 */
export function getModeSwitchFromKey(
  key: string,
  rawValue: string,
  isNegative: boolean,
  withdrawDisabled: boolean,
  depositDisabled: boolean
): boolean | null {
  const shouldSwitchToNegative = key === '-' && !withdrawDisabled;
  const shouldSwitchToPositive =
    (key === '+' && !depositDisabled) || (key === 'Backspace' && rawValue === '' && isNegative);

  if (shouldSwitchToNegative) return true;
  if (shouldSwitchToPositive) return false;
  return null;
}

/**
 * Get the input border color based on mode and validation state
 */
export function getInputBorderColor(isTakeMode: boolean, isOverLimit: boolean): string {
  if (isOverLimit) return 'var(--monarch-error)';
  return isTakeMode ? 'var(--overlay-btn-text-take)' : 'var(--overlay-btn-text-stash)';
}

/**
 * Calculate input width based on digit count
 */
export function calculateInputWidth(rawValue: string): number {
  const digitCount = rawValue.length;
  const commaCount = Math.floor((digitCount - 1) / 3);
  return Math.min(10, Math.max(2, digitCount + commaCount * 0.3));
}

/**
 * Parse raw input value to numeric
 */
export function parseNumericValue(rawValue: string): number {
  return rawValue === '' ? 0 : Number.parseInt(rawValue, 10);
}

/**
 * Format numeric value for display
 */
export function formatDisplayValue(numericValue: number): string {
  return numericValue > 0 ? numericValue.toLocaleString('en-US') : '';
}
