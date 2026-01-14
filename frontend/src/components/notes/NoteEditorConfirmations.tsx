/**
 * Note Editor Confirmation Dialogs
 *
 * Extracted confirmation UI components for the note editor modal.
 */

import { AlertTriangle, History, X, Trash2 } from 'lucide-react';

interface DeleteButtonProps {
  onClick: () => void;
}

export function DeleteButton({ onClick }: Readonly<DeleteButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-red-500/10 transition-colors"
      style={{ color: '#ef4444' }}
    >
      <Trash2 size={14} />
      Delete
    </button>
  );
}

interface ModalHeaderProps {
  categoryType: 'group' | 'category';
  categoryName: string;
  monthKey: string;
  isInherited: boolean;
  sourceMonth: string | null;
  formatMonth: (monthKey: string) => string;
  onClose: () => void;
}

export function NoteEditorHeader({
  categoryType,
  categoryName,
  monthKey,
  isInherited,
  sourceMonth,
  formatMonth,
  onClose,
}: Readonly<ModalHeaderProps>) {
  return (
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
  );
}

interface DiscardConfirmProps {
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function DiscardConfirmation({ onKeepEditing, onDiscard }: DiscardConfirmProps) {
  return (
    <div
      className="px-4 py-3 border-b flex items-center justify-between"
      style={{
        borderColor: 'var(--monarch-border)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
      }}
    >
      <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
        Discard unsaved changes?
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onKeepEditing}
          className="px-3 py-1.5 text-sm rounded-lg hover:bg-[var(--monarch-bg-hover)]"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Keep Editing
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="px-3 py-1.5 text-sm font-medium rounded-lg"
          style={{ backgroundColor: '#ef4444', color: 'white' }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}

interface InheritanceWarningProps {
  monthsWithCheckboxStates: Record<string, number>;
  formatMonth: (monthKey: string) => string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function InheritanceBreakWarning({
  monthsWithCheckboxStates,
  formatMonth,
  onCancel,
  onConfirm,
}: InheritanceWarningProps) {
  return (
    <div
      className="px-4 py-3 border-b"
      style={{
        borderColor: 'var(--monarch-border)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle
          size={16}
          className="mt-0.5 shrink-0"
          style={{ color: 'var(--monarch-orange)' }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            This will clear checkbox states
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            Creating a new note for this month will reset checked items in:
          </p>
        </div>
      </div>
      <ul
        className="text-xs ml-6 mb-3 space-y-0.5"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        {Object.entries(monthsWithCheckboxStates).map(([month, count]) => (
          <li key={month}>
            {formatMonth(month)} ({count} checked item{count !== 1 ? 's' : ''})
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-lg hover:bg-[var(--monarch-bg-hover)]"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-3 py-1.5 text-sm font-medium rounded-lg"
          style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}
        >
          Save Anyway
        </button>
      </div>
    </div>
  );
}

interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmation({ onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        Delete this note?
      </span>
      <button
        type="button"
        onClick={onConfirm}
        className="px-2 py-1 text-sm font-medium rounded"
        style={{ backgroundColor: '#ef4444', color: 'white' }}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1 text-sm rounded hover:bg-[var(--monarch-bg-hover)]"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        No
      </button>
    </div>
  );
}

interface InheritedContentRefProps {
  sourceMonth: string;
  inheritedContent: string;
  formatMonth: (monthKey: string) => string;
}

export function InheritedContentReference({
  sourceMonth,
  inheritedContent,
  formatMonth,
}: InheritedContentRefProps) {
  return (
    <div
      className="px-4 py-3 border-b"
      style={{
        borderColor: 'var(--monarch-border)',
        backgroundColor: 'var(--monarch-bg-page)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} style={{ color: 'var(--monarch-orange)' }} />
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Currently inheriting from {formatMonth(sourceMonth)}
        </span>
      </div>
      <div
        className="text-sm p-3 rounded-lg max-h-32 overflow-y-auto"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          color: 'var(--monarch-text-muted)',
        }}
      >
        <pre className="whitespace-pre-wrap font-sans text-sm">{inheritedContent}</pre>
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--monarch-text-muted)' }}>
        Type above to create a new note for this month, or leave empty to continue
        inheriting.
      </p>
    </div>
  );
}

interface FooterActionsProps {
  onShowHistory: () => void;
  onCancel: () => void;
  onSave: () => void;
  saveButtonText: string;
  isSaveDisabled: boolean;
}

export function NoteEditorFooterActions({
  onShowHistory,
  onCancel,
  onSave,
  saveButtonText,
  isSaveDisabled,
}: Readonly<FooterActionsProps>) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onShowHistory}
        className="p-2 rounded-lg hover:bg-[var(--monarch-bg-hover)] transition-colors"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label="View revision history"
        title="History"
      >
        <History size={18} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-[var(--monarch-bg-hover)] transition-colors"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaveDisabled}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          isSaveDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
        }`}
        style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}
      >
        {saveButtonText}
      </button>
    </div>
  );
}
