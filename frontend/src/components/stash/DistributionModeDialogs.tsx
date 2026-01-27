/**
 * Distribution Mode Dialogs
 *
 * Modal dialogs used by the Distribution Mode Banner.
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '../../constants';

interface ConfirmDialogProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({ isOpen, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
    >
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Portal-based dialog */}
      <div
        className="relative rounded-xl p-6 max-w-sm mx-4 shadow-xl"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          zIndex: Z_INDEX.MODAL,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2
          id="confirm-title"
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          Discard changes?
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
          You have unsaved changes. Are you sure you want to exit?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg btn-press"
            style={{
              backgroundColor: 'var(--monarch-bg-hover)',
              color: 'var(--monarch-text-dark)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg btn-press"
            style={{
              backgroundColor: 'var(--monarch-error)',
              color: '#fff',
            }}
          >
            Discard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface SaveNameDialogProps {
  readonly isOpen: boolean;
  readonly onSave: (name: string) => void;
  readonly onCancel: () => void;
}

export function SaveNameDialog({ isOpen, onSave, onCancel }: SaveNameDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(false);

  // Reset name when dialog opens
  // Using derived state pattern to detect when isOpen transitions from false to true
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setName('');
    }
  }

  // Focus input when dialog opens (must be in effect to avoid ref access during render)
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
    >
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Portal-based dialog */}
      <div
        className="relative rounded-xl p-6 max-w-sm mx-4 shadow-xl"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          zIndex: Z_INDEX.MODAL,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-title"
      >
        <h2
          id="save-title"
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          Save Scenario
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
          Enter a name for this scenario to save it for later.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            className="w-full px-3 py-2 text-sm rounded-lg mb-4 outline-none"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-text-dark)',
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg btn-press"
              style={{
                backgroundColor: 'var(--monarch-bg-hover)',
                color: 'var(--monarch-text-dark)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#9333ea',
                color: '#fff',
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
