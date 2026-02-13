/**
 * UnmatchConfirmModal
 *
 * Confirmation modal for unmatching refund transactions.
 */

import { Modal } from '../ui/Modal';
import { ModalFooter } from '../ui/ModalButtons';
import { Icons } from '../icons';

interface UnmatchConfirmModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => Promise<void>;
  readonly count: number;
  readonly isUnmatching: boolean;
}

export function UnmatchConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  isUnmatching,
}: UnmatchConfirmModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const plural = count === 1 ? '' : 's';

  const footer = (
    <ModalFooter
      onCancel={onClose}
      onSubmit={onConfirm}
      submitLabel={count > 1 ? `Unmatch ${count} Transactions` : 'Unmatch'}
      submitLoadingLabel="Unmatching..."
      isSubmitting={isUnmatching}
      variant="warning"
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unmatch Refund" footer={footer} maxWidth="sm">
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--monarch-orange) 10%, transparent)',
          border: '1px solid var(--monarch-orange)',
        }}
      >
        <Icons.Warning
          size={20}
          className="shrink-0 mt-0.5"
          style={{ color: 'var(--monarch-orange)' }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--monarch-orange)' }}>
            Remove refund match
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            {count === 1
              ? 'The refund match will be removed and the transaction will return to unmatched. Original tags will be restored.'
              : `Refund matches will be removed from ${count} transaction${plural}. They will return to unmatched and original tags will be restored.`}
          </p>
        </div>
      </div>
    </Modal>
  );
}
