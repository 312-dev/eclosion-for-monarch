/**
 * General Month Notes
 *
 * Right sidebar component for general notes about the month.
 * Shows preview by default, editor on click. Explicit save button.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { NoteEditorMDX } from './NoteEditorMDX';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useSaveGeneralNoteMutation, useDeleteGeneralNoteMutation } from '../../api/queries';
import { useCheckboxState } from '../../hooks';
import { formatErrorMessage } from '../../utils';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useNotesEditorOptional } from '../../context/NotesEditorContext';
import type { MonthKey, EffectiveGeneralNote } from '../../types/notes';

interface GeneralMonthNotesProps {
  /** Current month being viewed */
  monthKey: MonthKey;
  /** Effective general note (may be inherited from earlier month) */
  effectiveNote: EffectiveGeneralNote | null;
  /** Optional data-tour attribute for guided tour (only apply to one instance) */
  dataTourId?: string | undefined;
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
 * Inner component that resets when monthKey changes via key prop
 */
function GeneralMonthNotesInner({ monthKey, effectiveNote, dataTourId }: GeneralMonthNotesProps) {
  const note = effectiveNote?.note ?? null;
  const noteContent = note?.content ?? '';
  const isInherited = effectiveNote?.isInherited ?? false;
  const sourceMonth = effectiveNote?.sourceMonth ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(noteContent);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef(noteContent);
  const prevIsEditingRef = useRef(isEditing);
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const notesEditor = useNotesEditorOptional();

  const saveMutation = useSaveGeneralNoteMutation();
  const deleteMutation = useDeleteGeneralNoteMutation();

  // Unique editor ID for context coordination
  const editorId = `general-${monthKey}`;

  // Checkbox state management for general notes
  const { checkboxStates, toggleCheckbox } = useCheckboxState({
    generalNoteMonthKey: sourceMonth ?? monthKey,
    viewingMonth: monthKey,
    enabled: !!note || !!content.trim(),
  });

  // Sync content when note changes externally
  useEffect(() => {
    const justExitedEditing = prevIsEditingRef.current && !isEditing;
    prevIsEditingRef.current = isEditing;

    if (!isEditing && !justExitedEditing) {
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
        if (note) {
          await deleteMutation.mutateAsync(monthKey);
          lastSavedRef.current = '';
        }
      } else {
        // Save the note
        await saveMutation.mutateAsync({ monthKey, content: trimmedContent });
        lastSavedRef.current = trimmedContent;
      }
      setIsEditing(false);
      notesEditor?.closeEditor();
    } catch (err) {
      console.error('Failed to save note:', err);
      toast.error(formatErrorMessage(err, 'Failed to save note'));
    } finally {
      setIsSaving(false);
    }
  }, [content, note, monthKey, saveMutation, deleteMutation, toast, notesEditor]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Enter edit mode (blocked when rate limited)
  const handleStartEdit = useCallback(async () => {
    if (isRateLimited) return;

    // If using context, request to open (auto-saves other editors)
    if (notesEditor) {
      const canOpen = await notesEditor.requestOpen(editorId, saveNote);
      if (!canOpen) return;
    }

    setIsEditing(true);
  }, [isRateLimited, notesEditor, editorId, saveNote]);

  // Render content area
  const displayContent = content.trim();
  const hasContent = !!note || !!displayContent;

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="p-4">
          <NoteEditorMDX
            value={content}
            onChange={handleContentChange}
            onSave={saveNote}
            isSaving={isSaving}
            placeholder="Write general notes for this month..."
            minHeight={200}
            autoFocus
          />
        </div>
      );
    }

    if (hasContent) {
      return (
        <div className="p-4">
          {isInherited && sourceMonth && (
            <div
              className="text-xs mb-2 italic"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              Inherited from {formatMonth(sourceMonth)}
            </div>
          )}
          <MarkdownRenderer
            content={displayContent || note?.content || ''}
            checkboxStates={checkboxStates}
            onCheckboxToggle={toggleCheckbox}
            onDoubleClick={handleStartEdit}
          />
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleStartEdit}
        className="w-full p-4 flex items-center justify-center gap-2 text-sm hover:bg-[var(--monarch-bg-hover)] transition-colors"
        style={{ color: 'var(--monarch-text-muted)', minHeight: '100px' }}
      >
        <Plus size={16} />
        Add month notes
      </button>
    );
  };

  return (
    <div
      className="rounded-xl overflow-hidden sticky top-18 section-enter"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
      data-tour={dataTourId}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <h3 className="font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
          Notes for {formatMonth(monthKey)}
        </h3>
      </div>

      {/* Content area */}
      {renderContent()}
    </div>
  );
}

/**
 * Wrapper that uses key to reset state when month changes
 */
export function GeneralMonthNotes({ monthKey, effectiveNote, dataTourId }: GeneralMonthNotesProps) {
  return <GeneralMonthNotesInner key={monthKey} monthKey={monthKey} effectiveNote={effectiveNote} dataTourId={dataTourId} />;
}
