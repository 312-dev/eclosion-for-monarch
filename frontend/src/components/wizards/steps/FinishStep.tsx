/**
 * FinishStep - Final step with install/bookmark nudge for the setup wizard
 */

import { CheckCircleIcon, DownloadIcon, BookmarkIcon, CheckIcon } from '../SetupWizardIcons';

interface FinishStepProps {
  readonly canInstall: boolean;
  readonly isInstalled: boolean;
  readonly isIOS: boolean;
  readonly onInstall: () => void;
}

export function FinishStep({ canInstall, isInstalled, isIOS, onInstall }: FinishStepProps) {
  const baseUrl = globalThis.location.origin;

  return (
    <div className="text-center animate-fade-in">
      <div className="mb-4 flex justify-center">
        <CheckCircleIcon size={48} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        You're All Set!
      </h2>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        Your recurring savings tracker is ready to go. Before you dive in, save this app for easy
        access.
      </p>

      <div className="space-y-4 text-left">
        {/* Install App Option */}
        {!isInstalled && (canInstall || isIOS) && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'rgba(255, 105, 45, 0.08)',
              border: '1px solid var(--monarch-orange)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0" style={{ color: 'var(--monarch-orange)' }}>
                <DownloadIcon size={24} />
              </div>
              <div className="flex-1">
                <div className="font-medium mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                  Install as App
                </div>
                <div className="text-sm mb-3" style={{ color: 'var(--monarch-text-muted)' }}>
                  {isIOS
                    ? 'Add to your home screen for quick access like a native app.'
                    : 'Install on your device for quick access and offline support.'}
                </div>
                {canInstall && (
                  <button
                    onClick={onInstall}
                    className="px-4 py-2 text-white rounded-lg text-sm font-medium hover-bg-orange-to-orange-hover"
                  >
                    Install App
                  </button>
                )}
                {!canInstall && isIOS && (
                  <div
                    className="text-sm p-3 rounded"
                    style={{ backgroundColor: 'var(--monarch-bg-page)' }}
                  >
                    <div style={{ color: 'var(--monarch-text-dark)' }}>
                      Tap the <strong>Share</strong> button{' '}
                      <span style={{ fontFamily: 'system-ui' }}>(share icon)</span> then select{' '}
                      <strong>"Add to Home Screen"</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Already Installed */}
        {isInstalled && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--monarch-success-bg)',
              border: '1px solid var(--monarch-success)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0" style={{ color: 'var(--monarch-success)' }}>
                <CheckIcon size={24} />
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--monarch-success)' }}>
                  App Installed
                </div>
                <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                  You're running Eclosion as an installed app.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookmark Option */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0" style={{ color: 'var(--monarch-text-muted)' }}>
              <BookmarkIcon size={24} />
            </div>
            <div className="flex-1">
              <div className="font-medium mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                Bookmark This Page
              </div>
              <div className="text-sm mb-2" style={{ color: 'var(--monarch-text-muted)' }}>
                Save to your bookmarks for easy access.
              </div>
              <div
                className="text-xs p-2 rounded font-mono break-all"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  color: 'var(--monarch-text-muted)',
                  border: '1px solid var(--monarch-border)',
                }}
              >
                {baseUrl}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--monarch-text-muted)' }}>
                Press{' '}
                <kbd
                  className="px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--monarch-bg-card)',
                    border: '1px solid var(--monarch-border)',
                  }}
                >
                  {navigator.userAgent.includes('Mac') ? 'Cmd' : 'Ctrl'}+D
                </kbd>{' '}
                to bookmark
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
