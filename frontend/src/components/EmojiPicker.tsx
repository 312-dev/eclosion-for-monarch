import { useState, useRef } from 'react';
import { useClickOutside } from '../hooks';
import { RefreshIcon } from './icons';

interface EmojiPickerProps {
  readonly currentEmoji: string;
  readonly onSelect: (emoji: string) => Promise<void>;
  readonly disabled?: boolean;
}

// Common emojis for subscription/category use
const EMOJI_OPTIONS = [
  // Default
  '🔄',
  // Entertainment
  '🎬', '🎵', '🎮', '📺', '🎧', '🎤',
  // Technology
  '💻', '📱', '☁️', '🔐', '🌐', '💾',
  // Finance
  '💰', '💳', '🏦', '📈', '💵', '🧾',
  // Health & Fitness
  '🏋️', '🧘', '💊', '🏥', '🍎', '❤️',
  // Home & Utilities
  '🏠', '💡', '📦', '🚗', '⚡', '🔌',
  // Education
  '📚', '🎓', '✏️', '📝', '🧠', '💡',
  // Food & Delivery
  '🍕', '🍔', '☕', '🛒', '🥡', '🍽️',
  // Shopping
  '🛍️', '👕', '👟', '💄', '🎁', '📿',
  // Misc
  '⭐', '🔔', '📅', '🎯', '✅', '🌟',
];

// Check if a string contains at least one emoji
function containsEmoji(str: string): boolean {
  const emojiRegex = /\p{Emoji}/u;
  return emojiRegex.test(str);
}

// Extract first emoji from string
function extractFirstEmoji(str: string): string | null {
  const emojiRegex = /\p{Extended_Pictographic}/u;
  const match = emojiRegex.exec(str);
  return match ? match[0] : null;
}

export function EmojiPicker({ currentEmoji, onSelect, disabled }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close picker when clicking outside
  useClickOutside([pickerRef], () => {
    setIsOpen(false);
    setCustomInput('');
  }, isOpen);

  const handleSelect = async (emoji: string) => {
    if (emoji === currentEmoji) {
      setIsOpen(false);
      setCustomInput('');
      return;
    }

    setIsUpdating(true);
    try {
      await onSelect(emoji);
      setIsOpen(false);
      setCustomInput('');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCustomSubmit = () => {
    const emoji = extractFirstEmoji(customInput);
    if (emoji) {
      handleSelect(emoji);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setCustomInput('');
    }
  };

  // Handle keyboard navigation for emoji grid
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setCustomInput('');
    }
  };

  return (
    <span className="relative inline-flex items-center" ref={pickerRef}>
      <button
        type="button"
        onClick={() => !disabled && !isUpdating && setIsOpen(!isOpen)}
        disabled={disabled || isUpdating}
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
          className="absolute z-(--z-index-dropdown) top-full left-0 mt-1 p-2 rounded-lg shadow-lg border dropdown-menu min-w-50 bg-monarch-bg-card border-monarch-border"
          role="dialog"
          aria-label="Choose an emoji"
          onKeyDown={handleGridKeyDown}
        >
          {/* Custom emoji input */}
          <div className="flex gap-1 mb-2">
            <input
              ref={inputRef}
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type any emoji..."
              aria-label="Type a custom emoji"
              className="flex-1 px-2 py-1 text-sm rounded border bg-monarch-bg-page border-monarch-border text-monarch-text-dark"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!containsEmoji(customInput)}
              className="px-2 py-1 text-xs font-medium rounded disabled:opacity-40 bg-monarch-orange text-white"
              aria-label="Set custom emoji"
            >
              Set
            </button>
          </div>
          {/* Quick select grid */}
          <div className="grid grid-cols-6 gap-1" role="grid" aria-label="Emoji options">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                type="button"
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-lg ${
                  emoji === currentEmoji ? 'ring-2 ring-orange-400' : ''
                }`}
                aria-label={`Select ${emoji}`}
                aria-pressed={emoji === currentEmoji}
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
