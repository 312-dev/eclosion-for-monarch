/**
 * Marketing Version Indicator
 *
 * Simplified version indicator for the marketing site.
 * Shows BETA or STABLE badge based on the current site (beta.eclosion.app vs eclosion.app).
 * Opens a changelog modal using baked-in data.
 * Unlike the app's VersionIndicator, this doesn't check for updates (no backend).
 */

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { ChangelogDisplay } from '../ChangelogDisplay';
import { VersionBadge } from '../VersionBadge';
import { useIsBetaSite } from '../../hooks';

// Vite injects app version at build time
declare const __APP_VERSION__: string;

export function MarketingVersionIndicator() {
  const [showChangelog, setShowChangelog] = useState(false);
  const isBetaSite = useIsBetaSite();

  const version = typeof __APP_VERSION__ === 'undefined' ? '0.0.0' : __APP_VERSION__;
  // Use site-based detection: beta.eclosion.app shows BETA, eclosion.app shows STABLE
  const channel = isBetaSite ? 'beta' : 'stable';

  return (
    <>
      <button
        type="button"
        onClick={() => setShowChangelog(true)}
        className="flex items-center"
        title="View changelog"
      >
        <VersionBadge
          version={version}
          channel={channel}
          size="md"
          className="hover:brightness-110 transition-all"
        />
      </button>

      <Modal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        title="Changelog"
        description={`Current version: v${version}`}
        maxWidth="lg"
        footer={
          <div className="flex justify-end w-full">
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
          </div>
        }
      >
        <ChangelogDisplay version={undefined} showUpdateInstructions={false} />
      </Modal>
    </>
  );
}
