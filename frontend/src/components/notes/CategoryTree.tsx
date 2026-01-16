/**
 * Category Tree
 *
 * Displays Monarch category groups and categories with their notes.
 * Groups are expandable/collapsible.
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import { CategoryGroupRow } from './CategoryGroupRow';
import { CategoryRow } from './CategoryRow';
import { decodeHtmlEntities, spacifyEmoji } from '../../utils';
import type { CategoryGroupWithNotes, MonthKey } from '../../types/notes';

interface CategoryTreeProps {
  /** Category groups with their notes */
  groups: CategoryGroupWithNotes[];
  /** Set of expanded group IDs */
  expandedGroups: Set<string>;
  /** Callback to toggle a group */
  onToggleGroup: (groupId: string) => void;
  /** Callback to expand all groups */
  onExpandAll: () => void;
  /** Callback to collapse all groups */
  onCollapseAll: () => void;
  /** Current month being viewed */
  currentMonth: MonthKey;
}

export function CategoryTree({
  groups,
  expandedGroups,
  onToggleGroup,
  onExpandAll,
  onCollapseAll,
  currentMonth,
}: CategoryTreeProps) {
  const allExpanded = groups.length > 0 && groups.every((g) => expandedGroups.has(g.id));

  if (groups.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="text-lg font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          No categories found
        </div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          Connect to Monarch Money to see your categories here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-tour="category-tree">
      {/* Header with expand/collapse toggle */}
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Category Notes
        </h2>
        <button
          type="button"
          onClick={allExpanded ? onCollapseAll : onExpandAll}
          className="px-2 py-1 text-xs rounded hover:bg-(--monarch-bg-hover) transition-colors"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label={allExpanded ? 'Collapse all groups' : 'Expand all groups'}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Category groups */}
      <div className="space-y-2">
        {groups.map((group, index) => {
          const isExpanded = expandedGroups.has(group.id);

          return (
            <div
              key={group.id}
              className="rounded-xl overflow-hidden list-item-enter"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid var(--monarch-border)',
                animationDelay: `${index * 30}ms`,
              }}
              data-tour={index === 0 ? 'category-note' : undefined}
            >
              {/* Group header section - lighter background for contrast */}
              <div
                style={{
                  backgroundColor: 'var(--monarch-bg-hover)',
                }}
              >
                {/* Clickable header row */}
                <button
                  type="button"
                  onClick={() => onToggleGroup(group.id)}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-(--monarch-bg-hover) transition-colors"
                  aria-expanded={isExpanded}
                  aria-controls={`group-${group.id}-categories`}
                >
                  <span style={{ color: 'var(--monarch-text-muted)' }}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                  <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                    {spacifyEmoji(decodeHtmlEntities(group.name))}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                    ({group.categories.length})
                  </span>
                  {group.effectiveNote.note && (
                    <span
                      className="ml-auto px-2 py-0.5 text-xs rounded-full"
                      style={{
                        backgroundColor: group.effectiveNote.isInherited
                          ? 'var(--monarch-bg-hover)'
                          : 'rgba(34, 197, 94, 0.15)',
                        color: group.effectiveNote.isInherited
                          ? 'var(--monarch-text-muted)'
                          : '#22c55e',
                      }}
                    >
                      {group.effectiveNote.isInherited ? 'inherited' : 'edited'}
                    </span>
                  )}
                </button>

                {/* Group note - only shown when expanded */}
                {isExpanded && <CategoryGroupRow group={group} currentMonth={currentMonth} />}
              </div>

              {/* Categories */}
              {isExpanded && (
                <div
                  id={`group-${group.id}-categories`}
                  className="border-t"
                  style={{ borderColor: 'var(--monarch-border)' }}
                >
                  {group.categories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      groupId={group.id}
                      groupName={spacifyEmoji(decodeHtmlEntities(group.name))}
                      currentMonth={currentMonth}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
