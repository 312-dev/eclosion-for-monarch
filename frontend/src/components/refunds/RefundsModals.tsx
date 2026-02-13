/**
 * RefundsModals
 *
 * All modal dialogs for the Refunds tab, extracted to reduce main component size.
 */

import { ViewConfigModal } from './ViewConfigModal';
import { DeleteViewConfirmModal } from './DeleteViewConfirmModal';
import { RefundMatchModal } from './RefundMatchModal';
import { ExpectedRefundModal } from './ExpectedRefundModal';
import { ClearExpectedConfirmModal } from './ClearExpectedConfirmModal';
import { UnmatchConfirmModal } from './UnmatchConfirmModal';
import { ToolSettingsModal } from '../ui/ToolSettingsModal';
import type { useRefundsViewActions } from './useRefundsViewActions';
import type { MatchActionParams, ExpectedRefundParams } from './useRefundsMatchHandlers';
import type { Transaction, TransactionTag, RefundsMatch, RefundsConfig } from '../../types/refunds';

export interface UnmatchConfirmState {
  readonly showUnmatchConfirm: boolean;
  readonly handleCloseUnmatch: () => void;
  readonly handleConfirmUnmatch: () => Promise<void>;
  readonly unmatchCount: number;
  readonly unmatchPending: boolean;
}

interface RefundsModalsProps {
  readonly viewActions: ReturnType<typeof useRefundsViewActions>;
  readonly tags: TransactionTag[];
  readonly tagsLoading: boolean;
  readonly matchingTransaction: Transaction | null;
  readonly onCloseMatch: () => void;
  readonly config: RefundsConfig | undefined;
  readonly existingMatch: RefundsMatch | undefined;
  readonly onMatch: (params: MatchActionParams) => Promise<void>;
  readonly onSkip: () => Promise<void>;
  readonly onUnmatch: () => void;
  readonly matchPending: boolean;
  readonly batchCount: number;
  readonly batchAmount: number;
  readonly batchTransactions: Transaction[];
  readonly expectedTransaction: Transaction | null;
  readonly onCloseExpected: () => void;
  readonly onExpectedRefund: (params: ExpectedRefundParams) => Promise<void>;
  readonly expectedBatchCount: number;
  readonly showClearExpectedConfirm: boolean;
  readonly onCloseClearExpected: () => void;
  readonly onConfirmClearExpected: () => Promise<void>;
  readonly clearExpectedCount: number;
  readonly clearExpectedPending: boolean;
  readonly unmatchConfirm: UnmatchConfirmState;
  readonly showSettingsModal: boolean;
  readonly onCloseSettings: () => void;
}

export function RefundsModals({
  viewActions,
  tags,
  tagsLoading,
  matchingTransaction,
  onCloseMatch,
  config,
  existingMatch,
  onMatch,
  onSkip,
  onUnmatch,
  matchPending,
  batchCount,
  batchAmount,
  batchTransactions,
  expectedTransaction,
  onCloseExpected,
  onExpectedRefund,
  expectedBatchCount,
  showClearExpectedConfirm,
  onCloseClearExpected,
  onConfirmClearExpected,
  clearExpectedCount,
  clearExpectedPending,
  unmatchConfirm,
  showSettingsModal,
  onCloseSettings,
}: RefundsModalsProps): React.JSX.Element {
  return (
    <>
      {viewActions.showCreateModal && (
        <ViewConfigModal
          isOpen={viewActions.showCreateModal}
          onClose={() => viewActions.setShowCreateModal(false)}
          onSave={viewActions.handleCreateView}
          tags={tags}
          tagsLoading={tagsLoading}
          saving={viewActions.createPending}
        />
      )}
      {viewActions.editingView && (
        <ViewConfigModal
          isOpen={true}
          onClose={() => viewActions.setEditingView(null)}
          onSave={viewActions.handleUpdateView}
          tags={tags}
          tagsLoading={tagsLoading}
          saving={viewActions.updatePending}
          existingView={viewActions.editingView}
          onDelete={() => {
            const view = viewActions.editingView;
            viewActions.setEditingView(null);
            if (view) viewActions.handleDeleteView(view.id);
          }}
        />
      )}
      {matchingTransaction && (
        <RefundMatchModal
          isOpen={true}
          onClose={onCloseMatch}
          transaction={matchingTransaction}
          config={config}
          existingMatch={existingMatch}
          onMatch={onMatch}
          onSkip={onSkip}
          onUnmatch={onUnmatch}
          matching={matchPending}
          batchCount={batchCount}
          batchAmount={batchAmount}
          batchTransactions={batchTransactions}
        />
      )}
      {expectedTransaction && (
        <ExpectedRefundModal
          isOpen={true}
          onClose={onCloseExpected}
          transaction={expectedTransaction}
          onSubmit={onExpectedRefund}
          submitting={matchPending}
          batchCount={expectedBatchCount}
          batchAmount={batchAmount}
          batchTransactions={batchTransactions}
        />
      )}
      <ClearExpectedConfirmModal
        isOpen={showClearExpectedConfirm}
        onClose={onCloseClearExpected}
        onConfirm={onConfirmClearExpected}
        count={clearExpectedCount}
        isClearing={clearExpectedPending}
      />
      <UnmatchConfirmModal
        isOpen={unmatchConfirm.showUnmatchConfirm}
        onClose={unmatchConfirm.handleCloseUnmatch}
        onConfirm={unmatchConfirm.handleConfirmUnmatch}
        count={unmatchConfirm.unmatchCount}
        isUnmatching={unmatchConfirm.unmatchPending}
      />
      <DeleteViewConfirmModal
        isOpen={viewActions.deletingView !== null}
        onClose={viewActions.cancelDeleteView}
        onConfirm={viewActions.confirmDeleteView}
        view={viewActions.deletingView}
        isDeleting={viewActions.deletePending}
      />
      {showSettingsModal && (
        <ToolSettingsModal isOpen={true} onClose={onCloseSettings} tool="refunds" />
      )}
    </>
  );
}
