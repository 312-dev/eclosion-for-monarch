/**
 * WhatsNewModal Component
 *
 * Automatically shows changelog on first app open after an upgrade.
 * Can be dismissed and won't show again until the next upgrade.
 * User can still view changelog by clicking the version indicator.
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { ChangelogDisplay } from './ChangelogDisplay';
import { useChangelogStatusQuery, useMarkChangelogReadMutation, useVersionQuery } from '../api/queries';

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const hasAutoOpenedRef = useRef(false);

  const { data: changelogStatus, isLoading: statusLoading } = useChangelogStatusQuery();
  const { data: versionInfo } = useVersionQuery();
  const markAsRead = useMarkChangelogReadMutation();

  // Auto-open modal on first render if there are unread changelog entries
  useEffect(() => {
    if (
      !statusLoading &&
      changelogStatus?.has_unread &&
      !hasAutoOpenedRef.current
    ) {
      hasAutoOpenedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time modal auto-open
      setIsOpen(true);
    }
  }, [changelogStatus?.has_unread, statusLoading]);

  const handleClose = () => {
    setIsOpen(false);
    // Mark changelog as read when closing
    if (changelogStatus?.has_unread) {
      markAsRead.mutate();
    }
  };

  // Don't render if no unread entries (after first check)
  if (!changelogStatus?.has_unread && !isOpen) {
    return null;
  }

  const currentVersion = versionInfo?.version || changelogStatus?.current_version || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <Sparkles size={20} style={{ color: 'var(--monarch-orange)' }} />
          What's New in v{currentVersion}
        </span>
      }
      description="Here's what changed in this update"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Click the version badge anytime to view the changelog
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}
          >
            Got it
          </button>
        </div>
      }
    >
      <ChangelogDisplay
        version={currentVersion}
        showUpdateInstructions={false}
      />
    </Modal>
  );
}
