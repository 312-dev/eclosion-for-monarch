/**
 * Stash Modal Components
 *
 * Modal-specific UI components for stash forms.
 */

import { useMemo } from 'react';
import { Icons } from '../icons';
import { ModalFooter } from '../ui/ModalButtons';
import { formatMonthsRemaining, calculateMonthsRemaining } from '../../utils/savingsCalculations';

interface ModalFooterButtonsProps {
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
  readonly isDisabled: boolean;
  readonly isSubmitting: boolean;
  readonly submitLabel?: string;
  readonly submittingLabel?: string;
}

/**
 * Backwards-compatible wrapper for ModalFooter.
 * Maps the old API (submittingLabel) to the new API (submitLoadingLabel).
 * @deprecated Use ModalFooter from '../ui/ModalButtons' directly.
 */
export function ModalFooterButtons({
  onCancel,
  onSubmit,
  isDisabled,
  isSubmitting,
  submitLabel = 'Create',
  submittingLabel = 'Creating...',
}: ModalFooterButtonsProps) {
  return (
    <ModalFooter
      onCancel={onCancel}
      onSubmit={onSubmit}
      isDisabled={isDisabled}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
      submitLoadingLabel={submittingLabel}
    />
  );
}

interface MonthlyTargetPreviewProps {
  monthlyTarget: number;
  targetDate: string;
}

export function MonthlyTargetPreview({ monthlyTarget, targetDate }: MonthlyTargetPreviewProps) {
  const monthsRemaining = useMemo(() => calculateMonthsRemaining(targetDate), [targetDate]);
  const isInvalid = monthlyTarget < 1;

  return (
    <div
      className="p-3 rounded-md text-sm"
      style={{
        backgroundColor: isInvalid ? 'var(--monarch-orange-bg)' : 'var(--monarch-orange-light)',
        color: 'var(--monarch-orange)',
      }}
    >
      {isInvalid ? (
        <>
          <strong>Goal date too far:</strong> Choose a closer date to require at least $1/mo
        </>
      ) : (
        <>
          <strong>Monthly savings needed:</strong> ${monthlyTarget}/mo
          <span className="text-xs ml-2">({formatMonthsRemaining(monthsRemaining)} to goal)</span>
        </>
      )}
    </div>
  );
}

interface CategoryInfoDisplayProps {
  categoryName: string;
  categoryId: string;
  categoryGroupName?: string;
  onChangeCategory?: () => void;
}

export function CategoryInfoDisplay({
  categoryName,
  categoryId,
  categoryGroupName,
  onChangeCategory,
}: CategoryInfoDisplayProps) {
  return (
    <div>
      <span className="block text-sm font-medium mb-1" style={{ color: 'var(--monarch-text)' }}>
        Linked Category
      </span>
      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Icons.ListTree size={14} style={{ color: 'var(--monarch-text-muted)' }} />
          <div className="text-sm">
            {categoryGroupName && (
              <>
                <span style={{ color: 'var(--monarch-text-muted)' }}>{categoryGroupName}</span>
                <span style={{ color: 'var(--monarch-text-muted)' }}> › </span>
              </>
            )}
            <span style={{ color: 'var(--monarch-text)' }}>{categoryName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onChangeCategory && (
            <button
              type="button"
              onClick={onChangeCategory}
              className="flex items-center gap-1 text-xs hover:underline bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-label="Change linked category"
            >
              <span>Change</span>
            </button>
          )}
          <a
            href={`https://app.monarch.com/categories/${categoryId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs hover:underline"
            style={{ color: 'var(--monarch-orange)' }}
            aria-label="View category in Monarch"
          >
            <span>View</span>
            <Icons.ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
