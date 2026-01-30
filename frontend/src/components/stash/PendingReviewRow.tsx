/**
 * PendingReviewRow Component
 *
 * Single row displaying a pending bookmark with Skip and Create Stash actions.
 */

import { ExternalLink, X, Plus } from 'lucide-react';
import type { PendingBookmark } from '../../types';
import { decodeHtmlEntities } from '../../utils/decodeHtmlEntities';

interface PendingReviewRowProps {
  item: PendingBookmark;
  onSkip: () => void;
  onCreateTarget: () => void;
  isSkipping?: boolean;
  /** Index for staggered animation (0-14 for list-item-enter) */
  animationIndex?: number;
}

export function PendingReviewRow({
  item,
  onSkip,
  onCreateTarget,
  isSkipping = false,
  animationIndex = 0,
}: PendingReviewRowProps) {
  // Decode HTML entities from API response (XSS sanitization encodes apostrophes etc.)
  const displayName = decodeHtmlEntities(item.name);
  const decodedUrl = decodeHtmlEntities(item.url);

  // Extract hostname from URL for display
  let hostname = '';
  try {
    hostname = new URL(decodedUrl).hostname.replace('www.', '');
  } catch {
    hostname = decodedUrl;
  }

  // Use list-item-enter for staggered animation (supports up to 15 items via CSS nth-child)
  // For items beyond 15, animation plays immediately
  const animationStyle =
    animationIndex < 15 ? { animationDelay: `${animationIndex * 30}ms` } : undefined;

  return (
    <div
      className="list-item-enter flex items-center gap-3 px-4 py-3 hover:bg-(--monarch-bg-hover) transition-colors"
      style={{
        borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))',
        ...animationStyle,
      }}
    >
      {/* Favicon */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {item.logo_url ? (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onError is not user interaction
          <img
            src={item.logo_url}
            alt=""
            className="w-5 h-5 object-contain"
            onError={(e) => {
              // Fallback to link icon on error
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('favicon-fallback');
            }}
          />
        ) : (
          <ExternalLink size={16} style={{ color: 'var(--monarch-text-muted)' }} />
        )}
      </div>

      {/* Name and hostname */}
      <div className="flex-1 min-w-0">
        <div
          className="font-medium text-sm truncate"
          style={{ color: 'var(--monarch-text-dark)' }}
          title={displayName}
        >
          {displayName}
        </div>
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          <span className="truncate">{hostname}</span>
          <a
            href={decodedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 hover:opacity-70"
            onClick={(e) => e.stopPropagation()}
            aria-label="Open link in new tab"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md btn-press"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--monarch-text-muted)',
          }}
          aria-label={`Skip ${displayName}`}
        >
          <X size={14} />
          Skip
        </button>
        <button
          type="button"
          onClick={onCreateTarget}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md btn-press"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--monarch-teal)',
            border: '1px solid var(--monarch-border)',
          }}
          aria-label={`Create stash from ${displayName}`}
        >
          <Plus size={14} />
          Create Stash
        </button>
      </div>
    </div>
  );
}
