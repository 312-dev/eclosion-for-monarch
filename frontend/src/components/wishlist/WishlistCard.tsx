/**
 * WishlistCard - Card component for wishlist items
 *
 * Displays a wishlist item in a card layout with:
 * - Image area at top (logo or custom image)
 * - Item name with emoji
 * - Goal amount and target date
 * - Progress bar with status
 * - Edit action
 */

import { memo, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { TbTargetArrow } from 'react-icons/tb';
import type { WishlistItem, ItemStatus } from '../../types';
import { SavingsProgressBar } from '../shared';
import { Icons } from '../icons';
import { formatCurrency, getStatusStyles } from '../../utils';
import { WishlistBudgetInput } from './WishlistBudgetInput';
import { WishlistItemImage } from './WishlistItemImage';

interface WishlistCardProps {
  readonly item: WishlistItem;
  readonly onEdit: (item: WishlistItem) => void;
  readonly onAllocate: (itemId: string, amount: number) => Promise<void>;
  readonly isAllocating?: boolean;
  /** Drag handle props from dnd-kit (applied to image area) */
  readonly dragHandleProps?: Record<string, unknown> | undefined;
  /** Whether the card is currently being dragged */
  readonly isDragging?: boolean;
  /** Card size in grid units (for widget-style resizable cards) */
  readonly size?: { cols: number; rows: number };
  /** Whether this is the first card (for tour targeting) */
  readonly isFirstCard?: boolean;
}

/** Format archived date in short form (e.g., "Jan 20" or "Jan 20 '25") */
function formatArchivedDateShort(archivedAt: string | null | undefined): string {
  if (!archivedAt) return '';
  const date = new Date(archivedAt);
  const currentYear = new Date().getFullYear();
  const archivedYear = date.getFullYear();
  if (archivedYear === currentYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} '${String(archivedYear).slice(-2)}`;
}

/** Status badge component */
function StatusBadge({
  status,
  isArchived,
  archivedAt,
}: {
  readonly status: ItemStatus;
  readonly isArchived?: boolean;
  readonly archivedAt?: string | null | undefined;
}) {
  const styles = getStatusStyles(status, true);
  const labels: Record<ItemStatus, string> = {
    funded: 'Funded',
    ahead: 'Ahead',
    on_track: 'On Track',
    behind: 'Behind',
    due_now: 'Due Now',
    inactive: 'Inactive',
    disabled: 'Disabled',
    critical: 'Critical',
  };

  if (isArchived) {
    const dateStr = formatArchivedDateShort(archivedAt);
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
        style={{
          background: '#374151',
          color: '#9ca3af',
        }}
      >
        Archived{dateStr ? ` ${dateStr}` : ''}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{
        // Layer status bg over solid black to ensure opacity
        background: `linear-gradient(${styles.bg}, ${styles.bg}), #000`,
        color: styles.color,
      }}
    >
      {labels[status]}
    </span>
  );
}

export const WishlistCard = memo(function WishlistCard({
  item,
  onEdit,
  onAllocate,
  isAllocating = false,
  dragHandleProps,
  isFirstCard = false,
}: WishlistCardProps) {
  const progressPercent = Math.min(item.progress_percent, 100);
  const displayStatus: ItemStatus = item.status;

  // Format target date
  const targetDate = new Date(item.target_date);
  const currentYear = new Date().getFullYear();
  const targetYear = targetDate.getFullYear();
  const dateDisplay =
    targetYear === currentYear
      ? targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} '${String(targetYear).slice(-2)}`;

  // Calculate days remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(item.target_date);
  target.setHours(0, 0, 0, 0);
  const daysRemaining = Math.max(
    0,
    Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Get current month abbreviation for budget label
  const currentMonthAbbr = new Date().toLocaleDateString('en-US', { month: 'short' });

  // Check if item has any image source
  const hasImage = Boolean(item.custom_image_path || item.logo_url);

  // Calculate rollover for progress bar tooltip
  const rolloverAmount = Math.max(0, item.current_balance - item.planned_budget);
  const budgetedThisMonth = item.planned_budget;

  // Handle double-click to open edit modal (unless clicking on a text field)
  const handleDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Don't trigger if clicking on input, textarea, or elements with contenteditable
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable="true"]')
      ) {
        return;
      }
      onEdit(item);
    },
    [onEdit, item]
  );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- double-click is supplementary; Edit button provides accessible interaction
    <div
      className="group rounded-xl border overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Image Area - drag handle (fills remaining space after content) */}
      {}
      <div
        className="wishlist-card-image flex-1 min-h-28 flex items-center justify-center relative group cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: 'var(--monarch-bg-hover)',
          userSelect: 'none',
          containerType: 'size',
        }}
        {...dragHandleProps}
      >
        <WishlistItemImage
          customImagePath={item.custom_image_path}
          logoUrl={item.logo_url}
          emoji={item.emoji}
          alt={item.name}
          className={hasImage ? 'w-full h-full object-cover' : 'opacity-50'}
        />

        {/* Price badge - top left */}
        <div className="absolute top-2 left-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-base font-bold"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'white' }}
          >
            <TbTargetArrow size={16} />
            {formatCurrency(item.amount, { maximumFractionDigits: 0 })}
          </span>
        </div>

        {/* Status badge - bottom right */}
        <div className="absolute bottom-2 right-2">
          <StatusBadge
            status={displayStatus}
            isArchived={item.is_archived}
            archivedAt={item.archived_at}
          />
        </div>
      </div>

      {/* Content Area - fixed max height, image fills the rest */}
      <div className="p-4 shrink-0 flex flex-col" style={{ maxHeight: 140 }}>
        {/* Top row: Title + info on left, budget input on right */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left side: Title and date */}
          <div className="min-w-0 flex-1">
            {/* Title with edit icon */}
            <div className="flex items-center gap-1.5 mb-1">
              {item.source_url ? (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium truncate hover:underline"
                  style={{ color: 'var(--monarch-text-dark)' }}
                  title={item.name}
                >
                  {hasImage && <span className="mr-1.5">{item.emoji || '🎯'}</span>}
                  {item.name}
                </a>
              ) : (
                <h3
                  className="font-medium truncate"
                  style={{ color: 'var(--monarch-text-dark)' }}
                  title={item.name}
                >
                  {hasImage && <span className="mr-1.5">{item.emoji || '🎯'}</span>}
                  {item.name}
                </h3>
              )}
              {!item.is_archived && (
                <button
                  data-tour={isFirstCard ? 'wishlist-edit-item' : undefined}
                  onClick={() => onEdit(item)}
                  className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
                  aria-label="Edit item"
                >
                  <Icons.Edit size={12} style={{ color: 'var(--monarch-text-muted)' }} />
                </button>
              )}
            </div>
            {/* Target date */}
            <div
              className="flex items-center gap-1 text-sm"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <Icons.Calendar size={14} />
              <span>{dateDisplay}</span>
              {!item.is_archived && daysRemaining > 0 && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  (in {daysRemaining} days)
                </span>
              )}
            </div>
          </div>

          {/* Right side: Budget input (hidden for archived items) */}
          {!item.is_archived && (
            <div className="shrink-0 flex flex-col items-end">
              <WishlistBudgetInput
                plannedBudget={item.planned_budget}
                monthlyTarget={item.monthly_target}
                onAllocate={(amount) => onAllocate(item.id, amount)}
                isAllocating={isAllocating}
              />
              <span className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                budgeted in {currentMonthAbbr}.
              </span>
            </div>
          )}
        </div>

        {/* Progress bar or restore button */}
        {item.is_archived ? (
          <button
            onClick={() => onEdit(item)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md btn-press"
            style={{
              backgroundColor: 'var(--monarch-bg-hover)',
              color: 'var(--monarch-text-muted)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <Icons.Rotate size={14} />
            Restore
          </button>
        ) : (
          <SavingsProgressBar
            totalSaved={item.current_balance}
            targetAmount={item.amount}
            progressPercent={progressPercent}
            displayStatus={displayStatus}
            isEnabled={true}
            rolloverAmount={rolloverAmount}
            budgetedThisMonth={budgetedThisMonth}
          />
        )}
      </div>
    </div>
  );
});
