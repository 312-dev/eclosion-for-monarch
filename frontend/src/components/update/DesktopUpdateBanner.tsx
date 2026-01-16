/**
 * DesktopUpdateBanner Component
 *
 * Unified, non-dismissible banner for desktop update notifications.
 * Shows download progress during download, "Quit & Relaunch" button when ready.
 *
 * Behavior:
 * - Downloading: Shows progress bar with percentage
 * - Ready: Shows green banner with "Quit & Relaunch" button
 * - Not dismissible - update is expected to be installed
 */

import { useState, useRef, useCallback } from 'react';
import { Download, RotateCcw, AlertCircle } from 'lucide-react';
import { useUpdate } from '../../context/UpdateContext';

// Timeout for install operation (if app doesn't quit within this time, show error)
const INSTALL_TIMEOUT_MS = 10000;

/** Props for the ReadyToInstallBanner component */
interface ReadyBannerProps {
  readonly isBeta: boolean;
  readonly installError: string | null;
  readonly isRestarting: boolean;
  readonly onQuitAndRelaunch: () => void;
}

/** Banner shown when update is downloaded and ready to install */
function ReadyToInstallBanner({
  isBeta,
  installError,
  isRestarting,
  onQuitAndRelaunch,
}: ReadyBannerProps) {
  const hasError = !!installError;

  // Determine accent color based on state
  const getAccentColor = () => {
    if (hasError) return 'var(--monarch-error)';
    if (isBeta) return 'var(--monarch-accent, #a78bfa)';
    return 'var(--monarch-success)';
  };
  const accentColor = getAccentColor();

  // Determine button text
  const getButtonText = () => {
    if (isRestarting) return 'Restarting...';
    if (hasError) return 'Try Again';
    return 'Quit & Relaunch';
  };

  const Icon = hasError ? AlertCircle : Download;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
      style={{
        backgroundColor: 'var(--monarch-bg-elevated)',
        borderLeft: `3px solid ${accentColor}`,
        color: 'var(--monarch-text-dark)',
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className="shrink-0" style={{ color: accentColor }} aria-hidden="true" />
        <span>{hasError ? installError : 'A new version of Eclosion is ready to install'}</span>
      </div>

      <button
        type="button"
        onClick={onQuitAndRelaunch}
        disabled={isRestarting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-70 hover:opacity-90"
        style={{ backgroundColor: accentColor, color: '#1a1918' }}
        aria-label={isRestarting ? 'Restarting application' : 'Quit and relaunch to install update'}
      >
        <RotateCcw size={14} className={isRestarting ? 'animate-spin' : ''} />
        {getButtonText()}
      </button>
    </div>
  );
}

export function DesktopUpdateBanner() {
  const {
    isDesktop,
    updateAvailable,
    updateDownloaded,
    isDownloading,
    downloadProgress,
    updateInfo,
    quitAndInstall,
    error: updateError,
  } = useUpdate();

  const [isRestarting, setIsRestarting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Combine errors - show backend error if we're restarting, otherwise local error
  const installError = isRestarting ? updateError || localError : localError;

  // Only show as "restarting" if we haven't received an error yet
  const showAsRestarting = isRestarting && !installError;

  // Clear any pending timeout
  const clearInstallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Only show on desktop when there's an update in progress
  if (!isDesktop || (!updateAvailable && !updateDownloaded)) {
    return null;
  }

  const version = updateInfo?.version || 'new version';
  const progress = Math.round(downloadProgress);
  const isBeta = version.includes('-beta');

  const handleQuitAndRelaunch = () => {
    setIsRestarting(true);
    setLocalError(null);
    clearInstallTimeout();

    // Set timeout - if app doesn't quit, installation likely failed
    timeoutRef.current = setTimeout(() => {
      setIsRestarting(false);
      setLocalError('Installation timed out. Please try again or restart the app manually.');
    }, INSTALL_TIMEOUT_MS);

    // Small delay to show loading state
    setTimeout(() => {
      quitAndInstall();
    }, 200);
  };

  // Update downloaded - show "Quit & Relaunch" banner
  if (updateDownloaded) {
    return (
      <ReadyToInstallBanner
        isBeta={isBeta}
        installError={installError}
        isRestarting={showAsRestarting}
        onQuitAndRelaunch={handleQuitAndRelaunch}
      />
    );
  }

  // Update downloading - show progress
  if (updateAvailable && (isDownloading || progress > 0)) {
    return (
      <output
        aria-live="polite"
        aria-label={`Downloading update v${version}: ${progress}% complete`}
        className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          borderBottom: '1px solid var(--monarch-border)',
          flexShrink: 0,
          display: 'flex',
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Download
            size={16}
            className="shrink-0"
            style={{ color: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-orange)' }}
            aria-hidden="true"
          />

          <span style={{ color: 'var(--monarch-text-dark)' }}>
            Downloading v{version}... {progress}%
          </span>

          <progress
            className="flex-1 h-1.5 max-w-50"
            value={progress}
            max={100}
            style={{
              appearance: 'none',
              backgroundColor: 'var(--monarch-border)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          />
        </div>
      </output>
    );
  }

  // Update available but not yet downloading (shouldn't happen with auto-download)
  return null;
}
