/**
 * ReleaseSelector - Component for selecting a release version to update to
 */

import type { Release } from '../../api/client';

interface ReleaseSelectorProps {
  readonly stableReleases: Release[];
  readonly betaReleases: Release[];
  readonly selectedVersion: string | null;
  readonly onSelectVersion: (version: string) => void;
}

interface ReleaseListProps {
  readonly releases: Release[];
  readonly selectedVersion: string | null;
  readonly onSelectVersion: (version: string) => void;
  readonly variant: 'stable' | 'beta';
}

function ReleaseList({ releases, selectedVersion, onSelectVersion, variant }: ReleaseListProps) {
  const isStable = variant === 'stable';
  const accentColor = isStable ? 'success' : 'accent';

  return (
    <div className="space-y-2 max-h-32 overflow-y-auto">
      {releases.map((release) => (
        <button
          key={release.version}
          onClick={() => onSelectVersion(release.version)}
          className={`w-full p-3 rounded-lg text-left transition-colors border ${
            selectedVersion === release.version ? 'ring-2 ring-offset-1' : ''
          }`}
          style={{
            backgroundColor: selectedVersion === release.version
              ? `var(--monarch-${accentColor}-bg)`
              : 'var(--monarch-bg-input)',
            borderColor: selectedVersion === release.version
              ? `var(--monarch-${accentColor})`
              : 'var(--monarch-border)',
            '--tw-ring-color': `var(--monarch-${accentColor})`,
            '--tw-ring-offset-color': 'var(--monarch-bg-card)',
          } as React.CSSProperties}
          disabled={release.is_current}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                v{release.version}
              </span>
              {release.is_current && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--monarch-bg-card)',
                    color: 'var(--monarch-text-muted)',
                  }}
                >
                  current
                </span>
              )}
            </div>
            {release.published_at && (
              <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                {new Date(release.published_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

export function ReleaseSelector({
  stableReleases,
  betaReleases,
  selectedVersion,
  onSelectVersion,
}: ReleaseSelectorProps) {
  if (stableReleases.length === 0 && betaReleases.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {stableReleases.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Stable Releases
            </h3>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--monarch-success-bg)',
                color: 'var(--monarch-success)',
              }}
            >
              Recommended
            </span>
          </div>
          <ReleaseList
            releases={stableReleases}
            selectedVersion={selectedVersion}
            onSelectVersion={onSelectVersion}
            variant="stable"
          />
        </div>
      )}

      {betaReleases.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Beta Releases
            </h3>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--monarch-accent-muted)',
                color: 'var(--monarch-accent)',
              }}
            >
              Preview
            </span>
          </div>
          <ReleaseList
            releases={betaReleases}
            selectedVersion={selectedVersion}
            onSelectVersion={onSelectVersion}
            variant="beta"
          />
        </div>
      )}
    </div>
  );
}
