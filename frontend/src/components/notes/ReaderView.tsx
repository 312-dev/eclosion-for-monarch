/**
 * Reader View
 *
 * Clean, read-only presentation of all notes for a month.
 */

import { FileText } from 'lucide-react';
import { decodeHtmlEntities } from '../../utils';
import type { CategoryGroupWithNotes, GeneralMonthNote, MonthKey } from '../../types/notes';

interface ReaderViewProps {
  /** Current month */
  monthKey: MonthKey;
  /** Category groups with notes */
  groups: CategoryGroupWithNotes[];
  /** General month note */
  generalNote: GeneralMonthNote | null;
  /** Whether there are any notes */
  hasNotes: boolean;
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

/**
 * Format source month indicator
 */
function formatSourceMonth(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Render markdown content as simple HTML.
 */
function renderMarkdown(content: string): string {
  /* eslint-disable sonarjs/slow-regex -- Using negated char classes to prevent backtracking */
  return content
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replaceAll(/\*([^*]+)\*/g, '<em>$1</em>')
    .replaceAll(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-(--monarch-orange) hover:underline">$1</a>'
    )
    .replaceAll('\n', '<br />');
  /* eslint-enable sonarjs/slow-regex */
}

export function ReaderView({ monthKey, groups, generalNote, hasNotes }: ReaderViewProps) {
  if (!hasNotes) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <FileText
          size={48}
          className="mx-auto mb-4"
          style={{ color: 'var(--monarch-text-muted)' }}
        />
        <div className="text-lg font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          No notes for {formatMonth(monthKey)}
        </div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          Switch to Notes tab to add notes to your categories.
        </div>
      </div>
    );
  }

  // Collect all groups/categories that have notes
  const groupsWithNotes = groups.filter(
    (g) => g.effectiveNote.note || g.categories.some((c) => c.effectiveNote.note)
  );

  return (
    <div
      className="rounded-xl overflow-hidden section-enter"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
          Notes for {formatMonth(monthKey)}
        </h2>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* General month notes */}
        {generalNote && (
          <section className="section-enter">
            <h3
              className="text-lg font-semibold mb-3 pb-2 border-b"
              style={{ color: 'var(--monarch-text-dark)', borderColor: 'var(--monarch-border)' }}
            >
              General Notes
            </h3>
            <div
              className="text-sm leading-relaxed"
              style={{ color: 'var(--monarch-text-dark)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(generalNote.content) }}
            />
          </section>
        )}

        {/* Category notes by group */}
        {groupsWithNotes.map((group, index) => (
          <section
            key={group.id}
            className="section-enter"
            style={{ animationDelay: `${(index + 1) * 50}ms` }}
          >
            <h3
              className="text-lg font-semibold mb-3 pb-2 border-b"
              style={{ color: 'var(--monarch-text-dark)', borderColor: 'var(--monarch-border)' }}
            >
              {decodeHtmlEntities(group.name)}
            </h3>

            {/* Group note */}
            {group.effectiveNote.note && (
              <div
                className="mb-4 pl-4 border-l-2"
                style={{ borderColor: 'var(--monarch-orange)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-medium uppercase"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    Group Note
                  </span>
                  {group.effectiveNote.isInherited && group.effectiveNote.sourceMonth && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--monarch-bg-hover)',
                        color: 'var(--monarch-text-muted)',
                      }}
                    >
                      from {formatSourceMonth(group.effectiveNote.sourceMonth)}
                    </span>
                  )}
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--monarch-text-dark)' }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(group.effectiveNote.note.content),
                  }}
                />
              </div>
            )}

            {/* Category notes */}
            <div className="space-y-4">
              {group.categories
                .filter((c) => c.effectiveNote.note)
                .map((category) => (
                  <div
                    key={category.id}
                    className="pl-4 border-l-2"
                    style={{ borderColor: 'var(--monarch-border)' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {category.icon && (
                        <span className="text-base" aria-hidden="true">
                          {category.icon}
                        </span>
                      )}
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--monarch-text-dark)' }}
                      >
                        {decodeHtmlEntities(category.name)}
                      </span>
                      {category.effectiveNote.isInherited && category.effectiveNote.sourceMonth && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--monarch-bg-hover)',
                            color: 'var(--monarch-text-muted)',
                          }}
                        >
                          from {formatSourceMonth(category.effectiveNote.sourceMonth)}
                        </span>
                      )}
                    </div>
                    <div
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(category.effectiveNote.note!.content),
                      }}
                    />
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
