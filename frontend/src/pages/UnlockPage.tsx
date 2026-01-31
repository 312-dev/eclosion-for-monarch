/**
 * Unlock Page
 *
 * Unified unlock page for both local and remote access.
 *
 * Local mode (default):
 * 1. Passphrase/biometric entry -> decrypt + validate
 * 2. If biometric fails repeatedly -> fallback to email/password
 * 3. If Monarch credentials invalid -> credential update form
 * 4. If passphrase forgotten -> reset app modal
 *
 * Remote mode (accessed via tunnel at /remote-unlock):
 * - Simplified passphrase-only entry
 * - No biometric (not available on remote device)
 * - No credential update (desktop already has valid session)
 * - No reset app (blocked for security)
 * - Server-side lockout enforcement
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PassphrasePrompt, FallbackAuthForm } from '../components/passphrase';
import { CredentialUpdateForm } from '../components/CredentialUpdateForm';
import { ResetAppModal } from '../components/ResetAppModal';
import { ElectronTitleBar } from '../components/ElectronTitleBar';
import { useState, useEffect } from 'react';
import { usePageTitle, useBiometric } from '../hooks';
import { isDesktopMode } from '../utils/apiBase';

type UnlockStage = 'passphrase' | 'fallback' | 'credential_update';

export function UnlockPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated, needsUnlock, lockReason, setAuthenticated, setNeedsUnlock } = useAuth();
  const biometric = useBiometric();

  // Detect remote mode from URL path
  const remoteMode = location.pathname === '/remote-unlock';

  // Stage management (only used in local mode)
  const [stage, setStage] = useState<UnlockStage>('passphrase');
  // Store passphrase temporarily for re-encryption when updating credentials
  const [storedPassphrase, setStoredPassphrase] = useState<string | null>(null);
  // Reset modal visibility
  const [showResetModal, setShowResetModal] = useState(false);

  // Get the intended destination (local mode uses from state, remote mode goes to /recurring)
  const from = remoteMode
    ? '/recurring'
    : (location.state as { from?: Location })?.from?.pathname || '/';

  // Set compact window size on mount and when stage changes (local mode only)
  useEffect(() => {
    if (!isDesktopMode() || remoteMode) return;

    // Height varies by stage:
    // - passphrase: 600px (Touch ID button + fallback link)
    // - fallback: 600px (email/password form)
    // - credential_update: handled by CredentialUpdateForm
    if (stage === 'credential_update') return;

    const height = 600;
    globalThis.electron?.windowMode?.setCompactSize(height).catch(() => {
      // Ignore errors - window sizing is a UX enhancement
    });
  }, [stage, remoteMode]);

  // Set page title
  usePageTitle(remoteMode ? 'Remote Access' : 'Unlock');

  // Redirect if already authenticated or doesn't need unlock (local mode only)
  // Remote mode handles its own auth via session['remote_unlocked']
  useEffect(() => {
    if (remoteMode) return;

    if (authenticated === true) {
      navigate(from, { replace: true });
    } else if (authenticated === false && !needsUnlock) {
      navigate('/login', { replace: true });
    }
  }, [authenticated, needsUnlock, navigate, from, remoteMode]);

  // Handle successful unlock (passphrase correct + Monarch validated)
  const handleUnlockSuccess = () => {
    setStoredPassphrase(null); // Clear from memory
    if (remoteMode) {
      // For remote mode, mark as authenticated in frontend state
      // (server already set session['remote_unlocked'] = true)
      setAuthenticated(true);
    }
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

  // Handle fallback auth request (when Touch ID fails or user requests it)
  const handleFallbackRequest = () => {
    setStage('fallback');
  };

  // Handle cancel from fallback form (go back to biometric)
  const handleFallbackCancel = () => {
    setStage('passphrase');
  };

  // Render credential update form when Monarch credentials are invalid (local mode only)
  if (!remoteMode && stage === 'credential_update' && storedPassphrase) {
    return (
      <CredentialUpdateForm
        passphrase={storedPassphrase}
        onSuccess={handleCredentialUpdateSuccess}
        onCancel={handleCredentialUpdateCancel}
      />
    );
  }

  // Render fallback auth form when Touch ID fails (local mode only)
  if (!remoteMode && stage === 'fallback' && isDesktopMode()) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <ElectronTitleBar variant="compact" />
        <div className="flex-1 flex items-center justify-center p-4">
          <FallbackAuthForm
            onCancel={handleFallbackCancel}
            setAuthenticated={setAuthenticated}
            setNeedsUnlock={setNeedsUnlock}
            biometricDisplayName={biometric.displayName}
            biometricEnrolled={biometric.enrolled}
          />
        </div>
      </div>
    );
  }

  // Auto-prompt biometric unless this was a manual lock (local mode only)
  // Manual lock = user clicked lock button, they should click Touch ID button to unlock
  // Other cases (app startup, system lock, idle) = auto-prompt for convenience
  const autoPromptBiometric = !remoteMode && lockReason !== 'manual';

  // Default: render passphrase prompt
  // Use conditional spreading to avoid passing undefined for optional props
  const localModeProps = remoteMode
    ? {}
    : {
        onCredentialUpdateNeeded: handleCredentialUpdateNeeded,
        onResetApp: handleResetAppClick,
        onFallbackRequest: handleFallbackRequest,
      };

  return (
    <>
      <PassphrasePrompt
        mode="unlock"
        onSuccess={handleUnlockSuccess}
        autoPromptBiometric={autoPromptBiometric}
        remoteMode={remoteMode}
        {...localModeProps}
      />

      {!remoteMode && (
        <ResetAppModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          onReset={handleResetComplete}
        />
      )}
    </>
  );
}
