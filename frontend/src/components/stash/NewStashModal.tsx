/**
 * NewStashModal Component
 *
 * Modal for creating a new stash with two-step flow.
 */

import { Modal } from '../ui/Modal';
import { NewStashForm } from './NewStashForm';
import { ModalFooterButtons } from './StashFormFields';

interface NewStashModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess?: () => void;
  readonly prefill?: {
    name?: string;
    sourceUrl?: string;
    sourceBookmarkId?: string;
  };
  readonly pendingBookmarkId?: string;
  readonly onPendingConverted?: (id: string) => Promise<void>;
}

export function NewStashModal({
  isOpen,
  onClose,
  onSuccess,
  prefill,
  pendingBookmarkId,
  onPendingConverted,
}: NewStashModalProps) {
  if (!isOpen) return null;

  // Use key to reset form state when modal reopens or prefill changes
  const formKey = `${isOpen}-${prefill?.name}-${prefill?.sourceUrl}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Stash"
      description="Set your sights on something"
      maxWidth="md"
    >
      <NewStashForm
        key={formKey}
        prefill={prefill}
        pendingBookmarkId={pendingBookmarkId}
        onPendingConverted={onPendingConverted}
        onSuccess={onSuccess}
        onClose={onClose}
        renderFooter={({ isDisabled, isSubmitting, onSubmit }) => (
          <ModalFooterButtons
            onCancel={onClose}
            onSubmit={onSubmit}
            isDisabled={isDisabled}
            isSubmitting={isSubmitting}
            submitLabel="Create"
            submittingLabel="Creating..."
          />
        )}
      />
    </Modal>
  );
}
