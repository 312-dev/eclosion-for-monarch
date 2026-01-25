/**
 * Revision History Modal
 *
 * Shows all versions of a note across time.
 * Allows navigation to past/future versions.
 */

import { useEffect, useRef } from 'react';
import { X, Calendar, ArrowRight } from 'lucide-react';
import { Portal } from '../Portal';
import { useNoteHistoryQuery } from '../../api/queries';
import { useScrollLock } from '../../hooks/useScrollLock';
import { decodeHtmlEntities } from '../../utils';
import type { MonthKey, NoteVersion } from '../../types/notes';

interface RevisionHistoryModalProps {
  /** Type of category */
  categoryType: 'group' | 'category';
  /** Category/group ID */
  categoryId: string;
  /** Category/group name */
  categoryName: string;
  /** Parent group ID (for categories) */
  groupId?: string;
  /** Parent group name (for categories) */
  groupName?: string;
  /** Current month being viewed */
  currentMonth: MonthKey;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback to navigate to a month */
  onNavigateToMonth?: (month: MonthKey) => void;
}

/**
 * Format month key for display
 */
function formatMonth(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function RevisionHistoryModal({
  categoryType,
  categoryId,
  categoryName,
  groupId: _groupId,
  groupName,
  currentMonth,
  onClose,
  onNavigateToMonth,
}: RevisionHistoryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useScrollLock(true);

  const {
    data: history,
    isLoading,
    error,
  } = useNoteHistoryQuery(categoryType, categoryId, { enabled: true });

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleVersionClick = (monthKey: MonthKey) => {
    if (onNavigateToMonth) {
      onNavigateToMonth(monthKey);
    }
    onClose();
  };

  // Separate versions into past, current, and future
  // history is NoteVersion[] directly from the query
  const versions: NoteVersion[] = history ?? [];
  const pastVersions = versions.filter((v) => v.monthKey < currentMonth);
  const currentVersions = versions.filter((v) => v.monthKey === currentMonth);
  const futureVersions = versions.filter((v) => v.monthKey > currentMonth);
  // Create reversed copy for past versions display (most recent first)
  const pastVersionsReversed = [...pastVersions].reverse();

  // Extract conditional states to avoid nested ternaries
  const showError = !isLoading && error;
  const showEmpty = !isLoading && !error && versions.length === 0;
  const showVersions = !isLoading && !error && versions.length > 0;

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 'var(--z-index-modal)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div
          ref={modalRef}
          className="rounded-xl shadow-lg w-full max-w-md max-h-[90vh] flex flex-col"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-modal-title"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0 rounded-t-xl"
            style={{ borderColor: 'var(--monarch-border)', backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <div>
              <h2
                id="history-modal-title"
                className="font-semibold"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                Notes History
              </h2>
              <p className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                {categoryType === 'group'
                  ? `${decodeHtmlEntities(categoryName)} Group`
                  : decodeHtmlEntities(categoryName)}
                {groupName && categoryType === 'category' && ` in ${decodeHtmlEntities(groupName)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors"
              aria-label="Close"
            >
              <X size={18} style={{ color: 'var(--monarch-text-muted)' }} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && (
              <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
                Loading history...
              </div>
            )}
            {showError && (
              <div className="text-center py-8" style={{ color: 'var(--monarch-warning)' }}>
                Failed to load history
              </div>
            )}
            {showEmpty && (
              <div className="text-center py-8" style={{ color: 'var(--monarch-text-muted)' }}>
                No revisions found for this note.
              </div>
            )}
            {showVersions && (
              <div className="space-y-4">
                {/* Future versions */}
                {futureVersions.length > 0 && (
                  <div>
                    <h3
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: 'var(--monarch-text-muted)' }}
                    >
                      Future Overrides
                    </h3>
                    <div className="space-y-2">
                      {futureVersions.map((version, index) => (
                        <VersionItem
                          key={version.monthKey}
                          version={version}
                          isCurrent={false}
                          onClick={() => handleVersionClick(version.monthKey)}
                          animationDelay={index * 30}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Current version */}
                {currentVersions.length > 0 && (
                  <div>
                    <h3
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: 'var(--monarch-text-muted)' }}
                    >
                      Current
                    </h3>
                    <div className="space-y-2">
                      {currentVersions.map((version, index) => (
                        <VersionItem
                          key={version.monthKey}
                          version={version}
                          isCurrent={true}
                          animationDelay={index * 30}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past versions */}
                {pastVersions.length > 0 && (
                  <div>
                    <h3
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{ color: 'var(--monarch-text-muted)' }}
                    >
                      Past Months
                    </h3>
                    <div className="space-y-2">
                      {pastVersionsReversed.map((version, index) => (
                        <VersionItem
                          key={version.monthKey}
                          version={version}
                          isCurrent={false}
                          onClick={() => handleVersionClick(version.monthKey)}
                          animationDelay={index * 30}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

interface VersionItemProps {
  version: {
    monthKey: MonthKey;
    contentPreview: string;
    createdAt: string;
  };
  isCurrent: boolean;
  onClick?: () => void;
  animationDelay?: number;
}

function VersionItem({ version, isCurrent, onClick, animationDelay = 0 }: VersionItemProps) {
  const content = (
    <div
      className={`rounded-lg p-3 list-item-enter ${
        isCurrent ? '' : 'cursor-pointer hover:bg-(--monarch-bg-hover)'
      }`}
      style={{
        backgroundColor: isCurrent ? 'var(--monarch-orange-light)' : 'var(--monarch-bg-page)',
        border: isCurrent ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
        animationDelay: `${animationDelay}ms`,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Calendar
            size={14}
            style={{ color: isCurrent ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)' }}
          />
          <span
            className={`text-sm ${isCurrent ? 'font-semibold' : 'font-medium'}`}
            style={{ color: isCurrent ? 'var(--monarch-orange)' : 'var(--monarch-text-dark)' }}
          >
            {formatMonth(version.monthKey)}
          </span>
          {isCurrent && (
            <span
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: 'var(--monarch-orange)',
                color: 'white',
              }}
            >
              current
            </span>
          )}
        </div>
        {!isCurrent && <ArrowRight size={14} style={{ color: 'var(--monarch-text-muted)' }} />}
      </div>
      <p className="text-sm line-clamp-2" style={{ color: 'var(--monarch-text-muted)' }}>
        {version.contentPreview}
      </p>
    </div>
  );

  if (isCurrent) {
    return content;
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}
