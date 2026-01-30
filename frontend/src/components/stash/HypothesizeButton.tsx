/**
 * HypothesizeButton Component
 *
 * "What-if" planning button for fund distribution scenarios.
 * When in hypothesize mode, becomes an "Exit" button.
 * If there are unsaved changes, shows a checkmark for "Save & Exit".
 */

import { useState, useCallback } from 'react';
import { Icons } from '../icons';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { useToast } from '../../context/ToastContext';
import { useSaveHypothesisMutation } from '../../api/queries/stashQueries';
import { Tooltip } from '../ui/Tooltip';
import { SaveNameDialog } from './DistributionModeDialogs';
import type { StashItem, SaveHypothesisRequest } from '../../types';

/** Position in a button group for styling borders/corners */
type ButtonGroupPosition = 'left' | 'right' | 'top' | 'bottom' | 'standalone';

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
 * Render the appropriate exit icon based on whether there are changes.
 */
function renderExitIcon(hasChanges: boolean, iconSize: number): React.ReactNode {
  return hasChanges ? <Icons.Check size={iconSize} /> : <Icons.X size={iconSize} />;
}

export function HypothesizeButton({
  items,
  compact = false,
  groupPosition = 'standalone',
  iconOnly = false,
}: HypothesizeButtonProps) {
  const {
    enterHypothesizeMode,
    exitMode,
    mode,
    hasChanges,
    loadedScenarioId,
    loadedScenarioName,
    stashedAllocations,
    monthlyAllocations,
    timelineEvents,
    customAvailableFunds,
    customLeftToBudget,
    itemApys,
    totalStashedAllocated,
    totalMonthlyAllocated,
  } = useDistributionMode();
  const toast = useToast();
  const saveMutation = useSaveHypothesisMutation();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeStashItems = getActiveStashItems(items);
  const hasNoItems = activeStashItems.length === 0;
  const isInHypothesizeMode = mode === 'hypothesize';
  const isInOtherMode = mode !== null && mode !== 'hypothesize';

  // Only disabled if no items or in distribute mode (not hypothesize mode)
  const isDisabled = hasNoItems || isInOtherMode || isSaving;

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

  // Build save request from current state
  const buildSaveRequest = useCallback(
    (name: string): SaveHypothesisRequest => {
      const eventsMap: Record<
        string,
        Array<{ id: string; type: '1x' | 'mo'; month: string; amount: number }>
      > = {};
      for (const event of timelineEvents) {
        const arr = (eventsMap[event.itemId] ??= []);
        arr.push({
          id: event.id,
          type: event.type === 'deposit' ? '1x' : 'mo',
          month: event.date.slice(0, 7),
          amount: event.amount,
        });
      }

      return {
        name,
        savingsAllocations: stashedAllocations,
        savingsTotal: totalStashedAllocated,
        monthlyAllocations,
        monthlyTotal: totalMonthlyAllocated,
        events: eventsMap,
        customAvailableFunds,
        customLeftToBudget,
        itemApys,
      };
    },
    [
      stashedAllocations,
      totalStashedAllocated,
      monthlyAllocations,
      totalMonthlyAllocated,
      timelineEvents,
      customAvailableFunds,
      customLeftToBudget,
      itemApys,
    ]
  );

  const handleClick = () => {
    if (isInHypothesizeMode) {
      if (hasChanges) {
        if (loadedScenarioId && loadedScenarioName) {
          // Editing existing scenario: save directly and exit
          setIsSaving(true);
          const request = buildSaveRequest(loadedScenarioName);
          saveMutation.mutate(request, {
            onSuccess: () => {
              toast.success(`Saved "${loadedScenarioName}"`);
              exitMode();
            },
            onError: () => toast.error('Failed to save scenario'),
            onSettled: () => setIsSaving(false),
          });
        } else {
          // New scenario: show modal to prompt for name
          setShowSaveDialog(true);
        }
      } else {
        exitMode();
      }
    } else {
      enterHypothesizeMode(activeStashItems);
    }
  };

  // Handle saving with a name (for new scenarios)
  const handleSaveWithName = (name: string) => {
    setIsSaving(true);
    const request = buildSaveRequest(name);
    saveMutation.mutate(request, {
      onSuccess: () => {
        toast.success(`Saved "${name}"`);
        setShowSaveDialog(false);
        exitMode();
      },
      onError: () => toast.error('Failed to save scenario'),
      onSettled: () => setIsSaving(false),
    });
  };

  const tooltipMessage = getTooltipMessage();
  const isCell = compact && groupPosition !== 'standalone';
  const sizeClasses = iconOnly ? 'px-2.5 flex-1' : getSizeClasses(isCell, compact);
  const radiusClasses = isCell ? '' : getGroupRadiusClasses(groupPosition);

  // Purple color for hypothesize mode
  const purpleBgSolid = 'color-mix(in srgb, #9333ea 50%, var(--monarch-bg-card))';
  const purpleBgLight = 'rgba(147, 51, 234, 0.2)';
  const purpleText = '#a855f7';

  // Determine colors based on context
  const getBgColor = () => {
    if (iconOnly) return purpleBgSolid;
    if (isCell) return 'var(--monarch-bg-page)';
    return purpleBgLight;
  };
  const bgColor = getBgColor();
  // Use CSS variable for icon-only mode (adapts to light/dark theme)
  const textColor = iconOnly ? 'var(--hypothesize-btn-icon)' : purpleText;
  const boxShadow = iconOnly
    ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 2px rgba(0,0,0,0.2)'
    : undefined;

  const getIconSize = () => {
    if (iconOnly) return 16;
    return compact ? 14 : 18;
  };

  const exitLabel = hasChanges ? 'Save & Exit' : 'Exit Mode';
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
      aria-label={isInHypothesizeMode ? exitLabel : 'Hypothesize fund allocation'}
    >
      {isInHypothesizeMode ? (
        <>
          {renderExitIcon(hasChanges, iconSize)}
          {!iconOnly && <span>{exitLabel}</span>}
        </>
      ) : (
        <>
          <Icons.FlaskConical size={iconSize} />
          {!iconOnly && <span>Hypothesize</span>}
        </>
      )}
    </button>
  );

  // Always show tooltip in icon-only mode, or when there's a disabled message
  const showTooltip = iconOnly || tooltipMessage;
  const getDefaultTooltip = () => {
    if (isInHypothesizeMode) {
      if (hasChanges) {
        return loadedScenarioId
          ? `Save "${loadedScenarioName}" and exit`
          : 'Save as new scenario and exit';
      }
      return 'Exit hypothesize mode';
    }
    return 'Hypothesize';
  };
  const tooltipContent = tooltipMessage ?? getDefaultTooltip();

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
      <SaveNameDialog
        isOpen={showSaveDialog}
        onSave={handleSaveWithName}
        onCancel={() => setShowSaveDialog(false)}
      />
    </>
  );
}
