/**
 * Updates Carousel
 *
 * Dashboard component that displays unread Reddit updates in a compact card format.
 * Features intuitive navigation and clear dismiss actions. When all updates have been
 * read, falls back to a collapsible recent-articles view.
 */

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useUpdatesState } from '../../hooks/useUpdatesState';
import { Icons, RedditIcon } from '../icons';
import { RecentUpdates } from './RecentUpdates';
import { formatRelativeTime, markdownComponents, stripMarkdown } from './updatesUtils';

type SlideDirection = 'forward' | 'backward' | null;

export function UpdatesCarousel() {
  const {
    allFetchedUpdates,
    unreadUpdates,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  } = useUpdatesState();
  const [rawIndex, setRawIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>(null);

  // Clamp index to valid range (handles when items are marked as read)
  const currentIndex =
    unreadUpdates.length === 0 ? 0 : Math.min(rawIndex, unreadUpdates.length - 1);

  const goToNext = useCallback(() => {
    if (currentIndex < unreadUpdates.length - 1) {
      setSlideDirection('forward');
      setRawIndex(currentIndex + 1);
    }
  }, [currentIndex, unreadUpdates.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setSlideDirection('backward');
      setRawIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (unreadUpdates.length === 0) return;
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, unreadUpdates.length]);

  if (isLoading) {
    return <UpdatesCarouselSkeleton />;
  }

  if (error) {
    return null; // Graceful degradation
  }

  // All caught up - show browse recent option if there are past updates
  if (unreadUpdates.length === 0) {
    if (allFetchedUpdates.length === 0) return null;
    return <RecentUpdates updates={allFetchedUpdates} />;
  }

  const currentUpdate = unreadUpdates[currentIndex];
  if (!currentUpdate) return null;

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < unreadUpdates.length - 1;

  return (
    <div
      className="mb-6 mx-4 sm:mx-0 rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      {/* Main content area with left accent */}
      <div className="flex">
        {/* Orange accent bar */}
        <div
          className="w-1 shrink-0"
          style={{ backgroundColor: 'var(--monarch-orange)' }}
          aria-hidden="true"
        />

        <div className="flex-1 p-4">
          {/* Header row: badge + navigation + dismiss */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {/* Left: Update badge */}
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--monarch-orange)' }}
              >
                <Icons.Megaphone className="h-3.5 w-3.5" />
                {unreadCount === 1 ? 'New Update' : `${unreadCount} Updates`}
              </span>
            </div>

            {/* Right: Navigation (if multiple) + Dismiss */}
            <div className="flex items-center gap-2">
              {/* Navigation controls - only show if multiple updates */}
              {unreadCount > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPrev}
                    disabled={!canGoBack}
                    className="p-1 rounded transition-colors hover:bg-(--monarch-bg-page) disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: 'var(--monarch-text-muted)' }}
                    aria-label="Previous update"
                  >
                    <Icons.ChevronLeft className="h-4 w-4" />
                  </button>
                  <span
                    className="text-xs tabular-nums min-w-[3ch] text-center"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    {currentIndex + 1}/{unreadCount}
                  </span>
                  <button
                    onClick={goToNext}
                    disabled={!canGoForward}
                    className="p-1 rounded transition-colors hover:bg-(--monarch-bg-page) disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: 'var(--monarch-text-muted)' }}
                    aria-label="Next update"
                  >
                    <Icons.ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Dismiss button - always visible, prominent */}
              <button
                onClick={() => (unreadCount > 1 ? markAsRead(currentUpdate.id) : markAllAsRead())}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors hover:bg-(--monarch-bg-page)"
                style={{
                  color: 'var(--monarch-text-muted)',
                  border: '1px solid var(--monarch-border)',
                }}
                aria-label={unreadCount > 1 ? 'Dismiss this update' : 'Dismiss'}
              >
                <Icons.Check className="h-3.5 w-3.5" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>

          {/* Update content with slide animation */}
          <div
            key={currentUpdate.id}
            className={slideDirection ? 'carousel-slide-enter' : ''}
            style={
              {
                '--slide-direction': slideDirection === 'backward' ? '1' : '-1',
              } as React.CSSProperties
            }
          >
            <a
              href={currentUpdate.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
              onClick={() => markAsRead(currentUpdate.id)}
            >
              {/* Title - prominent */}
              <h4
                className="text-base font-semibold leading-snug"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {stripMarkdown(currentUpdate.title)}
              </h4>

              {/* Meta line: date + source */}
              <div
                className="flex items-center gap-1.5 mt-1 text-xs"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                <span>{formatRelativeTime(new Date(currentUpdate.date))}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  via <RedditIcon className="h-3 w-3" />
                </span>
              </div>

              {/* Markdown body preview - truncated with ellipsis (no gradient) */}
              {currentUpdate.preview && (
                <div
                  className="mt-2 text-sm leading-relaxed updates-markdown-preview"
                  style={{
                    color: 'var(--monarch-text-muted)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  <ReactMarkdown components={markdownComponents}>
                    {currentUpdate.preview}
                  </ReactMarkdown>
                </div>
              )}

              {/* Read more link */}
              <span
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium"
                style={{ color: 'var(--monarch-orange)' }}
              >
                Read more
                <Icons.ExternalLink className="h-3 w-3" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdatesCarouselSkeleton() {
  return (
    <div
      className="mb-6 mx-4 sm:mx-0 rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <div className="flex">
        <div className="w-1 shrink-0" style={{ backgroundColor: 'var(--monarch-border)' }} />
        <div className="flex-1 p-4">
          <div
            className="h-4 w-24 rounded animate-pulse mb-3"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          />
          <div
            className="h-5 w-3/4 rounded animate-pulse"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          />
          <div
            className="h-4 w-full rounded animate-pulse mt-3"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          />
        </div>
      </div>
    </div>
  );
}
