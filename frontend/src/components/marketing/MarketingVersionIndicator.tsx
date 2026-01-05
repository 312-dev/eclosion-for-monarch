/**
 * Marketing Version Indicator
 *
 * Simplified version indicator for the marketing site.
 * Shows version + badge and opens a changelog modal using baked-in data.
 * Unlike the app's VersionIndicator, this doesn't check for updates (no backend).
 */

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { ChangelogDisplay } from '../ChangelogDisplay';
import { VersionBadge } from '../VersionBadge';

// Vite injects app version at build time
declare const __APP_VERSION__: string;

export function MarketingVersionIndicator() {
  const [showChangelog, setShowChangelog] = useState(false);

  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

  return (
    <>
      <button
        type="button"
        onClick={() => setShowChangelog(true)}
        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors hover:bg-[var(--monarch-bg-hover)]"
        style={{ color: 'var(--monarch-text-muted)' }}
        title="View changelog"
      >
        v{version}
        <VersionBadge version={version} channel={undefined} />
      </button>

      <Modal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        title="Changelog"
        description={`Current version: v${version}`}
        maxWidth="lg"
        footer={
          <button
            type="button"
            onClick={() => setShowChangelog(false)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--monarch-bg-input)',
              color: 'var(--monarch-text)',
            }}
          >
            Close
          </button>
        }
      >
        <ChangelogDisplay version={undefined} showUpdateInstructions={false} />
      </Modal>
    </>
  );
}
