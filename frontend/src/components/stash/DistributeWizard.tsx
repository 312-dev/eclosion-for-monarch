/**
 * DistributeWizard Component
 *
 * Two-screen wizard for distributing funds across stash items.
 * Makes the two-phase distribution explicit:
 *
 * Screen 1: "Distribute Existing Savings" (if availableAmount > leftToBudget)
 *   - Amount: availableAmount - leftToBudget
 *   - Goes to: Category starting balances (one-time boost)
 *
 * Screen 2: "Distribute Monthly Income"
 *   - Amount: leftToBudget (or $100 default if 0)
 *   - Goes to: Monthly budgets (recurring)
 *   - Shows "at this rate" projections
 *
 * Supports two modes:
 * - distribute: Saves allocations to Monarch
 * - hypothesize: What-if planning, no save
 */

import { useState, useCallback, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DistributeScreen } from './DistributeScreen';
import { StepIndicator } from '../wizards/StepIndicator';
import { Icons } from '../icons';
import {
  useAllocateStashBatchMutation,
  useUpdateCategoryRolloverMutation,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import type { StashItem } from '../../types';

type WizardStep = 'savings' | 'monthly';

const DISTRIBUTE_STEPS = [
  { id: 'savings', title: 'Savings' },
  { id: 'monthly', title: 'Monthly' },
];

/** Mode for the wizard */
export type DistributeMode = 'distribute' | 'hypothesize';

interface DistributeWizardProps {
  /** Whether the modal is open */
  readonly isOpen: boolean;
  /** Callback to close the modal */
  readonly onClose: () => void;
  /** Mode: 'distribute' for real allocation, 'hypothesize' for what-if planning */
  readonly mode: DistributeMode;
  /** Available funds to distribute (after buffer) - max amount in distribute mode */
  readonly availableAmount: number;
  /** Left to Budget amount (ready_to_assign from Monarch) - determines split */
  readonly leftToBudget: number;
  /** List of stash items to distribute to */
  readonly items: StashItem[];
}

export function DistributeWizard({
  isOpen,
  onClose,
  mode,
  availableAmount,
  leftToBudget,
  items,
}: DistributeWizardProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const batchAllocateMutation = useAllocateStashBatchMutation();
  const rolloverMutation = useUpdateCategoryRolloverMutation();

  // Calculate the two pools
  const existingSavings = Math.max(0, availableAmount - leftToBudget);
  const monthlyIncome = leftToBudget > 0 ? leftToBudget : 100; // Default $100 if no leftToBudget
  const hasSavingsStep = existingSavings > 0;

  // Step state
  const [step, setStep] = useState<WizardStep>('savings');

  // Separate allocations for each step
  const [savingsAllocations, setSavingsAllocations] = useState<Record<string, number>>({});
  const [monthlyAllocations, setMonthlyAllocations] = useState<Record<string, number>>({});

  // Current step's allocations
  const currentAllocations = step === 'savings' ? savingsAllocations : monthlyAllocations;

  // For monthly step in hypothesize mode, allow editing the amount
  const [customMonthlyAmount, setCustomMonthlyAmount] = useState<number>(monthlyIncome);
  const effectiveMonthlyAmount = mode === 'hypothesize' ? customMonthlyAmount : monthlyIncome;

  // Calculate totals for current step
  const totalAllocated = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);
  const stepAmount = step === 'savings' ? existingSavings : effectiveMonthlyAmount;
  const remaining = stepAmount - totalAllocated;
  // Use rounded comparison to handle floating point precision issues
  const isFullyAllocated = Math.round(remaining) === 0 && stepAmount > 0;

  // Validation
  const isOverMax = mode === 'distribute' && step === 'savings' && totalAllocated > existingSavings;

  // Handlers for current step
  const handleAllocationChange = useCallback(
    (id: string, amount: number) => {
      if (step === 'savings') {
        setSavingsAllocations((prev) => ({ ...prev, [id]: amount }));
      } else {
        setMonthlyAllocations((prev) => ({ ...prev, [id]: amount }));
      }
    },
    [step]
  );

  const handleReset = useCallback(() => {
    if (step === 'savings') {
      setSavingsAllocations({});
    } else {
      setMonthlyAllocations({});
    }
  }, [step]);

  const handleTotalChange = useCallback(
    (amount: number) => {
      // Only monthly step in hypothesize mode allows editing the amount
      if (step === 'monthly') {
        setCustomMonthlyAmount(amount);
      }
    },
    [step]
  );

  // Navigate to next step (savings -> monthly)
  const handleNextStep = useCallback(() => {
    // Carry over ratios from savings to monthly (unless leftToBudget was 0)
    if (leftToBudget > 0) {
      const totalSavings = Object.values(savingsAllocations).reduce((a, b) => a + b, 0);
      if (totalSavings > 0) {
        const newMonthly: Record<string, number> = {};
        for (const [id, amount] of Object.entries(savingsAllocations)) {
          const ratio = amount / totalSavings;
          newMonthly[id] = Math.round(ratio * effectiveMonthlyAmount);
        }
        setMonthlyAllocations(newMonthly);
      }
    }
    // If leftToBudget === 0, start fresh with no predefined ratios
    setStep('monthly');
  }, [leftToBudget, savingsAllocations, effectiveMonthlyAmount]);

  // Navigate back (monthly -> savings)
  const handleBackStep = useCallback(() => {
    setStep('savings');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (mode !== 'distribute') return;

    try {
      let rolloverTotal = 0;
      let budgetTotal = 0;

      // Step 1: Apply savings allocations to rollover balances
      for (const [itemId, amount] of Object.entries(savingsAllocations)) {
        if (amount <= 0) continue;
        const item = items.find((i) => i.id === itemId);
        if (item?.category_id) {
          await rolloverMutation.mutateAsync({
            categoryId: item.category_id,
            amount,
          });
          rolloverTotal += amount;
        }
      }

      // Step 2: Apply monthly allocations to budgets
      const budgetUpdates = Object.entries(monthlyAllocations)
        .filter(([, amount]) => amount > 0)
        .map(([id, budget]) => ({ id, budget }));

      if (budgetUpdates.length > 0) {
        await batchAllocateMutation.mutateAsync(budgetUpdates);
        budgetTotal = budgetUpdates.reduce((sum, u) => sum + u.budget, 0);
      }

      // Success message
      if (rolloverTotal > 0 && budgetTotal > 0) {
        toast.success(
          `Distributed $${rolloverTotal} to savings and $${budgetTotal} to budgets`
        );
      } else if (rolloverTotal > 0) {
        toast.success(`Added $${rolloverTotal} to category savings`);
      } else if (budgetTotal > 0) {
        toast.success(`Updated budgets for ${budgetUpdates.length} stash items`);
      } else {
        toast.warning('No allocations to save');
        return;
      }

      onClose();
    } catch {
      toast.error('Failed to distribute funds. Please try again.');
    }
  }, [
    mode,
    savingsAllocations,
    monthlyAllocations,
    items,
    rolloverMutation,
    batchAllocateMutation,
    toast,
    onClose,
  ]);

  // Reset state when modal opens (via rAF to avoid synchronous setState in effect)
  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        // Start at savings step if there are existing savings, otherwise skip to monthly
        setStep(hasSavingsStep ? 'savings' : 'monthly');
        setSavingsAllocations({});
        setMonthlyAllocations({});
        setCustomMonthlyAmount(leftToBudget > 0 ? leftToBudget : 100);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen, hasSavingsStep, leftToBudget]);

  // Determine if current step is complete (fully allocated)
  const isStepComplete = isFullyAllocated && !isOverMax;

  // Determine if confirm is enabled (on monthly step, fully allocated)
  const canConfirm =
    mode === 'distribute' &&
    step === 'monthly' &&
    isStepComplete &&
    !rolloverMutation.isPending &&
    !batchAllocateMutation.isPending &&
    !isRateLimited;

  const isSubmitting = rolloverMutation.isPending || batchAllocateMutation.isPending;

  // Step title and description (shown inside the modal, above the amount)
  const getStepTitle = () => {
    if (step === 'savings') return 'Distribute Existing Savings';
    return 'Distribute Monthly Income';
  };

  const getStepDescription = () => {
    if (step === 'savings') {
      return 'This money will be added to your category balances as a one-time boost.';
    }
    return 'This is your recurring monthly contribution. Projections are based on this rate.';
  };

  // Modal title is just the mode
  const title = mode === 'distribute' ? 'Distribute' : 'Hypothesize';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
      <div className="flex flex-col h-125">
        {/* Step indicator - only show if both steps exist */}
        {hasSavingsStep && (
          <div className="px-4 pt-4">
            <StepIndicator
              steps={DISTRIBUTE_STEPS}
              currentStep={step === 'savings' ? 0 : 1}
            />
          </div>
        )}

        {/* Step title and description - above the amount */}
        <div className="px-4 pb-2 text-center">
          <h3 className="text-base font-semibold text-monarch-text-dark mb-1">{getStepTitle()}</h3>
          <p className="text-xs text-monarch-text-muted">{getStepDescription()}</p>
        </div>

        <DistributeScreen
          mode={mode}
          totalAmount={stepAmount}
          {...(mode === 'distribute' && step === 'savings' && { maxAmount: existingSavings })}
          isTotalEditable={step === 'monthly' && mode === 'hypothesize'}
          onTotalChange={handleTotalChange}
          allocations={currentAllocations}
          onAllocationChange={handleAllocationChange}
          items={items}
          onReset={handleReset}
          {...(step === 'monthly' && { leftToBudget: effectiveMonthlyAmount })}
          {...(step === 'monthly' && { rolloverAllocations: savingsAllocations })}
          showForecast={step === 'monthly'}
        />

        {/* Footer buttons */}
        <div className="flex items-center justify-between p-4 border-t border-monarch-border">
          {/* Left side: Back button (only on monthly step if savings step exists) */}
          <div>
            {step === 'monthly' && hasSavingsStep && (
              <button
                onClick={handleBackStep}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-monarch-text-muted hover:bg-monarch-bg-hover"
              >
                ← Back
              </button>
            )}
          </div>

          {/* Right side: Cancel/Close and Next/Confirm */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-monarch-text-muted hover:bg-monarch-bg-hover"
            >
              {mode === 'hypothesize' && step === 'monthly' ? 'Close' : 'Cancel'}
            </button>

            {/* Savings step: Next button */}
            {step === 'savings' && (
              <button
                onClick={handleNextStep}
                disabled={!isStepComplete}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isStepComplete
                    ? 'bg-monarch-orange text-white'
                    : 'bg-monarch-bg-hover text-monarch-text-muted'
                }`}
              >
                Next →
              </button>
            )}

            {/* Monthly step: Confirm button (distribute mode only) */}
            {step === 'monthly' && mode === 'distribute' && (
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  canConfirm
                    ? 'bg-monarch-orange text-white'
                    : 'bg-monarch-bg-hover text-monarch-text-muted'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Icons.Spinner size={16} className="animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Confirm'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
