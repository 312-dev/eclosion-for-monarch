/**
 * EditWishlistModal Component
 *
 * Modal for editing an existing wishlist item.
 */

import { Modal } from '../ui/Modal';
import { Tooltip } from '../ui/Tooltip';
import { Icons } from '../icons';
import { EditWishlistForm } from './EditWishlistForm';
import type { WishlistItem } from '../../types';

/** Get button styles based on disabled state */
function getPrimaryButtonStyle(isDisabled: boolean) {
  return {
    backgroundColor: isDisabled ? 'var(--monarch-border)' : 'var(--monarch-teal)',
    color: isDisabled ? 'var(--monarch-text-muted)' : 'white',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
  } as const;
}

interface EditModalFooterProps {
  readonly isArchived: boolean;
  readonly isDisabled: boolean;
  readonly isSubmitting: boolean;
  readonly onArchive: () => void;
  readonly onDelete: () => void;
  readonly onSaveAndRestore: () => void;
  readonly onSubmit: () => void;
}

function ArchiveButton({
  isDisabled,
  onArchive,
}: {
  readonly isDisabled: boolean;
  readonly onArchive: () => void;
}) {
  return (
    <Tooltip content="Archive if this goal is completed early or postponed indefinitely" side="top">
      <button
        type="button"
        onClick={onArchive}
        disabled={isDisabled}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md btn-press"
        style={{
          color: 'var(--monarch-text-muted)',
          backgroundColor: 'transparent',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <Icons.Package size={14} />
        Archive
      </button>
    </Tooltip>
  );
}

function DeleteButton({
  isDisabled,
  onDelete,
}: {
  readonly isDisabled: boolean;
  readonly onDelete: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={isDisabled}
      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md btn-press"
      style={{ color: 'var(--monarch-error)', backgroundColor: 'transparent' }}
    >
      <Icons.Trash size={14} />
      Delete
    </button>
  );
}

function SaveRestoreButton({
  isDisabled,
  isSubmitting,
  onClick,
}: {
  readonly isDisabled: boolean;
  readonly isSubmitting: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md btn-press"
      style={getPrimaryButtonStyle(isDisabled)}
    >
      <Icons.Rotate size={14} />
      {isSubmitting ? 'Restoring...' : 'Save & Restore'}
    </button>
  );
}

function SaveButton({
  isDisabled,
  isSubmitting,
  onClick,
}: {
  readonly isDisabled: boolean;
  readonly isSubmitting: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className="px-4 py-2 text-sm font-medium rounded-md btn-press"
      style={getPrimaryButtonStyle(isDisabled)}
    >
      {isSubmitting ? 'Saving...' : 'Save'}
    </button>
  );
}

function EditModalFooter({
  isArchived,
  isDisabled,
  isSubmitting,
  onArchive,
  onDelete,
  onSaveAndRestore,
  onSubmit,
}: EditModalFooterProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        {!isArchived && <ArchiveButton isDisabled={isDisabled} onArchive={onArchive} />}
        <DeleteButton isDisabled={isDisabled} onDelete={onDelete} />
      </div>
      {isArchived ? (
        <SaveRestoreButton
          isDisabled={isDisabled}
          isSubmitting={isSubmitting}
          onClick={onSaveAndRestore}
        />
      ) : (
        <SaveButton isDisabled={isDisabled} isSubmitting={isSubmitting} onClick={onSubmit} />
      )}
    </div>
  );
}

interface EditWishlistModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly item: WishlistItem | null;
  readonly onSuccess?: () => void;
}

export function EditWishlistModal({ isOpen, onClose, item, onSuccess }: EditWishlistModalProps) {
  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Wishlist Item"
      description="Update your savings goal"
      maxWidth="md"
    >
      <EditWishlistForm
        key={item.id}
        item={item}
        onSuccess={onSuccess}
        onClose={onClose}
        renderFooter={(props) => <EditModalFooter {...props} />}
      />
    </Modal>
  );
}
