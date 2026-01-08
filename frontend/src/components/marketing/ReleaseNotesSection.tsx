/**
 * ReleaseNotesSection
 *
 * Displays release notes from GitHub in a collapsible format.
 * Shows a summary by default with option to expand full notes.
 */

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from '../icons';

interface ReleaseNotesSectionProps {
  readonly body: string;
  readonly version: string;
  readonly htmlUrl: string;
  readonly publishedAt?: string;
}

/**
 * Extracts the first paragraph or summary from markdown release notes.
 */
function extractSummary(body: string): string {
  if (!body) return '';

  // Remove blockquote AI summaries (lines starting with >)
  const lines = body.split('\n');
  const summaryLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines at the start
    if (summaryLines.length === 0 && !trimmed) continue;
    // Stop at headers or horizontal rules
    if (trimmed.startsWith('#') || trimmed.startsWith('---')) break;
    // Capture blockquote summaries (AI-generated summaries start with >)
    if (trimmed.startsWith('>')) {
      summaryLines.push(trimmed.slice(1).trim());
      continue;
    }
    // Stop if we hit a non-summary line after collecting some summary
    if (summaryLines.length > 0 && !trimmed.startsWith('>')) break;
  }

  return summaryLines.join(' ').trim();
}

/**
 * Simple markdown to text conversion for display (strips formatting).
 */
function markdownToText(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .trim();
}

/**
 * Converts markdown to HTML for rendering release notes.
 * Handles common patterns: headers, lists, bold, italic, links, code.
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (## heading)
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-[var(--monarch-text-dark)] mt-4 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-[var(--monarch-text-dark)] mt-4 mb-2">$1</h3>')
    // Bold (**text**)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic (*text*)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Inline code (`code`)
    .replace(/`([^`]+)`/g, '<code class="bg-[var(--monarch-bg-hover)] px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // Links [text](url) - restored > for URLs
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--monarch-orange)] hover:underline">$1</a>')
    // Unordered list items (- item or * item)
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4">$1</li>')
    // Wrap consecutive li elements in ul
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 my-2">$&</ul>')
    // Blockquotes (> text)
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-[var(--monarch-border)] pl-3 italic text-[var(--monarch-text-muted)]">$1</blockquote>')
    // Line breaks - convert double newlines to paragraph breaks
    .replace(/\n\n/g, '</p><p class="my-2">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p class="my-2">${html}</p>`;
  }

  return html;
}

export function ReleaseNotesSection({
  body,
  version,
  htmlUrl,
  publishedAt,
}: ReleaseNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const summary = extractSummary(body);
  const hasFullNotes = body && body.length > (summary?.length || 0) + 50;

  if (!body && !summary) {
    return null;
  }

  return (
    <div
      className="p-4 rounded-lg border border-[var(--monarch-border)]"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--monarch-text-dark)]">
          What&apos;s New in v{version}
        </h3>
        {publishedAt && (
          <span className="text-xs text-[var(--monarch-text-muted)]">
            {new Date(publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
      </div>

      {summary && (
        <p className="text-sm text-[var(--monarch-text)] mb-3">
          {markdownToText(summary)}
        </p>
      )}

      {hasFullNotes && (
        <>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--monarch-orange)] hover:opacity-80 transition-opacity"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Hide full release notes' : 'Show full release notes'}
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon size={14} />
                Hide details
              </>
            ) : (
              <>
                <ChevronDownIcon size={14} />
                View full release notes
              </>
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-[var(--monarch-border)]">
              <div
                className="text-sm text-[var(--monarch-text)] prose-sm"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(body) }}
              />
            </div>
          )}
        </>
      )}

      <div className="mt-3 pt-3 border-t border-[var(--monarch-border)]">
        <a
          href={htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[var(--monarch-orange)] hover:underline"
        >
          View on GitHub
          <ExternalLinkIcon size={12} />
        </a>
      </div>
    </div>
  );
}
