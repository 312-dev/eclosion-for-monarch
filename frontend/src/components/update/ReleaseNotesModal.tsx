/**
 * ReleaseNotesModal Component
 *
 * Displays GitHub release notes in a modal dialog.
 * Used by UpdateReadyBanner to show what's new in an update.
 */

import { Sparkles, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';

export interface ReleaseNotesModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Version string (e.g., "1.2.11") */
  version: string;
  /** HTML content from GitHub release notes */
  releaseNotes: string;
}

/**
 * Modal for displaying release notes from a desktop app update.
 */
export function ReleaseNotesModal({
  isOpen,
  onClose,
  version,
  releaseNotes,
}: ReleaseNotesModalProps) {
  const isBeta = version.includes('-beta');
  const githubUrl = `https://github.com/monarchmoney/eclosion/releases/tag/v${version}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Sparkles
            size={20}
            style={{ color: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-success)' }}
          />
          What&apos;s New in v{version}
        </span>
      }
      description="Here's what changed in this update"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm hover:underline"
            style={{ color: 'var(--monarch-orange)' }}
          >
            <ExternalLink size={14} />
            View on GitHub
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
            style={{
              backgroundColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-success)',
              color: 'white',
            }}
          >
            Got it
          </button>
        </div>
      }
    >
      <div
        className="release-notes-content text-sm leading-relaxed"
        style={{ color: 'var(--monarch-text)' }}
        dangerouslySetInnerHTML={{ __html: releaseNotes }}
      />
    </Modal>
  );
}
