/**
 * Shared utilities for the Updates feature.
 *
 * Markdown rendering components and date formatting used by both
 * the carousel (unread) and recent updates (all-read) views.
 */

import type { ReactNode } from 'react';
import type { Components } from 'react-markdown';

/** Markdown components for preview - preserves paragraph breaks */
export const markdownComponents: Components = {
  p: ({ children }: { children?: ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  ol: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  li: ({ children }: { children?: ReactNode }) => <span>• {children} </span>,
  a: ({ children }: { children?: ReactNode }) => (
    <span style={{ color: 'var(--monarch-orange)' }}>{children}</span>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => <em>{children}</em>,
  code: ({ children }: { children?: ReactNode }) => (
    <code className="px-1 rounded text-xs" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
      {children}
    </code>
  ),
  pre: () => null,
  blockquote: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  h1: ({ children }: { children?: ReactNode }) => (
    <span className="font-semibold">{children} </span>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <span className="font-semibold">{children} </span>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <span className="font-semibold">{children} </span>
  ),
  img: () => null,
  hr: () => null,
};

/** Strip markdown syntax from a string, returning plain text. */
export function stripMarkdown(text: string): string {
  let result = text;
  // Images and links: ![alt](url) → alt, [text](url) → text
  // Use iterative string search to avoid regex backtracking warnings
  let i = 0;
  let cleaned = '';
  while (i < result.length) {
    const isImage = result[i] === '!' && result[i + 1] === '[';
    const isLink = result[i] === '[';
    if (isImage || isLink) {
      const bracketStart = isImage ? i + 2 : i + 1;
      const bracketEnd = result.indexOf(']', bracketStart);
      if (bracketEnd !== -1 && result[bracketEnd + 1] === '(') {
        const parenEnd = result.indexOf(')', bracketEnd + 2);
        if (parenEnd !== -1) {
          cleaned += result.slice(bracketStart, bracketEnd);
          i = parenEnd + 1;
          continue;
        }
      }
    }
    cleaned += result[i];
    i++;
  }
  result = cleaned;
  // Bold/italic: ***text***, **text**, *text*
  result = result.replaceAll(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  // Bold/italic: ___text___, __text__, _text_
  result = result.replaceAll(/_{1,3}([^_]+)_{1,3}/g, '$1');
  // Inline code: `text`
  result = result.replaceAll(/`([^`]+)`/g, '$1');
  // Strikethrough: ~~text~~
  result = result.replaceAll(/~~([^~]+)~~/g, '$1');
  return result;
}

/** Format a date as relative time (e.g., "2 days ago") */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffMinutes > 0) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  return 'just now';
}
