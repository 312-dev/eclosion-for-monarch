/**
 * UpdateErrorBanner Component
 *
 * Displays a banner when a desktop app update fails to download or install.
 * Provides retry button and manual download link for recovery.
 */

import { useState } from 'react';
import { AlertTriangle, X, ExternalLink, RotateCcw } from 'lucide-react';
import { useElectronUpdates } from '../../hooks';

/**
 * Banner shown when a desktop update fails.
 */
export function UpdateErrorBanner() {
  const {
    error,
    isDesktop,
    checkForUpdates,
  } = useElectronUpdates();

  const [isRetrying, setIsRetrying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't render if not desktop, no error, or dismissed
  if (!isDesktop || !error || dismissed) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await checkForUpdates();
    } finally {
      // Keep retrying state briefly to show feedback
      setTimeout(() => setIsRetrying(false), 500);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const releasesUrl = 'https://github.com/graysoncadams/eclosion-for-monarch/releases';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="relative"
      style={{
        backgroundColor: 'var(--monarch-error)',
        color: 'white',
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-sm font-medium">Update failed</span>
            <span className="text-sm opacity-90 ml-2 hidden sm:inline">
              {error}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded transition-colors disabled:opacity-70"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            }}
            aria-label={isRetrying ? 'Retrying update check' : 'Retry update check'}
          >
            <RotateCcw size={14} className={isRetrying ? 'animate-spin' : ''} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>

          <a
            href={releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white/10 transition-colors"
            aria-label="Download update manually from GitHub (opens in new tab)"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Manual Download</span>
            <span className="sm:hidden">Download</span>
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Dismiss error notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Show full error on mobile when it's truncated */}
      <div className="px-4 pb-2 pt-0 text-sm opacity-90 sm:hidden">
        {error}
      </div>
    </div>
  );
}
