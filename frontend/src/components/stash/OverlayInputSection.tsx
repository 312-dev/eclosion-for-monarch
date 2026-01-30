/**
 * Overlay Input Section
 *
 * Input field and available amount display for the TakeStashOverlay component.
 */

import { type RefObject, type ChangeEvent, type KeyboardEvent, memo } from 'react';

interface OverlayInputSectionProps {
  /** Reference to the input element */
  readonly inputRef: RefObject<HTMLInputElement | null>;
  /** Whether all actions are disabled */
  readonly allActionsDisabled: boolean;
  /** Border color for the input based on mode */
  readonly inputBorderColor: string;
  /** Whether in negative (take) mode */
  readonly isNegative: boolean;
  /** Formatted display value */
  readonly formattedValue: string;
  /** Input width in characters */
  readonly inputWidth: number;
  /** Whether currently processing */
  readonly isProcessing: boolean;
  /** Whether in take mode */
  readonly isTakeMode: boolean;
  /** Item name for accessibility */
  readonly itemName: string;
  /** Whether value exceeds limit */
  readonly isOverLimit: boolean;
  /** Available amount text to display */
  readonly availableAmountText: string;
  /** Change handler */
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Focus handler */
  readonly onFocus: () => void;
  /** Key down handler */
  readonly onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export const OverlayInputSection = memo(function OverlayInputSection({
  inputRef,
  allActionsDisabled,
  inputBorderColor,
  isNegative,
  formattedValue,
  inputWidth,
  isProcessing,
  isTakeMode,
  itemName,
  isOverLimit,
  availableAmountText,
  onChange,
  onFocus,
  onKeyDown,
}: OverlayInputSectionProps) {
  return (
    <>
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
          onChange={onChange}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
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
        {availableAmountText}
      </div>
    </>
  );
});
