/* eslint-disable max-lines -- Form components with multiple field types require significant code */
/**
 * Stash Form Field Components
 *
 * Shared form input fields for New and Edit stash modals.
 */

import { useMemo, useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import { EmojiPicker } from '../EmojiPicker';
import { getSafeHref } from '../../utils';
import { getQuickPickDates } from '../../utils/savingsCalculations';
import { Z_INDEX } from '../../constants';
import type { StashGoalType } from '../../types';
import { createArrowKeyHandler } from '../../hooks/useArrowKeyIncrement';

/**
 * Creates a keydown handler for numeric string inputs with arrow key support.
 * Shared between AmountInput and StartingBalanceInput.
 */
function createNumericStringKeyHandler(
  value: string,
  onChange: (value: string) => void
): (e: React.KeyboardEvent<HTMLInputElement>) => void {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentValue = value ? Number.parseInt(value, 10) : 0;
    const arrowHandler = createArrowKeyHandler({
      value: currentValue,
      onChange: (newValue) => {
        onChange(newValue === 0 ? '' : String(newValue));
      },
      step: 1,
      min: 0,
    });
    arrowHandler(e);
  };
}

// Re-export modal-specific components for backward compatibility
export {
  MonthlyTargetPreview,
  ModalFooterButtons,
  CategoryInfoDisplay,
} from './StashModalComponents';

interface NameInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  emoji: string;
  onEmojiChange: (emoji: string) => void;
  placeholder?: string;
  onFocusChange?: (isFocused: boolean) => void;
}

export function NameInputWithEmoji({
  id,
  value,
  onChange,
  emoji,
  onEmojiChange,
  placeholder = 'What are you saving for?',
  onFocusChange,
}: NameInputProps) {
  const handleEmojiSelect = useCallback(
    async (selectedEmoji: string) => {
      onEmojiChange(selectedEmoji);
    },
    [onEmojiChange]
  );

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--monarch-text)' }}
      >
        Name
      </label>
      <div className="flex items-stretch">
        {/* Emoji picker prefix - joined to input */}
        <div
          className="flex items-center justify-center text-lg rounded-l-md shrink-0 pl-3 pr-2"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            borderTop: '1px solid var(--monarch-border)',
            borderBottom: '1px solid var(--monarch-border)',
            borderLeft: '1px solid var(--monarch-border)',
          }}
        >
          <EmojiPicker currentEmoji={emoji || '💰'} onSelect={handleEmojiSelect} showChevron />
        </div>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-l-none rounded-r-md"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
        />
      </div>
    </div>
  );
}

interface UrlInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

/** @deprecated Use UrlDisplay instead */
export function UrlInput({ id, value, onChange }: UrlInputProps) {
  const safeHref = getSafeHref(value);
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--monarch-text)' }}
      >
        URL{' '}
        <span style={{ color: 'var(--monarch-text-muted)', fontWeight: 'normal' }}>(optional)</span>
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/product"
          className="flex-1 px-3 py-2 rounded-md"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
        />
        {safeHref && (
          <button
            type="button"
            onClick={() => window.open(safeHref, '_blank', 'noopener,noreferrer')}
            className="flex items-center justify-center w-10 rounded-md hover:opacity-70"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-teal)',
            }}
            aria-label="Open URL in new tab"
          >
            <Icons.ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface UrlDisplayProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onModalOpenChange?: (isOpen: boolean) => void;
}

/**
 * Inner content of the URL edit modal.
 * Separated to reset state when modal reopens via key prop.
 */
function UrlEditModalContent({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (url: string) => void;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    onSave(inputValue.trim());
    onClose();
  };

  const handleRemove = () => {
    onSave('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
      <h3 className="text-lg font-medium mb-3" style={{ color: 'var(--monarch-text)' }}>
        {value ? 'Edit Link' : 'Add Link'}
      </h3>
      <input
        ref={inputRef}
        type="url"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="https://example.com/product"
        className="w-full px-3 py-2 rounded-md mb-4"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
          color: 'var(--monarch-text)',
        }}
      />
      <div className="flex justify-between">
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="px-3 py-1.5 text-sm rounded-md transition-colors"
            style={{ color: 'var(--monarch-error)' }}
          >
            Remove Link
          </button>
        )}
        <div className={`flex gap-2 ${value ? '' : 'ml-auto'}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md transition-colors"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              color: 'var(--monarch-text-muted)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors"
            style={{
              backgroundColor: 'var(--monarch-teal)',
              color: 'white',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}

function UrlEditModal({
  isOpen,
  onClose,
  value,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onSave: (url: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Control dialog open/close via ref
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Handle native dialog close (e.g., Escape key)
  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      // Only close if clicking the backdrop (dialog element itself)
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Dialog backdrop click-to-close is standard UX; keyboard close via Escape is handled natively
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      className="w-full max-w-md p-4 rounded-lg shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        margin: 0,
      }}
    >
      {/* Use key to reset content state when modal opens */}
      {isOpen && <UrlEditModalContent value={value} onSave={onSave} onClose={onClose} />}
    </dialog>,
    document.body
  );
}

export function UrlDisplay({ value, onChange, onModalOpenChange }: UrlDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const safeHref = getSafeHref(value);

  const handleModalOpen = useCallback(() => {
    setIsModalOpen(true);
    onModalOpenChange?.(true);
  }, [onModalOpenChange]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    onModalOpenChange?.(false);
  }, [onModalOpenChange]);

  if (!value) {
    return (
      <>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent blur from firing
            handleModalOpen();
          }}
          className="text-xs hover:underline"
          style={{ color: 'var(--monarch-orange)' }}
        >
          ↳ Add link
        </button>
        <UrlEditModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          value={value}
          onSave={onChange}
        />
      </>
    );
  }

  // Truncate URL for display
  const displayUrl = value.length > 40 ? `${value.slice(0, 37)}...` : value;

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        {safeHref ? (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline truncate"
            style={{ color: 'var(--monarch-teal)' }}
            title={value}
          >
            {displayUrl}
          </a>
        ) : (
          <span className="truncate" style={{ color: 'var(--monarch-text-muted)' }} title={value}>
            {displayUrl}
          </span>
        )}
        <button
          type="button"
          onClick={handleModalOpen}
          className="shrink-0 p-1 rounded hover:bg-(--monarch-bg-page)"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="Edit link"
        >
          <Icons.Edit className="w-3.5 h-3.5" />
        </button>
      </div>
      <UrlEditModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        value={value}
        onSave={onChange}
      />
    </>
  );
}

interface AmountInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Hide the label for inline/sentence layouts */
  hideLabel?: boolean;
  /** Show a search button on the right side (for debt account lookup) */
  showSearchButton?: boolean;
  /** Callback when search button is clicked */
  onSearchClick?: () => void;
}

export function AmountInput({
  id,
  value,
  onChange,
  label = 'Amount',
  hideLabel = false,
  showSearchButton = false,
  onSearchClick,
}: AmountInputProps) {
  const handleChange = (inputValue: string) => {
    const cleaned = inputValue.replaceAll(/\D/g, '');
    onChange(cleaned);
  };

  const handleKeyDown = createNumericStringKeyHandler(value, onChange);

  // Format the display value with commas
  const displayValue = useMemo(() => {
    if (!value || value === '0') return '';
    const numericValue = Number.parseInt(value, 10);
    if (Number.isNaN(numericValue)) return '';
    return numericValue.toLocaleString('en-US');
  }, [value]);

  // Auto-size: min 3ch, grows with formatted content (including commas)
  const inputWidth = Math.max(3, displayValue.length + 1);

  return (
    <div className={hideLabel ? 'inline-flex' : ''}>
      {!hideLabel && (
        <label
          htmlFor={id}
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--monarch-text)' }}
        >
          {label}
        </label>
      )}
      <div className="relative inline-flex">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="0"
          className={`pl-7 py-2 tabular-nums ${showSearchButton ? 'pr-0.5' : 'pr-3'}`}
          style={{
            width: hideLabel ? `${inputWidth + 3}ch` : '100%',
            minWidth: hideLabel ? '5ch' : undefined,
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            borderRight: showSearchButton ? 'none' : '1px solid var(--monarch-border)',
            borderRadius: showSearchButton ? '0.375rem 0 0 0.375rem' : '0.375rem',
            color: 'var(--monarch-text)',
          }}
        />
        {showSearchButton && (
          <button
            type="button"
            onClick={onSearchClick}
            className="pl-0.5 pr-1.5 py-2 rounded-r-md transition-colors hover:bg-(--monarch-bg-card)"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
              borderLeft: 'none',
              color: 'var(--monarch-text-muted)',
            }}
            aria-label="Search debt accounts"
          >
            <Icons.Search size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

interface TargetDateInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  quickPickOptions?: Array<{ label: string; date: string }> | undefined;
  /** Hide the label for inline/sentence layouts */
  hideLabel?: boolean;
}

/** Max date: 85 years from now */
const MAX_YEARS_OUT = 85;

export function TargetDateInput({
  id,
  value,
  onChange,
  minDate,
  maxDate,
  quickPickOptions,
  hideLabel = false,
}: TargetDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const quickPicks = useMemo(() => getQuickPickDates(), []);

  // Default max date: 85 years from now
  const defaultMaxDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + MAX_YEARS_OUT);
    return date.toISOString().split('T')[0];
  }, []);
  const effectiveMaxDate = maxDate ?? defaultMaxDate;
  const defaultQuickPicks = [
    { label: 'in 2 months', date: quickPicks.twoMonths },
    { label: 'in 3 months', date: quickPicks.threeMonths },
    { label: 'in 6 months', date: quickPicks.sixMonths },
    { label: 'in 1 year', date: quickPicks.oneYear },
  ];
  const picks = quickPickOptions || defaultQuickPicks;

  // Format date as MM/DD/YY
  const formattedDate = useMemo(() => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return '';
    return `${month}/${day}/${year.slice(-2)}`;
  }, [value]);

  const handleContainerClick = () => {
    inputRef.current?.showPicker();
  };

  return (
    <div>
      {!hideLabel && (
        <label
          htmlFor={id}
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--monarch-text)' }}
        >
          Deadline
        </label>
      )}
      {hideLabel ? (
        <div className="inline-flex h-10 items-center">
          <input
            id={id}
            type="date"
            value={value}
            min={minDate}
            max={effectiveMaxDate}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-2 rounded-md leading-normal"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
              color: value ? 'var(--monarch-text)' : 'var(--monarch-text-muted)',
            }}
          />
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            className="w-full px-3 py-2 rounded-md cursor-pointer text-left"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
              color: value ? 'var(--monarch-text)' : 'var(--monarch-text-muted)',
            }}
            onClick={handleContainerClick}
          >
            {formattedDate || 'Select date'}
          </button>
          <input
            ref={inputRef}
            id={id}
            type="date"
            value={value}
            min={minDate}
            max={effectiveMaxDate}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}
      {picks.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {picks.map((pick) => (
            <button
              key={pick.label}
              type="button"
              onClick={() => onChange(pick.date)}
              className={`px-2 py-1 text-xs rounded-md btn-press ${value === pick.date ? 'ring-2 ring-(--monarch-teal)' : ''}`}
              style={{
                backgroundColor:
                  value === pick.date ? 'var(--monarch-teal-light)' : 'var(--monarch-bg-page)',
                color: value === pick.date ? 'var(--monarch-teal)' : 'var(--monarch-text-muted)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              {pick.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface StartingBalanceInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly availableAmount: number | undefined;
  readonly isLoading?: boolean;
  /** Whether this field is focused (controls visibility of available amount) */
  readonly isFocused: boolean;
  readonly onFocusChange: (focused: boolean) => void;
  /**
   * Initial/existing value for edit mode. When set, validation checks the DELTA
   * (increase from initial) against available, not the absolute value.
   * This allows keeping existing committed funds without showing an error.
   */
  readonly initialValue?: number;
}

/**
 * Starting balance input with Available to Stash validation.
 * Shows available amount underneath when focused.
 * Color codes: green if > $0, gray if == $0, red if over.
 */
export function StartingBalanceInput({
  value,
  onChange,
  availableAmount,
  isLoading = false,
  isFocused,
  onFocusChange,
  initialValue = 0,
}: StartingBalanceInputProps) {
  const handleChange = (inputValue: string) => {
    const cleaned = inputValue.replaceAll(/\D/g, '');
    onChange(cleaned);
  };

  const handleKeyDown = createNumericStringKeyHandler(value, onChange);

  // Format the display value with commas
  const displayValue = useMemo(() => {
    if (!value || value === '0') return '';
    const numericValue = Number.parseInt(value, 10);
    if (Number.isNaN(numericValue)) return '';
    return numericValue.toLocaleString('en-US');
  }, [value]);

  // Auto-size: min 3ch, grows with formatted content (including commas)
  const inputWidth = Math.max(3, displayValue.length + 1);

  // Calculate if over available
  // For edit mode (initialValue > 0), check if the INCREASE exceeds available
  // For new mode (initialValue = 0), check if the absolute value exceeds available
  const numericValue = Number.parseInt(value, 10) || 0;
  const delta = numericValue - initialValue;
  const isOverAvailable = availableAmount !== undefined && delta > 0 && delta > availableAmount;

  const showAvailable = isFocused || isOverAvailable;

  // Compute available message and color
  // Shows remaining amount after accounting for the typed value (live updates as user types)
  const { availableMessage, availableColor } = useMemo(() => {
    const formatAmount = (amount: number) =>
      `${amount < 0 ? '-' : ''}$${Math.abs(Math.round(amount)).toLocaleString('en-US')}`;

    if (isLoading) {
      return { availableMessage: 'Loading...', availableColor: 'var(--monarch-text-muted)' };
    }
    if (availableAmount === undefined) {
      return { availableMessage: null, availableColor: 'var(--monarch-text-muted)' };
    }

    // Calculate remaining after the typed delta
    const remaining = availableAmount - Math.max(0, delta);

    if (remaining < 0) {
      return {
        availableMessage: `${formatAmount(remaining)} left`,
        availableColor: 'var(--monarch-error)',
      };
    }
    if (remaining === 0 && availableAmount === 0 && initialValue === 0) {
      return {
        availableMessage: 'No additional funds available',
        availableColor: 'var(--monarch-text-muted)',
      };
    }
    return {
      availableMessage: `${formatAmount(remaining)} left`,
      availableColor: 'var(--monarch-success)',
    };
  }, [isLoading, availableAmount, delta, initialValue]);

  return (
    <div
      className={`inline-flex flex-col self-start relative transition-[margin-bottom] duration-200 ${
        showAvailable ? 'mb-5' : 'mb-0'
      }`}
    >
      <div className="relative inline-flex h-10 items-center">
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          placeholder="0"
          className="pl-7 pr-3 py-2 rounded-md tabular-nums"
          style={{
            width: `${inputWidth + 3}ch`,
            minWidth: '5ch',
            backgroundColor: 'var(--monarch-bg-page)',
            border: `1px solid ${isOverAvailable ? 'var(--monarch-error)' : 'var(--monarch-border)'}`,
            color: 'var(--monarch-text)',
          }}
          aria-label="Starting balance"
          aria-invalid={isOverAvailable}
        />
      </div>
      {/* Available amount indicator - absolutely positioned to not affect inline layout */}
      <div
        className={`absolute top-full mt-1 left-1/2 text-xs whitespace-nowrap transition-all duration-200 ${
          showAvailable ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          color: availableColor,
          transform: `translateX(-50%) translateY(${showAvailable ? '0' : '-0.25rem'})`,
        }}
      >
        {availableMessage}
      </div>
    </div>
  );
}

interface GoalTypeSelectorProps {
  readonly value: StashGoalType;
  readonly onChange: (value: StashGoalType) => void;
  /** Hide the label for inline/sentence layouts */
  readonly hideLabel?: boolean;
}

const GOAL_TYPE_OPTIONS: Array<{
  value: StashGoalType;
  title: string;
  description: string;
  examples: string;
  icon: 'BadgeDollarSign' | 'HandCoins' | 'PiggyBank';
}> = [
  {
    value: 'debt',
    title: 'debt',
    description: 'Pay down a debt. Track progress as you chip away.',
    examples: 'e.g. Credit card, student loan, car loan',
    icon: 'HandCoins',
  },
  {
    value: 'one_time',
    title: 'purchase',
    description: 'Save up to buy something. Mark complete when done.',
    examples: 'e.g. New laptop, vacation, furniture',
    icon: 'BadgeDollarSign',
  },
  {
    value: 'savings_buffer',
    title: 'savings fund',
    description: 'A fund to dip into and refill. Spending reduces progress.',
    examples: 'e.g. Emergency fund, car maintenance, gifts',
    icon: 'PiggyBank',
  },
];

/**
 * Goal type selector dropdown for stash items.
 * Allows choosing between purchase and savings buffer goals.
 */
export function GoalTypeSelector({ value, onChange, hideLabel = false }: GoalTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    GOAL_TYPE_OPTIONS.find((opt) => opt.value === value) ?? GOAL_TYPE_OPTIONS[0]!;

  // Calculate dropdown position when opening - useLayoutEffect for synchronous DOM measurements
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 180; // Approximate height of dropdown (scaled to ~80%)
      const dropdownWidth = 340; // Wide enough for full descriptions (scaled to ~80%)
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: 'fixed',
        left: triggerRect.left,
        width: dropdownWidth,
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
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
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

  const dropdownMenu = isOpen
    ? createPortal(
        <div
          ref={dropdownRef}
          className="rounded-md shadow-lg"
          style={{
            ...dropdownStyle,
            zIndex: Z_INDEX.TOOLTIP,
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {GOAL_TYPE_OPTIONS.map((option) => {
            const iconMap = {
              BadgeDollarSign: { component: Icons.BadgeDollarSign, color: 'var(--monarch-info)' },
              HandCoins: { component: Icons.HandCoins, color: 'var(--monarch-warning)' },
              PiggyBank: { component: Icons.PiggyBank, color: 'var(--monarch-accent)' },
            } as const;
            const { component: IconComponent, color: iconColor } = iconMap[option.icon];
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-2.5 text-left first:rounded-t-md last:rounded-b-md transition-colors ${
                  isSelected
                    ? 'bg-(--monarch-bg-page)'
                    : 'bg-transparent hover:bg-(--monarch-bg-page)'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <IconComponent className="w-4 h-4 mt-0.5 shrink-0" style={{ color: iconColor }} />
                  <div className="flex-1">
                    <div
                      className="text-sm font-medium"
                      style={{ color: 'var(--monarch-text-dark)' }}
                    >
                      {option.title}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                      {option.description}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: 'var(--monarch-text-muted)' }}
                    >
                      {option.examples}
                    </div>
                  </div>
                  {isSelected && (
                    <Icons.Check
                      className="w-3.5 h-3.5 mt-0.5"
                      style={{ color: 'var(--monarch-teal)' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={hideLabel ? 'inline-flex h-10 items-center' : ''}>
      {!hideLabel && (
        <label
          htmlFor="goal-type-selector"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--monarch-text)' }}
        >
          Intention
        </label>
      )}
      <div className="relative">
        {/* Trigger button */}
        <button
          ref={triggerRef}
          id="goal-type-selector"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`${hideLabel ? '' : 'w-full justify-between'} px-3 py-2 rounded-md text-left flex items-center gap-2`}
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {selectedOption.icon === 'BadgeDollarSign' && (
            <Icons.BadgeDollarSign className="w-4 h-4" style={{ color: 'var(--monarch-info)' }} />
          )}
          {selectedOption.icon === 'HandCoins' && (
            <Icons.HandCoins className="w-4 h-4" style={{ color: 'var(--monarch-warning)' }} />
          )}
          {selectedOption.icon === 'PiggyBank' && (
            <Icons.PiggyBank className="w-4 h-4" style={{ color: 'var(--monarch-accent)' }} />
          )}
          {selectedOption.title}
          <Icons.ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--monarch-text-muted)' }}
          />
        </button>
      </div>
      {dropdownMenu}
    </div>
  );
}
