/**
 * ReleaseNotesSection
 *
 * Displays release notes from GitHub in a collapsible format.
 * Shows a summary by default with option to expand full notes.
 */

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from '../icons';
import {
  hasNewFormat,
  extractNewFormatSummary,
  extractTechnicalDetails,
} from '../../utils/releaseNotesParser';

interface ReleaseNotesSectionProps {
  readonly body: string;
  readonly version: string;
  readonly htmlUrl: string;
  readonly publishedAt?: string;
}

/**
 * Extracts the first paragraph or summary from markdown release notes.
 * Supports both new format (summary before ---) and legacy format (blockquotes).
 */
function extractSummary(body: string): string {
  if (!body) return '';

  // Try new format first (summary before ---)
  if (hasNewFormat(body)) {
    return extractNewFormatSummary(body) ?? '';
  }

  // Legacy format: look for blockquote AI summaries (lines starting with >)
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
 * Gets the content to show when expanded.
 * For new format, this is the technical details section.
 * For legacy format, this is the full body.
 */
function getExpandedContent(body: string): string {
  if (!body) return '';

  if (hasNewFormat(body)) {
    return extractTechnicalDetails(body) ?? body;
  }

  return body;
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

  // Normalize list items: remove blank lines between consecutive list items
  // This ensures they get grouped into a single <ul>
  const normalized = markdown
    // Collapse multiple blank lines between list items into single newlines
    .replace(/^([-*] .+)\n+(?=[-*] )/gm, '$1\n');

  let html = normalized
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (## heading)
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-[var(--monarch-text-dark)] mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-[var(--monarch-text-dark)] mt-3 mb-1">$1</h3>')
    // Bold (**text**)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic (*text*)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Inline code (`code`)
    .replace(/`([^`]+)`/g, '<code class="bg-[var(--monarch-bg-hover)] px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // Links [text](url) - restored > for URLs
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--monarch-orange)] hover:underline">$1</a>')
    // Unordered list items (- item or * item)
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li elements in ul (now they should be consecutive after normalization)
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-5 space-y-1 my-2">$&</ul>')
    // Clean up newlines inside ul tags (between li elements)
    .replace(/<\/li>\n<li>/g, '</li><li>')
    // Blockquotes (> text)
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-[var(--monarch-border)] pl-3 italic text-[var(--monarch-text-muted)]">$1</blockquote>')
    // Line breaks - convert double newlines to paragraph breaks
    .replace(/\n\n+/g, '</p><p class="my-1">')
    // Single newlines (not inside lists) - be more selective
    .replace(/\n/g, ' ');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p class="my-1">${html}</p>`;
  }

  // Clean up empty paragraphs
  html = html.replaceAll(/<p class="my-1">\s*<\/p>/g, '');

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
  const expandedContent = getExpandedContent(body);
  const hasFullNotes = expandedContent && expandedContent.length > 50;

  if (!body && !summary) {
    return null;
  }

  return (
    <div
      className="p-6 rounded-xl border border-[var(--monarch-border)]"
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-[var(--monarch-text-dark)]">
          What&apos;s New in v{version}
        </h3>
        {publishedAt && (
          <span className="text-sm text-[var(--monarch-text-muted)]">
            {new Date(publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
      </div>

      {summary && (
        <p className="text-[var(--monarch-text)] mb-4 leading-relaxed">
          {markdownToText(summary)}
        </p>
      )}

      {hasFullNotes && (
        <>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--monarch-orange)] hover:opacity-80 transition-opacity"
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

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-[var(--monarch-border)]">
              <div
                className="text-[var(--monarch-text)] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(expandedContent) }}
              />
            </div>
          )}
        </>
      )}

      <div className="mt-4 pt-4 border-t border-[var(--monarch-border)]">
        <a
          href={htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--monarch-orange)] hover:underline"
        >
          View on GitHub
          <ExternalLinkIcon size={14} />
        </a>
      </div>
    </div>
  );
}
