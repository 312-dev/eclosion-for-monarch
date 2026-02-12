/**
 * TransactionSearchBar
 *
 * Inline search input for filtering the refunds transaction list
 * by merchant, category, account, notes, or tag name.
 */

import { useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

interface TransactionSearchBarProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function TransactionSearchBar({ value, onChange }: TransactionSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut(
    'f',
    useCallback(() => inputRef.current?.focus(), []),
    { ctrl: true }
  );

  return (
    <div className="sticky top-18 z-10 px-4 py-2 border-b border-(--monarch-border) bg-(--monarch-bg-card)">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--monarch-text-muted)"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') inputRef.current?.blur();
          }}
          placeholder="Search transactions..."
          aria-label="Search transactions"
          className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-(--monarch-text-muted) hover:text-(--monarch-text-dark) transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
