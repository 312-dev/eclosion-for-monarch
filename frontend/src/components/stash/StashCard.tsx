/* eslint-disable max-lines */
/**
 * StashCard - Card component for stash items
 *
 * Displays a stash in a card layout with:
 * - Image area at top (logo or custom image)
 * - Item name with emoji
 * - Goal amount and target date
 * - Progress bar with status
 * - Edit action
 */

import { memo } from 'react';
import type { StashItem, ItemStatus } from '../../types';
import { SavingsProgressBar } from '../shared';
import { Icons } from '../icons';
import { formatCurrency, getStatusStyles } from '../../utils';
import { parseLocalDate } from '../../utils/savingsCalculations';
import { StashBudgetInput } from './StashBudgetInput';
import { StashItemImage } from './StashItemImage';
import { StashTitleDropdown } from './StashTitleDropdown';
import { CardAllocationInput } from './CardAllocationInput';
import { useDistributionModeType } from '../../context/DistributionModeContext';
import { useProjectedStashItem } from '../../hooks';

interface StashCardProps {
  readonly item: StashItem;
  readonly onEdit: (item: StashItem) => void;
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
  /** Callback to view report for this stash */
  readonly onViewReport?: (stashId: string) => void;
  /** Whether to show the type badge (Stash vs Goal) - shown when mixed content */
  readonly showTypeBadge?: boolean;
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
  completedAt,
}: {
  readonly status: ItemStatus;
  readonly isArchived?: boolean;
  readonly archivedAt?: string | null | undefined;
  readonly completedAt?: string | null | undefined;
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

  // Completed items (one-time purchases that were marked as done)
  if (completedAt) {
    const dateStr = formatArchivedDateShort(completedAt);
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
        style={{
          background: 'var(--monarch-success-bg)',
          color: 'var(--monarch-success)',
        }}
      >
        <Icons.Check size={12} />
        Completed{dateStr ? ` ${dateStr}` : ''}
      </span>
    );
  }

  if (isArchived) {
    const dateStr = formatArchivedDateShort(archivedAt);
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
        style={{
          background: 'var(--monarch-bg-elevated)',
          color: 'var(--monarch-text-muted)',
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

export const StashCard = memo(function StashCard({
  item,
  onEdit,
  onAllocate,
  isAllocating = false,
  dragHandleProps,
  isFirstCard = false,
  onViewReport,
  showTypeBadge = true,
}: StashCardProps) {
  const distributionMode = useDistributionModeType();
  const isInDistributionMode = distributionMode !== null;
  const isHypothesizeMode = distributionMode === 'hypothesize';

  // Get projected values in hypothesize mode (reverts to actual when mode exits)
  const projectedItem = useProjectedStashItem(item);
  const displayStatus: ItemStatus = projectedItem.status;

  // Format target date (parseLocalDate avoids timezone shift bugs with ISO dates)
  // Handle null/undefined target_date defensively
  const currentYear = new Date().getFullYear();
  const dateDisplay = item.target_date
    ? (() => {
        const targetDate = parseLocalDate(item.target_date);
        const targetYear = targetDate.getFullYear();
        return targetYear === currentYear
          ? targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : `${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} '${String(targetYear).slice(-2)}`;
      })()
    : 'No date set';

  // Get current month abbreviation for budget label
  const currentMonthAbbr = new Date().toLocaleDateString('en-US', { month: 'short' });

  // Check if item has any image source
  const hasImage = Boolean(item.custom_image_path || item.logo_url);

  // Calculate rollover for progress bar tooltip
  // Use actual rollover from Monarch, falling back to calculated value for backwards compatibility
  const rolloverAmount =
    item.rollover_amount ?? Math.max(0, item.current_balance - item.planned_budget);
  const budgetedThisMonth = item.planned_budget;
  const creditsThisMonth = item.credits_this_month ?? 0;

  // For flex categories, progress bar should be based on total contributions (saved),
  // not remaining balance. This matches purchase goal behavior where progress is immune to spending.
  const totalContributions = rolloverAmount + budgetedThisMonth + creditsThisMonth;

  // Use projected values in hypothesize mode for visual preview
  // When not in hypothesize mode or when exiting, projectedItem equals item (no projection)
  const displayBalance = projectedItem.current_balance;

  // Calculate progress percent based on mode and item type
  const getProgressPercent = (): number => {
    // In hypothesize mode with active projection, use projected progress
    if (isHypothesizeMode && projectedItem.isProjected) {
      return projectedItem.progress_percent;
    }
    // For flex categories, calculate from total contributions
    if (item.is_flexible_group) {
      return Math.min(100, item.amount > 0 ? (totalContributions / item.amount) * 100 : 0);
    }
    // Default: use item's progress percent
    return Math.min(item.progress_percent, 100);
  };
  const progressPercent = getProgressPercent();

  return (
    <div
      className="group rounded-xl border overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
    >
      {/* Image Area - drag handle (fills remaining space after content) */}
      {}
      <div
        className="stash-card-image flex-1 min-h-28 flex items-center justify-center relative group cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: 'var(--monarch-bg-hover)',
          userSelect: 'none',
          containerType: 'size',
        }}
        {...(isInDistributionMode ? {} : dragHandleProps)}
      >
        <StashItemImage
          customImagePath={item.custom_image_path}
          logoUrl={item.logo_url}
          emoji={item.emoji}
          alt={item.name}
          className={hasImage ? 'w-full h-full object-cover' : 'opacity-50'}
        />

        {/* Distribution mode overlay */}
        {isInDistributionMode && !item.is_archived && (
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity"
            style={{
              backgroundColor:
                distributionMode === 'distribute'
                  ? 'rgba(20, 120, 60, 0.92)' // Green overlay (darker)
                  : 'rgba(40, 10, 70, 0.95)', // Purple overlay (much darker)
            }}
          >
            <CardAllocationInput itemId={item.id} itemName={item.name} />
          </div>
        )}

        {/* Goal type badge - top left (only shown when showTypeBadge is true and not in distribution mode) */}
        {!isInDistributionMode &&
          showTypeBadge &&
          (() => {
            const badgeConfig = {
              one_time: {
                icon: Icons.BadgeDollarSign,
                color: 'var(--monarch-info)',
                label: 'Purchase',
              },
              debt: { icon: Icons.HandCoins, color: 'var(--monarch-warning)', label: 'Debt' },
              savings_buffer: {
                icon: Icons.PiggyBank,
                color: 'var(--monarch-accent)',
                label: 'Savings Fund',
              },
            } as const;
            const config = badgeConfig[item.goal_type ?? 'one_time'];
            const BadgeIcon = config.icon;
            return (
              <div className="absolute top-2 left-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <BadgeIcon size={12} style={{ color: config.color }} />
                  {config.label}
                </span>
              </div>
            );
          })()}

        {/* Edit button - top right, shown on hover (hidden in distribution mode) */}
        {!isInDistributionMode && !item.is_archived && (
          <button
            data-tour={isFirstCard ? 'stash-edit-item' : undefined}
            onClick={() => onEdit(item)}
            className="absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity icon-btn-hover"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
            }}
            aria-label="Edit item"
          >
            <Icons.Edit size={18} style={{ color: '#fff' }} />
          </button>
        )}

        {/* Status badge - bottom right (hidden in distribution mode) */}
        {!isInDistributionMode && (
          <div className="absolute bottom-2 right-2">
            <StatusBadge
              status={displayStatus}
              isArchived={item.is_archived}
              archivedAt={item.archived_at}
              completedAt={item.completed_at}
            />
          </div>
        )}
      </div>

      {/* Content Area - fixed height for consistency */}
      <div className="px-4 pt-3 pb-4 shrink-0 flex flex-col" style={{ height: 112 }}>
        {/* Top row: Title + info on left, budget input on right */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left side: Title and date */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <div className="flex items-center gap-1.5 min-w-0">
              {onViewReport ? (
                <StashTitleDropdown
                  stashName={item.name}
                  categoryId={item.category_id}
                  onViewReport={() => onViewReport(item.id)}
                >
                  {item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium truncate hover:underline"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      title={item.name}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasImage && <span className="mr-1.5">{item.emoji || '🎯'}</span>}
                      {item.name}
                    </a>
                  ) : (
                    <h3
                      className="text-base font-medium truncate"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      title={item.name}
                    >
                      {hasImage && <span className="mr-1.5">{item.emoji || '🎯'}</span>}
                      {item.name}
                    </h3>
                  )}
                </StashTitleDropdown>
              ) : (
                <>
                  {item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium truncate hover:underline"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      title={item.name}
                    >
                      {hasImage && <span className="mr-1.5">{item.emoji || '🎯'}</span>}
                      {item.name}
                    </a>
                  ) : (
                    <h3
                      className="text-base font-medium truncate"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      title={item.name}
                    >
                      {hasImage && <span className="mr-1.5">{item.emoji || '🎯'}</span>}
                      {item.name}
                    </h3>
                  )}
                </>
              )}
            </div>
            {/* Goal amount and target date - "Save"/"Store"/"Pay off" hidden on narrow cards */}
            {(() => {
              const goalTypeConfig = {
                one_time: { verb: 'Save' },
                debt: { verb: 'Pay off' },
                savings_buffer: { verb: 'Store' },
              } as const;
              const config = goalTypeConfig[item.goal_type ?? 'one_time'];
              return (
                <div
                  className="flex items-center gap-1 text-sm min-w-0"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  <span className="shrink-0 inline-flex">
                    <Icons.Calendar size={14} style={{ color: 'var(--monarch-text-muted)' }} />
                  </span>
                  <span
                    className="truncate"
                    title={`${config.verb} ${formatCurrency(item.amount, { maximumFractionDigits: 0 })} by ${dateDisplay}`}
                  >
                    <span className="hidden @[140px]:inline">{config.verb} </span>
                    {formatCurrency(item.amount, { maximumFractionDigits: 0 })} by {dateDisplay}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Right side: Budget input (hidden for archived items) */}
          {!item.is_archived && (
            <div className="shrink-0 flex flex-col items-end">
              <StashBudgetInput
                itemId={item.id}
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

        {/* Progress bar or restore button - pushed to bottom */}
        <div className="mt-auto">
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
              totalSaved={displayBalance}
              targetAmount={item.amount}
              progressPercent={progressPercent}
              displayStatus={displayStatus}
              isEnabled={true}
              rolloverAmount={rolloverAmount}
              budgetedThisMonth={budgetedThisMonth}
              creditsThisMonth={creditsThisMonth}
              // Flex categories behave like savings_buffer (spending reduces balance)
              goalType={item.is_flexible_group ? 'savings_buffer' : item.goal_type}
              {...(item.available_to_spend !== undefined && {
                availableToSpend: item.available_to_spend,
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
});
