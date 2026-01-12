/**
 * Category Row
 *
 * Displays a single category with inline note editing.
 * Auto-saves on blur and with debounce.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, History, ExternalLink } from 'lucide-react';
import { NoteEditorMDX } from './NoteEditorMDX';
import { MarkdownRenderer } from './MarkdownRenderer';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import { useSaveCategoryNoteMutation } from '../../api/queries';
import { useCheckboxState } from '../../hooks';
import type { CategoryWithNotes, MonthKey } from '../../types/notes';

/** Debounce delay for auto-save in ms */
const AUTO_SAVE_DELAY = 1000;

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
  const hasNote = effectiveNote.note !== null;
  const noteContent = effectiveNote.note?.content ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(noteContent);
  const [showHistory, setShowHistory] = useState(false);
  const lastSavedRef = useRef(noteContent);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const saveMutation = useSaveCategoryNoteMutation();

  // Checkbox state management
  const { checkboxStates, toggleCheckbox } = useCheckboxState({
    noteId: effectiveNote.note?.id,
    viewingMonth: currentMonth,
    enabled: hasNote,
  });

  // Sync content when note changes externally (but not while editing)
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
    if (trimmedContent === lastSavedRef.current.trim()) return;
    if (!trimmedContent) return; // Don't save empty notes

    try {
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
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  }, [saveMutation, category.id, category.name, groupId, groupName, currentMonth]);

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
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    // Save immediately
    saveNote(newContent);
  }, [saveNote]);

  // Enter edit mode
  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="flex items-start gap-3 px-4 py-3 border-t hover:bg-[var(--monarch-bg-hover)] transition-colors group"
        style={{ borderColor: 'var(--monarch-border)' }}
        onBlur={handleBlur}
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
            title={`View ${category.name} in Monarch`}
          >
            {category.name}
            <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* Note content area */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <NoteEditorMDX
              value={content}
              onChange={handleContentChange}
              onCommit={handleCommit}
              placeholder={`Write a note for ${category.name}...`}
              autoFocus
              minHeight={80}
            />
          ) : hasNote ? (
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
                content={effectiveNote.note!.content}
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
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity icon-btn-hover"
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-label={`Add note for ${category.name}`}
            >
              <Plus size={14} />
              Add note
            </button>
          )}
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
