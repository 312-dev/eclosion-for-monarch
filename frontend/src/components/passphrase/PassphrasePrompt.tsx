import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils';
import { UI } from '../../constants';
import { LockIcon } from '../icons';
import { ElectronTitleBar } from '../ElectronTitleBar';
import {
  getCooldownSeconds,
  validatePassphrase,
  getLockoutState,
  setLockoutState,
  clearLockoutState,
} from './PassphraseUtils';
import { usePassphraseBiometric } from './usePassphraseBiometric';
import {
  PasswordInput,
  RequirementsList,
  BiometricUnlockButton,
  BiometricResetBanner,
  SecurityNote,
} from './PassphraseFormFields';

interface PassphrasePromptProps {
  mode: 'create' | 'unlock';
  onSuccess: () => void;
  onCredentialUpdateNeeded?: (passphrase: string) => void;
  onResetApp?: () => void;
  autoPromptBiometric?: boolean;
}

export function PassphrasePrompt({
  mode,
  onSuccess,
  onCredentialUpdateNeeded,
  onResetApp,
  autoPromptBiometric = true,
}: Readonly<PassphrasePromptProps>) {
  const { setPassphrase: savePassphrase, unlockCredentials } = useAuth();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);

  // Progressive cooldown state (persisted across restarts)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [lockoutLoaded, setLockoutLoaded] = useState(false);

  // Load persisted lockout state on mount
  useEffect(() => {
    getLockoutState().then((state) => {
      setFailedAttempts(state.failedAttempts);
      setCooldownUntil(state.cooldownUntil);
      setLockoutLoaded(true);
    });
  }, []);

  const clearCooldown = useCallback(() => {
    setFailedAttempts(0);
    setCooldownUntil(null);
    clearLockoutState();
  }, []);

  const {
    biometric,
    biometricLoading,
    biometricWasReset,
    biometricError,
    handleBiometricUnlock,
    storePassphraseForSync,
    offerBiometricEnrollment,
  } = usePassphraseBiometric({
    mode,
    autoPromptBiometric,
    unlockCredentials,
    onSuccess,
    ...(onCredentialUpdateNeeded && { onCredentialUpdateNeeded }),
    onClearCooldown: clearCooldown,
    loading,
  });

  const requirements = useMemo(() => validatePassphrase(passphrase), [passphrase]);
  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = passphrase === confirmPassphrase;
  const isInCooldown = cooldownRemaining > 0;
  // Wait for lockout state to load before allowing submission (prevents race condition)
  const isValid = mode === 'unlock'
    ? passphrase.length > 0 && !isInCooldown && lockoutLoaded
    : allRequirementsMet && passwordsMatch;
  const displayError = error || biometricError;

  // Cooldown timer effect
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      if (remaining <= 0) setCooldownUntil(null);
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, UI.INTERVAL.COOLDOWN_TICK);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const startCooldown = useCallback((attempts: number) => {
    const seconds = getCooldownSeconds(attempts);
    const newCooldownUntil = seconds > 0 ? Date.now() + seconds * 1000 : null;
    if (newCooldownUntil) setCooldownUntil(newCooldownUntil);
    // Persist lockout state
    setLockoutState({ failedAttempts: attempts, cooldownUntil: newCooldownUntil });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const result = await savePassphrase(passphrase);
        if (result.success) {
          await storePassphraseForSync(passphrase);
          await offerBiometricEnrollment(passphrase);
          onSuccess();
        } else {
          setError(result.error || 'Failed to set passphrase');
        }
      } else {
        const result = await unlockCredentials(passphrase);
        if (result.success) {
          clearCooldown();
          await storePassphraseForSync(passphrase);
          await offerBiometricEnrollment(passphrase);
          onSuccess();
        } else if (result.needs_credential_update && result.unlock_success) {
          clearCooldown();
          await storePassphraseForSync(passphrase);
          onCredentialUpdateNeeded?.(passphrase);
        } else {
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          startCooldown(newAttempts);
          setError(result.error || 'Invalid passphrase');
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (isInCooldown) return `Wait ${cooldownRemaining}s`;
    if (loading) return mode === 'create' ? 'Encrypting...' : 'Unlocking...';
    return mode === 'create' ? 'Encrypt & Save' : 'Unlock';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
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
            : 'Enter your passphrase to unlock your encrypted credentials.'}
        </p>

        {biometricWasReset && biometric.available && <BiometricResetBanner displayName={biometric.displayName} />}

        {displayError && !biometricWasReset && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
            {displayError}
          </div>
        )}

        {mode === 'unlock' && biometric.available && biometric.enrolled && (
          <BiometricUnlockButton
            displayName={biometric.displayName}
            loading={biometricLoading}
            disabled={biometricLoading || loading || isInCooldown}
            onClick={handleBiometricUnlock}
          />
        )}

        <form onSubmit={handleSubmit}>
          <PasswordInput
            id="passphrase"
            label={mode === 'create' ? 'Create Passphrase' : 'Passphrase'}
            value={passphrase}
            onChange={setPassphrase}
            showPassword={showPassphrase}
            onToggleShow={() => setShowPassphrase(!showPassphrase)}
            placeholder={mode === 'create' ? 'Create a strong passphrase' : 'Enter your passphrase'}
          />

          {mode === 'create' && (
            <>
              <PasswordInput
                id="confirmPassphrase"
                label="Confirm Passphrase"
                value={confirmPassphrase}
                onChange={setConfirmPassphrase}
                showPassword={showPassphrase}
                onToggleShow={() => setShowPassphrase(!showPassphrase)}
                placeholder="Confirm your passphrase"
                error={confirmPassphrase && !passwordsMatch ? 'Passphrases do not match' : null}
              />
              <RequirementsList requirements={requirements} />
            </>
          )}

          <button
            type="submit"
            disabled={loading || !isValid || isInCooldown}
            className="w-full px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift hover-bg-orange-enabled"
            style={{ backgroundColor: loading || !isValid || isInCooldown ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)' }}
          >
            {getButtonText()}
          </button>

          {isInCooldown && mode === 'unlock' && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--monarch-text-muted)' }}>
              Too many failed attempts. Please wait before trying again.
            </p>
          )}
        </form>

        {mode === 'unlock' && onResetApp && (
          <button type="button" onClick={onResetApp} className="w-full mt-3 text-sm hover:underline" style={{ color: 'var(--monarch-text-muted)' }}>
            Forgot passphrase? Reset my app
          </button>
        )}

        <SecurityNote />
      </div>
    </div>
  );
}
