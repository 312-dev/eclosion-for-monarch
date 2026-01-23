/**
 * IgnoredBookmarksSection Component
 *
 * Displays skipped/ignored bookmarks at the bottom of the stash page.
 * Uses a minimal, muted design with thin text-based expand header.
 */

import { ChevronRight, ExternalLink, Plus } from 'lucide-react';
import type { PendingBookmark } from '../../types';

interface IgnoredBookmarkRowProps {
  item: PendingBookmark;
  onCreateTarget: () => void;
  /** Index for staggered animation */
  animationIndex?: number;
}

function IgnoredBookmarkRow({ item, onCreateTarget, animationIndex = 0 }: IgnoredBookmarkRowProps) {
  // Extract hostname from URL for display
  let hostname = '';
  try {
    hostname = new URL(item.url).hostname.replace('www.', '');
  } catch {
    hostname = item.url;
  }

  // Use list-item-enter for staggered animation
  const animationStyle =
    animationIndex < 15 ? { animationDelay: `${animationIndex * 30}ms` } : undefined;

  return (
    <div
      className="list-item-enter flex items-center gap-3 py-2.5 hover:bg-(--monarch-bg-hover) transition-colors"
      style={{
        borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))',
        ...animationStyle,
      }}
    >
      {/* Favicon */}
      <div
        className="w-6 h-6 rounded flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border-light)',
        }}
      >
        {item.logo_url ? (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onError is not user interaction
          <img
            src={item.logo_url}
            alt=""
            className="w-4 h-4 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('favicon-fallback');
            }}
          />
        ) : (
          <ExternalLink size={12} style={{ color: 'var(--monarch-text-muted)' }} />
        )}
      </div>

      {/* Name and hostname */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className="text-sm truncate"
          style={{ color: 'var(--monarch-text-muted)' }}
          title={item.name}
        >
          {item.name}
        </span>
        <span
          className="text-xs truncate shrink-0"
          style={{ color: 'var(--monarch-text-light, #a3a09d)' }}
        >
          {hostname}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 hover:opacity-70"
          style={{ color: 'var(--monarch-text-muted)' }}
          onClick={(e) => e.stopPropagation()}
          aria-label="Open link in new tab"
        >
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Create Stash button */}
      <button
        type="button"
        onClick={onCreateTarget}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded btn-press shrink-0"
        style={{
          backgroundColor: 'var(--monarch-teal)',
          color: 'white',
        }}
        aria-label={`Create stash from ${item.name}`}
      >
        <Plus size={12} />
        Create Stash
      </button>
    </div>
  );
}

interface IgnoredBookmarksSectionProps {
  items: PendingBookmark[];
  onCreateTarget: (item: PendingBookmark) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function IgnoredBookmarksSection({
  items,
  onCreateTarget,
  isExpanded,
  onToggle,
}: IgnoredBookmarksSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="section-enter mt-4">
      {/* Thin muted text header - no card container */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 py-2 text-sm hover:opacity-70 transition-opacity"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse ignored bookmarks' : 'Expand ignored bookmarks'}
      >
        <ChevronRight
          size={16}
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
        <span className="font-medium">Ignored Bookmarks ({items.length})</span>
      </button>

      {/* Content - subtle list with light top border */}
      {isExpanded && (
        <div
          className="animate-expand ml-6 mt-1"
          style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
        >
          {items.map((item, index) => (
            <IgnoredBookmarkRow
              key={item.id}
              item={item}
              onCreateTarget={() => onCreateTarget(item)}
              animationIndex={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
