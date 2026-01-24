/**
 * Breakdown Detail Modal
 *
 * Full-screen modal showing detailed breakdown of Available Funds calculation.
 * Displays all accounts, categories, goals, and stash items that contribute to each total.
 * Includes an editable buffer input that allows users to reserve funds.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Tooltip } from '../ui/Tooltip';
import { Icons } from '../icons';
import { useStashConfigQuery, useUpdateStashConfigMutation } from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import {
  BreakdownSection,
  BREAKDOWN_LABELS,
  BREAKDOWN_EMPTY_MESSAGES,
} from './BreakdownComponents';
import type { AvailableToStashResult } from '../../types';
import { formatAvailableAmount } from '../../utils/availableToStash';

interface BreakdownDetailModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly data: AvailableToStashResult;
  readonly statusColor: string;
  readonly formattedAmount: string;
}

export function BreakdownDetailModal({
  isOpen,
  onClose,
  data,
  statusColor,
  formattedAmount,
}: BreakdownDetailModalProps) {
  const { breakdown, detailedBreakdown, includesExpectedIncome } = data;
  const toast = useToast();
  const { data: config } = useStashConfigQuery();
  const updateConfig = useUpdateStashConfigMutation();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Current buffer from config
  const currentBuffer = config?.bufferAmount ?? 0;

  // Local state for buffer input (optimistic update)
  const [localBuffer, setLocalBuffer] = useState(currentBuffer);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate available BEFORE buffer is applied (add buffer back to get pre-buffer amount)
  const availableBeforeBuffer = data.available + breakdown.bufferAmount;

  // Sync local state with config when it changes externally
  useEffect(() => {
    if (!isSaving && currentBuffer !== localBuffer) {
      setLocalBuffer(currentBuffer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBuffer]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Save buffer with debounce
  const saveBuffer = useCallback(
    async (value: number) => {
      setIsSaving(true);
      try {
        await updateConfig.mutateAsync({ bufferAmount: value });
      } catch {
        toast.error('Failed to save buffer amount');
        setLocalBuffer(currentBuffer);
      } finally {
        setIsSaving(false);
      }
    },
    [updateConfig, toast, currentBuffer]
  );

  // Handle buffer input change
  const handleBufferChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replaceAll(/\D/g, '');
      const value = rawValue === '' ? 0 : Math.max(0, Number.parseInt(rawValue, 10));

      // Cap at available amount (before buffer)
      const cappedValue = Math.min(value, Math.max(0, availableBeforeBuffer));
      setLocalBuffer(cappedValue);

      // Debounce save
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveBuffer(cappedValue);
      }, 500);
    },
    [availableBeforeBuffer, saveBuffer]
  );

  // Warning threshold: buffer > $2,000 OR > 50% of available
  const showWarning = useMemo(() => {
    if (availableBeforeBuffer <= 0) return false;
    const bufferPercent = (localBuffer / availableBeforeBuffer) * 100;
    return localBuffer > 2000 || bufferPercent > 50;
  }, [localBuffer, availableBeforeBuffer]);

  // Format buffer for display in input
  const formattedBuffer = localBuffer === 0 ? '' : localBuffer.toLocaleString();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Icons.Landmark size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          <span>Available Funds Breakdown</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Summary */}
        <div
          className="flex items-center justify-between p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Total Available
          </span>
          <span className="text-2xl font-semibold" style={{ color: statusColor }}>
            {formattedAmount}
          </span>
        </div>

        {/* Positive contributions */}
        <BreakdownSection
          title={BREAKDOWN_LABELS.cashOnHand}
          items={detailedBreakdown.cashAccounts}
          total={breakdown.cashOnHand}
          isPositive
          emptyMessage={BREAKDOWN_EMPTY_MESSAGES.cashOnHand}
        />

        <BreakdownSection
          title={BREAKDOWN_LABELS.goalBalances}
          items={detailedBreakdown.goals}
          total={breakdown.goalBalances}
          emptyMessage={BREAKDOWN_EMPTY_MESSAGES.goalBalances}
        />

        {includesExpectedIncome && breakdown.expectedIncome > 0 && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                {BREAKDOWN_LABELS.expectedIncome}
              </h3>
              <span className="text-sm font-medium" style={{ color: 'var(--monarch-green)' }}>
                +{formatAvailableAmount(breakdown.expectedIncome)}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Income planned but not yet received this month
            </p>
          </div>
        )}

        {/* Negative contributions (committed funds) */}
        <BreakdownSection
          title={BREAKDOWN_LABELS.creditCardDebt}
          items={detailedBreakdown.creditCards}
          total={breakdown.creditCardDebt}
          emptyMessage={BREAKDOWN_EMPTY_MESSAGES.creditCardDebt}
        />

        <BreakdownSection
          title={BREAKDOWN_LABELS.unspentBudgets}
          items={detailedBreakdown.unspentCategories}
          total={breakdown.unspentBudgets}
          emptyMessage={BREAKDOWN_EMPTY_MESSAGES.unspentBudgets}
        />

        <BreakdownSection
          title={BREAKDOWN_LABELS.stashBalances}
          items={detailedBreakdown.stashItems}
          total={breakdown.stashBalances}
          emptyMessage={BREAKDOWN_EMPTY_MESSAGES.stashBalances}
        />

        {/* Buffer Input */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                {BREAKDOWN_LABELS.reservedBuffer}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {showWarning && (
                <Tooltip
                  content={
                    <div className="max-w-xs">
                      <p className="font-medium mb-1">This is not an emergency fund</p>
                      <p>
                        The buffer is just peace of mind—if all your stashes were depleted, you'd
                        have this much left. Create a dedicated Stash or Monarch Goal for your
                        emergency fund instead.
                      </p>
                    </div>
                  }
                  side="left"
                >
                  <span className="cursor-help">
                    <AlertTriangle size={16} style={{ color: 'var(--monarch-warning)' }} />
                  </span>
                </Tooltip>
              )}
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: showWarning ? 'var(--monarch-warning)' : 'var(--monarch-red)' }}
                >
                  -$
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formattedBuffer}
                  onChange={handleBufferChange}
                  placeholder="0"
                  className="w-28 pl-7 pr-3 py-1.5 text-sm text-right rounded-md tabular-nums"
                  style={{
                    backgroundColor: 'var(--monarch-bg-card)',
                    border: '1px solid var(--monarch-border)',
                    color: showWarning ? 'var(--monarch-warning)' : 'var(--monarch-red)',
                  }}
                  aria-label="Reserved buffer amount"
                />
              </div>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--monarch-text-muted)' }}>
            Reserve funds that won't count toward your available amount
          </p>
        </div>
      </div>
    </Modal>
  );
}
