/**
 * WizardNavigation - Navigation buttons for wizard steps
 */

export interface WizardNavigationProps {
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly onSkip?: (() => void) | undefined;
  readonly canGoBack: boolean;
  readonly canProceed: boolean;
  readonly isLastStep: boolean;
  readonly isSaving: boolean;
  readonly nextLabel?: string | undefined;
  readonly showSkip?: boolean | undefined;
}

export function WizardNavigation({
  onBack,
  onNext,
  onSkip,
  canGoBack,
  canProceed,
  isLastStep,
  isSaving,
  nextLabel,
  showSkip = true,
}: WizardNavigationProps) {
  const getButtonLabel = () => {
    if (isSaving) return 'Setting up...';
    if (nextLabel) return nextLabel;
    return isLastStep ? 'Get Started' : 'Continue';
  };

  return (
    <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--monarch-border)' }}>
      <div className="flex gap-3">
        {canGoBack && (
          <button
            onClick={onBack}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg transition-colors btn-hover-lift disabled:opacity-50"
            style={{
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-text-dark)',
              backgroundColor: 'var(--monarch-bg-card)',
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed || isSaving}
          className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift hover-bg-orange-enabled"
          style={{
            backgroundColor: !canProceed || isSaving ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
          }}
        >
          {getButtonLabel()}
        </button>
      </div>

      {showSkip && onSkip && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onSkip}
            disabled={isSaving}
            className="text-sm px-4 py-1 rounded transition-colors hover:underline disabled:opacity-50"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Skip setup
          </button>
        </div>
      )}
    </div>
  );
}
