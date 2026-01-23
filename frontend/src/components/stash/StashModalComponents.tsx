/**
 * Stash Modal Components
 *
 * Modal-specific UI components for stash forms.
 */

import { useMemo } from 'react';
import { Icons } from '../icons';
import { formatMonthsRemaining, calculateMonthsRemaining } from '../../utils/savingsCalculations';

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
        backgroundColor: isInvalid ? 'var(--monarch-orange-bg)' : 'var(--monarch-teal-light)',
        color: isInvalid ? 'var(--monarch-orange)' : 'var(--monarch-teal)',
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

interface ModalFooterButtonsProps {
  onCancel: () => void;
  onSubmit: () => void;
  isDisabled: boolean;
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}

export function ModalFooterButtons({
  onCancel,
  onSubmit,
  isDisabled,
  isSubmitting,
  submitLabel = 'Create',
  submittingLabel = 'Creating...',
}: ModalFooterButtonsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium rounded-md btn-press hover:bg-(--monarch-bg-page)"
        style={{
          color: 'var(--monarch-text)',
          backgroundColor: 'transparent',
          border: '1px solid var(--monarch-border)',
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        className="px-4 py-2 text-sm font-medium rounded-md btn-press"
        style={{
          backgroundColor: isDisabled ? 'var(--monarch-border)' : 'var(--monarch-teal)',
          color: isDisabled ? 'var(--monarch-text-muted)' : 'white',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </>
  );
}

interface CategoryInfoDisplayProps {
  categoryName: string;
  categoryId: string;
  categoryGroupName?: string;
}

export function CategoryInfoDisplay({
  categoryName,
  categoryId,
  categoryGroupName,
}: CategoryInfoDisplayProps) {
  return (
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
          <span style={{ color: 'var(--monarch-text)' }}>{categoryName}</span>
          {categoryGroupName && (
            <span style={{ color: 'var(--monarch-text-muted)' }}> under {categoryGroupName}</span>
          )}
        </div>
      </div>
      <a
        href={`https://app.monarch.com/categories/${categoryId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs hover:underline"
        style={{ color: 'var(--monarch-teal)' }}
        aria-label="View category in Monarch"
      >
        <span>View</span>
        <Icons.ExternalLink size={12} />
      </a>
    </div>
  );
}
