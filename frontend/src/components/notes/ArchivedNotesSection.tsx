/**
 * Archived Notes Section
 *
 * Collapsible section showing notes from deleted Monarch categories.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Archive } from 'lucide-react';
import { useDeleteArchivedNoteMutation } from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { handleApiError, decodeHtmlEntities } from '../../utils';
import type { ArchivedNote } from '../../types/notes';

interface ArchivedNotesSectionProps {
  /** Archived notes to display */
  notes: ArchivedNote[];
}

/**
 * Format month key for display
 */
function formatMonth(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ArchivedNotesSection({ notes }: ArchivedNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  const deleteMutation = useDeleteArchivedNoteMutation();

  if (notes.length === 0) {
    return null;
  }

  const handleDelete = async (noteId: string) => {
    try {
      await deleteMutation.mutateAsync(noteId);
      toast.success('Archived note deleted');
      setDeletingId(null);
    } catch (err) {
      toast.error(handleApiError(err, 'Failed to delete note'));
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden mt-6"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-(--monarch-bg-hover) transition-colors"
        aria-expanded={isExpanded}
      >
        <Archive size={16} style={{ color: 'var(--monarch-text-muted)' }} />
        <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          Archived Notes
        </span>
        <span
          className="px-2 py-0.5 text-xs rounded-full"
          style={{
            backgroundColor: 'var(--monarch-bg-hover)',
            color: 'var(--monarch-text-muted)',
          }}
        >
          {notes.length}
        </span>
        <span className="ml-auto" style={{ color: 'var(--monarch-text-muted)' }}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>

      {/* Archived notes list */}
      {isExpanded && (
        <div className="border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          {notes.map((note, index) => (
            <div
              key={note.id}
              className="px-4 py-3 border-b last:border-b-0 list-item-enter"
              style={{ borderColor: 'var(--monarch-border)', animationDelay: `${index * 30}ms` }}
            >
              {/* Note header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div
                    className="font-medium text-sm"
                    style={{ color: 'var(--monarch-text-dark)' }}
                  >
                    {decodeHtmlEntities(note.originalCategoryName)}
                    {note.originalGroupName && (
                      <span className="font-normal" style={{ color: 'var(--monarch-text-muted)' }}>
                        {' '}
                        in {decodeHtmlEntities(note.originalGroupName)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                    from {formatMonth(note.monthKey)} · deleted{' '}
                    {new Date(note.archivedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Delete button */}
                {deletingId === note.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      disabled={deleteMutation.isPending}
                      className="px-2 py-1 text-xs font-medium rounded disabled:opacity-50"
                      style={{ backgroundColor: 'var(--monarch-warning)', color: 'white' }}
                    >
                      {deleteMutation.isPending ? '...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-2 py-1 text-xs rounded hover:bg-(--monarch-bg-hover)"
                      style={{ color: 'var(--monarch-text-muted)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(note.id)}
                    className="p-1.5 rounded hover:bg-(--monarch-bg-hover) transition-colors icon-btn-hover"
                    style={{ color: 'var(--monarch-text-muted)' }}
                    aria-label="Delete archived note"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Note content preview */}
              <div className="text-sm line-clamp-2" style={{ color: 'var(--monarch-text-dark)' }}>
                {note.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
