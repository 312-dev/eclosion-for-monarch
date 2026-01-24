/**
 * WhatsNewModal Component
 *
 * Automatically shows changelog on first app open after an upgrade.
 * Shows ALL versions since the user's last read version, not just the current.
 * This handles cases where users skip multiple versions.
 *
 * Can be dismissed and won't show again until the next upgrade.
 * User can still view changelog by clicking the version indicator.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { WarningButton } from './ui/ModalButtons';
import { ChangelogDisplay } from './ChangelogDisplay';
import {
  useChangelogStatusQuery,
  useMarkChangelogReadMutation,
  useChangelogQuery,
} from '../api/queries';
import { compareSemver } from '../utils/semver';

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const hasAutoOpenedRef = useRef(false);

  const { data: changelogStatus, isLoading: statusLoading } = useChangelogStatusQuery();
  const { data: changelogData } = useChangelogQuery(20); // Fetch more to cover version jumps
  const markAsRead = useMarkChangelogReadMutation();

  // Auto-open modal on first render if there are unread changelog entries
  useEffect(() => {
    if (!statusLoading && changelogStatus?.has_unread && !hasAutoOpenedRef.current) {
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

  // Extract values outside useMemo to satisfy React Compiler
  const entries = changelogData?.entries;
  const lastRead = changelogStatus?.last_read_version;
  const current = changelogStatus?.current_version;

  // Filter changelog entries to only show versions newer than last read
  const unreadEntries = useMemo(() => {
    if (!entries || !changelogStatus || !current) return [];

    // If no last read version, this is first time - show only current version
    if (!lastRead) {
      return entries.filter((e) => e.version === current);
    }

    // Filter to entries newer than lastRead and up to current
    return entries.filter((entry) => {
      const isNewerThanLastRead = compareSemver(entry.version, lastRead) > 0;
      const isAtOrBeforeCurrent = compareSemver(entry.version, current) <= 0;
      return isNewerThanLastRead && isAtOrBeforeCurrent;
    });
  }, [entries, changelogStatus, lastRead, current]);

  // Don't render if no unread entries (after first check)
  if (!changelogStatus?.has_unread && !isOpen) {
    return null;
  }

  const currentVersion = current || '';
  const lastReadVersion = lastRead;
  const hasMultipleVersions = unreadEntries.length > 1;

  // Build title based on whether user jumped multiple versions
  const title =
    hasMultipleVersions && lastReadVersion
      ? `What's New (v${lastReadVersion} → v${currentVersion})`
      : `What's New in v${currentVersion}`;

  const description = hasMultipleVersions
    ? `You've updated across ${unreadEntries.length} releases. Here's everything that changed.`
    : "Here's what changed in this update";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <Sparkles size={20} style={{ color: 'var(--monarch-orange)' }} />
          {title}
        </span>
      }
      description={description}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Click the version badge anytime to view the changelog
          </span>
          <WarningButton onClick={handleClose}>Got it, thanks!</WarningButton>
        </div>
      }
    >
      {/* Show all unread versions, not just current */}
      <ChangelogDisplay
        version={hasMultipleVersions ? undefined : currentVersion}
        limit={unreadEntries.length || 5}
        showUpdateInstructions={false}
      />
    </Modal>
  );
}
