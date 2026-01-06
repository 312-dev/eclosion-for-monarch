/**
 * Get Started Modal
 *
 * Multi-step wizard for getting started with Eclosion:
 * 1. Choose deployment type (Desktop, Railway, Self-hosted)
 * 2. Accept terms of service
 * 3. Navigate to appropriate destination
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { hasAcceptedTerms, setTermsAccepted as persistTermsAccepted } from './TermsModal';
import { GetStartedTermsContent } from './GetStartedTermsContent';
import {
  GetStartedDeploymentSelection,
  type DeploymentType,
} from './GetStartedDeploymentSelection';
import { ChevronLeftIcon } from '../icons';

type WizardStep = 'selection' | 'terms';

interface GetStartedModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const EXTERNAL_URLS = {
  railway: 'https://railway.app/template/eclosion',
  selfhosted: 'https://github.com/GraysonCAdams/eclosion-for-monarch/wiki',
} as const;

export function GetStartedModal({ isOpen, onClose }: GetStartedModalProps) {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('selection');
  const [deploymentType, setDeploymentType] = useState<DeploymentType | null>(null);

  // Terms state
  const [termsAccepted, setTermsAccepted] = useState(() => hasAcceptedTerms());
  const [acknowledged, setAcknowledged] = useState(false);

  // Navigate to the appropriate destination based on deployment type
  const handleFinalNavigation = useCallback(
    (type: DeploymentType) => {
      onClose();

      if (type === 'desktop') {
        navigate('/download');
      } else if (type === 'railway') {
        window.open(EXTERNAL_URLS.railway, '_blank', 'noopener,noreferrer');
      } else if (type === 'selfhosted') {
        window.open(EXTERNAL_URLS.selfhosted, '_blank', 'noopener,noreferrer');
      }
    },
    [navigate, onClose]
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form state on modal open
      const accepted = hasAcceptedTerms();
      /* eslint-disable react-hooks/set-state-in-effect -- Resetting form state when modal opens is valid */
      setTermsAccepted(accepted);
      setStep('selection');
      setDeploymentType(null);
      setAcknowledged(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen]);

  // Handle selecting a deployment type and proceeding
  const handleSelectAndProceed = useCallback(
    (type: DeploymentType) => {
      setDeploymentType(type);

      if (termsAccepted) {
        // Terms already accepted, go to destination
        handleFinalNavigation(type);
      } else {
        // Need to show terms first
        setStep('terms');
      }
    },
    [termsAccepted, handleFinalNavigation]
  );

  // Handle accepting terms and navigating to final destination
  const handleAcceptTerms = useCallback(() => {
    persistTermsAccepted();
    setTermsAccepted(true);

    if (deploymentType) {
      handleFinalNavigation(deploymentType);
    }
  }, [deploymentType, handleFinalNavigation]);

  // Go back to selection
  const handleBack = () => {
    setStep('selection');
    setAcknowledged(false);
  };

  // Render Step 1: Deployment Selection
  if (step === 'selection') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Get Started with Eclosion"
        description="Choose how you want to run your instance"
        maxWidth="lg"
        closeOnBackdrop={true}
      >
        <GetStartedDeploymentSelection
          selected={deploymentType}
          onSelect={handleSelectAndProceed}
        />
      </Modal>
    );
  }

  // Render Step 2: Terms
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Before You Get Started"
      description="Please read and acknowledge the following"
      maxWidth="lg"
      closeOnBackdrop={true}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              color: 'var(--monarch-text)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <ChevronLeftIcon size={16} />
            Back
          </button>
          <button
            type="button"
            onClick={handleAcceptTerms}
            disabled={!acknowledged}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: acknowledged
                ? 'var(--monarch-orange)'
                : 'var(--monarch-orange-disabled)',
            }}
          >
            I Accept
          </button>
        </div>
      }
    >
      <GetStartedTermsContent
        acknowledged={acknowledged}
        onAcknowledgeChange={setAcknowledged}
      />
    </Modal>
  );
}
