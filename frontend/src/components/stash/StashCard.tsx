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
 * - Withdraw/Deposit overlay on hover
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { StashItem, ItemStatus, StashData } from '../../types';
import { SavingsProgressBar } from '../shared';
import { Icons } from '../icons';
import { formatCurrency, getStatusStyles } from '../../utils';
import { parseLocalDate, calculateExpectedProgress } from '../../utils/savingsCalculations';
import { StashBudgetInput } from './StashBudgetInput';
import { StashItemImage } from './StashItemImage';
import { StashTitleDropdown } from './StashTitleDropdown';
import { TakeStashOverlay } from './WithdrawDepositOverlay';
import { motion, AnimatePresence, TIMING } from '../motion';
import { AnimatedEmoji } from '../ui';
// Note: CardAllocationInput is no longer used - replaced by TakeStashOverlay
import {
  useDistributionModeType,
  useDistributionMode,
} from '../../context/DistributionModeContext';
import {
  TOUR_SHOW_OVERLAY_EVENT,
  TOUR_SHOW_EDIT_BUTTON_EVENT,
  TOUR_HIDE_ALL_EVENT,
} from '../layout/stashTourSteps';
import { useProjectedStashItem } from '../../hooks';
import {
  useAvailableToStash,
  useStashConfigQuery,
  useUpdateCategoryRolloverMutation,
  useUpdateGroupRolloverMutation,
  useAllocateStashMutation,
  useDashboardQuery,
  getQueryKey,
  queryKeys,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useDemo } from '../../context/DemoContext';

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

// eslint-disable-next-line sonarjs/cognitive-complexity -- Card component with multiple interactive states requires this complexity
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
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const distributionMode = useDistributionModeType();
  const isInDistributionMode = distributionMode !== null;
  const isHypothesizeMode = distributionMode === 'hypothesize';

  // Hover state for withdraw/deposit overlay
  const [showOverlay, setShowOverlay] = useState(false);

  // Track mouse and focus state separately - overlay closes only when both leave
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [isFocusInside, setIsFocusInside] = useState(false);

  // Tour-forced UI states (show overlay/edit during guided tour)
  const [tourShowOverlay, setTourShowOverlay] = useState(false);
  const [tourShowEditButton, setTourShowEditButton] = useState(false);

  // Card-level hover state for animated emoji
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Listen for tour events to show overlay/edit button (only on first card)
  useEffect(() => {
    if (!isFirstCard) return;

    const handleShowOverlay = () => {
      setTourShowOverlay(true);
      setShowOverlay(true);
    };
    const handleShowEditButton = () => {
      setTourShowEditButton(true);
    };
    const handleHideAll = () => {
      setTourShowOverlay(false);
      setTourShowEditButton(false);
      // Don't force-close overlay if mouse/focus is inside
      if (!isMouseInside && !isFocusInside) {
        setShowOverlay(false);
      }
    };

    globalThis.addEventListener(TOUR_SHOW_OVERLAY_EVENT, handleShowOverlay);
    globalThis.addEventListener(TOUR_SHOW_EDIT_BUTTON_EVENT, handleShowEditButton);
    globalThis.addEventListener(TOUR_HIDE_ALL_EVENT, handleHideAll);

    return () => {
      globalThis.removeEventListener(TOUR_SHOW_OVERLAY_EVENT, handleShowOverlay);
      globalThis.removeEventListener(TOUR_SHOW_EDIT_BUTTON_EVENT, handleShowEditButton);
      globalThis.removeEventListener(TOUR_HIDE_ALL_EVENT, handleHideAll);
    };
  }, [isFirstCard, isMouseInside, isFocusInside]);

  // Track Take mode state for budget input highlighting
  const [isTakeModeActive, setIsTakeModeActive] = useState(false);
  const [isDippingIntoBudget, setIsDippingIntoBudget] = useState(false);

  // Track additional budget from Stash mode (drawing from Left to Budget)
  const [additionalBudgetFromStash, setAdditionalBudgetFromStash] = useState(0);
  const [isStashOverLimit, setIsStashOverLimit] = useState(false);

  // Track if overlay input has a value (to keep overlay open)
  const [hasInputValue, setHasInputValue] = useState(false);

  // Handle Take mode state changes from overlay
  const handleTakeModeChange = useCallback((isTakeMode: boolean, dippingIntoBudget: boolean) => {
    setIsTakeModeActive(isTakeMode);
    setIsDippingIntoBudget(dippingIntoBudget);
  }, []);

  // Handle Stash mode budget changes from overlay
  const handleStashBudgetChange = useCallback((additionalBudget: number, overLimit: boolean) => {
    setAdditionalBudgetFromStash(additionalBudget);
    setIsStashOverLimit(overLimit);
  }, []);

  // Handle input value changes from overlay
  const handleInputValueChange = useCallback((hasValue: boolean) => {
    setHasInputValue(hasValue);
  }, []);

  // Get distribution mode context for tracking allocations
  const {
    totalStashedAllocated,
    startingStashTotal,
    stashedAllocations,
    setStashedAllocation,
    monthlyAllocations,
    setMonthlyAllocation,
  } = useDistributionMode();

  // Get available to stash data for deposit calculation
  const { data: config } = useStashConfigQuery();
  const { data: availableData } = useAvailableToStash({
    includeExpectedIncome: config?.includeExpectedIncome ?? false,
    bufferAmount: config?.bufferAmount ?? 0,
  });

  // Get dashboard data for Left to Budget (same source as AvailableFundsBar)
  const { data: dashboardData } = useDashboardQuery();

  // Mutations for updating rollover and budget
  const updateCategoryRollover = useUpdateCategoryRolloverMutation();
  const updateGroupRollover = useUpdateGroupRolloverMutation();
  const allocateStash = useAllocateStashMutation();

  // Calculate withdraw available (rollover + budget = total balance available to take)
  const rolloverAmount = item.rollover_amount ?? 0;
  const budgetAmount = item.planned_budget ?? 0;
  const withdrawAvailable = rolloverAmount + budgetAmount;

  // Calculate deposit available (Available to Stash pool minus already allocated in this session)
  // Only subtract delta when in distribution mode (matches AvailableFundsBar logic)
  const baseAvailable = availableData?.available ?? 0;
  const stashAllocationDelta = totalStashedAllocated - startingStashTotal;
  const depositAvailable = isInDistributionMode
    ? Math.max(0, baseAvailable - stashAllocationDelta)
    : baseAvailable;

  // Left to Budget allows stashing beyond Cash to Stash
  // Use dashboard data (same source as AvailableFundsBar) for accurate real-time value
  const leftToBudget = dashboardData?.ready_to_assign?.ready_to_assign ?? 0;

  // Helper to get fresh stash item values from React Query cache
  // This prevents stale closure issues during rapid operations
  const getFreshStashItem = useCallback(() => {
    const stashKey = getQueryKey(queryKeys.stash, isDemo);
    const stashData = queryClient.getQueryData<StashData>(stashKey);
    return stashData?.items.find((i) => i.id === item.id);
  }, [queryClient, isDemo, item.id]);

  // Handle withdraw action - draws from rollover first, then budget
  const handleWithdraw = useCallback(
    async (amount: number) => {
      // Validate inputs with specific error messages
      if (isRateLimited) {
        toast.error('Cannot withdraw: rate limited');
        return;
      }
      if (amount <= 0) {
        toast.error('Enter an amount to withdraw');
        return;
      }
      if (amount > withdrawAvailable) {
        toast.error(
          `Cannot withdraw more than available (${formatCurrency(withdrawAvailable, { maximumFractionDigits: 0 })})`
        );
        return;
      }

      // CRITICAL: Read fresh values from cache to avoid stale closure issues
      // During rapid operations, the closure's rolloverAmount/budgetAmount may be stale
      // but the cache is updated by each mutation's onMutate handler
      const freshItem = getFreshStashItem();
      const freshRollover = freshItem?.rollover_amount ?? 0;
      const freshBudget = freshItem?.planned_budget ?? 0;

      const currentAllocation = stashedAllocations[item.id] ?? item.current_balance;
      const newAllocation = currentAllocation - amount;

      // Calculate how much comes from rollover vs budget using FRESH values
      const fromRollover = Math.min(amount, freshRollover);
      const fromBudget = amount - fromRollover;

      // Optimistic update - update context immediately for UI feedback
      setStashedAllocation(item.id, newAllocation);

      // Build toast message
      const currencyOpts = { maximumFractionDigits: 0 };
      const buildToastMessage = () => {
        if (fromRollover > 0 && fromBudget > 0) {
          return `Took ${formatCurrency(fromRollover, currencyOpts)} from ${item.name}'s stashed cash, plus ${formatCurrency(fromBudget, currencyOpts)} from monthly budget`;
        } else if (fromRollover > 0) {
          return `Took ${formatCurrency(fromRollover, currencyOpts)} from ${item.name}'s stashed cash`;
        } else {
          return `Took ${formatCurrency(fromBudget, currencyOpts)} from ${item.name}'s monthly budget`;
        }
      };

      // In hypothesize mode, no API call needed - just update local projection
      if (isHypothesizeMode) {
        // Track the budget portion as reducing monthly allocation (mirrors real mode behavior)
        // This returns that portion back to Left to Budget
        if (fromBudget > 0) {
          const currentMonthlyAllocation = monthlyAllocations[item.id] ?? 0;
          // Reduce by fromBudget (context clamps to 0 minimum)
          setMonthlyAllocation(item.id, currentMonthlyAllocation - fromBudget);
        }
        toast.success(`Projected: ${buildToastMessage()}`);
        return;
      }

      // Show success toast immediately (optimistic)
      toast.success(buildToastMessage());

      // Error handler to revert optimistic update
      const onError = () => {
        setStashedAllocation(item.id, currentAllocation);
        toast.error('Failed to withdraw funds');
      };

      // Fire mutations (don't await - optimistic updates handle UI)
      // Reduce rollover if needed
      if (fromRollover > 0) {
        if (item.is_flexible_group && item.category_group_id) {
          updateGroupRollover.mutate(
            { groupId: item.category_group_id, amount: -fromRollover },
            { onError }
          );
        } else if (item.category_id) {
          updateCategoryRollover.mutate(
            { categoryId: item.category_id, amount: -fromRollover },
            { onError }
          );
        }
      }

      // Reduce budget if needed - use FRESH budget value
      if (fromBudget > 0) {
        const newBudget = freshBudget - fromBudget;
        allocateStash.mutate({ id: item.id, amount: newBudget }, { onError });
      }
    },
    [
      isRateLimited,
      withdrawAvailable,
      getFreshStashItem,
      isHypothesizeMode,
      stashedAllocations,
      item,
      setStashedAllocation,
      monthlyAllocations,
      setMonthlyAllocation,
      toast,
      updateGroupRollover,
      updateCategoryRollover,
      allocateStash,
    ]
  );

  // Handle deposit action
  const handleDeposit = useCallback(
    async (amount: number) => {
      // Calculate max allowed (Cash to Stash + Left to Budget)
      const maxDepositAmount = depositAvailable + Math.max(0, leftToBudget);

      // Validate inputs with specific error messages
      if (isRateLimited) {
        toast.error('Cannot deposit: rate limited');
        return;
      }
      if (amount <= 0) {
        toast.error('Enter an amount to deposit');
        return;
      }
      if (amount > maxDepositAmount) {
        toast.error(
          `Cannot deposit more than available (${formatCurrency(maxDepositAmount, { maximumFractionDigits: 0 })})`
        );
        return;
      }

      // Check if item can receive deposits (needs category_id or flexible group)
      const canDeposit =
        isHypothesizeMode || item.category_id || (item.is_flexible_group && item.category_group_id);
      if (!canDeposit) {
        toast.error('Cannot deposit: item is not linked to a category');
        return;
      }

      // CRITICAL: Read fresh budget from cache to avoid stale closure issues
      // During rapid operations, the closure's budgetAmount may be stale
      // but the cache is updated by each mutation's onMutate handler
      const freshItem = getFreshStashItem();
      const freshBudget = freshItem?.planned_budget ?? 0;

      // Calculate how much comes from Cash to Stash vs Left to Budget
      // Note: depositAvailable may be slightly stale, but this only affects the split
      // between sources, not the correctness of the mutation amounts
      const fromCashToStash = Math.min(amount, depositAvailable);
      const fromLeftToBudget = Math.max(0, amount - depositAvailable);

      const currentAllocation = stashedAllocations[item.id] ?? item.current_balance;
      const newAllocation = currentAllocation + amount;

      // Optimistic update - update context immediately for UI feedback
      setStashedAllocation(item.id, newAllocation);

      // Build toast message
      const currencyOpts = { maximumFractionDigits: 0 };
      const buildToastMessage = () => {
        if (fromLeftToBudget > 0) {
          return `Deposited ${formatCurrency(amount, currencyOpts)} to ${item.name} (${formatCurrency(fromLeftToBudget, currencyOpts)} added to budget)`;
        }
        return `Deposited ${formatCurrency(amount, currencyOpts)} to ${item.name}`;
      };

      // In hypothesize mode, no API call needed - just update local projection
      if (isHypothesizeMode) {
        // Track the LTB portion as a monthly allocation (mirrors real mode behavior)
        if (fromLeftToBudget > 0) {
          const currentMonthlyAllocation = monthlyAllocations[item.id] ?? 0;
          setMonthlyAllocation(item.id, currentMonthlyAllocation + fromLeftToBudget);
        }
        toast.success(`Projected: ${buildToastMessage()}`);
        return;
      }

      // Show success toast immediately (optimistic)
      toast.success(buildToastMessage());

      // Fire mutation (don't await - optimistic updates handle UI)
      const onError = () => {
        // Revert optimistic update on error
        setStashedAllocation(item.id, currentAllocation);
        toast.error('Failed to deposit funds');
      };

      // Update rollover with the Cash to Stash portion
      if (fromCashToStash > 0) {
        if (item.is_flexible_group && item.category_group_id) {
          updateGroupRollover.mutate(
            { groupId: item.category_group_id, amount: fromCashToStash },
            { onError }
          );
        } else if (item.category_id) {
          updateCategoryRollover.mutate(
            { categoryId: item.category_id, amount: fromCashToStash },
            { onError }
          );
        }
      }

      // Update budget with the Left to Budget portion - use FRESH budget value
      if (fromLeftToBudget > 0) {
        const newBudget = freshBudget + fromLeftToBudget;
        allocateStash.mutate({ id: item.id, amount: newBudget }, { onError });
      }
    },
    [
      isRateLimited,
      depositAvailable,
      leftToBudget,
      isHypothesizeMode,
      getFreshStashItem,
      stashedAllocations,
      item,
      setStashedAllocation,
      monthlyAllocations,
      setMonthlyAllocation,
      toast,
      updateGroupRollover,
      updateCategoryRollover,
      allocateStash,
    ]
  );

  // Helper to close overlay and reset state
  const closeOverlay = useCallback(() => {
    setShowOverlay(false);
    setIsTakeModeActive(false);
    setIsDippingIntoBudget(false);
    setAdditionalBudgetFromStash(0);
    setIsStashOverLimit(false);
    setHasInputValue(false);
  }, []);

  // Handle cancel/close overlay
  const handleCancelOverlay = useCallback(() => {
    setIsMouseInside(false);
    setIsFocusInside(false);
    closeOverlay();
  }, [closeOverlay]);

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    if (!isInDistributionMode && !item.is_archived) {
      setIsMouseInside(true);
      setShowOverlay(true);
      // Reset stash-related state when overlay opens
      setAdditionalBudgetFromStash(0);
      setIsStashOverLimit(false);
      setHasInputValue(false);
    }
  }, [isInDistributionMode, item.is_archived]);

  const handleMouseLeave = useCallback(() => {
    setIsMouseInside(false);
    // Only close if focus is also outside AND input has no value AND tour isn't forcing it open
    if (!isFocusInside && !hasInputValue && !tourShowOverlay) {
      closeOverlay();
    }
  }, [isFocusInside, hasInputValue, tourShowOverlay, closeOverlay]);

  // Focus handler - track when focus enters the overlay area
  const handleFocus = useCallback(() => {
    setIsFocusInside(true);
    if (!isInDistributionMode && !item.is_archived) {
      setShowOverlay(true);
      // Reset stash-related state when overlay opens via focus
      setAdditionalBudgetFromStash(0);
      setIsStashOverLimit(false);
      setHasInputValue(false);
    }
  }, [isInDistributionMode, item.is_archived]);

  // Blur handler - only close overlay if focus is leaving the entire component AND mouse is outside AND no input value
  // This prevents closing when focus moves between elements within the overlay (e.g., input → button)
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // If focus is moving to another element within this component, don't close
      if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      setIsFocusInside(false);
      // Only close if mouse is also outside AND input has no value AND tour isn't forcing it open
      if (!isMouseInside && !hasInputValue && !tourShowOverlay) {
        closeOverlay();
      }
    },
    [isMouseInside, hasInputValue, tourShowOverlay, closeOverlay]
  );

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
  const rolloverForDisplay =
    item.rollover_amount ?? Math.max(0, item.current_balance - item.planned_budget);
  const budgetedThisMonth = item.planned_budget;
  const creditsThisMonth = item.credits_this_month ?? 0;

  // For flex categories, progress bar should be based on total contributions (saved),
  // not remaining balance. This matches purchase goal behavior where progress is immune to spending.
  const totalContributions = rolloverForDisplay + budgetedThisMonth + creditsThisMonth;

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
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- hover handlers for visual animation only
    <div
      className="group rounded-xl border overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Image Area - drag handle (fills remaining space after content) */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- role="button" is applied conditionally via spread when not archived */}
      <div
        data-tour={isFirstCard ? 'stash-take-stash' : undefined}
        className={`stash-card-image flex-1 min-h-28 flex items-center justify-center relative group${
          item.is_archived ? '' : ' cursor-grab active:cursor-grabbing'
        }`}
        style={{
          backgroundColor: 'var(--monarch-bg-hover)',
          userSelect: 'none',
          containerType: 'size',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...(item.is_archived
          ? {}
          : {
              role: 'button',
              tabIndex: isInDistributionMode ? undefined : 0,
              'aria-label': `Withdraw or deposit funds for ${item.name}`,
            })}
        {...(isInDistributionMode || item.is_archived || showOverlay ? {} : dragHandleProps)}
      >
        <StashItemImage
          customImagePath={item.custom_image_path}
          logoUrl={item.logo_url}
          emoji={item.emoji}
          alt={item.name}
          className={hasImage ? 'w-full h-full object-cover' : 'opacity-50'}
        />

        {/* Withdraw/Deposit overlay (hover mode or distribution mode) */}
        <AnimatePresence>
          {(showOverlay || isInDistributionMode) &&
            !item.is_archived &&
            (() => {
              // Extract overlay background color to avoid nested ternary
              let overlayBgColor = 'var(--overlay-bg)'; // Default for hover mode
              if (isInDistributionMode) {
                overlayBgColor =
                  distributionMode === 'distribute'
                    ? 'var(--overlay-distribute-bg)' // Green for distribute
                    : 'var(--overlay-hypothesize-bg)'; // Purple for hypothesize
              }
              return (
                <motion.div
                  key="stash-overlay"
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: overlayBgColor, backdropFilter: 'blur(8px)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: TIMING.fast }}
                >
                  <TakeStashOverlay
                    itemId={item.id}
                    itemName={item.name}
                    currentBalance={displayBalance}
                    withdrawAvailable={withdrawAvailable}
                    depositAvailable={depositAvailable}
                    leftToBudget={leftToBudget}
                    rolloverAmount={rolloverAmount}
                    onTake={handleWithdraw}
                    onStash={handleDeposit}
                    onCancel={handleCancelOverlay}
                    onTakeModeChange={handleTakeModeChange}
                    onStashBudgetChange={handleStashBudgetChange}
                    onInputValueChange={handleInputValueChange}
                    isDistributionMode={isInDistributionMode}
                  />
                </motion.div>
              );
            })()}
        </AnimatePresence>

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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--card-badge-bg)',
                    color: 'var(--card-badge-text)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <BadgeIcon size={14} style={{ color: config.color }} />
                  {config.label}
                </span>
              </div>
            );
          })()}

        {/* Edit button - top right, shown on hover (hidden in distribution mode) */}
        {/* Stop all drag-related events from bubbling to prevent dnd-kit activation */}
        {!isInDistributionMode && !item.is_archived && (
          <button
            data-tour={isFirstCard ? 'stash-edit-item' : undefined}
            onClick={() => onEdit(item)}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`absolute top-2 right-2 p-2 rounded-lg transition-opacity icon-btn-hover ${
              tourShowEditButton ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            style={{
              backgroundColor: 'var(--card-edit-btn-bg)',
              backdropFilter: 'blur(4px)',
            }}
            aria-label="Edit item"
          >
            <Icons.Edit size={18} style={{ color: 'var(--card-edit-btn-icon)' }} />
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
      <div className="px-4 pt-3 pb-4 shrink-0 flex flex-col" style={{ height: 124 }}>
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
                      {hasImage && (
                        <AnimatedEmoji
                          emoji={item.emoji || '🎯'}
                          isAnimating={isCardHovered}
                          size={20}
                          className="mr-1.5 align-middle"
                        />
                      )}
                      {item.name}
                    </a>
                  ) : (
                    <h3
                      className="text-base font-medium truncate"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      title={item.name}
                    >
                      {hasImage && (
                        <AnimatedEmoji
                          emoji={item.emoji || '🎯'}
                          isAnimating={isCardHovered}
                          size={20}
                          className="mr-1.5 align-middle"
                        />
                      )}
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
                      {hasImage && (
                        <AnimatedEmoji
                          emoji={item.emoji || '🎯'}
                          isAnimating={isCardHovered}
                          size={20}
                          className="mr-1.5 align-middle"
                        />
                      )}
                      {item.name}
                    </a>
                  ) : (
                    <h3
                      className="text-base font-medium truncate"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      title={item.name}
                    >
                      {hasImage && (
                        <AnimatedEmoji
                          emoji={item.emoji || '🎯'}
                          isAnimating={isCardHovered}
                          size={20}
                          className="mr-1.5 align-middle"
                        />
                      )}
                      {item.name}
                    </h3>
                  )}
                </>
              )}
            </div>
            {/* Goal strategy - varies by goal type */}
            {(() => {
              const formattedAmount = formatCurrency(item.amount, { maximumFractionDigits: 0 });
              const goalType = item.goal_type ?? 'one_time';

              // savings_buffer: "Maintain $X" (ongoing fund, no date)
              // debt: "Pay off $X by [date]"
              // one_time: "Save $X by [date]"
              const getDescription = () => {
                if (goalType === 'savings_buffer') {
                  return {
                    text: `Maintain ${formattedAmount}`,
                    title: `Maintain ${formattedAmount}`,
                  };
                }
                const verb = goalType === 'debt' ? 'Pay off' : 'Save';
                return {
                  text: `${verb} ${formattedAmount} by ${dateDisplay}`,
                  title: `${verb} ${formattedAmount} by ${dateDisplay}`,
                };
              };
              const { text, title } = getDescription();

              return (
                <div
                  className="flex items-center gap-1 text-sm min-w-0"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  <span className="shrink-0 inline-flex">
                    <Icons.Calendar size={14} style={{ color: 'var(--monarch-text-muted)' }} />
                  </span>
                  <span className="truncate" title={title}>
                    {text}
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
                isTakeModeActive={isTakeModeActive}
                isDippingIntoBudget={isDippingIntoBudget}
                additionalBudgetFromStash={additionalBudgetFromStash}
                isStashOverLimit={isStashOverLimit}
                isOverlayVisible={showOverlay}
                dataTour={isFirstCard ? 'stash-budget-input' : undefined}
              />
              <span className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                budgeted in {currentMonthAbbr}.
              </span>
            </div>
          )}
        </div>

        {/* Progress bar or restore button - pushed to bottom */}
        <div className="mt-auto" data-tour={isFirstCard ? 'stash-progress-bar' : undefined}>
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
              rolloverAmount={rolloverForDisplay}
              budgetedThisMonth={budgetedThisMonth}
              creditsThisMonth={creditsThisMonth}
              savedLabel="committed"
              // Flex categories behave like savings_buffer (spending reduces balance)
              goalType={item.is_flexible_group ? 'savings_buffer' : item.goal_type}
              // Show expected progress tick for time-based goals (not savings_buffer which has no end date)
              expectedProgressPercent={
                item.goal_type === 'savings_buffer'
                  ? null
                  : calculateExpectedProgress(item.target_date)
              }
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
