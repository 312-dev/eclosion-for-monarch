/**
 * DesktopUpdateContent Component
 *
 * Shows live update status for desktop users inside the UpdateModal.
 * Integrates with electron-updater via useElectronUpdates hook.
 */

import { useState } from 'react';
import { Download, RotateCcw, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { UseElectronUpdatesReturn } from '../../hooks';

interface DesktopUpdateContentProps {
  readonly electronUpdates: UseElectronUpdatesReturn;
}

export function DesktopUpdateContent({ electronUpdates }: DesktopUpdateContentProps) {
  const {
    updateAvailable,
    updateDownloaded,
    isDownloading,
    downloadProgress,
    updateInfo,
    currentVersion,
    channel,
    error,
    autoUpdateEnabled,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
  } = electronUpdates;

  const [isChecking, setIsChecking] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isStartingDownload, setIsStartingDownload] = useState(false);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      await checkForUpdates();
    } finally {
      // Small delay to show the checking state
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  const handleRestart = () => {
    setIsRestarting(true);
    setTimeout(() => {
      quitAndInstall();
    }, 200);
  };

  const handleDownload = async () => {
    setIsStartingDownload(true);
    try {
      await downloadUpdate();
    } finally {
      // Keep showing "starting" until progress events arrive
      setTimeout(() => setIsStartingDownload(false), 1000);
    }
  };

  const isBeta = channel === 'beta' || updateInfo?.version?.includes('-beta');

  // Update downloaded and ready
  if (updateDownloaded && updateInfo) {
    return (
      <div className="space-y-4">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--monarch-success-bg)',
            borderColor: 'var(--monarch-success)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-lg shrink-0"
              style={{ backgroundColor: 'var(--monarch-success)', color: 'white' }}
            >
              <CheckCircle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium" style={{ color: 'var(--monarch-success)' }}>
                Update Ready to Install
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                Version {updateInfo.version} has been downloaded and is ready to install.
                Click restart to apply the update.
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRestart}
          disabled={isRestarting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-70"
          style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}
          aria-label={isRestarting ? 'Restarting application' : 'Restart to install update'}
        >
          <RotateCcw size={18} className={isRestarting ? 'animate-spin' : ''} />
          {isRestarting ? 'Restarting...' : 'Restart to Install'}
        </button>
      </div>
    );
  }

  // Update available - show download button or progress based on state
  if (updateAvailable && updateInfo) {
    const showProgress = isDownloading || isStartingDownload || autoUpdateEnabled;

    return (
      <div className="space-y-4">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: isBeta ? 'var(--monarch-accent-muted)' : 'var(--monarch-bg-input)',
            borderColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-lg shrink-0"
              style={{
                backgroundColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-orange)',
                color: 'white',
              }}
            >
              <Download size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                {showProgress ? 'Downloading Update' : 'Update Available'}
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                {showProgress
                  ? `Version ${updateInfo.version} is downloading...`
                  : `Version ${updateInfo.version} is available.`}
              </div>
            </div>
          </div>

          {/* Progress bar - only show when downloading */}
          {showProgress && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                <span>Downloading...</span>
                <span>{Math.round(downloadProgress)}%</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${downloadProgress}%`,
                    backgroundColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-orange)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Download button - only show when NOT auto-downloading */}
        {!showProgress && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={isStartingDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-70"
            style={{
              backgroundColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-orange)',
              color: 'white',
            }}
            aria-label="Download update"
          >
            <Download size={18} />
            Download &amp; Install
          </button>
        )}

        <p className="text-sm text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          {showProgress
            ? 'The update will be ready to install once the download completes.'
            : 'Click the button above to download and install this update.'}
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--monarch-danger-bg)',
            borderColor: 'var(--monarch-danger)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-lg shrink-0"
              style={{ backgroundColor: 'var(--monarch-danger)', color: 'white' }}
            >
              <AlertCircle size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium" style={{ color: 'var(--monarch-danger)' }}>
                Update Error
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                {error}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-70"
          style={{
            backgroundColor: 'var(--monarch-bg-input)',
            color: 'var(--monarch-text-dark)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <RefreshCw size={18} className={isChecking ? 'animate-spin' : ''} />
          {isChecking ? 'Checking...' : 'Try Again'}
        </button>
      </div>
    );
  }

  // No update available - show check button
  return (
    <div className="space-y-4">
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--monarch-bg-input)',
          borderColor: 'var(--monarch-border)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--monarch-bg-page)', color: 'var(--monarch-text-muted)' }}
          >
            <CheckCircle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              You&apos;re Up to Date
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Currently running version {currentVersion}
              {channel === 'beta' && ' (beta channel)'}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheckForUpdates}
        disabled={isChecking}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-70"
        style={{
          backgroundColor: 'var(--monarch-bg-input)',
          color: 'var(--monarch-text-dark)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {isChecking ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Checking for Updates...
          </>
        ) : (
          <>
            <RefreshCw size={18} />
            Check for Updates
          </>
        )}
      </button>

      <p className="text-xs text-center" style={{ color: 'var(--monarch-text-muted)' }}>
        {autoUpdateEnabled
          ? 'Updates are downloaded automatically in the background.'
          : 'Auto-update is disabled. Click "Check for Updates" to see if a new version is available.'}
      </p>
    </div>
  );
}
