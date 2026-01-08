/**
 * Recurring Setup Wizard
 *
 * Per-tool setup wizard for the Recurring Expenses feature.
 * Shown within the RecurringTab when the feature is not yet configured.
 *
 * Steps:
 * 1. Category Group Selection - Choose where to create budget categories
 * 2. Item Selection - Select recurring items to track (with category linking)
 * 3. Rollup Explanation - Explain the rollup concept
 */

import { TourProvider } from '@reactour/tour';
import { useRecurringSetupWizard } from '../../hooks/useRecurringSetupWizard';
import { LinkCategoryModal } from '../LinkCategoryModal';
import {
  StepIndicator,
  WizardNavigation,
  wizardTourStyles,
  TourController,
} from './WizardComponents';
import { CategoryStep, ItemSelectionStep, RollupConfigStep } from './steps';
import { SETUP_TOUR_STEPS } from './tourSteps';
import { RollupTipModal } from './RollupTipModal';

interface RecurringSetupWizardProps {
  onComplete: () => void;
}

// Steps for this wizard
const STEPS = [
  { id: 'category', title: 'Category' },
  { id: 'items', title: 'Items' },
  { id: 'rollup', title: 'Rollup' },
];

export function RecurringSetupWizard({ onComplete }: RecurringSetupWizardProps) {
  const wizard = useRecurringSetupWizard({ onComplete });

  const renderStepContent = () => {
    switch (wizard.currentStep) {
      case 0:
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
      case 1:
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
      case 2:
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
            groupName={wizard.selectedGroupName}
            autoCategorizeEnabled={wizard.autoCategorizeEnabled}
            onAutoCategorizeChange={wizard.setAutoCategorizeEnabled}
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
      <div className="flex items-center justify-center p-4">
        <div
          className="rounded-xl shadow-lg w-full max-w-lg p-6"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <StepIndicator steps={STEPS} currentStep={wizard.currentStep} />

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
            isLastStep={wizard.currentStep === STEPS.length - 1}
            isSaving={wizard.saving}
            nextLabel={wizard.currentStep === STEPS.length - 1 ? 'Finish Setup' : undefined}
          />
        </div>

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
      </div>
    </TourProvider>
  );
}
