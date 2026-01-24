/**
 * ThresholdInput - Input component for auto-add threshold setting
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Format a number with commas for display. Returns empty string for null/undefined/0.
 */
function formatWithCommas(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '';
  return Math.round(value).toLocaleString('en-US');
}

/**
 * Parse a formatted string (with commas) back to a number or null.
 */
function parseFormatted(value: string): number | null {
  const digitsOnly = value.replaceAll(/\D/g, '');
  if (digitsOnly === '') return null;
  return Number.parseInt(digitsOnly, 10);
}

interface ThresholdInputProps {
  readonly defaultValue: number | null | undefined;
  readonly disabled: boolean;
  readonly onChange: (value: number | null) => void;
}

export function ThresholdInput({ defaultValue, disabled, onChange }: ThresholdInputProps) {
  const [inputValue, setInputValue] = useState(formatWithCommas(defaultValue));

  // Sync with prop changes
  useEffect(() => {
    setInputValue(formatWithCommas(defaultValue));
  }, [defaultValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const digitsOnly = rawInput.replaceAll(/\D/g, '');
    if (digitsOnly === '') {
      setInputValue('');
    } else {
      const numericValue = Number.parseInt(digitsOnly, 10);
      setInputValue(numericValue.toLocaleString('en-US'));
    }
  }, []);

  const handleBlur = useCallback(() => {
    const value = parseFormatted(inputValue);
    setInputValue(formatWithCommas(value));
    if (value !== defaultValue) {
      onChange(value);
    }
  }, [inputValue, defaultValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setInputValue(formatWithCommas(defaultValue));
        (e.target as HTMLInputElement).blur();
      }
    },
    [defaultValue]
  );

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleChange}
        placeholder="any"
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-16 px-2 py-1 text-right rounded text-sm tabular-nums"
        style={{
          border: '1px solid var(--monarch-border)',
          backgroundColor: 'var(--monarch-bg-card)',
          color: 'var(--monarch-text-dark)',
        }}
      />
      <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        /mo
      </span>
    </div>
  );
}
