/**
 * DistributeButton and HypothesizeButton Components
 *
 * Two buttons for fund distribution and what-if planning:
 *
 * DistributeButton:
 * - Enters distribute mode (inline overlay on cards)
 * - Disabled when availableAmount <= 0, no stash items, or rate limited
 *
 * HypothesizeButton:
 * - Enters hypothesize mode (inline overlay, localStorage only)
 * - Always enabled as long as there are stash items
 * - Allows "what-if" planning with any hypothetical amount
 */

import { useState } from 'react';
import { Icons } from '../icons';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { Tooltip } from '../ui/Tooltip';
import { ExitDistributeConfirmModal } from './ExitDistributeConfirmModal';
import { ExitHypothesizeConfirmModal } from './ExitHypothesizeConfirmModal';
import type { StashItem } from '../../types';

/** Position in a button group for styling borders/corners */
type ButtonGroupPosition = 'left' | 'right' | 'top' | 'bottom' | 'standalone';

interface DistributeButtonProps {
  /** Available funds to distribute (after buffer) */
  readonly availableAmount: number;
  /** List of stash items to distribute to */
  readonly items: StashItem[];
  /** Compact mode for button groups */
  readonly compact?: boolean;
  /** Position in button group for styling */
  readonly groupPosition?: ButtonGroupPosition;
  /** Icon-only mode (no label) */
  readonly iconOnly?: boolean;
}

interface HypothesizeButtonProps {
  /** List of stash items to distribute to */
  readonly items: StashItem[];
  /** Compact mode for button groups */
  readonly compact?: boolean;
  /** Position in button group for styling */
  readonly groupPosition?: ButtonGroupPosition;
  /** Icon-only mode (no label) */
  readonly iconOnly?: boolean;
}

/**
 * Filter to active stash items only (not archived, not goals).
 */
function getActiveStashItems(items: StashItem[]): StashItem[] {
  return items.filter((item) => item.type === 'stash' && !item.is_archived);
}

/**
 * Get border radius classes based on button group position.
 */
function getGroupRadiusClasses(position: ButtonGroupPosition): string {
  switch (position) {
    case 'left':
      return 'rounded-l-md rounded-r-none';
    case 'right':
      return 'rounded-r-md rounded-l-none border-l-0';
    case 'top':
      return 'rounded-t-md rounded-b-none';
    case 'bottom':
      return 'rounded-b-md rounded-t-none border-t-0';
    default:
      return 'rounded-lg';
  }
}

/**
 * Get size classes for button based on cell/compact mode.
 */
function getSizeClasses(isCell: boolean, compact: boolean): string {
  if (isCell) return 'flex-1 justify-center py-2.5 text-sm';
  if (compact) return 'px-3 py-1.5 text-sm';
  return 'px-4 py-2';
}

/**
 * Distribute button - allocates Available to Stash funds.
 * When in distribute mode, becomes an "Exit" button.
 */
export function DistributeButton({
  availableAmount,
  items,
  compact = false,
  groupPosition = 'standalone',
  iconOnly = false,
}: DistributeButtonProps) {
  const isRateLimited = useIsRateLimited();
  const { enterDistributeMode, exitMode, mode, hasChanges } = useDistributionMode();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const activeStashItems = getActiveStashItems(items);
  const hasNoItems = activeStashItems.length === 0;
  const nothingToDistribute = availableAmount <= 0;
  const isInDistributeMode = mode === 'distribute';
  const isInOtherMode = mode !== null && mode !== 'distribute';

  // When in distribute mode, button is always enabled (for exiting)
  // Otherwise, disabled if no items, nothing to distribute, rate limited, or in hypothesize mode
  const isDisabled = isInDistributeMode
    ? false
    : isRateLimited || hasNoItems || nothingToDistribute || isInOtherMode;

  // Determine tooltip message based on disabled reason
  const getTooltipMessage = (): string | null => {
    if (isInOtherMode) {
      return 'Exit current mode first';
    }
    if (nothingToDistribute && !isInDistributeMode) {
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

  const handleClick = () => {
    if (isInDistributeMode) {
      if (hasChanges) {
        setShowConfirmModal(true);
      } else {
        exitMode();
      }
    } else {
      enterDistributeMode(activeStashItems);
    }
  };

  const tooltipMessage = getTooltipMessage();
  const isCell = compact && groupPosition !== 'standalone';
  const sizeClasses = iconOnly ? 'px-2.5 flex-1' : getSizeClasses(isCell, compact);
  const radiusClasses = isCell ? '' : getGroupRadiusClasses(groupPosition);

  // Green color for distribute mode
  const greenBgSolid = 'color-mix(in srgb, var(--monarch-success) 50%, var(--monarch-bg-card))';
  const greenBgLight = 'color-mix(in srgb, var(--monarch-success) 30%, var(--monarch-bg-page))';
  const greenText = 'var(--monarch-success)';
  const greenBright = '#4ade80'; // Brighter green for icon-only mode

  const getBgColor = () => {
    if (iconOnly) return greenBgSolid;
    return greenBgLight;
  };
  const bgColor = getBgColor();
  const textColor = iconOnly ? greenBright : greenText;
  const boxShadow = iconOnly
    ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 2px rgba(0,0,0,0.2)'
    : undefined;

  const getIconSize = () => {
    if (iconOnly) return 16;
    return compact ? 14 : 18;
  };

  // Add subtle pulse animation to icon when funds are available to distribute
  const iconPulseClass = isDisabled ? '' : 'animate-icon-pulse';

  const buttonContent = (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`flex items-center justify-center gap-1.5 ${sizeClasses} ${radiusClasses} font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110`}
      style={{
        backgroundColor: isDisabled ? 'var(--monarch-bg-hover)' : bgColor,
        color: isDisabled ? 'var(--monarch-text-muted)' : textColor,
        boxShadow: isDisabled ? undefined : boxShadow,
      }}
      aria-label={isInDistributeMode ? 'Exit distribute mode' : 'Distribute funds'}
    >
      {isInDistributeMode ? (
        <>
          <Icons.X size={getIconSize()} />
          {!iconOnly && <span>Exit Mode</span>}
        </>
      ) : (
        <>
          <Icons.Split size={getIconSize()} className={iconPulseClass} />
          {!iconOnly && <span>Distribute</span>}
        </>
      )}
    </button>
  );

  // Always show tooltip in icon-only mode, or when there's a disabled message
  const showTooltip = iconOnly || tooltipMessage;
  const defaultTooltip = isInDistributeMode ? 'Exit distribute mode' : 'Distribute funds';
  const tooltipContent = tooltipMessage ?? defaultTooltip;

  const buttonWithTooltip = showTooltip ? (
    <Tooltip content={tooltipContent} side="top">
      {buttonContent}
    </Tooltip>
  ) : (
    buttonContent
  );

  return (
    <>
      {buttonWithTooltip}
      <ExitDistributeConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
      />
    </>
  );
}

/**
 * Hypothesize button - "what-if" planning without saving.
 * When in hypothesize mode, becomes an "Exit" button.
 */
export function HypothesizeButton({
  items,
  compact = false,
  groupPosition = 'standalone',
  iconOnly = false,
}: HypothesizeButtonProps) {
  const { enterHypothesizeMode, exitMode, mode, hasChanges } = useDistributionMode();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const activeStashItems = getActiveStashItems(items);
  const hasNoItems = activeStashItems.length === 0;
  const isInHypothesizeMode = mode === 'hypothesize';
  const isInOtherMode = mode !== null && mode !== 'hypothesize';

  // Only disabled if no items or in distribute mode (not hypothesize mode)
  const isDisabled = hasNoItems || isInOtherMode;

  // Determine tooltip message based on disabled reason
  const getTooltipMessage = (): string | null => {
    if (isInOtherMode) {
      return 'Exit current mode first';
    }
    if (hasNoItems) {
      return 'Create some stash items first';
    }
    return null;
  };

  const handleClick = () => {
    if (isInHypothesizeMode) {
      if (hasChanges) {
        setShowConfirmModal(true);
      } else {
        exitMode();
      }
    } else {
      enterHypothesizeMode(activeStashItems);
    }
  };

  const tooltipMessage = getTooltipMessage();
  const isCell = compact && groupPosition !== 'standalone';
  const sizeClasses = iconOnly ? 'px-2.5 flex-1' : getSizeClasses(isCell, compact);
  const radiusClasses = isCell ? '' : getGroupRadiusClasses(groupPosition);

  // Purple color for hypothesize mode
  const purpleBgSolid = 'color-mix(in srgb, #9333ea 50%, var(--monarch-bg-card))';
  const purpleBgLight = 'rgba(147, 51, 234, 0.2)';
  const purpleText = '#a855f7';
  const purpleBright = '#c084fc'; // Brighter purple for icon-only mode

  // Determine colors based on context
  const getBgColor = () => {
    if (iconOnly) return purpleBgSolid;
    if (isCell) return 'var(--monarch-bg-page)';
    return purpleBgLight;
  };
  const bgColor = getBgColor();
  const textColor = iconOnly ? purpleBright : purpleText;
  const boxShadow = iconOnly
    ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 2px rgba(0,0,0,0.2)'
    : undefined;

  const getIconSize = () => {
    if (iconOnly) return 16;
    return compact ? 14 : 18;
  };

  const buttonContent = (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`flex items-center justify-center gap-1.5 ${sizeClasses} ${radiusClasses} font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110`}
      style={{
        backgroundColor: isDisabled ? 'var(--monarch-bg-hover)' : bgColor,
        color: isDisabled ? 'var(--monarch-text-muted)' : textColor,
        boxShadow: isDisabled ? undefined : boxShadow,
      }}
      aria-label={isInHypothesizeMode ? 'Exit hypothesize mode' : 'Hypothesize fund allocation'}
    >
      {isInHypothesizeMode ? (
        <>
          <Icons.X size={getIconSize()} />
          {!iconOnly && <span>Exit Mode</span>}
        </>
      ) : (
        <>
          <Icons.FlaskConical size={getIconSize()} />
          {!iconOnly && <span>Hypothesize</span>}
        </>
      )}
    </button>
  );

  // Always show tooltip in icon-only mode, or when there's a disabled message
  const showTooltip = iconOnly || tooltipMessage;
  const defaultTooltip = isInHypothesizeMode ? 'Exit hypothesize mode' : 'Hypothesize';
  const tooltipContent = tooltipMessage ?? defaultTooltip;

  const buttonWithTooltip = showTooltip ? (
    <Tooltip content={tooltipContent} side="bottom">
      {buttonContent}
    </Tooltip>
  ) : (
    buttonContent
  );

  return (
    <>
      {buttonWithTooltip}
      <ExitHypothesizeConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
      />
    </>
  );
}
