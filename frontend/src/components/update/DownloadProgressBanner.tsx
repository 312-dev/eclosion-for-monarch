/**
 * DownloadProgressBanner Component
 *
 * Displays download progress for desktop app updates.
 * Shows during the downloading phase only - UpdateReadyBanner handles the ready state.
 * Works independently of backend - communicates directly with Electron main process.
 */

import { Download, X } from 'lucide-react';
import { useElectronUpdates } from '../../hooks';

/**
 * Banner shown while a desktop update is downloading.
 * Displays version, progress percentage, and progress bar.
 */
export function DownloadProgressBanner() {
  const {
    updateAvailable,
    updateDownloaded,
    downloadProgress,
    updateInfo,
    isDesktop,
    dismiss,
    dismissed,
  } = useElectronUpdates();

  // Only show when a download is actually in progress
  // - updateAvailable: an update was found
  // - !updateDownloaded: not yet complete
  // - downloadProgress > 0: download has actually started (not just "available")
  // If downloadProgress is 0, no download has started (auto-download may be disabled)
  // UpdateReadyBanner handles the ready state
  if (!isDesktop || !updateAvailable || updateDownloaded || dismissed || downloadProgress === 0) {
    return null;
  }

  const version = updateInfo?.version || 'unknown';
  const progress = Math.round(downloadProgress);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Downloading update v${version}: ${progress}% complete`}
      className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        borderBottom: '1px solid var(--monarch-border)',
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Download icon */}
        <Download
          size={16}
          className="flex-shrink-0"
          style={{ color: 'var(--monarch-orange)' }}
          aria-hidden="true"
        />

        {/* Status text */}
        <span style={{ color: 'var(--monarch-text-dark)' }}>
          Downloading v{version}... {progress}%
        </span>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[200px]"
          style={{ backgroundColor: 'var(--monarch-border)' }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--monarch-orange)',
            }}
          />
        </div>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={dismiss}
        className="p-1 rounded transition-colors hover:bg-[var(--monarch-bg-hover)] flex-shrink-0"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label="Dismiss download notification"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
