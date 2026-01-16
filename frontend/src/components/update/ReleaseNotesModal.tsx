/**
 * ReleaseNotesModal Component
 *
 * Displays GitHub release notes in a modal dialog.
 * Used by UpdateReadyBanner to show what's new in an update.
 */

import { useMemo, useState } from 'react';
import { Sparkles, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { sanitizeHtml } from '../../utils';

/**
 * Checks if HTML content uses new format with <hr> separator and Technical Details header.
 */
function hasNewFormatHtml(html: string): boolean {
  if (!html) return false;
  return html.includes('<hr') && />\s*Technical Details\s*</i.test(html);
}

/**
 * Extracts the summary from new format HTML (content before <hr>).
 */
function extractHtmlSummary(html: string): string | null {
  if (!html) return null;

  const hrIndex = html.search(/<hr\s*\/?>/i);
  if (hrIndex === -1) return null;

  const summary = html.slice(0, hrIndex).trim();
  return summary || null;
}

/**
 * Extracts technical details from new format HTML (content after Technical Details header).
 */
function extractHtmlTechnicalDetails(html: string): string | null {
  if (!html) return null;

  // Find the Technical Details header and get everything after it
  const regex = /<h[1-3][^>]*>\s*Technical Details\s*<\/h[1-3]>/i;
  const match = regex.exec(html);
  if (!match?.index) return null;

  return html.slice(match.index + match[0].length).trim();
}

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
  const [isExpanded, setIsExpanded] = useState(false);
  const isBeta = version.includes('-beta');
  const githubUrl = `https://github.com/monarchmoney/eclosion/releases/tag/v${version}`;

  // Sanitize HTML to prevent XSS from external content
  const sanitizedNotes = useMemo(() => sanitizeHtml(releaseNotes), [releaseNotes]);

  // Check if we have the new format with summary + technical details
  const isNewFormat = hasNewFormatHtml(sanitizedNotes);
  const summary = isNewFormat ? extractHtmlSummary(sanitizedNotes) : null;
  const technicalDetails = isNewFormat ? extractHtmlTechnicalDetails(sanitizedNotes) : null;

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
      {isNewFormat && summary ? (
        <div className="space-y-4">
          {/* Summary */}
          <div
            className="release-notes-content text-sm leading-relaxed"
            style={{ color: 'var(--monarch-text)' }}
            dangerouslySetInnerHTML={{ __html: summary }}
          />

          {/* Technical details expander */}
          {technicalDetails && (
            <>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--monarch-orange)' }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Hide technical details' : 'Show technical details'}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={16} />
                    Hide technical details
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Show technical details
                  </>
                )}
              </button>

              {isExpanded && (
                <div
                  className="release-notes-content text-sm leading-relaxed pt-4 border-t"
                  style={{
                    color: 'var(--monarch-text)',
                    borderColor: 'var(--monarch-border)',
                  }}
                  dangerouslySetInnerHTML={{ __html: technicalDetails }}
                />
              )}
            </>
          )}
        </div>
      ) : (
        // Legacy format: show everything
        <div
          className="release-notes-content text-sm leading-relaxed"
          style={{ color: 'var(--monarch-text)' }}
          dangerouslySetInnerHTML={{ __html: sanitizedNotes }}
        />
      )}
    </Modal>
  );
}
