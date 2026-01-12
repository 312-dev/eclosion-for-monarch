import { useState } from 'react';
import { useChangelogQuery } from '../api/queries';
import type { ChangelogEntry, ChangelogSection } from '../types';
import { InfoIcon, CheckCircleIcon, CopyIcon, ChevronDownIcon, ChevronUpIcon } from './icons';
import { isDesktopMode } from '../utils/apiBase';

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

  if (isLoading) {
    return <div style={{ color: 'var(--monarch-text-muted)' }}>Loading changelog...</div>;
  }

  if (error || !data?.entries.length) {
    return <div style={{ color: 'var(--monarch-text-muted)' }}>No changelog available.</div>;
  }

  const entries = version
    ? data.entries.filter(e => e.version === version)
    : data.entries;

  // Desktop uses electron-updater, so don't show web update instructions
  const isDesktop = isDesktopMode();

  return (
    <div className="space-y-6">
      {showUpdateInstructions && !isDesktop && <UpdateInstructions />}

      {entries.map((entry) => (
        <ChangelogEntryCard key={entry.version} entry={entry} />
      ))}
    </div>
  );
}

function UpdateInstructions() {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const dockerCommands = {
    backup: 'docker compose cp eclosion:/app/state ./backup-$(date +%Y%m%d)',
    update: 'docker compose pull && docker compose up -d',
  };

  return (
    <div
      className="p-4 rounded-lg mb-4"
      style={{ backgroundColor: 'var(--monarch-bg-elevated, var(--monarch-bg-hover))' }}
    >
      <h4
        className="font-medium mb-3 flex items-center gap-2"
        style={{ color: 'var(--monarch-text)' }}
      >
        <InfoIcon size={20} />
        How to Update
      </h4>

      <div className="space-y-4">
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--monarch-text-muted)' }}>
            <strong>1. Backup your data first (recommended):</strong>
          </p>
          <CopyableCommand
            command={dockerCommands.backup}
            copied={copiedCommand === 'backup'}
            onCopy={() => copyToClipboard(dockerCommands.backup, 'backup')}
          />
        </div>
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--monarch-text-muted)' }}>
            <strong>2. Pull and restart:</strong>
          </p>
          <CopyableCommand
            command={dockerCommands.update}
            copied={copiedCommand === 'update'}
            onCopy={() => copyToClipboard(dockerCommands.update, 'update')}
          />
        </div>
        <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          <strong>3.</strong> Refresh this page to use the new version.
        </p>
      </div>
    </div>
  );
}

function CopyableCommand({ command, copied, onCopy }: { command: string; copied: boolean; onCopy: () => void }) {
  return (
    <div
      className="flex items-center gap-2 p-2 rounded font-mono text-xs"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <code className="flex-1 overflow-x-auto" style={{ color: 'var(--monarch-text)' }}>
        {command}
      </code>
      <button
        onClick={onCopy}
        className="flex-shrink-0 p-1.5 rounded transition-colors hover:bg-[var(--monarch-bg-hover)]"
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <CheckCircleIcon size={16} className="text-[var(--monarch-success)]" />
        ) : (
          <CopyIcon size={16} style={{ color: 'var(--monarch-text-muted)' }} />
        )}
      </button>
    </div>
  );
}

const SUMMARY_LABELS: { key: keyof ChangelogSection; singular: string; plural: string }[] = [
  { key: 'added', singular: 'new feature', plural: 'new features' },
  { key: 'fixed', singular: 'bug fix', plural: 'bug fixes' },
  { key: 'changed', singular: 'improvement', plural: 'improvements' },
  { key: 'security', singular: 'security update', plural: 'security updates' },
  { key: 'deprecated', singular: 'deprecation', plural: 'deprecations' },
  { key: 'removed', singular: 'removal', plural: 'removals' },
];

function generateAutoSummary(sections: ChangelogSection): string {
  const parts = SUMMARY_LABELS
    .filter(({ key }) => sections[key]?.length)
    .map(({ key, singular, plural }) => {
      const count = sections[key]!.length;
      return `${count} ${count > 1 ? plural : singular}`;
    });

  if (parts.length === 0) return '';
  if (parts.length === 1) return `This release includes ${parts[0]}.`;
  const last = parts.pop();
  return `This release includes ${parts.join(', ')}, and ${last}.`;
}

function ChangelogEntryCard({ entry }: { entry: ChangelogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sections = Object.entries(entry.sections) as [keyof ChangelogSection, string[]][];
  const hasDetails = sections.some(([, items]) => items.length > 0);

  // Use provided summary or generate one from sections
  const summary = entry.summary || generateAutoSummary(entry.sections);

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

      {summary && (
        <p
          className="text-sm"
          style={{ color: 'var(--monarch-text)' }}
        >
          {summary}
        </p>
      )}

      {hasDetails && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--monarch-orange)' }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Hide technical details' : 'Show technical details'}
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon size={16} />
              Hide technical details
            </>
          ) : (
            <>
              <ChevronDownIcon size={16} />
              Show technical details
            </>
          )}
        </button>
      )}

      {isExpanded && sections.map(([section, items]) => (
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
