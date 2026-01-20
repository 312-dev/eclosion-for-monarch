/**
 * Browser Bookmarks Setup Wizard
 *
 * Setup wizard specifically for configuring browser bookmark sync.
 * This is NOT a general wishlist setup - it only handles browser/folder selection.
 *
 * Steps (desktop):
 * 1. Browser Selection - Choose which browser's bookmarks to sync
 * 2. Folder Selection - Select which bookmark folders to watch
 *
 * In demo/web mode, this wizard is not available since browser bookmarks
 * cannot be accessed.
 */

import { useBrowserBookmarksSetup } from '../../../hooks/useBrowserBookmarksSetup';
import { StepIndicator, WizardNavigation } from '../WizardComponents';
import { BrowserSelectionStep } from './steps/BrowserSelectionStep';
import { FolderSelectionStep } from './steps/FolderSelectionStep';
import { Icons } from '../../icons';

interface BrowserBookmarksSetupWizardProps {
  readonly onComplete: () => void;
  readonly onCancel?: () => void;
}

export function BrowserBookmarksSetupWizard({
  onComplete,
  onCancel,
}: BrowserBookmarksSetupWizardProps) {
  const wizard = useBrowserBookmarksSetup({ onComplete, onCancel });

  // In demo mode, bookmarks aren't available
  if (!wizard.isDesktopMode) {
    return (
      <div className="text-center py-8">
        <Icons.AlertCircle
          size={48}
          className="mx-auto mb-4"
          style={{ color: 'var(--monarch-text-muted)' }}
        />
        <p style={{ color: 'var(--monarch-text-muted)' }}>
          Browser bookmark sync is only available in the desktop app.
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-(--monarch-bg-hover)"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              color: 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  // Build steps array for StepIndicator
  const steps = wizard.stepTitles.map((title, index) => ({
    id: `step-${index}`,
    title,
  }));

  const renderStepContent = () => {
    switch (wizard.currentStep) {
      case 0:
        return (
          <BrowserSelectionStep
            browsers={wizard.browserSelection.browsers}
            selectedBrowser={wizard.browserSelection.selectedBrowser}
            permissionGranted={wizard.browserSelection.permissionGranted}
            isLoading={wizard.browserSelection.isLoading}
            error={wizard.browserSelection.error}
            onSelectBrowser={wizard.browserSelection.selectBrowser}
            onRequestPermission={wizard.browserSelection.requestPermission}
            onRefresh={wizard.browserSelection.refreshBrowsers}
            onNext={wizard.handleNext}
          />
        );
      case 1:
        return (
          <FolderSelectionStep
            folderTree={wizard.folderSelection.folderTree}
            expandedIds={wizard.folderSelection.expandedIds}
            selectedFolderId={wizard.folderSelection.selectedFolderId}
            loading={wizard.folderSelection.isLoading}
            error={wizard.folderSelection.error}
            onToggleExpanded={wizard.folderSelection.toggleExpanded}
            onSelectFolder={wizard.folderSelection.selectFolder}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = wizard.currentStep === wizard.totalSteps - 1;

  const handleNextOrComplete = () => {
    if (isLastStep) {
      wizard.handleComplete();
    } else {
      wizard.handleNext();
    }
  };

  return (
    <div
      className="scale-in rounded-xl shadow-lg w-full max-w-lg p-6"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      {/* Header with cancel button */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          Set Up Bookmark Sync
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors hover:bg-(--monarch-bg-hover)"
            aria-label="Cancel setup"
          >
            <Icons.X size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </button>
        )}
      </div>

      <StepIndicator steps={steps} currentStep={wizard.currentStep} />

      {wizard.saveError && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
        >
          {wizard.saveError}
        </div>
      )}

      {/* Step content with fade transition on step change */}
      <div key={wizard.currentStep} className="fade-in">
        {renderStepContent()}
      </div>

      {/* Hide navigation for browser selection step (auto-advances on selection) */}
      {wizard.currentStep !== 0 && (
        <WizardNavigation
          onBack={wizard.handleBack}
          onNext={handleNextOrComplete}
          canGoBack={wizard.canGoBack}
          canProceed={wizard.canProceed}
          isLastStep={isLastStep}
          isSaving={wizard.isSaving}
          nextLabel={isLastStep ? 'Start Syncing' : undefined}
        />
      )}
    </div>
  );
}
