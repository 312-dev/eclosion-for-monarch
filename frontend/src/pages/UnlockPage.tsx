/**
 * Unlock Page
 *
 * Orchestrates the credential unlock flow:
 * 1. Passphrase entry -> decrypt + validate
 * 2. If Monarch credentials invalid -> credential update form
 * 3. If passphrase forgotten -> reset app modal
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PassphrasePrompt } from '../components/PassphrasePrompt';
import { CredentialUpdateForm } from '../components/CredentialUpdateForm';
import { ResetAppModal } from '../components/ResetAppModal';
import { useState, useEffect } from 'react';
import { usePageTitle } from '../hooks';

type UnlockStage = 'passphrase' | 'credential_update';

export function UnlockPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated, needsUnlock, lockReason } = useAuth();

  // Stage management
  const [stage, setStage] = useState<UnlockStage>('passphrase');
  // Store passphrase temporarily for re-encryption when updating credentials
  const [storedPassphrase, setStoredPassphrase] = useState<string | null>(null);
  // Reset modal visibility
  const [showResetModal, setShowResetModal] = useState(false);

  // Get the intended destination
  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  // Set page title (no user name on unlock page)
  usePageTitle('Unlock');

  // Redirect if already authenticated or doesn't need unlock
  useEffect(() => {
    if (authenticated === true) {
      navigate(from, { replace: true });
    } else if (authenticated === false && !needsUnlock) {
      navigate('/login', { replace: true });
    }
  }, [authenticated, needsUnlock, navigate, from]);

  // Handle successful unlock (passphrase correct + Monarch validated)
  const handleUnlockSuccess = () => {
    setStoredPassphrase(null); // Clear from memory
    navigate(from, { replace: true });
  };

  // Handle case where passphrase is correct but Monarch credentials are invalid
  const handleCredentialUpdateNeeded = (passphrase: string) => {
    // Store the passphrase temporarily for re-encryption
    setStoredPassphrase(passphrase);
    setStage('credential_update');
  };

  // Handle successful credential update
  const handleCredentialUpdateSuccess = () => {
    setStoredPassphrase(null); // Clear from memory
    navigate(from, { replace: true });
  };

  // Handle cancel from credential update form (go back to passphrase)
  const handleCredentialUpdateCancel = () => {
    setStoredPassphrase(null); // Clear from memory
    setStage('passphrase');
  };

  // Handle reset app button click
  const handleResetAppClick = () => {
    setShowResetModal(true);
  };

  // Handle reset app completion
  const handleResetComplete = () => {
    setShowResetModal(false);
    setStoredPassphrase(null);
    navigate('/login', { replace: true });
  };

  // Render credential update form when Monarch credentials are invalid
  if (stage === 'credential_update' && storedPassphrase) {
    return (
      <CredentialUpdateForm
        passphrase={storedPassphrase}
        onSuccess={handleCredentialUpdateSuccess}
        onCancel={handleCredentialUpdateCancel}
      />
    );
  }

  // Auto-prompt biometric unless this was a manual lock
  // Manual lock = user clicked lock button, they should click Touch ID button to unlock
  // Other cases (app startup, system lock, idle) = auto-prompt for convenience
  const autoPromptBiometric = lockReason !== 'manual';

  // Default: render passphrase prompt
  return (
    <>
      <PassphrasePrompt
        mode="unlock"
        onSuccess={handleUnlockSuccess}
        onCredentialUpdateNeeded={handleCredentialUpdateNeeded}
        onResetApp={handleResetAppClick}
        autoPromptBiometric={autoPromptBiometric}
      />

      <ResetAppModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={handleResetComplete}
      />
    </>
  );
}
