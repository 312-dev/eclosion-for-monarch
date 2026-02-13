/**
 * Unmatch confirmation flow orchestration.
 *
 * Manages modal state and handlers for confirming unmatch actions,
 * extracted from RefundsTab to keep it under 300 lines.
 */

import { useState, useCallback } from 'react';

interface UnmatchFlowParams {
  readonly handleSingleUnmatch: () => Promise<void>;
  readonly handleBatchUnmatch: () => Promise<void>;
  readonly selectedCount: number;
  readonly pending: boolean;
}

interface UnmatchFlowResult {
  showUnmatchConfirm: boolean;
  unmatchCount: number;
  unmatchPending: boolean;
  handleStartUnmatch: (source: 'single' | 'batch') => void;
  handleConfirmUnmatch: () => Promise<void>;
  handleCloseUnmatch: () => void;
}

export function useUnmatchFlow({
  handleSingleUnmatch,
  handleBatchUnmatch,
  selectedCount,
  pending,
}: UnmatchFlowParams): UnmatchFlowResult {
  const [unmatchSource, setUnmatchSource] = useState<'single' | 'batch' | null>(null);

  const handleStartUnmatch = useCallback((source: 'single' | 'batch') => {
    setUnmatchSource(source);
  }, []);

  const handleConfirmUnmatch = useCallback(async () => {
    if (unmatchSource === 'single') {
      await handleSingleUnmatch();
    } else {
      await handleBatchUnmatch();
    }
    setUnmatchSource(null);
  }, [unmatchSource, handleSingleUnmatch, handleBatchUnmatch]);

  return {
    showUnmatchConfirm: unmatchSource !== null,
    unmatchCount: unmatchSource === 'single' ? 1 : selectedCount,
    unmatchPending: pending,
    handleStartUnmatch,
    handleConfirmUnmatch,
    handleCloseUnmatch: useCallback(() => setUnmatchSource(null), []),
  };
}
