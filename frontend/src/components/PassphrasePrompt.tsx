import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils';
import { UI } from '../constants';
import { LockIcon, EyeIcon, EyeOffIcon, CheckIcon, CircleIcon, ShieldCheckIcon } from './icons';

interface PassphrasePromptProps {
  mode: 'create' | 'unlock';
  onSuccess: () => void;
  /** Called when Monarch credentials are invalid but passphrase was correct */
  onCredentialUpdateNeeded?: (passphrase: string) => void;
  /** Called when user clicks "Reset my app" */
  onResetApp?: () => void;
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

export function PassphrasePrompt({ mode, onSuccess, onCredentialUpdateNeeded, onResetApp }: PassphrasePromptProps) {
  const { setPassphrase, unlockCredentials } = useAuth();
  const [passphrase, setPassphraseValue] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const result = await setPassphrase(passphrase);
        if (result.success) {
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
          onSuccess();
        } else if (result.needs_credential_update && result.unlock_success) {
          // Passphrase was correct but Monarch credentials are invalid
          // Reset cooldown since passphrase was correct
          setFailedAttempts(0);
          setCooldownUntil(null);
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

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
            {error}
          </div>
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
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
                        <svg className="w-4 h-4" style={{ color: 'var(--monarch-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" style={{ color: 'var(--monarch-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        </svg>
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
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--monarch-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
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
