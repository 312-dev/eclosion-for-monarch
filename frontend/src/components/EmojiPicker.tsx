import { useState, useRef } from 'react';
import { EmojiPicker as FrimoussePicker } from 'frimousse';
import { useClickOutside } from '../hooks';
import { RefreshIcon, Icons } from './icons';
import { useIsRateLimited } from '../context/RateLimitContext';

interface EmojiPickerProps {
  readonly currentEmoji: string;
  readonly onSelect: (emoji: string) => Promise<void>;
  readonly disabled?: boolean;
}

export function EmojiPicker({ currentEmoji, onSelect, disabled }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isRateLimited = useIsRateLimited();

  const isDisabled = disabled || isRateLimited;

  useClickOutside(
    [pickerRef],
    () => setIsOpen(false),
    isOpen
  );

  const handleSelect = async (emoji: string) => {
    if (emoji === currentEmoji) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onSelect(emoji);
      setIsOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <span className="relative inline-flex items-center" ref={pickerRef}>
      <button
        type="button"
        onClick={() => !isDisabled && !isUpdating && setIsOpen(!isOpen)}
        disabled={isDisabled || isUpdating}
        className="inline-flex items-center justify-center rounded hover:bg-black/5 transition-colors disabled:opacity-50 px-0.5 -ml-0.5"
        style={{ fontSize: 'inherit', lineHeight: 'inherit' }}
        aria-label={`Current icon: ${currentEmoji}. Click to change`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-busy={isUpdating}
      >
        {isUpdating ? (
          <RefreshIcon size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{currentEmoji}</span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute z-(--z-index-dropdown) top-full left-0 mt-1 rounded-lg shadow-lg border dropdown-menu"
          style={{
            width: '340px',
            height: '360px',
            backgroundColor: 'var(--monarch-bg-card)',
            borderColor: 'var(--monarch-border)',
          }}
          role="dialog"
          aria-label="Choose an emoji"
        >
          <FrimoussePicker.Root
            className="flex h-full w-full flex-col"
            columns={10}
            onEmojiSelect={({ emoji }) => handleSelect(emoji)}
          >
            <div className="p-2 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
              <div className="relative">
                <Icons.Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--monarch-text-muted)' }}
                />
                <FrimoussePicker.Search
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-md border appearance-none"
                  style={{
                    backgroundColor: 'var(--monarch-bg-page)',
                    borderColor: 'var(--monarch-border)',
                    color: 'var(--monarch-text-dark)',
                  }}
                  placeholder="Search emoji..."
                  autoFocus
                />
              </div>
            </div>

            <FrimoussePicker.Viewport className="relative flex-1 outline-hidden">
              <FrimoussePicker.Loading
                className="absolute inset-0 flex items-center justify-center text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                Loading…
              </FrimoussePicker.Loading>

              <FrimoussePicker.Empty
                className="absolute inset-0 flex items-center justify-center text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                No emoji found.
              </FrimoussePicker.Empty>

              <FrimoussePicker.List
                className="select-none pb-2"
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div
                      className="px-3 pt-3 pb-1.5 font-medium text-xs sticky top-0 z-10 bg-(--monarch-bg-card) text-(--monarch-text-muted) shadow-sm"
                      {...props}
                    >
                      {category.label}
                    </div>
                  ),
                  Row: ({ children, ...props }) => (
                    <div className="scroll-my-1.5 px-2" {...props}>
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji, ...props }) => (
                    <button
                      className="flex size-8 items-center justify-center rounded-md text-lg transition-colors"
                      style={{
                        backgroundColor: emoji.emoji === currentEmoji ? 'var(--monarch-orange-10)' : undefined,
                        boxShadow: emoji.emoji === currentEmoji ? 'inset 0 0 0 2px var(--monarch-orange)' : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (emoji.emoji !== currentEmoji) {
                          e.currentTarget.style.backgroundColor = 'var(--monarch-bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (emoji.emoji !== currentEmoji) {
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                      {...props}
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </FrimoussePicker.Viewport>
          </FrimoussePicker.Root>
        </div>
      )}
    </span>
  );
}
