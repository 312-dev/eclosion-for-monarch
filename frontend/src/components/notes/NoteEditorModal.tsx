/**
 * Note Editor Modal
 *
 * Modal wrapper for editing a category/group note.
 */

import { useState, useEffect, useRef } from 'react';
import { X, Trash2, History } from 'lucide-react';
import { Portal } from '../Portal';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import { NoteEditorMDX } from './NoteEditorMDX';
import { useSaveCategoryNoteMutation, useDeleteCategoryNoteMutation } from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { formatErrorMessage } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';
import type { MonthKey } from '../../types/notes';

interface NoteEditorModalProps {
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
  /** Month to save the note for */
  monthKey: MonthKey;
  /** Initial content */
  initialContent: string;
  /** Whether the note is inherited */
  isInherited: boolean;
  /** Source month if inherited */
  sourceMonth: MonthKey | null;
  /** Callback to close modal */
  onClose: () => void;
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

export function NoteEditorModal({
  categoryType,
  categoryId,
  categoryName,
  groupId,
  groupName,
  monthKey,
  initialContent,
  isInherited,
  sourceMonth,
  onClose,
}: NoteEditorModalProps) {
  const [content, setContent] = useState(initialContent);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const isRateLimited = useIsRateLimited();

  const saveMutation = useSaveCategoryNoteMutation();
  useDeleteCategoryNoteMutation(); // Pre-warm for future delete functionality

  const hasContent = content.trim().length > 0;

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSave = async () => {
    if (!hasContent) {
      toast.error('Note cannot be empty');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        categoryType,
        categoryId,
        categoryName,
        ...(groupId !== undefined && { groupId }),
        ...(groupName !== undefined && { groupName }),
        monthKey,
        content: content.trim(),
      });
      toast.success('Note saved');
      onClose();
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to save note'));
    }
  };

  const handleDelete = async () => {
    // For inherited notes, we can't delete - we need to clear with a new empty note
    // For now, we'll just close
    if (!initialContent) {
      onClose();
      return;
    }

    // Note: This needs the note ID, but we don't have it here
    // In practice, we'd need to track the note ID or use a different approach
    toast.info('Delete functionality coming soon');
    setShowDeleteConfirm(false);
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 'var(--z-index-modal)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div
          ref={modalRef}
          className="rounded-xl shadow-lg w-full max-w-lg"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-editor-title"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            <div>
              <h2
                id="note-editor-title"
                className="font-semibold"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {categoryType === 'group' ? `${categoryName} Group` : categoryName}
              </h2>
              <p className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                Note for {formatMonth(monthKey)}
                {isInherited && sourceMonth && (
                  <> (currently inherited from {formatMonth(sourceMonth)})</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--monarch-bg-hover)] transition-colors"
              aria-label="Close"
            >
              <X size={18} style={{ color: 'var(--monarch-text-muted)' }} />
            </button>
          </div>

          {/* Editor */}
          <div
            className="border-b"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            <NoteEditorMDX
              value={content}
              onChange={setContent}
              onSave={handleSave}
              placeholder={`Write a note for ${categoryName}...`}
              autoFocus
              minHeight={150}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3">
            {/* Delete button */}
            {initialContent && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-red-500/10 transition-colors"
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                  Delete this note?
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2 py-1 text-sm font-medium rounded"
                  style={{ backgroundColor: '#ef4444', color: 'white' }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 text-sm rounded hover:bg-[var(--monarch-bg-hover)]"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  No
                </button>
              </div>
            )}

            {!initialContent && !showDeleteConfirm && <div />}

            {/* Action buttons */}
            {!showDeleteConfirm && (
              <div className="flex items-center gap-2">
                {/* History button */}
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="p-2 rounded-lg hover:bg-[var(--monarch-bg-hover)] transition-colors"
                  style={{ color: 'var(--monarch-text-muted)' }}
                  aria-label="View revision history"
                  title="History"
                >
                  <History size={18} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-[var(--monarch-bg-hover)] transition-colors"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasContent || saveMutation.isPending || isRateLimited}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    !hasContent || saveMutation.isPending || isRateLimited
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: 'var(--monarch-orange)',
                    color: 'white',
                  }}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
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
          currentMonth={monthKey}
          onClose={() => setShowHistory(false)}
        />
      )}
    </Portal>
  );
}
