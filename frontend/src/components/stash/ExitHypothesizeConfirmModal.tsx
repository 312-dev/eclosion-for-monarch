/**
 * ExitHypothesizeConfirmModal
 *
 * Confirmation modal when exiting hypothesize mode with unsaved changes.
 * Offers options to discard, save & exit, or cancel.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { CancelButton, PrimaryButton, DestructiveButton } from '../ui/ModalButtons';
import { Icons } from '../icons';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { useSaveHypothesisMutation } from '../../api/queries/stashQueries';
import { useToast } from '../../context/ToastContext';
import type { SaveHypothesisRequest } from '../../types';

interface ExitHypothesizeConfirmModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Called after user confirms exit (discard or save & exit). Used for navigation blocking. */
  readonly onConfirmExit?: () => void;
}

export function ExitHypothesizeConfirmModal({
  isOpen,
  onClose,
  onConfirmExit,
}: ExitHypothesizeConfirmModalProps) {
  const {
    exitMode,
    stashedAllocations,
    monthlyAllocations,
    timelineEvents,
    customAvailableFunds,
    customLeftToBudget,
    itemApys,
    totalStashedAllocated,
    totalMonthlyAllocated,
  } = useDistributionMode();
  const saveMutation = useSaveHypothesisMutation();
  const toast = useToast();
  const [showNameInput, setShowNameInput] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when shown
  useEffect(() => {
    if (showNameInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNameInput]);

  // Reset state when modal closes - this is intentional for modal cleanup
  useEffect(() => {
    if (!isOpen) {
      setShowNameInput(false);
      setScenarioName('');
    }
  }, [isOpen]);

  const handleDiscard = () => {
    exitMode(true);
    onClose();
    onConfirmExit?.();
  };

  // Build the save request from current context state
  const buildSaveRequest = useCallback(
    (name: string): SaveHypothesisRequest => {
      // Transform timeline events from NamedEvent[] to StashEventsMap
      const eventsMap: Record<
        string,
        Array<{ id: string; type: '1x' | 'mo'; month: string; amount: number }>
      > = {};
      for (const event of timelineEvents) {
        const arr = (eventsMap[event.itemId] ??= []);
        arr.push({
          id: event.id,
          type: event.type === 'deposit' ? '1x' : 'mo',
          month: event.date.slice(0, 7), // YYYY-MM
          amount: event.amount,
        });
      }

      return {
        name,
        savingsAllocations: stashedAllocations,
        savingsTotal: totalStashedAllocated,
        monthlyAllocations,
        monthlyTotal: totalMonthlyAllocated,
        events: eventsMap,
        customAvailableFunds,
        customLeftToBudget,
        itemApys,
      };
    },
    [
      stashedAllocations,
      totalStashedAllocated,
      monthlyAllocations,
      totalMonthlyAllocated,
      timelineEvents,
      customAvailableFunds,
      customLeftToBudget,
      itemApys,
    ]
  );

  const handleSaveAndExit = () => {
    if (!showNameInput) {
      setShowNameInput(true);
      return;
    }

    if (scenarioName.trim()) {
      setIsSaving(true);
      const request = buildSaveRequest(scenarioName.trim());
      saveMutation.mutate(request, {
        onSuccess: () => {
          toast.success(`Saved "${scenarioName.trim()}"`);
          exitMode();
          onClose();
          onConfirmExit?.();
        },
        onError: () => {
          toast.error('Failed to save scenario');
        },
        onSettled: () => {
          setIsSaving(false);
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && scenarioName.trim()) {
      handleSaveAndExit();
    }
  };

  const footer = (
    <div className="flex flex-col gap-3">
      {showNameInput && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scenario name..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--monarch-bg-elevated)',
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-text-dark)',
            }}
            maxLength={50}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <CancelButton onClick={onClose}>Cancel</CancelButton>
        <div className="flex items-center gap-2">
          <DestructiveButton onClick={handleDiscard}>Discard</DestructiveButton>
          <PrimaryButton
            onClick={handleSaveAndExit}
            disabled={isSaving || (showNameInput && !scenarioName.trim())}
            icon={<Icons.Save size={16} />}
          >
            {isSaving && 'Saving...'}
            {!isSaving && showNameInput && 'Save & Exit'}
            {!isSaving && !showNameInput && 'Save Scenario'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Unsaved Changes" footer={footer} maxWidth="sm">
      <div className="space-y-4">
        <div
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{
            backgroundColor: 'rgba(147, 51, 234, 0.1)',
            border: '1px solid rgba(147, 51, 234, 0.3)',
          }}
        >
          <Icons.FlaskConical size={20} className="shrink-0 mt-0.5" style={{ color: '#9333ea' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              You have unsaved allocations
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Would you like to save this scenario before exiting? You can load it later to continue
              where you left off.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
