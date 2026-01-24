/**
 * LoadHypothesisOverlay
 *
 * Overlay for loading or deleting saved hypotheses from the Distribute Wizard.
 * Shows a list of saved hypotheses with load and delete actions.
 */

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Icons } from '../icons';
import type { StashHypothesis } from '../../types';

interface LoadHypothesisOverlayProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly hypotheses: StashHypothesis[];
  readonly onLoad: (hypothesis: StashHypothesis) => void;
  readonly onDelete: (id: string) => Promise<void>;
  readonly isLoading: boolean;
  readonly deletingId: string | null;
}

export function LoadHypothesisOverlay({
  isOpen,
  onClose,
  hypotheses,
  onLoad,
  onDelete,
  isLoading,
  deletingId,
}: LoadHypothesisOverlayProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleLoad = (hypothesis: StashHypothesis) => {
    onLoad(hypothesis);
    onClose();
  };

  const handleDeleteClick = (id: string) => {
    if (confirmDeleteId === id) {
      // Second click - actually delete
      onDelete(id).then(() => setConfirmDeleteId(null));
    } else {
      // First click - show confirmation
      setConfirmDeleteId(id);
    }
  };

  const handleClose = () => {
    setConfirmDeleteId(null);
    onClose();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  // Get summary for a hypothesis
  const getSummary = (hypothesis: StashHypothesis) => {
    const parts: string[] = [];
    if (hypothesis.savingsTotal > 0) {
      parts.push(`${formatCurrency(hypothesis.savingsTotal)} savings`);
    }
    if (hypothesis.monthlyTotal > 0) {
      parts.push(`${formatCurrency(hypothesis.monthlyTotal)}/mo`);
    }
    return parts.length > 0 ? parts.join(' + ') : 'No allocations';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Load Hypothesis" maxWidth="md">
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icons.Spinner size={24} className="animate-spin text-monarch-text-muted" />
          </div>
        ) : hypotheses.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-3 rounded-full bg-monarch-bg-page inline-block mb-3">
              <Icons.FlaskConicalOff size={24} className="text-monarch-text-muted" />
            </div>
            <p className="text-sm font-medium text-monarch-text-dark">No saved hypotheses</p>
            <p className="text-xs text-monarch-text-muted mt-1">
              Save a hypothesis from the Distribute Wizard to see it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-monarch-border">
            {hypotheses.map((hypothesis) => {
              const isDeleting = deletingId === hypothesis.id;
              const isConfirmingDelete = confirmDeleteId === hypothesis.id;

              return (
                <div
                  key={hypothesis.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  {/* Hypothesis info */}
                  <button
                    onClick={() => handleLoad(hypothesis)}
                    disabled={isDeleting}
                    className="flex-1 text-left hover:bg-monarch-bg-hover rounded-lg p-2 -m-2 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-monarch-text-dark group-hover:text-monarch-teal">
                        {hypothesis.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-monarch-text-muted">
                        {getSummary(hypothesis)}
                      </span>
                      <span className="text-xs text-monarch-text-muted">
                        &middot; {formatDate(hypothesis.updatedAt)}
                      </span>
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteClick(hypothesis.id)}
                    disabled={isDeleting}
                    className={`p-2 rounded-lg transition-colors shrink-0 ${
                      isConfirmingDelete
                        ? 'bg-monarch-error/10 text-monarch-error hover:bg-monarch-error/20'
                        : 'text-monarch-text-muted hover:text-monarch-error hover:bg-monarch-error/10'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label={isConfirmingDelete ? 'Confirm delete' : 'Delete hypothesis'}
                  >
                    {isDeleting ? (
                      <Icons.Spinner size={16} className="animate-spin" />
                    ) : (
                      <Icons.Trash size={16} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Hint about click-to-confirm */}
        {hypotheses.length > 0 && confirmDeleteId && (
          <p className="text-xs text-monarch-text-muted text-center pt-2 border-t border-monarch-border">
            Click the trash icon again to confirm deletion.
          </p>
        )}
      </div>
    </Modal>
  );
}
