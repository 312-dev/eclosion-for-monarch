/**
 * Card Allocation Input
 *
 * Large currency input overlay displayed on stash cards during distribution mode.
 * Features auto-focus and mode-aware focus ring colors.
 */

import { useRef, useState, useCallback, type ChangeEvent } from 'react';
import { TbMoneybag } from 'react-icons/tb';
import { useDistributionMode } from '../../context/DistributionModeContext';

interface CardAllocationInputProps {
  /** Stash item ID */
  readonly itemId: string;
  /** Item name for accessibility */
  readonly itemName: string;
}

export function CardAllocationInput({ itemId, itemName }: CardAllocationInputProps) {
  const { stashedAllocations, setStashedAllocation, mode } = useDistributionMode();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentValue = stashedAllocations[itemId] ?? 0;
  const displayValue = currentValue > 0 ? currentValue.toLocaleString('en-US') : '';

  // Calculate width: digits need ~1ch, commas need ~0.3ch
  const digitCount = displayValue.replaceAll(/\D/g, '').length;
  const commaCount = (displayValue.match(/,/g) || []).length;
  // Min 2ch, max 10ch (covers up to 9,999,999 which is $10M)
  const inputWidth = Math.min(10, Math.max(2, digitCount + commaCount * 0.3));

  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const digitsOnly = rawInput.replaceAll(/\D/g, '');
      const numericValue = digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10);
      setStashedAllocation(itemId, numericValue);
    },
    [itemId, setStashedAllocation]
  );

  const handleFocus = () => {
    setIsFocused(true);
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const isDistribute = mode === 'distribute';
  const focusRingColor = isDistribute ? 'ring-green-400' : 'ring-purple-400';

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Icon above input */}
      <TbMoneybag size={32} className="shrink-0" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />

      {/* Input container with white border */}
      <div
        className={`relative flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-200 ${
          isFocused ? `ring-2 ${focusRingColor}` : ''
        }`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
        }}
      >
        {/* Dollar sign */}
        <span className="text-3xl font-bold" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          $
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0"
          aria-label={`Allocation amount for ${itemName}`}
          className="min-w-8 text-3xl font-bold bg-transparent outline-none text-white placeholder:text-white/40 tabular-nums text-right"
          style={{ width: `${inputWidth}ch` }}
        />
      </div>

      {/* Label */}
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(255, 255, 255, 0.6)' }}
      >
        stashed
      </span>
    </div>
  );
}
