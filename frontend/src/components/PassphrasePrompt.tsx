import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils';
import { UI } from '../constants';
import { LockIcon, EyeIcon, EyeOffIcon, CheckIcon, CircleIcon, ShieldCheckIcon, FingerprintIcon, SpinnerIcon, InfoIcon } from './icons';
import { ElectronTitleBar } from './ElectronTitleBar';
import { useBiometric } from '../hooks';

interface PassphrasePromptProps {
  mode: 'create' | 'unlock';
  onSuccess: () => void;
  /** Called when Monarch credentials are invalid but passphrase was correct */
  onCredentialUpdateNeeded?: (passphrase: string) => void;
  /** Called when user clicks "Reset my app" */
  onResetApp?: () => void;
  /** Whether to auto-prompt biometric on mount (default: true). Set to false for manual lock. */
  autoPromptBiometric?: boolean;
}

/** Get cooldown duration based on failed attempts */
function getCooldownSeconds(failedAttempts: number): number {
  if (failedAttempts <= 3) return 0;
  if (failedAttempts <= 5) return 30;
  return 60;
}

interface RequirementCheck {
  label: string;
  met: boolean;
}

function validatePassphrase(passphrase: string): RequirementCheck[] {
  return [
    { label: 'At least 12 characters', met: passphrase.length >= 12 },
    { label: 'At least 1 uppercase letter', met: /[A-Z]/.test(passphrase) },
    { label: 'At least 1 lowercase letter', met: /[a-z]/.test(passphrase) },
    { label: 'At least 1 number', met: /[0-9]/.test(passphrase) },
    { label: 'At least 1 special character', met: /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/\\`~]/.test(passphrase) },
  ];
}

export function PassphrasePrompt({ mode, onSuccess, onCredentialUpdateNeeded, onResetApp, autoPromptBiometric = true }: Readonly<PassphrasePromptProps>) {
  const { setPassphrase, unlockCredentials } = useAuth();
  const [passphrase, setPassphraseValue] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);

  // Biometric authentication
  const biometric = useBiometric();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const biometricAttempted = useRef(false);
  // Track if biometric was reset (enrollment cleared due to keychain mismatch)
  const [biometricWasReset, setBiometricWasReset] = useState(false);

  // Progressive cooldown state for failed unlock attempts
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const requirements = useMemo(() => validatePassphrase(passphrase), [passphrase]);
  const allRequirementsMet = requirements.every(r => r.met);
  const passwordsMatch = passphrase === confirmPassphrase;

  const isInCooldown = cooldownRemaining > 0;
  const isValid = mode === 'unlock'
    ? passphrase.length > 0 && !isInCooldown
    : allRequirementsMet && passwordsMatch;

  // Cooldown timer effect
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        setCooldownUntil(null);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, UI.INTERVAL.COOLDOWN_TICK);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const startCooldown = useCallback((attempts: number) => {
    const seconds = getCooldownSeconds(attempts);
    if (seconds > 0) {
      setCooldownUntil(Date.now() + seconds * 1000);
    }
  }, []);

  /**
   * Handle biometric authentication.
   * Retrieves passphrase from secure storage and unlocks.
   */
  const handleBiometricUnlock = useCallback(async () => {
    if (biometricLoading || loading) return;

    setBiometricLoading(true);
    setError(null);

    try {
      const result = await biometric.authenticate();
      if (result.success && result.passphrase) {
        // Use the retrieved passphrase to unlock
        const unlockResult = await unlockCredentials(result.passphrase);
        if (unlockResult.success) {
          setFailedAttempts(0);
          setCooldownUntil(null);
          onSuccess();
        } else if (unlockResult.needs_credential_update && unlockResult.unlock_success) {
          setFailedAttempts(0);
          setCooldownUntil(null);
          onCredentialUpdateNeeded?.(result.passphrase);
        } else {
          setError(unlockResult.error || 'Failed to unlock');
        }
      } else if (result.error) {
        // Only show error if not cancelled
        if (!result.error.includes('cancel')) {
          // Check if biometric was reset (enrollment cleared due to keychain mismatch)
          if (result.error.includes('reset') || !biometric.enrolled) {
            setBiometricWasReset(true);
          }
          setError(result.error);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBiometricLoading(false);
    }
  }, [biometric, biometricLoading, loading, unlockCredentials, onSuccess, onCredentialUpdateNeeded]);

  // Auto-trigger biometric authentication on mount if enrolled (unlock mode only)
  // Skip auto-prompt when user manually locked (they can click the button instead)
  useEffect(() => {
    if (
      mode === 'unlock' &&
      autoPromptBiometric &&
      biometric.available &&
      biometric.enrolled &&
      !biometric.loading &&
      !biometricAttempted.current
    ) {
      biometricAttempted.current = true;
      void handleBiometricUnlock();
    }
  }, [mode, autoPromptBiometric, biometric.available, biometric.enrolled, biometric.loading, handleBiometricUnlock]);

  /**
   * Store passphrase for background sync (on desktop).
   * This enables auto-sync on startup/wake even without biometric unlock.
   */
  const storePassphraseForSync = useCallback(async (enteredPassphrase: string): Promise<void> => {
    if (!window.electron?.biometric) return;

    try {
      await window.electron.biometric.storeForSync(enteredPassphrase);
    } catch {
      // Don't block unlock flow if storage fails
    }
  }, []);

  /**
   * Offer to enable biometric authentication after successful passphrase entry.
   * Returns true if enrollment was successful or user declined.
   */
  const offerBiometricEnrollment = useCallback(async (enteredPassphrase: string): Promise<void> => {
    // Only offer on desktop with biometric support, if not already enrolled
    if (!window.electron || !biometric.available || biometric.enrolled || biometric.loading) {
      return;
    }

    try {
      const confirmed = await window.electron.showConfirmDialog({
        title: `Enable ${biometric.displayName}?`,
        message: `Would you like to use ${biometric.displayName} to unlock Eclosion in the future?`,
        detail: 'Your passphrase will be securely stored and protected by biometric authentication.',
        confirmText: 'Enable',
        cancelText: 'Not now',
      });

      if (confirmed) {
        const success = await biometric.enroll(enteredPassphrase);
        if (!success) {
          // Enrollment failed, but don't block the unlock flow
          await window.electron.showErrorDialog({
            title: 'Enrollment Failed',
            content: `Could not enable ${biometric.displayName}. You can try again from Settings.`,
          });
        }
      }
    } catch {
      // Don't block unlock flow if dialog fails
    }
  }, [biometric]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const result = await setPassphrase(passphrase);
        if (result.success) {
          // Store passphrase for background sync (desktop only)
          await storePassphraseForSync(passphrase);
          // Offer biometric enrollment after successful passphrase creation
          await offerBiometricEnrollment(passphrase);
          onSuccess();
        } else {
          setError(result.error || 'Failed to set passphrase');
        }
      } else {
        const result = await unlockCredentials(passphrase);
        if (result.success) {
          // Reset cooldown state on success
          setFailedAttempts(0);
          setCooldownUntil(null);
          // Store passphrase for background sync (desktop only)
          await storePassphraseForSync(passphrase);
          // Offer biometric enrollment after successful unlock (if not already enrolled)
          await offerBiometricEnrollment(passphrase);
          onSuccess();
        } else if (result.needs_credential_update && result.unlock_success) {
          // Passphrase was correct but Monarch credentials are invalid
          // Reset cooldown since passphrase was correct
          setFailedAttempts(0);
          setCooldownUntil(null);
          // Store passphrase for background sync (desktop only) - passphrase was correct
          await storePassphraseForSync(passphrase);
          onCredentialUpdateNeeded?.(passphrase);
        } else {
          // Passphrase was wrong - increment failed attempts and start cooldown
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          startCooldown(newAttempts);
          setError(result.error || 'Invalid passphrase');
        }
      }
    } catch (err) {
      // Network errors shouldn't count against cooldown
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
      {/* Draggable title bar for macOS Electron */}
      <ElectronTitleBar />
      <div className="rounded-xl shadow-lg max-w-md w-full p-6" style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--monarch-orange-bg)' }}>
            <LockIcon size={20} color="var(--monarch-orange)" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--monarch-text-dark)' }}>
            {mode === 'create' ? 'Create Encryption Passphrase' : 'Log back in'}
          </h1>
        </div>

        <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
          {mode === 'create'
            ? 'Your Monarch credentials will be encrypted with this passphrase. Only you can decrypt them.'
            : 'Enter your passphrase to unlock your encrypted credentials.'
          }
        </p>

        {/* Info banner when Touch ID was reset */}
        {biometricWasReset && biometric.available && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--monarch-info-bg, var(--monarch-orange-bg))', color: 'var(--monarch-info, var(--monarch-orange))' }}>
            <div className="flex items-start gap-2">
              <InfoIcon size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{biometric.displayName} was reset</p>
                <p style={{ color: 'var(--monarch-text-muted)' }}>
                  Enter your passphrase below, then you&apos;ll be prompted to re-enable {biometric.displayName}.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && !biometricWasReset && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
            {error}
          </div>
        )}

        {/* Biometric unlock button (unlock mode only, when available and enrolled) */}
        {mode === 'unlock' && biometric.available && biometric.enrolled && (
          <>
            <button
              type="button"
              onClick={handleBiometricUnlock}
              disabled={biometricLoading || loading || isInCooldown}
              className="w-full px-4 py-3 rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift flex items-center justify-center gap-2"
              style={{
                backgroundColor: biometricLoading || isInCooldown ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
                color: 'white',
              }}
              aria-label={`Unlock with ${biometric.displayName}`}
            >
              {biometricLoading ? (
                <>
                  <SpinnerIcon size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <FingerprintIcon size={20} />
                  <span>Unlock with {biometric.displayName}</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--monarch-border)' }} />
              <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                or enter passphrase
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--monarch-border)' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="passphrase"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              {mode === 'create' ? 'Create Passphrase' : 'Passphrase'}
            </label>
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                id="passphrase"
                value={passphrase}
                onChange={(e) => setPassphraseValue(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 pr-10"
                style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
                placeholder={mode === 'create' ? 'Create a strong passphrase' : 'Enter your passphrase'}
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                {showPassphrase ? (
                  <EyeOffIcon size={20} />
                ) : (
                  <EyeIcon size={20} />
                )}
              </button>
            </div>
          </div>

          {mode === 'create' && (
            <>
              <div className="mb-4">
                <label
                  htmlFor="confirmPassphrase"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--monarch-text-dark)' }}
                >
                  Confirm Passphrase
                </label>
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  id="confirmPassphrase"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  required
                  className="w-full rounded-lg px-3 py-2"
                  style={{
                    border: `1px solid ${confirmPassphrase && !passwordsMatch ? 'var(--monarch-error)' : 'var(--monarch-border)'}`,
                    backgroundColor: 'var(--monarch-bg-card)'
                  }}
                  placeholder="Confirm your passphrase"
                />
                {confirmPassphrase && !passwordsMatch && (
                  <p className="text-xs mt-1" style={{ color: 'var(--monarch-error)' }}>
                    Passphrases do not match
                  </p>
                )}
              </div>

              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  Passphrase Requirements:
                </p>
                <ul className="space-y-1">
                  {requirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs">
                      {req.met ? (
                        <CheckIcon size={16} color="var(--monarch-success)" />
                      ) : (
                        <CircleIcon size={16} color="var(--monarch-text-muted)" />
                      )}
                      <span style={{ color: req.met ? 'var(--monarch-success)' : 'var(--monarch-text-muted)' }}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || !isValid || isInCooldown}
            className="w-full px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift hover-bg-orange-enabled"
            style={{
              backgroundColor: loading || !isValid || isInCooldown ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
            }}
          >
            {isInCooldown
              ? `Wait ${cooldownRemaining}s`
              : loading
                ? (mode === 'create' ? 'Encrypting...' : 'Unlocking...')
                : (mode === 'create' ? 'Encrypt & Save' : 'Unlock')
            }
          </button>

          {/* Cooldown message */}
          {isInCooldown && mode === 'unlock' && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--monarch-text-muted)' }}>
              Too many failed attempts. Please wait before trying again.
            </p>
          )}
        </form>

        {mode === 'unlock' && onResetApp && (
          <button
            type="button"
            onClick={onResetApp}
            className="w-full mt-3 text-sm hover:underline"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Forgot passphrase? Reset my app
          </button>
        )}

        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
          <div className="flex items-start gap-2">
            <ShieldCheckIcon size={16} color="var(--monarch-orange)" className="mt-0.5 flex-shrink-0" />
            <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
              <p className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>Your credentials are encrypted</p>
              <p>Using AES-256 encryption. The server cannot decrypt your credentials without your passphrase.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
