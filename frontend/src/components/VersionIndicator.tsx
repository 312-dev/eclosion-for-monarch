/**
 * Version Indicator
 *
 * Shows current version and opens changelog modal.
 * Indicates when there are unread changelog entries.
 * For web users, shows update availability and instructions.
 * For desktop users, just shows changelog (updates are handled by DesktopUpdateBanner).
 */

import { useState, useEffect, useRef } from 'react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import {
  useChangelogStatusQuery,
  useMarkChangelogReadMutation,
  useVersionQuery,
} from '../api/queries';
import { Modal } from './ui/Modal';
import { ChangelogDisplay } from './ChangelogDisplay';
import { UI } from '../constants';
import { Icons } from './icons';

export function VersionIndicator() {
  const { updateAvailable, clientVersion, checkForUpdate, isChecking } = useUpdateCheck();

  const { data: changelogStatus } = useChangelogStatusQuery();
  const { data: versionInfo } = useVersionQuery();
  const markAsRead = useMarkChangelogReadMutation();

  const [showChangelog, setShowChangelog] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownTooltipRef = useRef(false);

  // Use backend's deployment_type instead of client-side detection
  // This correctly handles tunnel access where window.electron is undefined
  const isDesktop = versionInfo?.deployment_type === 'desktop';

  // Show "See what's new" tooltip on initial load if there are unread notes
  useEffect(() => {
    if (changelogStatus?.has_unread && !hasShownTooltipRef.current) {
      hasShownTooltipRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time tooltip display
      setShowTooltip(true);

      tooltipTimerRef.current = setTimeout(() => {
        setShowTooltip(false);
      }, UI.DELAY.TOOLTIP_AUTO_HIDE);
    }

    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, [changelogStatus?.has_unread]);

  const handleOpenChangelog = () => {
    setShowChangelog(true);
    setShowTooltip(false);
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    // Mark as read when opening
    if (changelogStatus?.has_unread) {
      markAsRead.mutate();
    }
  };

  const handleCheckForUpdate = () => {
    setHasChecked(true);
    checkForUpdate();
  };

  const hasUnread = changelogStatus?.has_unread ?? false;

  return (
    <>
      <div className="version-indicator-wrapper">
        <button onClick={handleOpenChangelog} className="version-indicator" title="View changelog">
          {(updateAvailable || hasUnread) && <span className="version-indicator-orb" />}
          <span className="version-indicator-text">v{clientVersion}</span>
          {/* Only show "New version available" for web users */}
          {updateAvailable && !isDesktop && (
            <span className="version-indicator-update">New version available!</span>
          )}
        </button>

        {showTooltip && hasUnread && !updateAvailable && (
          <div className="version-indicator-tooltip">See what's new</div>
        )}
      </div>

      <Modal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        title="Changelog"
        description={`Current version: v${clientVersion}`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Show "Up to date" only for web users who checked */}
              {!isDesktop && !updateAvailable && hasChecked && !isChecking && (
                <span
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: 'var(--monarch-green)' }}
                >
                  <Icons.CheckCircle size={16} />
                  Up to date
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Only show check button for web users */}
              {!isDesktop && !updateAvailable && (
                <button
                  onClick={handleCheckForUpdate}
                  disabled={isChecking}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--monarch-bg-input)',
                    color: 'var(--monarch-text)',
                  }}
                  aria-label="Check for updates"
                >
                  {isChecking ? (
                    <Icons.Spinner size={16} className="animate-spin" />
                  ) : (
                    <Icons.Refresh size={16} />
                  )}
                  {isChecking ? 'Checking...' : 'Check for Update'}
                </button>
              )}
              <button
                onClick={() => setShowChangelog(false)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--monarch-bg-input)',
                  color: 'var(--monarch-text)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        {/* Changelog history - always show */}
        <ChangelogDisplay
          version={undefined}
          showUpdateInstructions={updateAvailable && !isDesktop}
        />
      </Modal>
    </>
  );
}
