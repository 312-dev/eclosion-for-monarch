/**
 * General Month Notes
 *
 * Right sidebar component for general notes about the month.
 * Shows preview by default, editor on click. Auto-saves on blur.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { NoteEditorMDX } from './NoteEditorMDX';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useSaveGeneralNoteMutation, useDeleteGeneralNoteMutation } from '../../api/queries';
import { useCheckboxState } from '../../hooks';
import { formatErrorMessage } from '../../utils';
import { useToast } from '../../context/ToastContext';
import type { MonthKey, EffectiveGeneralNote } from '../../types/notes';

/** Debounce delay for auto-save in ms */
const AUTO_SAVE_DELAY = 1000;

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
  const hasNote = !!note;
  const isInherited = effectiveNote?.isInherited ?? false;
  const sourceMonth = effectiveNote?.sourceMonth ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(noteContent);
  const lastSavedRef = useRef(noteContent);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const saveMutation = useSaveGeneralNoteMutation();
  const deleteMutation = useDeleteGeneralNoteMutation();

  // Checkbox state management for general notes
  // Use source month for inherited notes to get the correct checkbox state
  const { checkboxStates, toggleCheckbox } = useCheckboxState({
    generalNoteMonthKey: sourceMonth ?? monthKey,
    viewingMonth: monthKey,
    enabled: hasNote,
  });

  // Sync content when note changes externally
  useEffect(() => {
    if (!isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from props
      setContent(noteContent);
      lastSavedRef.current = noteContent;
    }
  }, [noteContent, isEditing]);

  // Auto-save function
  const saveNote = useCallback(async (newContent: string) => {
    const trimmedContent = newContent.trim();

    // No changes
    if (trimmedContent === lastSavedRef.current.trim()) return;

    // If content is empty and there was a note, delete it
    if (!trimmedContent) {
      if (note) {
        try {
          await deleteMutation.mutateAsync(monthKey);
          lastSavedRef.current = '';
        } catch (err) {
          toast.error(formatErrorMessage(err, 'Failed to delete note'));
        }
      }
      return;
    }

    // Save the note
    try {
      await saveMutation.mutateAsync({ monthKey, content: trimmedContent });
      lastSavedRef.current = trimmedContent;
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to save note'));
    }
  }, [monthKey, note, saveMutation, deleteMutation, toast]);

  // Debounced auto-save on content change
  useEffect(() => {
    if (!isEditing) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote(content);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, isEditing, saveNote]);

  // Handle blur - save and exit edit mode
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't exit if focus is still within the container (e.g., toolbar)
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveNote(content);
    setIsEditing(false);
  }, [content, saveNote]);

  // Handle click outside - exit edit mode when clicking on non-focusable elements
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveNote(content);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, content, saveNote]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Handle immediate save (e.g., after math insertion)
  const handleCommit = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveNote(newContent);
  }, [saveNote]);

  // Enter edit mode
  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Render content area
  const renderContent = () => {
    if (isEditing) {
      return (
        <NoteEditorMDX
          value={content}
          onChange={handleContentChange}
          onCommit={handleCommit}
          placeholder="Write general notes for this month..."
          minHeight={200}
          autoFocus
        />
      );
    }

    if (hasNote) {
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
            content={note.content}
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
      ref={containerRef}
      className="rounded-xl overflow-hidden sticky top-18 section-enter"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
      onBlur={handleBlur}
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
  // Using key forces remount when month changes, resetting all state
  return <GeneralMonthNotesInner key={monthKey} monthKey={monthKey} effectiveNote={effectiveNote} dataTourId={dataTourId} />;
}
