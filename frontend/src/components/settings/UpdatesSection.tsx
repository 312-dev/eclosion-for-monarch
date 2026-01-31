/**
 * Updates Section
 *
 * Displays current version and update status.
 * - Desktop: Shows update status from UpdateContext (downloading/ready)
 * - Web: Shows "Check for Updates" button to open update modal
 *
 * Auto-update is always enabled for desktop - no toggle needed.
 */

import { useState } from 'react';
import { Download, RotateCcw, CheckCircle } from 'lucide-react';
import { VersionBadge } from '../VersionBadge';
import { useUpdate } from '../../context/UpdateContext';
import type { VersionInfo } from '../../types';

interface UpdatesSectionProps {
  readonly versionInfo: VersionInfo | null;
  readonly onShowUpdateModal: () => void;
}

/**
 * Desktop update action - shows status and Quit & Relaunch button.
 */
function DesktopUpdateAction() {
  const {
    updateAvailable,
    updateDownloaded,
    updateInfo,
    downloadProgress,
    quitAndInstall,
    checkForUpdates,
  } = useUpdate();
  const [isRestarting, setIsRestarting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    await checkForUpdates();
    // Brief delay to show checking state before resetting
    setTimeout(() => setIsChecking(false), 1500);
  };

  const handleQuitAndRelaunch = () => {
    setIsRestarting(true);
    setTimeout(() => {
      quitAndInstall();
    }, 200);
  };

  // Update downloaded - show restart button
  if (updateDownloaded) {
    return (
      <button
        type="button"
        onClick={handleQuitAndRelaunch}
        disabled={isRestarting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
        style={{
          backgroundColor: 'var(--monarch-success)',
          color: 'white',
        }}
        aria-label={isRestarting ? 'Restarting application' : 'Quit and relaunch to install update'}
      >
        <RotateCcw size={14} className={isRestarting ? 'animate-spin' : ''} />
        {isRestarting ? 'Restarting...' : 'Quit & Relaunch'}
      </button>
    );
  }

  // Update downloading - show progress text
  if (updateAvailable && downloadProgress > 0) {
    return (
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <Download size={14} className="animate-pulse" style={{ color: 'var(--monarch-orange)' }} />
        Downloading v{updateInfo?.version}...
      </div>
    );
  }

  // No update - show "Up to date" with check link
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className="flex items-center gap-1.5 text-sm"
        style={{ color: 'var(--monarch-success)' }}
      >
        <CheckCircle size={14} />
        Up to date
      </span>
      <button
        type="button"
        onClick={handleCheckForUpdates}
        disabled={isChecking}
        className="text-xs hover:underline transition-colors"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        {isChecking ? 'Checking...' : 'Check for updates'}
      </button>
    </div>
  );
}

/**
 * Desktop download progress bar.
 */
function DesktopDownloadProgress() {
  const { updateAvailable, updateDownloaded, downloadProgress } = useUpdate();

  if (!updateAvailable || updateDownloaded || downloadProgress <= 0) {
    return null;
  }

  return (
    <div className="px-4 pb-4">
      <progress
        className="w-full h-1.5 rounded-full overflow-hidden"
        value={downloadProgress}
        max={100}
        aria-label={`Download progress: ${Math.round(downloadProgress)}%`}
        style={{
          // Style the progress element
          appearance: 'none',
          backgroundColor: 'var(--monarch-border)',
        }}
      />
    </div>
  );
}

export function UpdatesSection({ versionInfo, onShowUpdateModal }: UpdatesSectionProps) {
  // Use backend's deployment_type instead of client-side detection
  // This correctly handles tunnel access where window.electron is undefined
  const isDesktop = versionInfo?.deployment_type === 'desktop';

  return (
    <section className="mb-8">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <Download size={12} />
        Updates
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                <Download size={20} style={{ color: 'var(--monarch-text-muted)' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                    v{versionInfo?.version || '...'}
                  </span>
                  {versionInfo && (
                    <VersionBadge version={versionInfo.version} channel={versionInfo.channel} />
                  )}
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                  {versionInfo?.build_time && versionInfo.build_time !== 'unknown'
                    ? `Last updated: ${new Date(versionInfo.build_time).toLocaleDateString()}`
                    : 'Current version'}
                </div>
              </div>
            </div>

            {isDesktop ? (
              <DesktopUpdateAction />
            ) : (
              <button
                type="button"
                onClick={onShowUpdateModal}
                className="px-3 py-1.5 rounded-lg text-sm font-medium hover-bg-page-to-hover"
                style={{
                  color: 'var(--monarch-text-dark)',
                  border: '1px solid var(--monarch-border)',
                }}
              >
                Check for Updates
              </button>
            )}
          </div>
        </div>

        {isDesktop && <DesktopDownloadProgress />}
      </div>
    </section>
  );
}
