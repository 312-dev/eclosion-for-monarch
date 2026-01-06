/**
 * UpdateReadyBanner Component
 *
 * Displays a banner when a desktop app update has been downloaded
 * and is ready to install. Shows version info, changelog link,
 * and restart button.
 */

import { useState } from 'react';
import { Download, X, ExternalLink, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useElectronUpdates } from '../../hooks';

/**
 * Banner shown when a desktop update is downloaded and ready to install.
 */
export function UpdateReadyBanner() {
  const {
    updateDownloaded,
    updateInfo,
    isDesktop,
    quitAndInstall,
    dismiss,
    dismissed,
  } = useElectronUpdates();

  const [showNotes, setShowNotes] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // Don't render if not desktop, no update ready, or dismissed
  if (!isDesktop || !updateDownloaded || dismissed) {
    return null;
  }

  const version = updateInfo?.version || 'new version';
  const releaseNotes = updateInfo?.releaseNotes;
  const isBeta = version.includes('-beta');

  const handleRestart = () => {
    setIsRestarting(true);
    // Small delay to show loading state
    setTimeout(() => {
      quitAndInstall();
    }, 200);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="relative"
      style={{
        backgroundColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-success)',
        color: 'white',
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-3">
          <Download size={18} className="shrink-0" aria-hidden="true" />
          <span className="text-sm">
            <strong>v{version}</strong> is ready to install
          </span>

          {releaseNotes && (
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1 text-sm underline hover:no-underline"
              aria-expanded={showNotes}
              aria-controls="update-release-notes"
            >
              What&apos;s new
              {showNotes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://github.com/monarchmoney/eclosion/releases/tag/v${version}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white/10 transition-colors"
            aria-label="View release on GitHub"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <button
            type="button"
            onClick={handleRestart}
            disabled={isRestarting}
            className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded transition-colors disabled:opacity-70"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            }}
            aria-label={isRestarting ? 'Restarting application' : 'Restart to update'}
          >
            <RotateCcw size={14} className={isRestarting ? 'animate-spin' : ''} />
            {isRestarting ? 'Restarting...' : 'Restart Now'}
          </button>

          <button
            type="button"
            onClick={dismiss}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Dismiss update notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Expandable release notes */}
      {releaseNotes && showNotes && (
        <div
          id="update-release-notes"
          className="px-4 pb-3 pt-1 text-sm border-t border-white/20"
        >
          <div
            className="prose prose-sm prose-invert max-w-none"
            style={{ color: 'rgba(255, 255, 255, 0.9)' }}
          >
            {releaseNotes}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of the update banner for use in settings or sidebar.
 */
export function UpdateReadyCard() {
  const {
    updateDownloaded,
    updateInfo,
    isDesktop,
    quitAndInstall,
  } = useElectronUpdates();

  const [isRestarting, setIsRestarting] = useState(false);

  if (!isDesktop || !updateDownloaded) {
    return null;
  }

  const version = updateInfo?.version || 'new version';
  const isBeta = version.includes('-beta');

  const handleRestart = () => {
    setIsRestarting(true);
    setTimeout(() => {
      quitAndInstall();
    }, 200);
  };

  return (
    <div
      className="p-3 rounded-lg border"
      style={{
        backgroundColor: isBeta ? 'var(--monarch-accent-muted)' : 'var(--monarch-success-bg)',
        borderColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-success)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{
            backgroundColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-success)',
            color: 'white',
          }}
        >
          <Download size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-medium text-sm"
            style={{ color: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-success)' }}
          >
            Update Ready
          </div>
          <div className="text-xs truncate" style={{ color: 'var(--monarch-text-muted)' }}>
            v{version} downloaded
          </div>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          disabled={isRestarting}
          className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-70"
          style={{
            backgroundColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-success)',
            color: 'white',
          }}
        >
          {isRestarting ? 'Restarting...' : 'Restart'}
        </button>
      </div>
    </div>
  );
}
