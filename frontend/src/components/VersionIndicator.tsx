import { useState, useEffect, useRef } from 'react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useElectronUpdates } from '../hooks/useElectronUpdates';
import { useChangelogStatusQuery, useMarkChangelogReadMutation } from '../api/queries';
import { Modal } from './ui/Modal';
import { ChangelogDisplay } from './ChangelogDisplay';
import { UI } from '../constants';
import { Icons } from './icons';

export function VersionIndicator() {
  const {
    updateAvailable,
    serverVersion,
    clientVersion,
    checkForUpdate,
    isChecking,
  } = useUpdateCheck();

  const {
    isDesktop,
    checkForUpdates: checkForDesktopUpdates,
  } = useElectronUpdates();

  const { data: changelogStatus } = useChangelogStatusQuery();
  const markAsRead = useMarkChangelogReadMutation();

  const [showChangelog, setShowChangelog] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [isCheckingDesktop, setIsCheckingDesktop] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownTooltipRef = useRef(false);

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

  const hasUnread = changelogStatus?.has_unread ?? false;
  const isCurrentlyChecking = isChecking || isCheckingDesktop;

  const handleCheckForUpdate = async () => {
    setHasChecked(true);
    if (isDesktop) {
      setIsCheckingDesktop(true);
      await checkForDesktopUpdates();
      // Give a moment for the update status to come back
      setTimeout(() => setIsCheckingDesktop(false), UI.DEBOUNCE.SEARCH);
    } else {
      checkForUpdate();
    }
  };

  return (
    <>
      <div className="version-indicator-wrapper">
        <button
          onClick={handleOpenChangelog}
          className="version-indicator"
          title="View changelog"
        >
          {(updateAvailable || hasUnread) && (
            <span className="version-indicator-orb" />
          )}
          <span className="version-indicator-text">
            v{clientVersion}
          </span>
          {updateAvailable && (
            <span className="version-indicator-update">
              New version available!
            </span>
          )}
        </button>

        {showTooltip && hasUnread && !updateAvailable && (
          <div className="version-indicator-tooltip">
            See what's new
          </div>
        )}
      </div>

      <Modal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        title={updateAvailable ? `Update Available: v${serverVersion}` : 'Changelog'}
        description={updateAvailable ? `You're on v${clientVersion}` : `Current version: v${clientVersion}`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {!updateAvailable && hasChecked && !isCurrentlyChecking && (
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
              {!updateAvailable && (
                <button
                  onClick={handleCheckForUpdate}
                  disabled={isCurrentlyChecking}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--monarch-bg-input)',
                    color: 'var(--monarch-text)',
                  }}
                  aria-label="Check for updates"
                >
                  {isCurrentlyChecking ? (
                    <Icons.Spinner size={16} className="animate-spin" />
                  ) : (
                    <Icons.Refresh size={16} />
                  )}
                  {isCurrentlyChecking ? 'Checking...' : 'Check for Update'}
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
        <ChangelogDisplay version={undefined} showUpdateInstructions={updateAvailable} />
      </Modal>
    </>
  );
}
