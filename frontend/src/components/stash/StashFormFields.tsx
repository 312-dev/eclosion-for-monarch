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
import type { StashGoalType } from '../../types';

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
      <div className="flex gap-2 items-center">
        <div
          className="w-12 h-10 flex items-center justify-center text-lg rounded-md shrink-0"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <EmojiPicker currentEmoji={emoji || '💰'} onSelect={handleEmojiSelect} />
        </div>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-md"
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
}

export function AmountInput({
  id,
  value,
  onChange,
  label = 'Amount',
  hideLabel = false,
}: AmountInputProps) {
  const handleChange = (inputValue: string) => {
    const cleaned = inputValue.replaceAll(/\D/g, '');
    onChange(cleaned);
  };

  // Auto-size: min 3ch, grows with content
  const inputWidth = Math.max(3, (value || '').length + 1);

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
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0"
          className="pl-7 pr-3 py-2 rounded-md"
          style={{
            width: hideLabel ? `${inputWidth + 3}ch` : '100%',
            minWidth: hideLabel ? '5ch' : undefined,
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
        />
      </div>
    </div>
  );
}

interface TargetDateInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string | undefined;
  quickPickOptions?: Array<{ label: string; date: string }> | undefined;
  /** Hide the label for inline/sentence layouts */
  hideLabel?: boolean;
}

export function TargetDateInput({
  id,
  value,
  onChange,
  minDate,
  quickPickOptions,
  hideLabel = false,
}: TargetDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const quickPicks = useMemo(() => getQuickPickDates(), []);
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
        <div className="inline-flex">
          <input
            id={id}
            type="date"
            value={value}
            min={minDate}
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
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}
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
  icon: 'Gift' | 'PiggyBank';
}> = [
  {
    value: 'one_time',
    title: 'purchase',
    description: 'Save up to buy something. Mark complete when done.',
    examples: 'e.g. New laptop, vacation, furniture',
    icon: 'Gift',
  },
  {
    value: 'savings_buffer',
    title: 'savings buffer',
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
      const dropdownHeight = 220; // Approximate height of dropdown
      const dropdownWidth = 420; // Wide enough for full descriptions
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
          className="z-50 rounded-md shadow-lg"
          style={{
            ...dropdownStyle,
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {GOAL_TYPE_OPTIONS.map((option) => {
            const IconComponent = option.icon === 'Gift' ? Icons.Gift : Icons.PiggyBank;
            const iconColor = option.icon === 'Gift' ? '#60a5fa' : '#a78bfa';
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-3 text-left hover:bg-(--monarch-bg-page) first:rounded-t-md last:rounded-b-md"
                style={{
                  backgroundColor: isSelected ? 'var(--monarch-bg-page)' : 'transparent',
                }}
              >
                <div className="flex items-start gap-3">
                  <IconComponent className="w-5 h-5 mt-0.5 shrink-0" style={{ color: iconColor }} />
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                      {option.title}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                      {option.description}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                      {option.examples}
                    </div>
                  </div>
                  {isSelected && (
                    <Icons.Check
                      className="w-4 h-4 mt-0.5"
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
    <div>
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
          {selectedOption.icon === 'Gift' ? (
            <Icons.Gift className="w-4 h-4" style={{ color: '#60a5fa' }} />
          ) : (
            <Icons.PiggyBank className="w-4 h-4" style={{ color: '#a78bfa' }} />
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
