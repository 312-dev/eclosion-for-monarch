/**
 * DeleteStashConfirmModal
 *
 * Confirmation modal for deleting a stash/savings goal.
 * Includes an optional checkbox to also delete the category from Monarch.
 */

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { ModalFooter } from '../ui/ModalButtons';
import { Icons } from '../icons';
import type { StashItem } from '../../types';

interface DeleteStashConfirmModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (deleteCategory: boolean) => Promise<void>;
  readonly item: StashItem | null;
  readonly isDeleting: boolean;
}

export function DeleteStashConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  isDeleting,
}: DeleteStashConfirmModalProps) {
  const [deleteCategory, setDeleteCategory] = useState(false);

  const handleClose = () => {
    setDeleteCategory(false);
    onClose();
  };

  const handleConfirm = async () => {
    await onConfirm(deleteCategory);
  };

  if (!item) return null;

  const footer = (
    <ModalFooter
      onCancel={handleClose}
      onSubmit={handleConfirm}
      submitLabel="Delete"
      submitLoadingLabel="Deleting..."
      isSubmitting={isDeleting}
      variant="destructive"
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Stash" footer={footer} maxWidth="sm">
      <div className="space-y-4">
        {/* Warning message */}
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
              This action cannot be undone
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              The stash &quot;{item.name}&quot; will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Category deletion checkbox - only show if item has a category */}
        {item.category_id && (
          <label
            htmlFor="delete-category-checkbox"
            className="flex items-start gap-3 cursor-pointer group"
          >
            <input
              id="delete-category-checkbox"
              type="checkbox"
              checked={deleteCategory}
              onChange={(e) => setDeleteCategory(e.target.checked)}
              disabled={isDeleting}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-monarch-orange focus:ring-monarch-text-muted"
            />
            <div>
              <span className="text-sm font-medium" style={{ color: 'var(--monarch-text)' }}>
                Also delete category from Monarch
              </span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                This will remove the &quot;{item.category_name || item.name}&quot; category from
                your Monarch account. Any transactions in this category will become uncategorized.
              </p>
            </div>
          </label>
        )}
      </div>
    </Modal>
  );
}
