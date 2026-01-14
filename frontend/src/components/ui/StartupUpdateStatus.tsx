/**
 * Startup Update Status Component
 *
 * Shows update download progress or "ready to install" status during startup.
 */

interface StartupUpdateStatusProps {
  status: 'none' | 'available' | 'downloading' | 'ready';
  version: string | null;
  progress: number;
}

export function StartupUpdateStatus({ status, version, progress }: StartupUpdateStatusProps) {
  if (status === 'none') return null;

  return (
    <div
      className="w-full mt-4 p-3 rounded-lg animate-fade-in"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4"
          style={{ color: status === 'ready' ? 'var(--monarch-success)' : 'var(--monarch-orange)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {status === 'ready'
            ? `Update v${version} ready to install`
            : `Downloading v${version}...`}
        </span>
      </div>
      {status === 'downloading' && (
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--monarch-border)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--monarch-orange)',
            }}
          />
        </div>
      )}
      {status === 'ready' && (
        <button
          onClick={() => globalThis.electron?.quitAndInstall()}
          className="w-full mt-2 px-3 py-1.5 rounded text-sm font-medium transition-colors btn-press"
          style={{ backgroundColor: 'var(--monarch-success)', color: 'white' }}
        >
          Restart & Update
        </button>
      )}
    </div>
  );
}
