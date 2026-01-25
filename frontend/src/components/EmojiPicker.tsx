import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EmojiPicker as FrimoussePicker } from 'frimousse';
import { RefreshIcon, Icons } from './icons';
import { useIsRateLimited } from '../context/RateLimitContext';
import { Z_INDEX } from '../constants';

interface EmojiPickerProps {
  readonly currentEmoji: string;
  readonly onSelect: (emoji: string) => Promise<void>;
  readonly disabled?: boolean;
  /** Show a dropdown chevron next to the emoji */
  readonly showChevron?: boolean;
}

export function EmojiPicker({ currentEmoji, onSelect, disabled, showChevron }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isRateLimited = useIsRateLimited();

  const isDisabled = disabled || isRateLimited;

  // Calculate dropdown position when opening
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 360;
      const dropdownWidth = 340;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: 'fixed',
        left: triggerRect.left,
        width: dropdownWidth,
        zIndex: Z_INDEX.TOOLTIP,
        ...(openUpward
          ? { bottom: window.innerHeight - triggerRect.top + 4 }
          : { top: triggerRect.bottom + 4 }),
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        pickerRef.current &&
        !pickerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

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

  const pickerDropdown = isOpen
    ? createPortal(
        <div
          ref={pickerRef}
          className="rounded-lg shadow-lg border dropdown-menu"
          style={{
            ...dropdownStyle,
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
                  Emoji: ({ emoji, ...props }) => {
                    const isSelected = emoji.emoji === currentEmoji;
                    return (
                      <button
                        className={`flex size-8 items-center justify-center rounded-md text-lg transition-colors ${
                          isSelected
                            ? 'ring-2 ring-inset bg-(--monarch-orange-10)'
                            : 'hover:bg-(--monarch-bg-hover)'
                        }`}
                        style={isSelected ? { '--tw-ring-color': 'var(--monarch-orange)' } as React.CSSProperties : undefined}
                        {...props}
                      >
                        {emoji.emoji}
                      </button>
                    );
                  },
                }}
              />
            </FrimoussePicker.Viewport>
          </FrimoussePicker.Root>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !isDisabled && !isUpdating && setIsOpen(!isOpen)}
        disabled={isDisabled || isUpdating}
        className="inline-flex items-center justify-center rounded hover:bg-black/5 transition-colors disabled:opacity-50 px-0.5 -ml-0.5 gap-1.5"
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
        {showChevron && (
          <Icons.ChevronDown
            size={14}
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-hidden="true"
          />
        )}
      </button>
      {pickerDropdown}
    </>
  );
}
