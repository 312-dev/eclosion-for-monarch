/**
 * General Month Notes
 *
 * Right sidebar component for general notes about the month.
 * Shows preview by default, editor on click. Explicit save button.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { NoteEditorMDX } from './NoteEditorMDX';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InheritanceWarningInline } from './InheritanceWarningInline';
import { useSaveGeneralNoteMutation, useDeleteGeneralNoteMutation } from '../../api/queries';
import { useCheckboxState, useInheritanceWarning } from '../../hooks';
import { handleApiError } from '../../utils';
import { useToast } from '../../context/ToastContext';
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
  const notesEditor = useNotesEditorOptional();

  const saveMutation = useSaveGeneralNoteMutation();
  const deleteMutation = useDeleteGeneralNoteMutation();

  // Unique editor ID for context coordination
  const editorId = `general-${monthKey}`;

  // Ref to always hold the latest save function (for context coordination)
  const saveNoteRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Checkbox state management for general notes
  const {
    checkboxStates,
    toggleCheckbox,
    isLoading: checkboxesLoading,
  } = useCheckboxState({
    generalNoteMonthKey: sourceMonth ?? monthKey,
    viewingMonth: monthKey,
    enabled: !!note || !!content.trim(),
  });

  // Determine if this is a source note (exists for this exact month, not inherited)
  const hasExistingNote = !!note && !isInherited;

  // Inheritance warning for breaking inheritance OR modifying source note
  const {
    showWarning: showInheritanceWarning,
    impact: inheritanceImpact,
    isChecking: isCheckingInheritance,
    checkBeforeSave,
    confirmSave: confirmInheritanceSave,
    cancelWarning: cancelInheritanceWarning,
  } = useInheritanceWarning({
    isInherited,
    hasExistingNote,
    monthKey,
    isGeneral: true,
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

  // Perform the actual save
  const performSave = useCallback(async () => {
    const trimmedContent = content.trim();

    setIsSaving(true);

    try {
      // If content is empty and there was a note, delete it
      if (trimmedContent) {
        // Save the note
        await saveMutation.mutateAsync({ monthKey, content: trimmedContent });
        lastSavedRef.current = trimmedContent;
      } else {
        if (note) {
          await deleteMutation.mutateAsync(monthKey);
          lastSavedRef.current = '';
        }
      }
      setIsEditing(false);
      notesEditor?.closeEditor();
    } catch (err) {
      toast.error(handleApiError(err, 'Failed to save note'));
    } finally {
      setIsSaving(false);
    }
  }, [content, note, monthKey, saveMutation, deleteMutation, toast, notesEditor]);

  // Save function - checks inheritance impact first
  const saveNote = useCallback(async () => {
    const trimmedContent = content.trim();

    // No changes
    if (trimmedContent === lastSavedRef.current.trim()) {
      setIsEditing(false);
      notesEditor?.closeEditor();
      return;
    }

    // Check inheritance impact before saving
    const canProceed = await checkBeforeSave();
    if (canProceed) {
      await performSave();
    }
  }, [content, notesEditor, checkBeforeSave, performSave]);

  // Confirm save after inheritance warning
  const handleConfirmInheritanceSave = useCallback(async () => {
    confirmInheritanceSave();
    await performSave();
  }, [confirmInheritanceSave, performSave]);

  // Keep ref updated so context always calls latest save function
  useEffect(() => {
    saveNoteRef.current = saveNote;
  }, [saveNote]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Cancel editing - discard changes
  const handleCancel = useCallback(() => {
    // Restore the original content (inherited or saved)
    setContent(noteContent);
    lastSavedRef.current = noteContent;
    setIsEditing(false);
    notesEditor?.closeEditor();
  }, [notesEditor, noteContent]);

  // Enter edit mode
  const handleStartEdit = useCallback(async () => {
    // If using context, request to open (auto-saves other editors)
    // Pass a stable wrapper that calls the ref to ensure latest content is saved
    if (notesEditor) {
      const canOpen = await notesEditor.requestOpen(editorId, () => saveNoteRef.current());
      if (!canOpen) return;
    }

    // If editing an inherited note, start with empty content
    // (user is creating a new note for this month, not editing the source)
    if (isInherited) {
      setContent('');
      lastSavedRef.current = '';
    }

    setIsEditing(true);
  }, [notesEditor, editorId, isInherited]);

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
            onCancel={handleCancel}
            isSaving={isSaving || isCheckingInheritance}
            placeholder="Write general notes for this month..."
            minHeight={200}
            autoFocus
          />
          {showInheritanceWarning && inheritanceImpact && (
            <InheritanceWarningInline
              monthsWithCheckboxStates={inheritanceImpact.monthsWithCheckboxStates}
              isSourceNoteEdit={inheritanceImpact.isSourceNoteEdit}
              onCancel={cancelInheritanceWarning}
              onConfirm={handleConfirmInheritanceSave}
            />
          )}
        </div>
      );
    }

    if (hasContent) {
      return (
        <div className="p-4 relative group">
          {isInherited && sourceMonth && (
            <div className="text-xs mb-2 italic" style={{ color: 'var(--monarch-text-muted)' }}>
              Inherited from {formatMonth(sourceMonth)}
            </div>
          )}
          <MarkdownRenderer
            content={displayContent || note?.content || ''}
            checkboxStates={checkboxStates}
            onCheckboxToggle={toggleCheckbox}
            onDoubleClick={handleStartEdit}
            checkboxesDisabled={checkboxesLoading}
          />
          {/* Clear inheritance button - only for inherited notes */}
          {isInherited && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="absolute top-4 right-4 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-(--monarch-bg-hover) transition-opacity icon-btn-hover"
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-label="Create new note for this month"
              title="Clear inheritance (start fresh)"
            >
              <X size={14} />
            </button>
          )}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleStartEdit}
        className="w-full p-4 flex items-center justify-center gap-2 text-sm hover:bg-(--monarch-bg-hover) transition-colors"
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
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
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
  return (
    <GeneralMonthNotesInner
      key={monthKey}
      monthKey={monthKey}
      effectiveNote={effectiveNote}
      dataTourId={dataTourId}
    />
  );
}
