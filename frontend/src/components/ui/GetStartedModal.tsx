/**
 * Get Started Modal
 *
 * Presents deployment options for the user:
 * - Easy Mode: One-click Railway deployment
 * - Expert Mode: Self-hosted Docker setup
 *
 * Shows terms of service on first visit that must be accepted before
 * displaying deployment options.
 */

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { hasAcceptedTerms, setTermsAccepted } from './TermsModal';
import { GetStartedTermsContent } from './GetStartedTermsContent';
import { GetStartedDeploymentContent } from './GetStartedDeploymentContent';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GetStartedModal({ isOpen, onClose }: GetStartedModalProps) {
  // Check if terms were already accepted
  const [termsAccepted, setTermsAcceptedState] = useState(() => hasAcceptedTerms());
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset acknowledgment when modal opens
  useEffect(() => {
    if (isOpen && !termsAccepted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset form state on modal open
      setAcknowledged(false);
    }
  }, [isOpen, termsAccepted]);

  const handleAcceptTerms = () => {
    setTermsAccepted();
    setTermsAcceptedState(true);
  };

  // Show terms view if not yet accepted
  if (!termsAccepted) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Before You Get Started"
        description="Please read and acknowledge the following"
        maxWidth="lg"
        closeOnBackdrop={false}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                color: 'var(--monarch-text)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAcceptTerms}
              disabled={!acknowledged}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: acknowledged ? 'var(--monarch-orange)' : 'var(--monarch-orange-disabled)',
              }}
            >
              I Accept
            </button>
          </div>
        }
      >
        <GetStartedTermsContent acknowledged={acknowledged} onAcknowledgeChange={setAcknowledged} />
      </Modal>
    );
  }

  // Show deployment options after terms accepted
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Get Started with Eclosion"
      description="Choose how you want to deploy your instance"
      maxWidth="lg"
    >
      <GetStartedDeploymentContent />
    </Modal>
  );
}
