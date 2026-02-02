/**
 * Version Indicator
 *
 * Shows current version and opens changelog modal.
 * Indicates when there are unread changelog entries.
 * For web users, shows update availability and instructions.
 * For desktop users, integrates with the UpdateContext for download/install actions.
 */

import { useState } from 'react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useUpdate } from '../context/UpdateContext';
import {
  useChangelogStatusQuery,
  useMarkChangelogReadMutation,
  useVersionQuery,
} from '../api/queries';
import { Modal } from './ui/Modal';
import { ChangelogDisplay } from './ChangelogDisplay';
import { Icons } from './icons';

export function VersionIndicator() {
  const { updateAvailable, clientVersion, checkForUpdate, isChecking } = useUpdateCheck();
  const desktopUpdate = useUpdate();

  const { data: changelogStatus } = useChangelogStatusQuery();
  const { data: versionInfo } = useVersionQuery();
  const markAsRead = useMarkChangelogReadMutation();

  const [showChangelog, setShowChangelog] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Use backend's deployment_type instead of client-side detection
  // This correctly handles tunnel access where window.electron is undefined
  const isDesktop = versionInfo?.deployment_type === 'desktop';

  // For desktop, use backend version for consistency with Settings
  // For web, use build-time version from __APP_VERSION__
  const displayVersion = isDesktop ? (versionInfo?.version ?? clientVersion) : clientVersion;

  // For desktop, use the UpdateContext state
  const hasDesktopUpdate = isDesktop && desktopUpdate.updateAvailable;
  const isDesktopDownloading = isDesktop && desktopUpdate.isDownloading;
  const desktopNewVersion = desktopUpdate.updateInfo?.version;

  const handleOpenChangelog = () => {
    setShowChangelog(true);
    // Mark as read when opening
    if (changelogStatus?.has_unread) {
      markAsRead.mutate();
    }
  };

  const handleCheckForUpdate = () => {
    setHasChecked(true);
    if (isDesktop) {
      desktopUpdate.checkForUpdates();
    } else {
      checkForUpdate();
    }
  };

  // Show orb only for actual updates (not unread changelog - WhatsNewModal handles that)
  // Desktop uses electron-updater (hasDesktopUpdate), web uses version check (updateAvailable)
  const showOrb = isDesktop ? hasDesktopUpdate : updateAvailable;

  // Build description based on update state
  const getDescription = () => {
    if (isDesktop && hasDesktopUpdate && desktopNewVersion) {
      if (isDesktopDownloading) {
        return `v${displayVersion} → v${desktopNewVersion} downloading (${Math.round(desktopUpdate.downloadProgress)}%)`;
      }
      return `v${displayVersion} → v${desktopNewVersion} available`;
    }
    return `Current version: v${displayVersion}`;
  };

  return (
    <>
      <div className="version-indicator-wrapper">
        <button onClick={handleOpenChangelog} className="version-indicator" title="View changelog">
          {showOrb && <span className="version-indicator-orb" />}
          <span className="version-indicator-text">v{displayVersion}</span>
          {/* Only show "New version available" for web users */}
          {updateAvailable && !isDesktop && (
            <span className="version-indicator-update">New version available!</span>
          )}
        </button>
      </div>

      <Modal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        title="Changelog"
        description={getDescription()}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Show "Up to date" only for users who checked and have no update */}
              {/* Desktop: no hasDesktopUpdate, Web: no updateAvailable */}
              {((isDesktop && !hasDesktopUpdate) || (!isDesktop && !updateAvailable)) &&
                hasChecked &&
                !isChecking && (
                  <span
                    className="flex items-center gap-1.5 text-sm"
                    style={{ color: 'var(--monarch-green)' }}
                  >
                    <Icons.CheckCircle size={16} />
                    Up to date
                  </span>
                )}
              {/* Show download progress for desktop */}
              {isDesktopDownloading && (
                <span
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  <Icons.Spinner size={16} className="animate-spin" />
                  Downloading... {Math.round(desktopUpdate.downloadProgress)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Show check button when no update available/downloading */}
              {/* Desktop: not downloading, Web: no update available */}
              {((isDesktop && !isDesktopDownloading) || (!isDesktop && !updateAvailable)) && (
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
