/**
 * SaveHypothesisOverlay
 *
 * Overlay for saving a hypothesis from the Distribute Wizard.
 * Handles name input, override confirmation, and max limit enforcement.
 */

import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { ModalFooter } from '../ui/ModalButtons';
import { Icons } from '../icons';

interface SaveHypothesisOverlayProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (name: string) => Promise<void>;
  readonly existingNames: string[];
  readonly defaultName?: string;
  readonly isSaving: boolean;
  readonly isAtLimit: boolean;
}

/**
 * Inner content component that manages its own state.
 * Gets remounted when the modal opens, resetting state naturally.
 */
function SaveHypothesisContent({
  onClose,
  onSave,
  existingNames,
  defaultName,
  isSaving,
  isAtLimit,
}: Readonly<Omit<SaveHypothesisOverlayProps, 'isOpen'>>) {
  const [name, setName] = useState(defaultName || 'Hypothesis 1');
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const trimmedName = name.trim();
  const nameExists = existingNames.some(
    (existing) => existing.toLowerCase() === trimmedName.toLowerCase()
  );
  const isNewName = !nameExists;
  const canSave = trimmedName.length > 0 && (!isAtLimit || !isNewName);

  const handleSave = async () => {
    if (!canSave) return;

    // If name exists and not in override mode, show confirmation
    if (nameExists && !showOverrideConfirm) {
      setShowOverrideConfirm(true);
      return;
    }

    await onSave(trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSave && !isSaving) {
      handleSave();
    }
  };

  const handleClose = () => {
    setShowOverrideConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Name input */}
        <div>
          <label htmlFor="hypothesis-name" className="block text-sm font-medium text-monarch-text-dark mb-1.5">
            Name
          </label>
          <input
            ref={inputRef}
            id="hypothesis-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowOverrideConfirm(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter a name for this hypothesis"
            maxLength={100}
            disabled={isSaving}
            className="w-full px-3 py-2 text-sm rounded-lg border border-monarch-border bg-monarch-bg-card text-monarch-text-dark placeholder-monarch-text-muted focus:outline-none focus:ring-2 focus:ring-monarch-teal/50 focus:border-monarch-teal disabled:opacity-50"
          />
        </div>

        {/* Override warning */}
        {showOverrideConfirm && (
          <div
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{
              backgroundColor: 'var(--monarch-warning-light, rgba(245, 158, 11, 0.1))',
              border: '1px solid var(--monarch-warning)',
            }}
          >
            <Icons.Warning
              size={20}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--monarch-warning)' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--monarch-warning)' }}>
                Override existing hypothesis?
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                A hypothesis named &quot;{trimmedName}&quot; already exists. Click Override to replace it.
              </p>
            </div>
          </div>
        )}

        {/* Limit warning */}
        {isAtLimit && isNewName && trimmedName.length > 0 && (
          <div
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{
              backgroundColor: 'var(--monarch-error-light, rgba(239, 68, 68, 0.1))',
              border: '1px solid var(--monarch-error)',
            }}
          >
            <Icons.Warning
              size={20}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--monarch-error)' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--monarch-error)' }}>
                Maximum hypotheses reached
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                You can save up to 10 hypotheses. Delete an existing one or use an existing name to override.
              </p>
            </div>
          </div>
        )}

        {/* Hint for existing name */}
        {nameExists && !showOverrideConfirm && !isAtLimit && (
          <p className="text-xs text-monarch-text-muted">
            This name exists. Saving will replace the existing hypothesis.
          </p>
        )}
      </div>

      <ModalFooter
        onCancel={handleClose}
        onSubmit={handleSave}
        submitLabel={showOverrideConfirm ? 'Override' : 'Save'}
        submitLoadingLabel="Saving..."
        isSubmitting={isSaving}
        isDisabled={!canSave}
        variant={showOverrideConfirm ? 'warning' : 'primary'}
      />
    </>
  );
}

export function SaveHypothesisOverlay({
  isOpen,
  onClose,
  ...contentProps
}: SaveHypothesisOverlayProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Hypothesis" maxWidth="sm">
      {isOpen && <SaveHypothesisContent onClose={onClose} {...contentProps} />}
    </Modal>
  );
}
