/**
 * Note Display
 *
 * Renders note content with proper markdown formatting and interactive checkboxes.
 * Supports inheritance badge, double-click to edit, and action buttons.
 */

import { useState, useCallback } from 'react';
import { Edit2, History } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import { useCheckboxState } from '../../hooks';
import type { EffectiveNote, MonthKey } from '../../types/notes';

interface NoteDisplayProps {
  /** The effective note to display */
  effectiveNote: EffectiveNote;
  /** Current month being viewed */
  currentMonth: MonthKey;
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
  /** Callback when edit button clicked */
  onEdit: () => void;
}

/**
 * Format month key for display (e.g., "Oct 2024")
 */
function formatSourceMonth(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function NoteDisplay({
  effectiveNote,
  currentMonth,
  categoryType,
  categoryId,
  categoryName,
  groupId,
  groupName,
  onEdit,
}: NoteDisplayProps) {
  const [showHistory, setShowHistory] = useState(false);
  const { note, sourceMonth, isInherited } = effectiveNote;

  // Checkbox state management
  const {
    checkboxStates,
    toggleCheckbox,
    isLoading: checkboxesLoading,
  } = useCheckboxState({
    noteId: note?.id,
    viewingMonth: currentMonth,
    enabled: !!note,
  });

  // Handle keyboard activation (Enter/Space) for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onEdit();
      }
    },
    [onEdit]
  );

  if (!note) return null;

  return (
    <>
      <div
        className="relative group"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label={`Note content. Double-click to edit.`}
      >
        {/* Inheritance badge */}
        {isInherited && sourceMonth && (
          <div className="text-xs mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
            from {formatSourceMonth(sourceMonth)}
          </div>
        )}

        {/* Note content with interactive checkboxes */}
        <div className="pr-16">
          <MarkdownRenderer
            content={note.content}
            checkboxStates={checkboxStates}
            onCheckboxToggle={toggleCheckbox}
            onDoubleClick={onEdit}
            checkboxesDisabled={checkboxesLoading}
          />
        </div>

        {/* Action buttons - positioned bottom right inside the note */}
        <div className="absolute bottom-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHistory(true);
            }}
            className="p-1 rounded hover:bg-(--monarch-bg-hover) transition-colors icon-btn-hover"
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label="View revision history"
            title="History"
          >
            <History size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 rounded hover:bg-(--monarch-bg-hover) transition-colors icon-btn-hover"
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label="Edit note"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
        </div>
      </div>

      {/* Revision history modal */}
      {showHistory && (
        <RevisionHistoryModal
          categoryType={categoryType}
          categoryId={categoryId}
          categoryName={categoryName}
          {...(groupId !== undefined && { groupId })}
          {...(groupName !== undefined && { groupName })}
          currentMonth={currentMonth}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
