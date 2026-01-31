/**
 * Settings Modals
 *
 * Container for all modal dialogs used in the Settings page.
 */

import { ResetAppModal } from '../ResetAppModal';
import { UninstallModal } from '../UninstallModal';
import { ImportSettingsModal } from '../ImportSettingsModal';
import { UpdateModal } from '../UpdateModal';
import { RecurringResetModal } from './RecurringResetModal';
import { BrowserBookmarksSetupWizard } from '../wizards/stash/BrowserBookmarksSetupWizard';

interface SettingsModalsProps {
  showResetModal: boolean;
  showUninstallModal: boolean;
  showImportModal: boolean;
  showUpdateModal: boolean;
  showRecurringResetModal: boolean;
  showBookmarkSetupModal: boolean;
  totalCategories: number;
  totalItems: number;
  onCloseResetModal: () => void;
  onCloseUninstallModal: () => void;
  onCloseImportModal: () => void;
  onCloseUpdateModal: () => void;
  onCloseRecurringResetModal: () => void;
  onCloseBookmarkSetupModal: () => void;
  onReset: () => void;
}

export function SettingsModals({
  showResetModal,
  showUninstallModal,
  showImportModal,
  showUpdateModal,
  showRecurringResetModal,
  showBookmarkSetupModal,
  totalCategories,
  totalItems,
  onCloseResetModal,
  onCloseUninstallModal,
  onCloseImportModal,
  onCloseUpdateModal,
  onCloseRecurringResetModal,
  onCloseBookmarkSetupModal,
  onReset,
}: Readonly<SettingsModalsProps>) {
  return (
    <>
      <ResetAppModal isOpen={showResetModal} onClose={onCloseResetModal} onReset={onReset} />
      <UninstallModal isOpen={showUninstallModal} onClose={onCloseUninstallModal} />
      <UpdateModal isOpen={showUpdateModal} onClose={onCloseUpdateModal} />
      <ImportSettingsModal isOpen={showImportModal} onClose={onCloseImportModal} />
      <RecurringResetModal
        isOpen={showRecurringResetModal}
        onClose={onCloseRecurringResetModal}
        totalCategories={totalCategories}
        totalItems={totalItems}
      />
      {showBookmarkSetupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <BrowserBookmarksSetupWizard
            onComplete={onCloseBookmarkSetupModal}
            onCancel={onCloseBookmarkSetupModal}
          />
        </div>
      )}
    </>
  );
}
