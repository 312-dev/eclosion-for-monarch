/**
 * Export Group Row
 *
 * Expandable row for category group selection in the export notes modal.
 * Shows the group checkbox and expands to show individual categories.
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CategoryGroupWithNotes } from '../../types/notes';

interface ExportGroupRowProps {
  group: CategoryGroupWithNotes;
  isExpanded: boolean;
  isSelected: boolean;
  selectedCategories: Set<string>;
  onToggleExpand: () => void;
  onToggleGroup: (checked: boolean) => void;
  onToggleCategory: (categoryId: string, checked: boolean) => void;
}

export function ExportGroupRow({
  group,
  isExpanded,
  isSelected,
  selectedCategories,
  onToggleExpand,
  onToggleGroup,
  onToggleCategory,
}: Readonly<ExportGroupRowProps>) {
  return (
    <div>
      {/* Group row */}
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-(--monarch-bg-hover)"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          borderBottom: '1px solid var(--monarch-border)',
        }}
      >
        <button
          type="button"
          onClick={onToggleExpand}
          className="p-0.5"
          aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
        >
          {isExpanded ? (
            <ChevronDown size={14} style={{ color: 'var(--monarch-text-muted)' }} />
          ) : (
            <ChevronRight size={14} style={{ color: 'var(--monarch-text-muted)' }} />
          )}
        </button>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleGroup(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
          style={{ accentColor: 'var(--monarch-orange)' }}
        />
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          {group.name}
        </span>
        {group.effectiveNote.note && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--monarch-orange-light)',
              color: 'var(--monarch-orange)',
            }}
          >
            has note
          </span>
        )}
      </div>

      {/* Categories (when expanded) */}
      {isExpanded && (
        <div>
          {group.categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-2 px-3 py-2 pl-10 hover:bg-(--monarch-bg-hover)"
              style={{ borderBottom: '1px solid var(--monarch-border)' }}
            >
              <input
                type="checkbox"
                checked={selectedCategories.has(category.id)}
                onChange={(e) => onToggleCategory(category.id, e.target.checked)}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: 'var(--monarch-orange)' }}
              />
              <span className="text-sm">
                {category.icon && <span className="mr-1">{category.icon}</span>}
                <span style={{ color: 'var(--monarch-text-dark)' }}>
                  {category.name}
                </span>
              </span>
              {category.effectiveNote.note && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--monarch-orange-light)',
                    color: 'var(--monarch-orange)',
                  }}
                >
                  has note
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
