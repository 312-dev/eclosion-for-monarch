import { useState } from 'react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { Modal } from './ui/Modal';
import { ChangelogDisplay } from './ChangelogDisplay';
import { SyncIcon } from './icons';

export function UpdateBanner() {
  const { updateAvailable, serverVersion, updateType, dismissed, dismissUpdate } = useUpdateCheck();

  const [showChangelog, setShowChangelog] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const updateTypeLabel = {
    major: 'Major update',
    minor: 'New features',
    patch: 'Bug fixes',
  }[updateType ?? 'patch'];

  return (
    <>
      <output
        className="update-banner flex items-center justify-between gap-3 py-2 px-4 text-sm"
        style={{
          backgroundColor: 'var(--monarch-orange)',
          borderTop: '1px solid var(--monarch-border)',
          color: 'white',
          flexShrink: 0,
          display: 'flex',
        }}
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <SyncIcon size={16} />
          <span>
            <strong>{updateTypeLabel}</strong> available (v{serverVersion})
          </span>
          <button onClick={() => setShowChangelog(true)} className="underline hover:no-underline">
            What's new?
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={dismissUpdate}
            className="px-3 py-1 rounded transition-opacity hover:opacity-80"
          >
            Later
          </button>
          <button
            onClick={() => setShowChangelog(true)}
            className="px-3 py-1 rounded font-medium transition-colors"
            style={{
              backgroundColor: 'white',
              color: 'var(--monarch-orange)',
            }}
          >
            View Update
          </button>
        </div>
      </output>

      <Modal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        title={`What's New in v${serverVersion}`}
        maxWidth="lg"
        footer={
          <div className="flex justify-end w-full">
            <button
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
        <ChangelogDisplay version={serverVersion ?? undefined} showUpdateInstructions />
      </Modal>
    </>
  );
}
