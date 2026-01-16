/**
 * CurrencyInput Component
 *
 * A styled input for currency values with $ prefix.
 * Replaces inline currency inputs in RecurringRow, RollupZone, and ReadyToAssign.
 */

import { useRef, useEffect, type ChangeEvent } from 'react';

export interface CurrencyInputProps {
  /** Current value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Whether to show warning styling */
  warning?: boolean;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
}

/**
 * Currency input with $ prefix and styled appearance.
 */
export function CurrencyInput({
  value,
  onChange,
  onBlur,
  warning = false,
  disabled = false,
  className = '',
  placeholder = '0.00',
  autoFocus = false,
  min,
  max,
  step = 0.01,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = Number.parseFloat(e.target.value) || 0;
    let clampedValue = newValue;

    if (min !== undefined && newValue < min) {
      clampedValue = min;
    }
    if (max !== undefined && newValue > max) {
      clampedValue = max;
    }

    onChange(clampedValue);
  };

  const borderColor = warning ? 'var(--monarch-warning)' : 'var(--monarch-border)';

  const focusBorderColor = warning ? 'var(--monarch-warning)' : 'var(--monarch-primary)';

  return (
    <div
      className={`relative flex items-center ${className}`}
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: '0.375rem',
        backgroundColor: disabled ? 'var(--monarch-bg-page)' : 'var(--monarch-bg-card)',
      }}
    >
      <span className="pl-2 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        $
      </span>
      <input
        ref={inputRef}
        type="number"
        value={value || ''}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="w-full py-1.5 pr-2 pl-1 text-sm bg-transparent outline-none"
        style={{
          color: 'var(--monarch-text)',
        }}
        onFocus={(e) => {
          const parent = e.currentTarget.parentElement;
          if (parent) {
            parent.style.borderColor = focusBorderColor;
          }
        }}
        onBlurCapture={(e) => {
          const parent = e.currentTarget.parentElement;
          if (parent) {
            parent.style.borderColor = borderColor;
          }
        }}
      />
    </div>
  );
}
