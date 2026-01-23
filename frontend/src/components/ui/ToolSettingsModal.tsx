/**
 * ToolSettingsModal - Modal wrapper for tool settings
 *
 * Opens tool settings (Recurring, Stash, Notes) in a modal overlay
 * instead of navigating to the Settings screen. This allows users to
 * adjust settings while staying in context on the tool page.
 */

import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { RecurringToolSettings } from '../settings/RecurringToolSettings';
import { StashToolSettings } from '../settings/StashToolSettings';
import { RecurringResetModal } from '../settings/RecurringResetModal';
import { useDashboardQuery, useClearUnconvertedBookmarksMutation, useUpdateStashConfigMutation } from '../../api/queries';
import { useToast } from '../../context/ToastContext';

export type ToolType = 'recurring' | 'stash' | 'notes';

interface ToolSettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly tool: ToolType;
}

export function ToolSettingsModal({ isOpen, onClose, tool }: ToolSettingsModalProps) {
  const toast = useToast();

  // Recurring-specific state
  const [showRecurringResetModal, setShowRecurringResetModal] = useState(false);
  const { data: dashboardData, refetch: refetchDashboard, isLoading: dashboardLoading } = useDashboardQuery();

  // Stash-specific state
  const clearUnconvertedBookmarks = useClearUnconvertedBookmarksMutation();
  const updateStashConfig = useUpdateStashConfigMutation();

  // Calculate recurring stats for reset modal
  const { totalCategories, totalItems } = useMemo(() => {
    if (!dashboardData) return { totalCategories: 0, totalItems: 0 };
    const dedicatedItems = dashboardData.items.filter(
      (item) => item.is_enabled && !item.is_in_rollup && item.category_id
    ) || [];
    const rollupItems = dashboardData.rollup?.items || [];
    return {
      totalCategories: dedicatedItems.length + (dashboardData.rollup?.category_id ? 1 : 0),
      totalItems: dedicatedItems.length + rollupItems.length,
    };
  }, [dashboardData]);

  const handleRefreshDashboard = async () => {
    await refetchDashboard();
  };

  const handleUnlinkBookmarks = async () => {
    if (!globalThis.confirm('Are you sure you want to unlink bookmark sync? This will clear all pending bookmarks.')) {
      return;
    }

    try {
      await updateStashConfig.mutateAsync({
        selectedBrowser: null,
        selectedFolderIds: [],
      });
      await clearUnconvertedBookmarks.mutateAsync();
      toast.success('Bookmark sync unlinked');
      onClose(); // Close modal after unlinking
    } catch {
      toast.error('Failed to unlink bookmark sync');
    }
  };

  const getModalTitle = () => {
    switch (tool) {
      case 'recurring':
        return 'Recurring Expenses Settings';
      case 'stash':
        return 'Stashes Settings';
      case 'notes':
        return 'Monthly Notes Settings';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={getModalTitle()}
        maxWidth="lg"
        closeOnBackdrop={!showRecurringResetModal}
        showCloseButton={!showRecurringResetModal}
      >
        {tool === 'recurring' && (
          <RecurringToolSettings
            dashboardData={dashboardData || null}
            loading={dashboardLoading}
            onRefreshDashboard={handleRefreshDashboard}
            onShowResetModal={() => setShowRecurringResetModal(true)}
            defaultExpanded={true}
            variant="modal"
          />
        )}

        {tool === 'stash' && (
          <StashToolSettings
            defaultExpanded={true}
            onSetupBookmarkSync={() => {
              toast.info('Please use the Settings screen to set up bookmark sync');
              onClose();
            }}
            onChangeBookmarkSource={() => {
              toast.info('Please use the Settings screen to change bookmark source');
              onClose();
            }}
            onUnlinkBookmarks={handleUnlinkBookmarks}
            variant="modal"
          />
        )}

        {tool === 'notes' && (
          <div className="p-6">
            <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Monthly Notes are always enabled. You can hide specific categories from the Settings screen.
            </p>
          </div>
        )}
      </Modal>

      {/* Nested modal */}
      {tool === 'recurring' && showRecurringResetModal && (
        <RecurringResetModal
          isOpen={showRecurringResetModal}
          onClose={() => setShowRecurringResetModal(false)}
          totalCategories={totalCategories}
          totalItems={totalItems}
        />
      )}
    </>
  );
}
