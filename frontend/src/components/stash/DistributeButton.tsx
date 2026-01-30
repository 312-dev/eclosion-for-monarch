/**
 * DistributeButton Component
 *
 * Button for fund distribution:
 * - Enters distribute mode (inline overlay on cards)
 * - Disabled when no stash items or rate limited
 * - Allows distribution even with no available funds (for reallocation)
 */

import { useState } from 'react';
import { Icons } from '../icons';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { Tooltip } from '../ui/Tooltip';
import { ExitDistributeConfirmModal } from './ExitDistributeConfirmModal';
import type { StashItem } from '../../types';

/** Position in a button group for styling borders/corners */
type ButtonGroupPosition = 'left' | 'right' | 'top' | 'bottom' | 'standalone';

interface DistributeButtonProps {
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
 * Render the appropriate exit icon based on whether there are changes.
 */
function renderExitIcon(hasChanges: boolean, iconSize: number): React.ReactNode {
  return hasChanges ? <Icons.Check size={iconSize} /> : <Icons.X size={iconSize} />;
}

/**
 * Distribute button - allocates Available to Stash funds.
 * When in distribute mode, becomes an "Exit" button.
 * If there are unsaved changes, shows a checkmark for "Apply & Exit".
 */
export function DistributeButton({
  items,
  compact = false,
  groupPosition = 'standalone',
  iconOnly = false,
}: DistributeButtonProps) {
  const isRateLimited = useIsRateLimited();
  const { enterDistributeMode, exitMode, mode, hasChanges, requestSubmit } = useDistributionMode();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const activeStashItems = getActiveStashItems(items);
  const hasNoItems = activeStashItems.length === 0;
  const isInDistributeMode = mode === 'distribute';
  const isInOtherMode = mode !== null && mode !== 'distribute';

  // When in distribute mode, button is always enabled (for exiting)
  // Otherwise, disabled if no items, rate limited, or in hypothesize mode
  // Note: We allow distribute mode even with no available funds (user may want to reallocate)
  const isDisabled = isInDistributeMode ? false : isRateLimited || hasNoItems || isInOtherMode;

  // Determine tooltip message based on disabled reason
  const getTooltipMessage = (): string | null => {
    if (isInOtherMode) {
      return 'Exit current mode first';
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
        // Apply changes and exit - requestSubmit triggers the save
        requestSubmit();
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

  const getBgColor = () => {
    if (iconOnly) return greenBgSolid;
    return greenBgLight;
  };
  const bgColor = getBgColor();
  // Use CSS variable for icon-only mode (adapts to light/dark theme)
  const textColor = iconOnly ? 'var(--distribute-btn-icon)' : greenText;
  const boxShadow = iconOnly
    ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 2px rgba(0,0,0,0.2)'
    : undefined;

  const getIconSize = () => {
    if (iconOnly) return 16;
    return compact ? 14 : 18;
  };

  const exitLabel = hasChanges ? 'Apply & Exit' : 'Exit Mode';
  const iconSize = getIconSize();

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
      aria-label={isInDistributeMode ? exitLabel : 'Distribute funds'}
    >
      {isInDistributeMode ? (
        <>
          {renderExitIcon(hasChanges, iconSize)}
          {!iconOnly && <span>{exitLabel}</span>}
        </>
      ) : (
        <>
          <Icons.Split size={iconSize} />
          {!iconOnly && <span>Distribute</span>}
        </>
      )}
    </button>
  );

  // Always show tooltip in icon-only mode, or when there's a disabled message
  const showTooltip = iconOnly || tooltipMessage;
  const getDefaultTooltip = () => {
    if (isInDistributeMode) {
      return hasChanges ? 'Apply changes and exit' : 'Exit distribute mode';
    }
    return 'Distribute funds';
  };
  const tooltipContent = tooltipMessage ?? getDefaultTooltip();

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

// Re-export HypothesizeButton from its own module for backwards compatibility
export { HypothesizeButton } from './HypothesizeButton';
