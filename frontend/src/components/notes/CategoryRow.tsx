/**
 * Category Row
 *
 * Displays a single category with inline note editing.
 * Explicit save button instead of auto-save on blur.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, History, ExternalLink, X } from 'lucide-react';
import { NoteEditorMDX } from './NoteEditorMDX';
import { MarkdownRenderer } from './MarkdownRenderer';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import { InheritanceWarningInline } from './InheritanceWarningInline';
import { useSaveCategoryNoteMutation, useDeleteCategoryNoteMutation } from '../../api/queries';
import { useCheckboxState, useInheritanceWarning } from '../../hooks';
import { decodeHtmlEntities, spacifyEmoji, handleApiError } from '../../utils';
import { useNotesEditorOptional } from '../../context/NotesEditorContext';
import { useToast } from '../../context/ToastContext';
import type { CategoryWithNotes, MonthKey } from '../../types/notes';

interface CategoryRowProps {
  /** The category */
  category: CategoryWithNotes;
  /** Parent group ID */
  groupId: string;
  /** Parent group name */
  groupName: string;
  /** Current month being viewed */
  currentMonth: MonthKey;
}

export function CategoryRow({ category, groupId, groupName, currentMonth }: CategoryRowProps) {
  const { effectiveNote } = category;
  const note = effectiveNote.note;
  const noteContent = note?.content ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(noteContent);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const lastSavedRef = useRef(noteContent);
  const notesEditor = useNotesEditorOptional();
  const toast = useToast();

  const saveMutation = useSaveCategoryNoteMutation();
  const deleteMutation = useDeleteCategoryNoteMutation();

  // Unique editor ID for context coordination
  const editorId = `category-${category.id}-${currentMonth}`;

  // Ref to always hold the latest save function (for context coordination)
  const saveNoteRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Checkbox state management
  const {
    checkboxStates,
    toggleCheckbox,
    isLoading: checkboxesLoading,
  } = useCheckboxState({
    noteId: note?.id,
    viewingMonth: currentMonth,
    enabled: !!note || !!content.trim(),
  });

  // Determine if this is a source note (exists for this exact month, not inherited)
  const hasExistingNote = !!note && !effectiveNote.isInherited;

  // Inheritance warning for breaking inheritance OR modifying source note
  const {
    showWarning: showInheritanceWarning,
    impact: inheritanceImpact,
    isChecking: isCheckingInheritance,
    checkBeforeSave,
    confirmSave: confirmInheritanceSave,
    cancelWarning: cancelInheritanceWarning,
  } = useInheritanceWarning({
    isInherited: effectiveNote.isInherited,
    hasExistingNote,
    categoryType: 'category',
    categoryId: category.id,
    monthKey: currentMonth,
  });

  // Sync content when note changes externally (but not while editing)
  useEffect(() => {
    if (!isEditing) {
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
        await saveMutation.mutateAsync({
          categoryType: 'category',
          categoryId: category.id,
          categoryName: category.name,
          groupId,
          groupName,
          monthKey: currentMonth,
          content: trimmedContent,
        });
        lastSavedRef.current = trimmedContent;
      } else {
        const noteId = effectiveNote.note?.id;
        if (noteId) {
          await deleteMutation.mutateAsync(noteId);
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
  }, [
    content,
    effectiveNote.note?.id,
    category.id,
    category.name,
    groupId,
    groupName,
    currentMonth,
    saveMutation,
    deleteMutation,
    notesEditor,
    toast,
  ]);

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
    if (effectiveNote.isInherited) {
      setContent('');
      lastSavedRef.current = '';
    }

    setIsEditing(true);
  }, [notesEditor, editorId, effectiveNote.isInherited]);

  // Render note content area
  const displayContent = content.trim();
  const hasContent = !!note || !!displayContent;

  const renderNoteContent = () => {
    if (isEditing) {
      return (
        <>
          <NoteEditorMDX
            value={content}
            onChange={handleContentChange}
            onSave={saveNote}
            onCancel={handleCancel}
            isSaving={isSaving || isCheckingInheritance}
            placeholder={`Write a note for ${decodeHtmlEntities(category.name)}...`}
            autoFocus
            minHeight={80}
          />
          {showInheritanceWarning && inheritanceImpact && (
            <InheritanceWarningInline
              monthsWithCheckboxStates={inheritanceImpact.monthsWithCheckboxStates}
              isSourceNoteEdit={inheritanceImpact.isSourceNoteEdit}
              onCancel={cancelInheritanceWarning}
              onConfirm={handleConfirmInheritanceSave}
            />
          )}
        </>
      );
    }

    if (hasContent) {
      return (
        <div className="relative">
          {/* Inheritance badge */}
          {effectiveNote.isInherited && effectiveNote.sourceMonth && (
            <div className="text-xs mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
              from {formatSourceMonth(effectiveNote.sourceMonth)}
            </div>
          )}
          <MarkdownRenderer
            content={displayContent || note?.content || ''}
            checkboxStates={checkboxStates}
            onCheckboxToggle={toggleCheckbox}
            onDoubleClick={handleStartEdit}
            checkboxesDisabled={checkboxesLoading}
          />
          {/* Action buttons - show on hover */}
          <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Clear inheritance button - only for inherited notes */}
            {effectiveNote.isInherited && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="p-1 rounded hover:bg-(--monarch-bg-card) icon-btn-hover"
                style={{ color: 'var(--monarch-text-muted)' }}
                aria-label="Create new note for this month"
                title="Clear inheritance (start fresh)"
              >
                <X size={14} />
              </button>
            )}
            {/* History button */}
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="p-1 rounded hover:bg-(--monarch-bg-card) icon-btn-hover"
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-label="View revision history"
              title="History"
            >
              <History size={14} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleStartEdit}
        className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity icon-btn-hover"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label={`Add note for ${decodeHtmlEntities(category.name)}`}
      >
        <Plus size={14} />
        Add note
      </button>
    );
  };

  return (
    <>
      <div
        className="flex items-start gap-3 px-4 py-3 border-t hover:bg-(--monarch-bg-hover) transition-colors group"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        {/* Category icon/name */}
        <div className="flex items-center gap-2 min-w-35 shrink-0">
          {category.icon && (
            <span className="text-base" aria-hidden="true">
              {decodeHtmlEntities(category.icon)}
            </span>
          )}
          <a
            href={`https://app.monarchmoney.com/categories/${category.id}?breakdown=category&date=${currentMonth}-01&sankey=category&timeframe=month&view=breakdown`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline inline-flex items-center gap-1 group/link"
            style={{ color: 'var(--monarch-text-dark)' }}
            title={`View ${decodeHtmlEntities(category.name)} in Monarch`}
          >
            {spacifyEmoji(decodeHtmlEntities(category.name))}
            <ExternalLink
              size={12}
              className="opacity-0 group-hover/link:opacity-100 transition-opacity"
            />
          </a>
        </div>

        {/* Note content area */}
        <div className="flex-1 min-w-0">{renderNoteContent()}</div>
      </div>

      {/* Revision history modal */}
      {showHistory && (
        <RevisionHistoryModal
          categoryType="category"
          categoryId={category.id}
          categoryName={category.name}
          groupId={groupId}
          groupName={groupName}
          currentMonth={currentMonth}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
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
