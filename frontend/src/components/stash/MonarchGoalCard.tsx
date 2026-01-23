/**
 * MonarchGoalCard - Card component for Monarch savings goals
 *
 * Displays a Monarch goal in a read-only card layout with:
 * - Image area at top (Monarch goal image or emoji)
 * - Goal name (clickable to open in Monarch)
 * - Status badge
 * - Target amount and date
 * - Progress bar with time-based marker
 *
 * Key differences from StashCard:
 * - Read-only (no edit button)
 * - Entire card clickable to open Monarch
 * - Uses Monarch's time-based status calculation
 * - Different progress bar visualization
 */

import { memo } from 'react';
import { Target } from 'lucide-react';
import type { MonarchGoal } from '../../types/monarchGoal';
import { Icons } from '../icons';
import { formatCurrency } from '../../utils';
import { MonarchGoalProgressBar } from './MonarchGoalProgressBar';

interface MonarchGoalCardProps {
  readonly goal: MonarchGoal;
  /** Drag handle props from dnd-kit (applied to image area) */
  readonly dragHandleProps?: Record<string, unknown> | undefined;
  /** Whether the card is currently being dragged */
  readonly isDragging?: boolean;
  /** Card size in grid units (for widget-style resizable cards) */
  readonly size?: { cols: number; rows: number };
  /** Whether to show the type badge (Goal vs Stash) - shown when mixed content */
  readonly showTypeBadge?: boolean;
}

/** Construct Monarch goal image URL from storage provider */
function getMonarchImageUrl(
  provider: string | null,
  providerId: string | null
): string | null {
  if (!provider || !providerId) return null;

  // Monarch uses Cloudinary for some goal images
  if (provider === 'cloudinary') {
    return `https://res.cloudinary.com/monarchmoney/image/upload/${providerId}`;
  }

  // Monarch uses Unsplash for goal images
  // For Unsplash, providerId is the full URL
  if (provider === 'unsplash') {
    return providerId;
  }

  // Unknown provider
  return null;
}

/** Format target date in short form (matching StashCard style) */
function formatTargetDateShort(targetDate: string | null): string {
  if (!targetDate) return '';

  const date = new Date(targetDate);
  const currentYear = new Date().getFullYear();
  const targetYear = date.getFullYear();

  return targetYear === currentYear
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} '${String(targetYear).slice(-2)}`;
}

/** Format goal description matching Stash card style */
function formatGoalDescription(
  targetAmount: number | null,
  targetDate: string | null
): string {
  if (!targetAmount && !targetDate) {
    return 'Save as you go';
  }

  if (!targetAmount) {
    return `Reach goal by ${formatTargetDateShort(targetDate)}`;
  }

  if (!targetDate) {
    return `Save ${formatCurrency(targetAmount, { maximumFractionDigits: 0 })}`;
  }

  const formattedTarget = formatCurrency(targetAmount, { maximumFractionDigits: 0 });
  const dateStr = formatTargetDateShort(targetDate);

  return `Save ${formattedTarget} by ${dateStr}`;
}

/** Status badge colors and labels */
const STATUS_CONFIG = {
  ahead: {
    label: 'Ahead',
    bg: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    icon: null,
  },
  on_track: {
    label: 'On track',
    bg: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    icon: null,
  },
  at_risk: {
    label: 'At risk',
    bg: 'rgba(251, 191, 36, 0.2)',
    color: '#fbbf24',
    icon: null,
  },
  completed: {
    label: 'Completed',
    bg: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    icon: 'check' as const,
  },
  no_target: {
    label: null,
    bg: null,
    color: null,
    icon: null,
  },
} as const;

/** Status badge component for Monarch goals */
function GoalStatusBadge({ status }: { readonly status: MonarchGoal['status'] }) {
  const config = STATUS_CONFIG[status];

  if (!config.label) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: '#fff',
        backdropFilter: 'blur(4px)',
        border: `1px solid ${config.color}`,
      }}
    >
      {config.icon === 'check' && <Icons.Check size={12} />}
      {config.label}
    </span>
  );
}

export const MonarchGoalCard = memo(function MonarchGoalCard({
  goal,
  dragHandleProps,
  isDragging,
  showTypeBadge = true,
}: MonarchGoalCardProps) {
  const imageUrl = getMonarchImageUrl(goal.imageStorageProvider, goal.imageStorageProviderId);
  const hasImage = Boolean(imageUrl);

  // Get current month abbreviation for label
  const currentMonthAbbr = new Date().toLocaleDateString('en-US', { month: 'short' });

  const openMonarchGoal = () => {
    window.open(`https://app.monarch.com/goals/savings/${goal.id}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`group rounded-xl border overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col ${isDragging ? 'opacity-50' : ''}`}
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
    >
      {/* Image Area - drag handle */}
      <div
        className="stash-card-image flex-1 min-h-28 flex items-center justify-center relative cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: 'var(--monarch-bg-hover)',
          userSelect: 'none',
          containerType: 'size',
        }}
        {...dragHandleProps}
      >
        {/* Image or emoji */}
        {hasImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={goal.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="flex items-center justify-center opacity-50"
            style={{ fontSize: 'min(50cqh, 96px)', lineHeight: 1 }}
          >
            💰
          </div>
        )}

        {/* Goal badge - top left (only shown when showTypeBadge is true) */}
        {showTypeBadge && (
          <div className="absolute top-2 left-2">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'var(--monarch-text-muted)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Target size={12} />
              Goal
            </span>
          </div>
        )}

        {/* Status badge - bottom right */}
        <div className="absolute bottom-2 right-2">
          <GoalStatusBadge status={goal.status} />
        </div>
      </div>

      {/* Content Area - clickable to open in Monarch */}
      <button
        onClick={openMonarchGoal}
        className="p-4 shrink-0 flex flex-col text-left w-full hover:bg-opacity-50 transition-colors"
        style={{ height: 140 }}
        aria-label={`Open ${goal.name} in Monarch Money`}
      >
        {/* Top row: Title and info */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left: Title and goal description */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <div className="mb-1 flex items-center gap-1.5">
              <h3
                className="text-base font-medium truncate hover:underline"
                style={{ color: 'var(--monarch-text-dark)' }}
                title={goal.name}
              >
                {goal.name}
              </h3>
              <Icons.ExternalLink size={14} className="shrink-0" style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
            {/* Goal description (matching Stash card style) */}
            <div
              className="flex items-center gap-1 text-sm"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <Target size={14} style={{ color: '#a78bfa' }} />
              <span>
                {formatGoalDescription(goal.targetAmount, goal.targetDate)}
              </span>
            </div>
          </div>

          {/* Right: Monthly contribution (read-only, styled like StashBudgetInput) */}
          <div className="shrink-0 flex flex-col items-end">
            <div
              className="flex items-center whitespace-nowrap rounded bg-monarch-bg-card border border-monarch-border px-2 py-1"
              aria-label="Planned monthly contribution"
            >
              <span className="font-medium text-monarch-text-dark">$</span>
              <span className="w-12 text-right font-medium text-monarch-text-dark">
                {Math.round(goal.plannedMonthlyContribution)}
              </span>
            </div>
            <span className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              budgeted in {currentMonthAbbr}.
            </span>
          </div>
        </div>

        {/* Progress bar - pushed to bottom */}
        <div className="mt-auto">
          <MonarchGoalProgressBar
            currentBalance={goal.currentBalance}
            netContribution={goal.netContribution}
            targetAmount={goal.targetAmount}
            progress={goal.progress}
            status={goal.status}
          />
        </div>
      </button>
    </div>
  );
});
