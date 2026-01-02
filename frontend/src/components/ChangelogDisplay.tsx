import { useChangelogQuery, useDeploymentInfoQuery } from '../api/queries';
import type { ChangelogEntry, ChangelogSection } from '../types';
import { InfoIcon } from './icons';

export interface ChangelogDisplayProps {
  version: string | undefined; // Show specific version, or all if undefined
  limit?: number;
  showUpdateInstructions: boolean | undefined;
}

const SECTION_CONFIG: Record<keyof ChangelogSection, { icon: string; label: string; color: string }> = {
  added: { icon: '+', label: 'Added', color: 'var(--monarch-success)' },
  changed: { icon: '~', label: 'Changed', color: 'var(--monarch-warning)' },
  deprecated: { icon: '!', label: 'Deprecated', color: 'var(--monarch-text-muted)' },
  removed: { icon: '-', label: 'Removed', color: 'var(--monarch-error)' },
  fixed: { icon: '*', label: 'Fixed', color: 'var(--monarch-info, #3b82f6)' },
  security: { icon: '!', label: 'Security', color: 'var(--monarch-error)' },
};

export function ChangelogDisplay({ version, limit = 5, showUpdateInstructions = false }: ChangelogDisplayProps) {
  const { data, isLoading, error } = useChangelogQuery(limit);
  const { data: deploymentInfo } = useDeploymentInfoQuery();

  if (isLoading) {
    return <div style={{ color: 'var(--monarch-text-muted)' }}>Loading changelog...</div>;
  }

  if (error || !data?.entries.length) {
    return <div style={{ color: 'var(--monarch-text-muted)' }}>No changelog available.</div>;
  }

  const entries = version
    ? data.entries.filter(e => e.version === version)
    : data.entries;

  return (
    <div className="space-y-6">
      {showUpdateInstructions && (
        <UpdateInstructions isRailway={deploymentInfo?.is_railway ?? false} />
      )}

      {entries.map((entry) => (
        <ChangelogEntryCard key={entry.version} entry={entry} />
      ))}
    </div>
  );
}

function UpdateInstructions({ isRailway }: { isRailway: boolean }) {
  return (
    <div
      className="p-4 rounded-lg mb-4"
      style={{ backgroundColor: 'var(--monarch-bg-elevated, var(--monarch-bg-hover))' }}
    >
      <h4
        className="font-medium mb-2 flex items-center gap-2"
        style={{ color: 'var(--monarch-text)' }}
      >
        <InfoIcon size={20} />
        How to Update
      </h4>

      {isRailway ? (
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          <li>Go to your <a href="https://railway.app/dashboard" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--monarch-orange)' }}>Railway Dashboard</a></li>
          <li>Click on your Eclosion project</li>
          <li>Click <strong>"Deploy"</strong> or <strong>"Redeploy"</strong> to pull the latest version</li>
          <li>Wait for the deployment to complete (usually 1-2 minutes)</li>
          <li>Refresh this page to use the new version</li>
        </ol>
      ) : (
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          <li>Pull the latest changes from the repository</li>
          <li>Rebuild and restart the application</li>
          <li>Refresh this page to use the new version</li>
        </ol>
      )}
    </div>
  );
}

function ChangelogEntryCard({ entry }: { entry: ChangelogEntry }) {
  const sections = Object.entries(entry.sections) as [keyof ChangelogSection, string[]][];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="font-semibold"
          style={{ color: 'var(--monarch-text)' }}
        >
          v{entry.version}
        </span>
        <span
          className="text-sm"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          {entry.date}
        </span>
      </div>

      {sections.map(([section, items]) => (
        items.length > 0 && (
          <div key={section} className="space-y-1">
            <div
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: SECTION_CONFIG[section].color }}
            >
              <span className="font-mono">{SECTION_CONFIG[section].icon}</span>
              <span>{SECTION_CONFIG[section].label}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {items.map((item, i) => (
                <li
                  key={i}
                  className="text-sm"
                  style={{ color: 'var(--monarch-text)' }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )
      ))}
    </div>
  );
}
