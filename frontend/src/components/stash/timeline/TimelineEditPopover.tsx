/* eslint-disable max-lines */
/** TimelineEditPopover - Popover for creating/editing timeline events */

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check } from 'lucide-react';
import type { NamedEvent, NamedEventType, TimelineItemConfig } from '../../../types/timeline';
import { Z_INDEX } from '../../../constants';
import { createArrowKeyHandler } from '../../../hooks/useArrowKeyIncrement';

const POPOVER_WIDTH = 288;
const POPOVER_HEIGHT = 450;

const inputStyle = {
  backgroundColor: 'var(--monarch-bg-page)',
  border: '1px solid var(--monarch-border)',
  color: 'var(--monarch-text-dark)',
};
const labelClass = 'block text-xs font-medium mb-1';
const inputClass =
  'w-full px-3 py-1.5 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-monarch-text-muted';

/** Custom dropdown for stash item selection with color dots */
interface StashItemDropdownProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly itemConfigs: TimelineItemConfig[];
}

function StashItemDropdown({ id, value, onChange, itemConfigs }: StashItemDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItem = itemConfigs.find((c) => c.itemId === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const currentIndex = itemConfigs.findIndex((c) => c.itemId === value);
      const nextIndex = (currentIndex + 1) % itemConfigs.length;
      onChange(itemConfigs[nextIndex]?.itemId ?? value);
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      const currentIndex = itemConfigs.findIndex((c) => c.itemId === value);
      const prevIndex = currentIndex <= 0 ? itemConfigs.length - 1 : currentIndex - 1;
      onChange(itemConfigs[prevIndex]?.itemId ?? value);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
        style={inputStyle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedItem && (
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedItem.color }}
            />
          )}
          <span className="truncate">{selectedItem?.name ?? 'Select item'}</span>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--monarch-text-muted)' }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute z-10 w-full mt-1 py-1 rounded-md shadow-lg max-h-48 overflow-y-auto"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {itemConfigs.map((config) => (
            <button
              key={config.itemId}
              type="button"
              aria-pressed={config.itemId === value}
              onClick={() => {
                onChange(config.itemId);
                setIsOpen(false);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-sm transition-colors hover:bg-(--monarch-bg-hover)"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: config.color }}
              />
              <span className="truncate flex-1">{config.name}</span>
              {config.itemId === value && (
                <Check size={14} style={{ color: 'var(--monarch-success)' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface TimelineEditPopoverProps {
  readonly event: NamedEvent | null;
  readonly initialDate: string;
  readonly itemConfigs: TimelineItemConfig[];
  readonly onSave: (eventData: Omit<NamedEvent, 'id' | 'createdAt'>) => void;
  readonly onClose: () => void;
  readonly onDelete?: (eventId: string) => void;
  readonly anchorRef?: React.RefObject<HTMLElement | null>;
  readonly clickPosition?: { x: number; y: number } | null;
}

export function TimelineEditPopover({
  event,
  initialDate,
  itemConfigs,
  onSave,
  onClose,
  onDelete,
  anchorRef,
  clickPosition,
}: TimelineEditPopoverProps) {
  const isEditing = event !== null;
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const [name, setName] = useState(event?.name ?? '');
  const [type, setType] = useState<NamedEventType>(event?.type ?? 'deposit');
  const [itemId, setItemId] = useState(event?.itemId ?? itemConfigs[0]?.itemId ?? '');
  const [amount, setAmount] = useState(event?.amount?.toString() ?? '');
  const [date, setDate] = useState(event?.date ?? initialDate);
  const [error, setError] = useState<string | null>(null);
  const minDate = new Date().toISOString().slice(0, 7);

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentValue = Number.parseInt(amount, 10) || 0;
    const arrowHandler = createArrowKeyHandler({
      value: currentValue,
      onChange: (newValue) => {
        setAmount(newValue === 0 ? '' : String(newValue));
      },
      step: 1,
      min: 0,
    });
    arrowHandler(e);
  };

  const [position, setPosition] = useState<{ top: number; left?: number; right?: number } | null>(
    null
  );

  useEffect(() => {
    const computePos = () => {
      if (clickPosition) {
        const { x, y } = clickPosition;
        const spaceOnRight = window.innerWidth - x;
        const showOnRight = spaceOnRight >= POPOVER_WIDTH + 16;
        const spaceBelow = window.innerHeight - y;
        const top = spaceBelow >= POPOVER_HEIGHT + 16 ? y : Math.max(16, y - POPOVER_HEIGHT);
        return showOnRight
          ? { top, left: x + 16 }
          : { top, left: Math.max(16, x - POPOVER_WIDTH - 16) };
      }
      if (anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        return { top: rect.bottom + 8, right: window.innerWidth - rect.right };
      }
      return null;
    };

    setPosition(computePos());

    if (clickPosition || !anchorRef?.current) return;
    const updatePosition = () => setPosition(computePos());
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, clickPosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (anchorRef?.current?.contains(e.target as Node)) return;
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, anchorRef]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!name.trim()) {
        setError('Event name is required');
        return;
      }
      if (!itemId) {
        setError('Please select a stash item');
        return;
      }
      const parsedAmount = Number.parseInt(amount, 10);
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        setError('Please enter a valid amount');
        return;
      }
      if (!date) {
        setError('Please select a date');
        return;
      }
      onSave({ name: name.trim(), type, itemId, amount: parsedAmount, date });
    },
    [name, type, itemId, amount, date, onSave]
  );

  const shouldPortal = clickPosition || anchorRef;

  const popoverContent = (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Portal-based dialog requires div
    <div
      ref={containerRef}
      id={popoverId}
      role="dialog"
      aria-label={isEditing ? 'Edit event' : 'Create event'}
      className="rounded-lg shadow-lg min-w-72 overflow-hidden"
      style={{
        position: shouldPortal ? 'fixed' : 'absolute',
        top: position?.top ?? 'auto',
        left: position?.left,
        right: position?.right,
        ...(shouldPortal ? {} : { top: '100%', marginTop: 8, right: 0 }),
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        zIndex: Z_INDEX.MODAL,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ backgroundColor: 'var(--monarch-bg-page)', borderColor: 'var(--monarch-border)' }}
      >
        <span className="font-medium text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
          {isEditing ? 'Edit Event' : 'Create Event'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:bg-black/5 transition-colors"
          aria-label="Close"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
        <div>
          <label
            htmlFor={`${popoverId}-name`}
            className={labelClass}
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Event Name
          </label>
          <input
            id={`${popoverId}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tax Refund, Bonus"
            className={inputClass}
            style={inputStyle}
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor={`${popoverId}-type`}
            className={labelClass}
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Event Type
          </label>
          <select
            id={`${popoverId}-type`}
            value={type}
            onChange={(e) => setType(e.target.value as NamedEventType)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="deposit">One-time Deposit</option>
            <option value="rate_change">Rate Change</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={`${popoverId}-item`}
            className={labelClass}
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Stash Item
          </label>
          <StashItemDropdown
            id={`${popoverId}-item`}
            value={itemId}
            onChange={setItemId}
            itemConfigs={itemConfigs}
          />
        </div>

        <div>
          <label
            htmlFor={`${popoverId}-amount`}
            className={labelClass}
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {type === 'deposit' ? 'Deposit Amount' : 'New Monthly Rate'}
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              $
            </span>
            <input
              id={`${popoverId}-amount`}
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replaceAll(/\D/g, ''))}
              onKeyDown={handleAmountKeyDown}
              placeholder="0"
              className="w-full pl-7 pr-3 py-1.5 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-monarch-text-muted"
              style={inputStyle}
            />
            {type === 'rate_change' && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                /mo
              </span>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor={`${popoverId}-date`}
            className={labelClass}
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Date
          </label>
          <input
            id={`${popoverId}-date`}
            type="month"
            value={date}
            min={minDate}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {error && (
          <div
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--monarch-error-bg, #fef2f2)',
              color: 'var(--monarch-error, #dc2626)',
            }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {/* Delete button - only show when editing */}
          {isEditing && onDelete && event && (
            <button
              type="button"
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors hover:bg-red-100"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--monarch-error, #dc2626)',
                border: '1px solid var(--monarch-error, #dc2626)',
              }}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              color: 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--hypothesize-accent, #8b5cf6)', color: 'white' }}
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );

  return shouldPortal ? createPortal(popoverContent, document.body) : popoverContent;
}
