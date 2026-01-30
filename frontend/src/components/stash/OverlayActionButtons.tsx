/**
 * Overlay Action Buttons
 *
 * Stash and Take buttons for the TakeStashOverlay component.
 */

import { memo } from 'react';
import { Icons } from '../icons';

type StashIconName = 'CircleFadingPlus' | 'ArrowsUpFromLine' | 'BanknoteArrowUp';

interface OverlayActionButtonsProps {
  /** Stash button label */
  readonly stashButtonLabel: string;
  /** Stash icon name */
  readonly stashIconName: StashIconName;
  /** Stash icon color */
  readonly stashIconColor: string;
  /** Stash button background color */
  readonly stashBgColor: string;
  /** Take icon color */
  readonly takeIconColor: string;
  /** Take button background color */
  readonly takeBgColor: string;
  /** Whether stash mode is active */
  readonly isStashMode: boolean;
  /** Whether take mode is active */
  readonly isTakeMode: boolean;
  /** Whether deposit is disabled */
  readonly depositDisabled: boolean;
  /** Whether withdraw is disabled */
  readonly withdrawDisabled: boolean;
  /** Whether processing is in progress */
  readonly isProcessing: boolean;
  /** Item name for accessibility */
  readonly itemName: string;
  /** Click handler for stash button */
  readonly onStashClick: () => void;
  /** Click handler for take button */
  readonly onTakeClick: () => void;
}

function getButtonStyles(_isActive: boolean, isDisabled: boolean) {
  return {
    opacity: 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
  };
}

export const OverlayActionButtons = memo(function OverlayActionButtons({
  stashButtonLabel,
  stashIconName,
  stashIconColor,
  stashBgColor,
  takeIconColor,
  takeBgColor,
  isStashMode,
  isTakeMode,
  depositDisabled,
  withdrawDisabled,
  isProcessing,
  itemName,
  onStashClick,
  onTakeClick,
}: OverlayActionButtonsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Stash button - green hue (muted when inactive, grey when disabled) */}
      <button
        type="button"
        onClick={onStashClick}
        disabled={depositDisabled || isProcessing}
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all focus-visible:outline-none"
        style={{
          backgroundColor: stashBgColor,
          ...getButtonStyles(isStashMode, depositDisabled),
        }}
        aria-label={`Stash to ${itemName}`}
      >
        {/* Icon varies based on label */}
        {stashIconName === 'CircleFadingPlus' && (
          <Icons.CircleFadingPlus size={16} style={{ color: stashIconColor }} />
        )}
        {stashIconName === 'ArrowsUpFromLine' && (
          <Icons.ArrowsUpFromLine size={16} style={{ color: stashIconColor }} />
        )}
        {stashIconName === 'BanknoteArrowUp' && (
          <Icons.BanknoteArrowUp size={16} style={{ color: stashIconColor }} />
        )}
        <span className="text-sm font-medium" style={{ color: stashIconColor }}>
          {stashButtonLabel}
        </span>
      </button>

      {/* Vertical divider */}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--overlay-divider)' }} />

      {/* Take button - orange hue (muted when inactive, grey when disabled) */}
      <button
        type="button"
        onClick={onTakeClick}
        disabled={withdrawDisabled || isProcessing}
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-all focus-visible:outline-none"
        style={{
          backgroundColor: takeBgColor,
          ...getButtonStyles(isTakeMode, withdrawDisabled),
        }}
        aria-label={`Take from ${itemName}`}
      >
        <Icons.BanknoteArrowDown size={16} style={{ color: takeIconColor }} />
        <span className="text-sm font-medium" style={{ color: takeIconColor }}>
          Take
        </span>
      </button>
    </div>
  );
});
