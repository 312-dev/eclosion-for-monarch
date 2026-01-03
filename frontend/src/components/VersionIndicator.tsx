import { useState, useEffect, useRef } from 'react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useChangelogStatusQuery, useMarkChangelogReadMutation } from '../api/queries';
import { Modal } from './ui/Modal';
import { ChangelogDisplay } from './ChangelogDisplay';
import { UI } from '../constants';

export function VersionIndicator() {
  const {
    updateAvailable,
    serverVersion,
    clientVersion,
  } = useUpdateCheck();

  const { data: changelogStatus } = useChangelogStatusQuery();
  const markAsRead = useMarkChangelogReadMutation();

  const [showChangelog, setShowChangelog] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
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
        }
      >
        <ChangelogDisplay version={undefined} showUpdateInstructions={updateAvailable} />
      </Modal>
    </>
  );
}
