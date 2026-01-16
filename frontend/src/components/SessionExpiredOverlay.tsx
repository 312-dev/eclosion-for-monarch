/**
 * Session Expired Overlay
 *
 * Non-dismissible overlay that appears when the user's session expires.
 * Allows re-authentication without losing current page state.
 *
 * Desktop mode: Shows MFA re-auth form (credentials stored in safeStorage)
 * Web mode: Shows full credential form
 */

import { useState, useEffect } from 'react';
import { desktopLogin, login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils';
import { MfaInputSection, detectMfaFormat } from './login';
import { MfaCodeCaveatsModal } from './MfaCodeCaveatsModal';
import { AppIcon } from './wizards/WizardComponents';

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

export function SessionExpiredOverlay() {
  const { showSessionExpiredOverlay, setAuthenticated, dismissSessionExpiredOverlay } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMfa, setShowMfa] = useState(false);
  const [showCodeCaveatsModal, setShowCodeCaveatsModal] = useState(false);
  const [pendingCodeModeLogin, setPendingCodeModeLogin] = useState(false);

  // Desktop mode state
  const [storedEmail, setStoredEmail] = useState<string | null>(null);
  const isDesktop = isElectronDesktop();

  // Load stored email on mount for desktop mode
  useEffect(() => {
    if (isDesktop && showSessionExpiredOverlay) {
      globalThis.electron?.credentials.get().then((creds) => {
        if (creds) {
          setStoredEmail(creds.email);
          setShowMfa(true); // Desktop always needs MFA for re-auth
        }
      });
    }
  }, [isDesktop, showSessionExpiredOverlay]);

  // Reset form when overlay closes
  useEffect(() => {
    if (!showSessionExpiredOverlay) {
      setEmail('');
      setPassword('');
      setMfaSecret('');
      setError(null);
      setShowMfa(false);
    }
  }, [showSessionExpiredOverlay]);

  const mfaFormat = detectMfaFormat(mfaSecret);

  /**
   * Perform the login after any confirmations.
   */
  const performLogin = async (confirmedMfaMode: 'secret' | 'code') => {
    setLoading(true);
    setError(null);

    try {
      if (isDesktop) {
        // Desktop mode: get stored credentials, use new MFA
        const credentials = await globalThis.electron?.credentials.get();
        if (!credentials) {
          setError('Stored credentials not found. Please restart the app.');
          return;
        }

        const result = await desktopLogin(
          credentials.email,
          credentials.password,
          mfaSecret,
          confirmedMfaMode
        );

        if (result.success) {
          // Update stored MFA mode/secret if using secret mode
          await globalThis.electron?.credentials.store({
            email: credentials.email,
            password: credentials.password,
            mfaMode: confirmedMfaMode,
            ...(mfaSecret && confirmedMfaMode === 'secret' && { mfaSecret }),
          });

          setAuthenticated(true);
          dismissSessionExpiredOverlay();
        } else {
          handleError(result.error);
        }
      } else {
        // Web mode: use entered credentials
        const result = await login(email, password, mfaSecret, confirmedMfaMode);

        if (result.success) {
          setAuthenticated(true);
          dismissSessionExpiredOverlay();
        } else {
          handleError(result.error);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleError = (errorMsg: string | undefined) => {
    const errorLower = errorMsg?.toLowerCase() || '';
    const isMfaError =
      errorLower.includes('mfa') ||
      errorLower.includes('multi-factor') ||
      errorLower.includes('2fa') ||
      errorLower.includes('two-factor');

    if (isMfaError && !showMfa) {
      setShowMfa(true);
      setError('MFA required. Please enter your TOTP secret or 6-digit code.');
    } else {
      setError(errorMsg || 'Authentication failed');
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

  if (!showSessionExpiredOverlay) return null;

  // Mask email for privacy
  // Use negated character class [^@]* instead of .* to prevent regex backtracking
  const maskedEmail = storedEmail ? storedEmail.replace(/^(.{2})[^@]*(@.*)$/, '$1***$2') : null;

  return (
    <>
      {/* Dark overlay backdrop */}
      <div
        className="fixed inset-0 z-100 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
      >
        <div
          className="rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scale-in"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {/* Header with icon */}
          <div className="flex items-center gap-3 mb-4">
            <AppIcon size={40} />
            <div>
              <h2
                id="session-expired-title"
                className="text-xl font-bold"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                Session Expired
              </h2>
              <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                Please sign in again to continue
              </p>
            </div>
          </div>

          {/* Desktop mode: show masked email */}
          {isDesktop && maskedEmail && (
            <div
              className="mb-4 p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                Signed in as
              </span>
              <p className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                {maskedEmail}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--monarch-error-bg)',
                color: 'var(--monarch-error)',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Web mode: show email/password fields */}
            {!isDesktop && (
              <>
                <div className="mb-4">
                  <label
                    htmlFor="session-email"
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--monarch-text-dark)' }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="session-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-lg px-3 py-2"
                    style={{
                      border: '1px solid var(--monarch-border)',
                      backgroundColor: 'var(--monarch-bg-card)',
                    }}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="session-password"
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--monarch-text-dark)' }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    id="session-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg px-3 py-2"
                    style={{
                      border: '1px solid var(--monarch-border)',
                      backgroundColor: 'var(--monarch-bg-card)',
                    }}
                  />
                </div>
              </>
            )}

            {/* MFA input - always shown for desktop, shown after error for web */}
            {showMfa && (
              <MfaInputSection
                mfaSecret={mfaSecret}
                onMfaSecretChange={setMfaSecret}
                mfaFormat={mfaFormat}
              />
            )}

            {/* Submit button */}
            {(() => {
              const isFormIncomplete = isDesktop ? !mfaSecret : !email || !password;
              const isSubmitDisabled = loading || isFormIncomplete;
              return (
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift hover-bg-orange-to-orange-hover"
                  style={{
                    backgroundColor: isSubmitDisabled
                      ? 'var(--monarch-orange-disabled)'
                      : 'var(--monarch-orange)',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              );
            })()}
          </form>
        </div>
      </div>

      {/* MFA code caveats modal */}
      <MfaCodeCaveatsModal
        isOpen={showCodeCaveatsModal}
        onClose={() => {
          setShowCodeCaveatsModal(false);
          setPendingCodeModeLogin(false);
        }}
        onAccept={async () => {
          setShowCodeCaveatsModal(false);
          if (pendingCodeModeLogin) {
            setPendingCodeModeLogin(false);
            await performLogin('code');
          }
        }}
      />
    </>
  );
}
