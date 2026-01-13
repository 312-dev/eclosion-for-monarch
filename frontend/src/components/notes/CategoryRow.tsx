/**
 * Category Row
 *
 * Displays a single category with inline note editing.
 * Explicit save button instead of auto-save on blur.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, History, ExternalLink } from 'lucide-react';
import { NoteEditorMDX } from './NoteEditorMDX';
import { MarkdownRenderer } from './MarkdownRenderer';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import { useSaveCategoryNoteMutation, useDeleteCategoryNoteMutation } from '../../api/queries';
import { useCheckboxState } from '../../hooks';
import { decodeHtmlEntities, spacifyEmoji } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useNotesEditorOptional } from '../../context/NotesEditorContext';
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
  const isRateLimited = useIsRateLimited();
  const notesEditor = useNotesEditorOptional();

  const saveMutation = useSaveCategoryNoteMutation();
  const deleteMutation = useDeleteCategoryNoteMutation();

  // Unique editor ID for context coordination
  const editorId = `category-${category.id}-${currentMonth}`;

  // Ref to always hold the latest save function (for context coordination)
  const saveNoteRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Checkbox state management
  const { checkboxStates, toggleCheckbox } = useCheckboxState({
    noteId: note?.id,
    viewingMonth: currentMonth,
    enabled: !!note || !!content.trim(),
  });

  // Sync content when note changes externally (but not while editing)
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
          categoryType: 'category',
          categoryId: category.id,
          categoryName: category.name,
          groupId,
          groupName,
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
  }, [content, effectiveNote.note?.id, category.id, category.name, groupId, groupName, currentMonth, saveMutation, deleteMutation, notesEditor]);

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

  // Render note content area
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
          placeholder={`Write a note for ${decodeHtmlEntities(category.name)}...`}
          autoFocus
          minHeight={80}
        />
      );
    }

    if (hasContent) {
      return (
        <div className="relative">
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
            className="absolute top-0 right-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--monarch-bg-card)] transition-opacity icon-btn-hover"
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
        className="flex items-start gap-3 px-4 py-3 border-t hover:bg-[var(--monarch-bg-hover)] transition-colors group"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        {/* Category icon/name */}
        <div className="flex items-center gap-2 min-w-[140px] shrink-0">
          {category.icon && (
            <span className="text-base" aria-hidden="true">
              {category.icon}
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
            <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* Note content area */}
        <div className="flex-1 min-w-0">
          {renderNoteContent()}
        </div>
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
