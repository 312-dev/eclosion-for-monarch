/**
 * Recent Updates
 *
 * Collapsed card shown when all updates have been read. Expands to reveal
 * the latest articles so users can browse past news without cluttering the
 * dashboard.
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { UpdateEntry } from '../../api/queries/updatesQueries';
import { Icons } from '../icons';
import { formatRelativeTime, markdownComponents, stripMarkdown } from './updatesUtils';

const INITIAL_VISIBLE = 5;
const LOAD_MORE_COUNT = 3;

export function RecentUpdates({ updates }: Readonly<{ updates: UpdateEntry[] }>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const recentUpdates = updates.slice(0, visibleCount);
  const hasMore = updates.length > visibleCount;

  return (
    <div
      className="mb-6 rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <div className="flex">
        {/* Muted accent bar (not orange — signals "all read") */}
        <div
          className="w-1 shrink-0"
          style={{ backgroundColor: 'var(--monarch-border)' }}
          aria-hidden="true"
        />

        <div className="flex-1 p-4">
          {/* Collapsed header — always visible */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={isExpanded}
            aria-controls="recent-updates-list"
          >
            <div className="flex items-center gap-2">
              <Icons.Newspaper
                className="h-3.5 w-3.5"
                style={{ color: 'var(--monarch-text-muted)' }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--monarch-text-muted)' }}>
                All caught up
              </span>
              <span className="text-xs" style={{ color: 'var(--monarch-text-light)' }}>
                &middot; {updates.length} recent {updates.length === 1 ? 'update' : 'updates'}
              </span>
            </div>

            <Icons.ChevronDown
              className="h-4 w-4 shrink-0 transition-transform"
              style={{
                color: 'var(--monarch-text-muted)',
                transform: isExpanded ? 'rotate(180deg)' : undefined,
              }}
            />
          </button>

          {/* Expanded list */}
          {isExpanded && (
            <ul id="recent-updates-list" className="mt-3 flex flex-col gap-1 section-enter">
              {recentUpdates.map((update) => (
                <li key={update.id}>
                  <a
                    href={update.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-(--monarch-bg-page) group"
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm font-medium leading-snug line-clamp-1"
                        style={{ color: 'var(--monarch-text-dark)' }}
                      >
                        {stripMarkdown(update.title)}
                      </span>
                      {update.preview && (
                        <span
                          className="block text-xs leading-relaxed mt-0.5 line-clamp-1"
                          style={{ color: 'var(--monarch-text-muted)' }}
                        >
                          <ReactMarkdown components={markdownComponents}>
                            {update.preview}
                          </ReactMarkdown>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <span
                        className="text-xs whitespace-nowrap"
                        style={{ color: 'var(--monarch-text-light)' }}
                      >
                        {formatRelativeTime(new Date(update.date))}
                      </span>
                      <Icons.ExternalLink
                        className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--monarch-text-muted)' }}
                      />
                    </div>
                  </a>
                </li>
              ))}

              {/* Load more */}
              {hasMore && (
                <li>
                  <button
                    onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
                    className="w-full text-center text-xs font-medium py-2 rounded-md transition-colors hover:bg-(--monarch-bg-page)"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    Load more&hellip;
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
