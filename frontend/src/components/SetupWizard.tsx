/**
 * SetupWizard - Main setup wizard for first-time configuration
 *
 * Guides users through initial setup including category group selection,
 * recurring item selection, and rollup configuration.
 */

import { TourProvider } from '@reactour/tour';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useSetupWizard } from '../hooks/useSetupWizard';
import { LinkCategoryModal } from './LinkCategoryModal';
import { ImportSettingsModal } from './import/ImportSettingsModal';
import { TourController, wizardTourStyles } from './wizards/WizardComponents';
import { StepIndicator, SETUP_WIZARD_STEPS } from './wizards/StepIndicator';
import { WizardNavigation } from './wizards/WizardNavigation';
import {
  WelcomeStep,
  CategoryStep,
  ItemSelectionStep,
  RollupConfigStep,
  FinishStep,
} from './wizards/steps';
import { SETUP_TOUR_STEPS } from './wizards/tourSteps';
import { RollupTipModal } from './wizards/RollupTipModal';
import { SetupWizardFooter } from './wizards/SetupWizardFooter';

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const pwaInstall = usePwaInstall();
  const wizard = useSetupWizard({ onComplete });

  const handleInstall = async () => {
    await pwaInstall.promptInstall();
  };

  const renderStepContent = () => {
    switch (wizard.currentStep) {
      case 0:
        return <WelcomeStep onRestoreFromBackup={wizard.handleRestoreFromBackup} />;
      case 1:
        return (
          <CategoryStep
            groups={wizard.groups}
            selectedGroupId={wizard.selectedGroupId}
            onSelectGroup={wizard.handleSelectGroup}
            loading={wizard.loadingGroups}
            onRefresh={wizard.fetchGroups}
            error={wizard.groupError}
          />
        );
      case 2:
        return (
          <ItemSelectionStep
            items={wizard.items}
            selectedIds={wizard.selectedItemIds}
            pendingLinks={wizard.pendingLinks}
            onToggleItem={wizard.handleToggleItem}
            onSelectAll={wizard.handleSelectAll}
            onDeselectAll={wizard.handleDeselectAll}
            onRefresh={wizard.handleRefreshItems}
            loading={wizard.loadingItems}
            error={wizard.itemsError}
            onToggleGroup={wizard.handleToggleGroup}
            onLinkClick={wizard.handleOpenLinkModal}
            onUnlink={wizard.handleUnlink}
            categoryGroupName={wizard.selectedGroupName}
            onChangeGroup={wizard.handleChangeGroup}
          />
        );
      case 3:
        return (
          <RollupConfigStep
            mode={wizard.rollupMode}
            onModeChange={wizard.setRollupMode}
            categories={wizard.rollupCategories}
            selectedCategoryId={wizard.selectedRollupCategoryId}
            onCategorySelect={wizard.setSelectedRollupCategoryId}
            syncName={wizard.rollupSyncName}
            onSyncNameChange={wizard.setRollupSyncName}
            loading={wizard.loadingRollupCategories}
            categoriesFetched={wizard.rollupCategoriesFetched}
            groupName={wizard.selectedGroupName}
            autoCategorizeEnabled={wizard.autoCategorizeEnabled}
            onAutoCategorizeChange={wizard.setAutoCategorizeEnabled}
          />
        );
      case 4:
        return (
          <FinishStep
            canInstall={pwaInstall.canInstall}
            isInstalled={pwaInstall.isInstalled}
            isIOS={pwaInstall.isIOS}
            onInstall={handleInstall}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TourProvider
      steps={SETUP_TOUR_STEPS}
      styles={wizardTourStyles}
      showNavigation={false}
      showBadge={false}
      disableInteraction
      onClickMask={() => wizard.setShowLinkTour(false)}
      onClickClose={() => wizard.setShowLinkTour(false)}
      scrollSmooth
    >
      <TourController isOpen={wizard.showLinkTour} onClose={() => wizard.setShowLinkTour(false)} />
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <div
          className="rounded-xl shadow-lg w-full max-w-lg p-6"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <StepIndicator steps={SETUP_WIZARD_STEPS} currentStep={wizard.currentStep} />

          {wizard.saveError && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              {wizard.saveError}
            </div>
          )}

          {renderStepContent()}

          <WizardNavigation
            onBack={wizard.handleBack}
            onNext={wizard.handleNext}
            onSkip={wizard.handleSkip}
            canGoBack={wizard.currentStep > 0}
            canProceed={wizard.canProceed()}
            isLastStep={wizard.currentStep === SETUP_WIZARD_STEPS.length - 1}
            isSaving={wizard.saving}
          />
        </div>

        <SetupWizardFooter
          showTutorialButton={wizard.currentStep === 2 && wizard.selectedItemIds.size > 0}
          onShowTutorial={() => wizard.setShowLinkTour(true)}
        />

        {wizard.linkModalItem && (
          <LinkCategoryModal
            item={wizard.linkModalItem}
            isOpen={!!wizard.linkModalItem}
            onClose={() => wizard.setLinkModalItem(null)}
            onSuccess={wizard.handleLinkSuccess}
            deferSave={true}
            reservedCategories={new Map(
              Array.from(wizard.pendingLinks.entries()).map(([itemId, link]) => {
                const linkedItem = wizard.items.find(i => i.id === itemId);
                const itemName = linkedItem?.merchant_name || linkedItem?.name || 'Unknown item';
                return [link.categoryId, itemName];
              })
            )}
          />
        )}

        <RollupTipModal isOpen={wizard.showRollupTip} onClose={() => wizard.setShowRollupTip(false)} />

        <ImportSettingsModal
          isOpen={wizard.showImportModal}
          onClose={() => wizard.setShowImportModal(false)}
          onSuccess={wizard.handleImportSuccess}
        />
      </div>
    </TourProvider>
  );
}
