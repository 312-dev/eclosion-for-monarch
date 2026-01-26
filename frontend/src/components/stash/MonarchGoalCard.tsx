/* eslint-disable max-lines */
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
import { useDistributionModeType } from '../../context/DistributionModeContext';

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
function getMonarchImageUrl(provider: string | null, providerId: string | null): string | null {
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

/** Calculate required monthly contribution to reach goal by target date */
function calculateMonthlyTarget(
  currentBalance: number,
  targetAmount: number | null,
  targetDate: string | null
): number {
  if (!targetAmount || !targetDate) return 0;

  const now = new Date();
  const target = new Date(targetDate + 'T00:00:00');

  // Calculate months remaining (at least 1 to avoid division by zero)
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44; // Average days per month
  const monthsRemaining = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / msPerMonth));

  const remaining = Math.max(0, targetAmount - currentBalance);
  return Math.round(remaining / monthsRemaining);
}

/** Format target date in short form (matching StashCard style) */
function formatTargetDateShort(targetDate: string | null): string {
  if (!targetDate) return '';

  // Append T00:00:00 to interpret as local midnight, not UTC
  // Without this, '2026-06-01' becomes May 31st in western timezones
  const date = new Date(targetDate + 'T00:00:00');
  const currentYear = new Date().getFullYear();
  const targetYear = date.getFullYear();

  return targetYear === currentYear
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} '${String(targetYear).slice(-2)}`;
}

/** Format goal description matching Stash card style */
function formatGoalDescription(
  targetAmount: number | null,
  targetDate: string | null,
  includePrefix = false
): string {
  if (!targetAmount && !targetDate) {
    return 'Save as you go';
  }

  if (!targetAmount) {
    return `Reach goal by ${formatTargetDateShort(targetDate)}`;
  }

  const prefix = includePrefix ? 'Save ' : '';
  const formattedTarget = formatCurrency(targetAmount, { maximumFractionDigits: 0 });

  if (!targetDate) {
    return `${prefix}${formattedTarget}`;
  }

  const dateStr = formatTargetDateShort(targetDate);

  return `${prefix}${formattedTarget} by ${dateStr}`;
}

/** Status badge colors and labels - uses CSS variables for theme support */
const STATUS_CONFIG = {
  ahead: {
    label: 'Ahead',
    bg: 'var(--monarch-success-bg)',
    color: 'var(--monarch-success)',
    icon: null,
  },
  on_track: {
    label: 'On track',
    bg: 'var(--monarch-info-bg)',
    color: 'var(--monarch-info)',
    icon: null,
  },
  at_risk: {
    label: 'At risk',
    bg: 'var(--monarch-warning-bg)',
    color: 'var(--monarch-warning)',
    icon: null,
  },
  completed: {
    label: 'Completed',
    bg: 'var(--monarch-success-bg)',
    color: 'var(--monarch-success)',
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

/** Goal description text with responsive "Save" prefix */
function GoalDescriptionText({
  targetAmount,
  targetDate,
}: {
  readonly targetAmount: number | null;
  readonly targetDate: string | null;
}) {
  if (!targetAmount && !targetDate) {
    return <>Save as you go</>;
  }

  if (!targetAmount) {
    return <>Reach goal by {formatTargetDateShort(targetDate)}</>;
  }

  return (
    <>
      <span className="hidden @[140px]:inline">Save </span>
      {formatCurrency(targetAmount, { maximumFractionDigits: 0 })}
      {targetDate && ` by ${formatTargetDateShort(targetDate)}`}
    </>
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
  const distributionMode = useDistributionModeType();

  // Get current month abbreviation for label
  const currentMonthAbbr = new Date().toLocaleDateString('en-US', { month: 'short' });
  const isInDistributionMode = distributionMode !== null;

  const openMonarchGoal = () => {
    window.open(
      `https://app.monarch.com/goals/savings/${goal.id}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      className={`group rounded-xl border overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col relative ${isDragging ? 'opacity-50' : ''}`}
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
    >
      {/* Distribution mode overlay - covers entire card */}
      {isInDistributionMode && (
        <div
          className="group/overlay absolute inset-0 z-10 flex items-center justify-center cursor-not-allowed"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
        >
          <Icons.EditOff
            className="w-[50%] h-[50%] max-w-24 max-h-24 transition-opacity duration-200 group-hover/overlay:opacity-0"
            style={{ color: 'rgba(160, 160, 160, 1)' }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-center text-sm font-medium text-white/80 px-4 opacity-0 transition-opacity duration-200 group-hover/overlay:opacity-100">
            Monarch Goals can only be edited in Monarch Money
          </span>
        </div>
      )}
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
          <img src={imageUrl} alt={goal.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="flex items-center justify-center opacity-50"
            style={{ fontSize: 'min(50cqh, 96px)', lineHeight: 1 }}
          >
            💰
          </div>
        )}

        {/* Monarch Goal badge - top left (only shown when showTypeBadge is true) */}
        {showTypeBadge && (
          <div className="absolute top-2 left-2">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Target size={12} style={{ color: 'rgb(255, 105, 45)' }} />
              Monarch Goal
            </span>
          </div>
        )}

        {/* External link button - top right, shown on hover (links to Monarch) */}
        <a
          href={`https://app.monarch.com/goals/savings/${goal.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity icon-btn-hover"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          aria-label={`Open ${goal.name} in Monarch Money`}
          onClick={(e) => e.stopPropagation()}
        >
          <Icons.ExternalLink size={18} style={{ color: '#fff' }} />
        </a>

        {/* Status badge - bottom right */}
        <div className="absolute bottom-2 right-2">
          <GoalStatusBadge status={goal.status} />
        </div>
      </div>

      {/* Content Area - clickable to open in Monarch */}
      <button
        onClick={openMonarchGoal}
        className="px-4 pt-3 pb-4 shrink-0 flex flex-col text-left w-full hover:bg-opacity-50 transition-colors"
        style={{ height: 112 }}
        aria-label={`Open ${goal.name} in Monarch Money`}
      >
        {/* Top row: Title and info */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left: Title and goal description */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <div className="flex items-center gap-1.5 min-w-0">
              <h3
                className="text-base font-medium truncate hover:underline"
                style={{ color: 'var(--monarch-text-dark)' }}
                title={goal.name}
              >
                {goal.name}
              </h3>
              <Icons.ExternalLink
                size={14}
                className="shrink-0"
                style={{ color: 'var(--monarch-text-muted)' }}
              />
            </div>
            {/* Goal description (matching Stash card style) - "Save" hidden on narrow cards */}
            <div
              className="flex items-center gap-1 text-sm min-w-0"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <span className="shrink-0 inline-flex">
                <Icons.Calendar size={14} style={{ color: 'var(--monarch-text-muted)' }} />
              </span>
              <span
                className="truncate"
                title={formatGoalDescription(goal.targetAmount, goal.targetDate, true)}
              >
                <GoalDescriptionText
                  targetAmount={goal.targetAmount}
                  targetDate={goal.targetDate}
                />
              </span>
            </div>
          </div>

          {/* Right: Monthly contribution (read-only, styled like StashBudgetInput) */}
          {(() => {
            const monthlyTarget = calculateMonthlyTarget(
              goal.currentBalance,
              goal.targetAmount,
              goal.targetDate
            );
            const showTarget = goal.targetAmount !== null && goal.targetDate !== null;
            return (
              <div className="shrink-0 flex flex-col items-end">
                <div
                  className="flex items-center w-35 rounded bg-monarch-bg-card border border-monarch-border px-2 py-1"
                  aria-label="Planned monthly contribution"
                >
                  <span className="font-medium text-monarch-text-dark">$</span>
                  <span className="w-14 ml-auto inline-block text-right font-medium text-monarch-text-dark tabular-nums">
                    {Math.round(goal.plannedMonthlyContribution).toLocaleString('en-US')}
                  </span>
                  {showTarget && (
                    <span className="text-monarch-text-muted tabular-nums ml-1">
                      / {monthlyTarget.toLocaleString('en-US')}
                    </span>
                  )}
                </div>
                <span className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                  budgeted in {currentMonthAbbr}.
                </span>
              </div>
            );
          })()}
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
