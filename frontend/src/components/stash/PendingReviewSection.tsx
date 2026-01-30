/**
 * PendingReviewSection Component
 *
 * Collapsible section showing pending bookmarks awaiting review.
 * Each bookmark can be skipped or converted to a stash item.
 */

import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { BookmarkIcon, type BookmarkIconHandle } from '../ui/bookmark';
import type { PendingBookmark } from '../../types';
import { PendingReviewRow } from './PendingReviewRow';

interface PendingReviewSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  pendingItems: PendingBookmark[];
  onSkip: (id: string) => void;
  onCreateTarget: (item: PendingBookmark) => void;
  skippingIds?: Set<string>;
}

export function PendingReviewSection({
  isExpanded,
  onToggle,
  pendingItems,
  onSkip,
  onCreateTarget,
  skippingIds = new Set(),
}: PendingReviewSectionProps) {
  const bookmarkRef = useRef<BookmarkIconHandle>(null);

  // Loop animation every 2 seconds when collapsed to draw attention
  useEffect(() => {
    if (isExpanded) return;

    // Play immediately when collapsed
    bookmarkRef.current?.startAnimation();

    const interval = setInterval(() => {
      bookmarkRef.current?.startAnimation();
    }, 2000);

    return () => clearInterval(interval);
  }, [isExpanded]);

  if (pendingItems.length === 0) return null;

  return (
    <div
      className="section-enter rounded-xl overflow-hidden mb-6"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header - clickable to expand/collapse */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-(--monarch-bg-hover) transition-colors cursor-pointer"
        style={{ backgroundColor: 'var(--monarch-bg-page)', border: 'none' }}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} pending review section`}
      >
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--monarch-orange-light)' }}>
          <BookmarkIcon ref={bookmarkRef} size={18} style={{ color: 'var(--monarch-orange)' }} />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Bookmarks Pending Review
          </span>
          <span
            className="px-2 py-0.5 text-xs font-semibold rounded-full"
            style={{
              backgroundColor: 'var(--monarch-orange)',
              color: 'white',
            }}
          >
            {pendingItems.length}
          </span>
        </div>
        <div
          className="p-1 transition-transform"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={20} style={{ color: 'var(--monarch-text-muted)' }} />
        </div>
      </button>

      {/* Content - list of pending items */}
      {isExpanded && (
        <div
          className="animate-expand"
          style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
        >
          {pendingItems.map((item, index) => (
            <PendingReviewRow
              key={item.id}
              item={item}
              onSkip={() => onSkip(item.id)}
              onCreateTarget={() => onCreateTarget(item)}
              isSkipping={skippingIds.has(item.id)}
              animationIndex={index}
              isFirstRow={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
