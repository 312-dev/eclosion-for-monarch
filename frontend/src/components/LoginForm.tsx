/**
 * Login Form
 *
 * Multi-stage login flow for Monarch Money authentication.
 * Stages: terms → beta warning → credentials → passphrase
 */

import { useState, useMemo, useEffect } from 'react';
import { login, desktopLogin } from '../api/client';
import { PassphrasePrompt } from './passphrase';
import { SecurityInfo } from './SecurityInfo';
import { TermsModal, setTermsAccepted } from './ui/TermsModal';
import {
  BetaWarningModal,
  hasAcknowledgedBetaWarning,
  setBetaWarningAcknowledged,
} from './ui/BetaWarningModal';
import { MfaCodeCaveatsModal } from './MfaCodeCaveatsModal';
import { CredentialsForm, detectMfaFormat, getInitialStage } from './login';
import {
  LoginSecurityNotice,
  UnofficialNotice,
  GithubSourceLink,
} from './login/LoginSecurityNotice';
import type { LoginStage } from './login';
import { getErrorMessage } from '../utils';
import { isBetaEnvironment } from '../utils/environment';
import { ElectronTitleBar } from './ElectronTitleBar';
import { useAuth } from '../context/AuthContext';

/**
 * Check if running in Electron desktop app with credential storage available.
 */
function isElectronDesktop(): boolean {
  return (
    typeof globalThis.window !== 'undefined' &&
    'electron' in globalThis &&
    globalThis.electron?.credentials !== undefined
  );
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
  const [showCodeCaveatsModal, setShowCodeCaveatsModal] = useState(false);
  const [pendingCodeModeLogin, setPendingCodeModeLogin] = useState(false);

  const mfaFormat = useMemo(() => detectMfaFormat(mfaSecret), [mfaSecret]);

  // Dynamically resize the compact window based on content (desktop only)
  // Heights are approximate and account for different form states
  useEffect(() => {
    if (!isElectronDesktop() || !globalThis.electron?.windowMode?.setCompactSize) return;

    let height: number;
    if (stage === 'terms') {
      height = 750; // Terms modal
    } else if (stage === 'betaWarning') {
      height = 920; // Beta warning modal (tallest)
    } else if (stage === 'passphrase') {
      height = 700; // Passphrase prompt
    } else if (showMfa) {
      height = 920; // Login form with MFA fields visible
    } else {
      height = 750; // Basic login form
    }

    globalThis.electron.windowMode.setCompactSize(height).catch(() => {
      // Ignore errors - window sizing is a UX enhancement
    });
  }, [stage, showMfa]);

  /**
   * Actually perform the login after any confirmations.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity -- Auth flow requires handling multiple MFA modes, credential storage, and error states
  const performLogin = async (confirmedMfaMode: 'secret' | 'code') => {
    setLoading(true);
    setError(null);

    try {
      // Desktop mode: simplified flow without passphrase
      if (isElectronDesktop()) {
        // Validate credentials and establish backend session
        const result = await desktopLogin(email, password, mfaSecret, confirmedMfaMode);

        if (result.success) {
          // Store credentials in Electron's safeStorage
          // - Always store email, password, and mfaMode
          // - Only store mfaSecret if using 'secret' mode (TOTP secrets are reusable)
          // - Don't store mfaSecret if using 'code' mode (6-digit codes are ephemeral)
          // globalThis.electron is guaranteed to exist inside isElectronDesktop()
          const stored = await globalThis.electron!.credentials.store({
            email,
            password,
            mfaMode: confirmedMfaMode,
            // Only store TOTP secrets, not ephemeral 6-digit codes
            ...(mfaSecret && confirmedMfaMode === 'secret' && { mfaSecret }),
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
        const result = await login(email, password, mfaSecret, confirmedMfaMode);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If user entered a 6-digit code, show confirmation modal first
    if (mfaFormat === 'six_digit_code') {
      setPendingCodeModeLogin(true);
      setShowCodeCaveatsModal(true);
      return;
    }

    // Otherwise proceed with secret mode login
    await performLogin('secret');
  };

  /**
   * Handle login error messages, detecting MFA and credentials errors.
   */
  const handleLoginError = (errorMsg: string | undefined) => {
    const errorLower = errorMsg?.toLowerCase() || '';
    const isMfaError =
      errorLower.includes('mfa') ||
      errorLower.includes('multi-factor') ||
      errorLower.includes('2fa') ||
      errorLower.includes('two-factor');
    const isCredentialsError = errorLower.includes('404') || errorLower.includes('not found');
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
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <div className="flex flex-col items-center">
          {/* Eclosion branding */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src={`${import.meta.env.BASE_URL}icons/icon-192.svg`}
              alt="Eclosion"
              className="w-12 h-12"
            />
            <span
              className="text-3xl"
              style={{
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 600,
                color: 'var(--monarch-text-dark)',
              }}
            >
              Eclosion
            </span>
          </div>

          <div
            className="rounded-xl shadow-lg max-w-md w-full p-6"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
              Connect to Monarch Money
            </h1>
            <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
              Enter your Monarch Money credentials to get started with Eclosion.
            </p>

            <CredentialsForm
              email={email}
              password={password}
              mfaSecret={mfaSecret}
              showMfa={showMfa}
              mfaFormat={mfaFormat}
              loading={loading}
              error={error}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onMfaSecretChange={setMfaSecret}
              onSubmit={handleSubmit}
            />

            <UnofficialNotice />
            <LoginSecurityNotice
              isElectronDesktop={isElectronDesktop()}
              onShowDetails={() => setShowSecurityInfo(true)}
            />
          </div>
        </div>
      </div>

      <SecurityInfo isOpen={showSecurityInfo} onClose={() => setShowSecurityInfo(false)} />

      <MfaCodeCaveatsModal
        isOpen={showCodeCaveatsModal}
        onClose={() => {
          setShowCodeCaveatsModal(false);
          setPendingCodeModeLogin(false);
        }}
        onAccept={async () => {
          setShowCodeCaveatsModal(false);
          // If this was triggered by form submit, proceed with login
          if (pendingCodeModeLogin) {
            setPendingCodeModeLogin(false);
            await performLogin('code');
          }
        }}
      />

      {/* GitHub source link - hidden on desktop app (shown in main app footer instead) */}
      {!isElectronDesktop() && <GithubSourceLink />}
    </>
  );
}
