/**
 * Login Form
 *
 * Multi-stage login flow for Monarch Money authentication.
 * Stages: terms → beta warning → credentials → passphrase
 */

import { useState, useMemo } from 'react';
import { login, desktopLogin } from '../api/client';
import { PassphrasePrompt } from './passphrase';
import { SecurityInfo } from './SecurityInfo';
import { TermsModal, setTermsAccepted } from './ui/TermsModal';
import { BetaWarningModal, hasAcknowledgedBetaWarning, setBetaWarningAcknowledged } from './ui/BetaWarningModal';
import { MfaCodeCaveatsModal } from './MfaCodeCaveatsModal';
import { MfaInputSection, detectMfaFormat, getInitialStage } from './login';
import type { LoginStage } from './login';
import { getErrorMessage } from '../utils';
import { isDesktopMode } from '../utils/apiBase';
import { isBetaEnvironment } from '../utils/environment';
import { ElectronTitleBar } from './ElectronTitleBar';
import { useAuth } from '../context/AuthContext';

/**
 * Check if running in Electron desktop app with credential storage available.
 */
function isElectronDesktop(): boolean {
  return typeof window !== 'undefined' &&
    'electron' in window &&
    window.electron?.credentials !== undefined;
}

interface LoginFormProps {
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { setAuthenticated } = useAuth();
  const [stage, setStage] = useState<LoginStage>(getInitialStage);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [mfaMode, setMfaMode] = useState<'secret' | 'code'>('secret');
  const [showCodeCaveatsModal, setShowCodeCaveatsModal] = useState(false);

  const mfaFormat = useMemo(() => detectMfaFormat(mfaSecret), [mfaSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Desktop mode: simplified flow without passphrase
      if (isElectronDesktop()) {
        // Validate credentials and establish backend session
        const result = await desktopLogin(email, password, mfaSecret, mfaMode);

        if (result.success) {
          // Store credentials in Electron's safeStorage
          // - Always store email, password, and mfaMode
          // - Only store mfaSecret if using 'secret' mode (TOTP secrets are reusable)
          // - Don't store mfaSecret if using 'code' mode (6-digit codes are ephemeral)
          // globalThis.electron is guaranteed to exist inside isElectronDesktop()
          const stored = await globalThis.electron!.credentials.store({
            email,
            password,
            mfaMode,
            // Only store TOTP secrets, not ephemeral 6-digit codes
            ...(mfaSecret && mfaMode === 'secret' && { mfaSecret }),
          });

          if (!stored) {
            setError('Failed to store credentials securely. Please try again.');
            return;
          }

          // Mark as authenticated in React state before navigating
          setAuthenticated(true);

          // Success - no passphrase needed
          onSuccess();
        } else {
          handleLoginError(result.error);
        }
      } else {
        // Web/self-hosted mode: existing passphrase flow
        const result = await login(email, password, mfaSecret, mfaMode);
        if (result.success) {
          if (result.needs_passphrase) {
            setStage('passphrase');
          } else {
            onSuccess();
          }
        } else {
          handleLoginError(result.error);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle login error messages, detecting MFA and credentials errors.
   */
  const handleLoginError = (errorMsg: string | undefined) => {
    const errorLower = errorMsg?.toLowerCase() || '';
    const isMfaError = errorLower.includes('mfa') ||
                      errorLower.includes('multi-factor') ||
                      errorLower.includes('2fa') ||
                      errorLower.includes('two-factor');
    const isCredentialsError = errorLower.includes('404') ||
                               errorLower.includes('not found');
    if (isMfaError && !showMfa) {
      setShowMfa(true);
      setError('MFA required. Please enter your TOTP secret key.');
    } else if (isCredentialsError) {
      setError('Incorrect email or password. Please check your credentials and try again.');
    } else {
      setError(errorMsg || 'Login failed');
    }
  };

  // Stage: Terms
  if (stage === 'terms') {
    return (
      <TermsModal
        isOpen={true}
        onClose={() => {}}
        onAccept={() => {
          setTermsAccepted();
          if (isBetaEnvironment() && !hasAcknowledgedBetaWarning()) {
            setStage('betaWarning');
          } else {
            setStage('credentials');
          }
        }}
      />
    );
  }

  // Stage: Beta Warning
  if (stage === 'betaWarning') {
    return (
      <BetaWarningModal
        isOpen={true}
        onClose={() => {}}
        onAccept={() => {
          setBetaWarningAcknowledged();
          setStage('credentials');
        }}
      />
    );
  }

  // Stage: Passphrase creation
  if (stage === 'passphrase') {
    return <PassphrasePrompt mode="create" onSuccess={onSuccess} />;
  }

  // Stage: Credentials
  return (
    <>
      <ElectronTitleBar />
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
        <div className="flex flex-col items-center">
          {/* Eclosion branding */}
          <div className="flex items-center gap-3 mb-6">
            <img src={`${import.meta.env.BASE_URL}icons/icon-192.svg`} alt="Eclosion" className="w-12 h-12" />
            <span className="text-3xl" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600, color: 'var(--monarch-text-dark)' }}>
              Eclosion
            </span>
          </div>

          <div className="rounded-xl shadow-lg max-w-md w-full p-6" style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
              Connect to Monarch Money
            </h1>
            <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
              Enter your Monarch Money credentials to get started with Eclosion.
            </p>

            {error && (
              <div
                className="mb-4 p-3 rounded-lg text-sm error-message"
                style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} aria-label="Login form">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  aria-required="true"
                  className="w-full rounded-lg px-3 py-2"
                  style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
                  placeholder="you@example.com"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  aria-required="true"
                  className="w-full rounded-lg px-3 py-2"
                  style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
                />
              </div>

              {showMfa && (
                <MfaInputSection
                  mfaSecret={mfaSecret}
                  onMfaSecretChange={setMfaSecret}
                  mfaMode={mfaMode}
                  mfaFormat={mfaFormat}
                  onShowCodeCaveats={() => setShowCodeCaveatsModal(true)}
                />
              )}

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift hover-bg-orange-to-orange-hover"
                style={{ backgroundColor: loading ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)' }}
              >
                {loading ? 'Connecting...' : 'Connect to Monarch'}
              </button>
            </form>

            {/* Unofficial notice */}
            <aside className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)', border: '1px solid var(--monarch-border)' }} aria-label="Important notice">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--monarch-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                  <p><strong>Unofficial third-party tool</strong> — not affiliated with or endorsed by Monarch Money.</p>
                </div>
              </div>
            </aside>

            {/* Security notice */}
            <aside className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }} aria-label="Security information">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--monarch-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                  <p className="font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>How Your Data is Protected</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    {isElectronDesktop() ? (
                      <>
                        <li>Credentials are <strong>encrypted</strong> by your operating system&apos;s secure storage</li>
                        <li>Protected by your device&apos;s keychain or credential manager</li>
                        <li>Stored <strong>locally</strong> on this device only</li>
                      </>
                    ) : (
                      <>
                        <li>Credentials are <strong>encrypted</strong> with a passphrase only you know</li>
                        <li>This is a <strong>dedicated single-user instance</strong> — not shared with other accounts</li>
                        <li>Encrypted credentials are stored {isDesktopMode() ? 'locally within this app' : 'on this server'}</li>
                      </>
                    )}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setShowSecurityInfo(true)}
                    className="mt-2 font-medium hover:underline"
                    style={{ color: 'var(--monarch-orange)' }}
                  >
                    Full security details
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <SecurityInfo isOpen={showSecurityInfo} onClose={() => setShowSecurityInfo(false)} />

      <MfaCodeCaveatsModal
        isOpen={showCodeCaveatsModal}
        onClose={() => setShowCodeCaveatsModal(false)}
        onAccept={() => {
          setShowCodeCaveatsModal(false);
          setMfaMode('code');
          setMfaSecret('');
        }}
      />

      {/* GitHub source link */}
      <a
        href="https://github.com/312-dev/eclosion"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 p-2 rounded-full transition-colors hover-text-muted-to-dark"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label="View source on GitHub (opens in new tab)"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
    </>
  );
}
