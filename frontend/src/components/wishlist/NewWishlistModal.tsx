/**
 * NewWishlistModal Component
 *
 * Modal for creating a new wishlist item with two-step flow.
 */

import { Modal } from '../ui/Modal';
import { NewWishlistForm } from './NewWishlistForm';
import { ModalFooterButtons } from './WishlistFormFields';

interface NewWishlistModalProps {
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

export function NewWishlistModal({
  isOpen,
  onClose,
  onSuccess,
  prefill,
  pendingBookmarkId,
  onPendingConverted,
}: NewWishlistModalProps) {
  if (!isOpen) return null;

  // Use key to reset form state when modal reopens or prefill changes
  const formKey = `${isOpen}-${prefill?.name}-${prefill?.sourceUrl}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Wishlist Item"
      description="Save for something you want to buy"
      maxWidth="md"
    >
      <NewWishlistForm
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
