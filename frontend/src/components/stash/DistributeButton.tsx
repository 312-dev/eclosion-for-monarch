/**
 * DistributeButton and HypothesizeButton Components
 *
 * Two buttons for fund distribution and what-if planning:
 *
 * DistributeButton:
 * - Opens Distribute wizard in 'distribute' mode
 * - Shows available amount when positive
 * - Disabled when availableAmount <= 0, no stash items, or rate limited
 *
 * HypothesizeButton:
 * - Opens Distribute wizard in 'hypothesize' mode (no save)
 * - Always enabled as long as there are stash items
 * - Allows "what-if" planning with any hypothetical amount
 */

import { useState } from 'react';
import { Icons } from '../icons';
import { DistributeWizard } from './DistributeWizard';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { Tooltip } from '../ui/Tooltip';
import type { StashItem } from '../../types';

interface DistributeButtonProps {
  /** Available funds to distribute (after buffer) */
  readonly availableAmount: number;
  /** Left to Budget amount (ready_to_assign from Monarch) */
  readonly leftToBudget: number;
  /** List of stash items to distribute to */
  readonly items: StashItem[];
}

interface HypothesizeButtonProps {
  /** Available funds (used as starting amount in hypothesize mode) */
  readonly availableAmount: number;
  /** Left to Budget amount (ready_to_assign from Monarch) */
  readonly leftToBudget: number;
  /** List of stash items to distribute to */
  readonly items: StashItem[];
}

/**
 * Format currency for display.
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Filter to active stash items only (not archived, not goals).
 */
function getActiveStashItems(items: StashItem[]): StashItem[] {
  return items.filter((item) => item.type === 'stash' && !item.is_archived);
}

/**
 * Distribute button - allocates Available to Stash funds.
 */
export function DistributeButton({ availableAmount, leftToBudget, items }: DistributeButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const isRateLimited = useIsRateLimited();

  const activeStashItems = getActiveStashItems(items);
  const hasNoItems = activeStashItems.length === 0;
  const nothingToDistribute = availableAmount <= 0;
  const isDisabled = isRateLimited || hasNoItems || nothingToDistribute;

  // Determine tooltip message based on disabled reason
  const getTooltipMessage = (): string | null => {
    if (nothingToDistribute) {
      return "There's nothing available to distribute. Use Hypothesize for what-if planning.";
    }
    if (hasNoItems) {
      return 'Create some stash items first';
    }
    if (isRateLimited) {
      return 'Rate limited - please wait';
    }
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  const buttonContent = (
    <button
      onClick={() => setIsWizardOpen(true)}
      disabled={isDisabled}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: isDisabled ? 'var(--monarch-bg-hover)' : 'var(--monarch-orange)',
        color: isDisabled ? 'var(--monarch-text-muted)' : 'white',
      }}
      aria-label={
        availableAmount > 0
          ? `Distribute ${formatCurrency(availableAmount)}`
          : 'Distribute funds'
      }
    >
      <Icons.Split size={18} />
      <span>
        {availableAmount > 0 ? `Distribute ${formatCurrency(availableAmount)}` : 'Distribute'}
      </span>
    </button>
  );

  return (
    <>
      {tooltipMessage ? (
        <Tooltip content={tooltipMessage} side="bottom">
          {buttonContent}
        </Tooltip>
      ) : (
        buttonContent
      )}

      <DistributeWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        mode="distribute"
        availableAmount={availableAmount}
        leftToBudget={leftToBudget}
        items={activeStashItems}
      />
    </>
  );
}

/**
 * Hypothesize button - "what-if" planning without saving.
 */
export function HypothesizeButton({ availableAmount, leftToBudget, items }: HypothesizeButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const activeStashItems = getActiveStashItems(items);
  const hasNoItems = activeStashItems.length === 0;
  const isDisabled = hasNoItems;

  // Determine tooltip message based on disabled reason
  const tooltipMessage = hasNoItems ? 'Create some stash items first' : null;

  const buttonContent = (
    <button
      onClick={() => setIsWizardOpen(true)}
      disabled={isDisabled}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-monarch-text-dark hover:bg-monarch-bg-hover"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
      aria-label="Hypothesize fund allocation"
    >
      <Icons.FlaskConical size={18} />
      <span>Hypothesize</span>
    </button>
  );

  return (
    <>
      {tooltipMessage ? (
        <Tooltip content={tooltipMessage} side="bottom">
          {buttonContent}
        </Tooltip>
      ) : (
        buttonContent
      )}

      <DistributeWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        mode="hypothesize"
        availableAmount={availableAmount}
        leftToBudget={leftToBudget}
        items={activeStashItems}
      />
    </>
  );
}
