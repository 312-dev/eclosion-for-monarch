/**
 * Category Group Row
 *
 * Displays note content for a category group with inline editing.
 * Explicit save button instead of auto-save on blur.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, History } from 'lucide-react';
import { NoteEditorMDX } from './NoteEditorMDX';
import { MarkdownRenderer } from './MarkdownRenderer';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import { useSaveCategoryNoteMutation, useDeleteCategoryNoteMutation } from '../../api/queries';
import { useCheckboxState } from '../../hooks';
import { decodeHtmlEntities } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useNotesEditorOptional } from '../../context/NotesEditorContext';
import type { CategoryGroupWithNotes, MonthKey } from '../../types/notes';

interface CategoryGroupRowProps {
  /** The category group */
  group: CategoryGroupWithNotes;
  /** Current month being viewed */
  currentMonth: MonthKey;
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

export function CategoryGroupRow({ group, currentMonth }: CategoryGroupRowProps) {
  const { effectiveNote } = group;
  const note = effectiveNote.note;
  const noteContent = note?.content ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(noteContent);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const lastSavedRef = useRef(noteContent);
  const isRateLimited = useIsRateLimited();
  const notesEditor = useNotesEditorOptional();

  const saveMutation = useSaveCategoryNoteMutation();
  const deleteMutation = useDeleteCategoryNoteMutation();

  // Unique editor ID for context coordination
  const editorId = `group-${group.id}-${currentMonth}`;

  // Ref to always hold the latest save function (for context coordination)
  const saveNoteRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Checkbox state management
  const { checkboxStates, toggleCheckbox } = useCheckboxState({
    noteId: note?.id,
    viewingMonth: currentMonth,
    enabled: !!note || !!content.trim(),
  });

  // Sync content when note changes externally
  useEffect(() => {
    if (!isEditing) {
      setContent(noteContent);
      lastSavedRef.current = noteContent;
    }
  }, [noteContent, isEditing]);

  // Save function
  const saveNote = useCallback(async () => {
    const trimmedContent = content.trim();

    // No changes
    if (trimmedContent === lastSavedRef.current.trim()) {
      setIsEditing(false);
      notesEditor?.closeEditor();
      return;
    }

    setIsSaving(true);

    try {
      // If content is empty and there was a note, delete it
      if (!trimmedContent) {
        const noteId = effectiveNote.note?.id;
        if (noteId) {
          await deleteMutation.mutateAsync(noteId);
          lastSavedRef.current = '';
        }
      } else {
        // Save the note
        await saveMutation.mutateAsync({
          categoryType: 'group',
          categoryId: group.id,
          categoryName: group.name,
          monthKey: currentMonth,
          content: trimmedContent,
        });
        lastSavedRef.current = trimmedContent;
      }
      setIsEditing(false);
      notesEditor?.closeEditor();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
    }
  }, [content, effectiveNote.note?.id, group.id, group.name, currentMonth, saveMutation, deleteMutation, notesEditor]);

  // Keep ref updated so context always calls latest save function
  useEffect(() => {
    saveNoteRef.current = saveNote;
  }, [saveNote]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Enter edit mode (blocked when rate limited)
  const handleStartEdit = useCallback(async () => {
    if (isRateLimited) return;

    // If using context, request to open (auto-saves other editors)
    // Pass a stable wrapper that calls the ref to ensure latest content is saved
    if (notesEditor) {
      const canOpen = await notesEditor.requestOpen(editorId, () => saveNoteRef.current());
      if (!canOpen) return;
    }

    setIsEditing(true);
  }, [isRateLimited, notesEditor, editorId]);

  // Render note content
  const displayContent = content.trim();
  const hasContent = !!note || !!displayContent;

  const renderNoteContent = () => {
    if (isEditing) {
      return (
        <NoteEditorMDX
          value={content}
          onChange={handleContentChange}
          onSave={saveNote}
          isSaving={isSaving}
          placeholder={`Write a note for ${decodeHtmlEntities(group.name)} group...`}
          autoFocus
          minHeight={80}
        />
      );
    }

    if (hasContent) {
      return (
        <div className="relative group/note">
          {/* Inheritance badge */}
          {effectiveNote.isInherited && effectiveNote.sourceMonth && (
            <div
              className="text-xs mb-1"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              from {formatSourceMonth(effectiveNote.sourceMonth)}
            </div>
          )}
          <MarkdownRenderer
            content={displayContent || note?.content || ''}
            checkboxStates={checkboxStates}
            onCheckboxToggle={toggleCheckbox}
            onDoubleClick={handleStartEdit}
          />
          {/* History button - shows on hover */}
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="absolute top-0 right-0 p-1 rounded opacity-0 group-hover/note:opacity-100 hover:bg-(--monarch-bg-card) transition-opacity icon-btn-hover"
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label="View revision history"
            title="History"
          >
            <History size={14} />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleStartEdit}
        className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity icon-btn-hover"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label={`Add note for ${decodeHtmlEntities(group.name)} group`}
      >
        <Plus size={14} />
        Add group note
      </button>
    );
  };

  return (
    <>
      <div className="px-4 py-3">
        {/* Inner card for note content */}
        <div
          className="rounded-lg p-3 section-enter"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {renderNoteContent()}
        </div>
      </div>

      {/* Revision history modal */}
      {showHistory && (
        <RevisionHistoryModal
          categoryType="group"
          categoryId={group.id}
          categoryName={group.name}
          currentMonth={currentMonth}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
