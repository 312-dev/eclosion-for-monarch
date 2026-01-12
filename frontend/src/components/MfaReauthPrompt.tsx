/**
 * MFA Re-authentication Prompt
 *
 * Lightweight prompt for re-entering MFA code when session restore requires it.
 * Used when 6-digit code users restart the app and their session has expired.
 *
 * Features:
 * - Shows the user's email (pre-filled from stored credentials)
 * - Prompts for 6-digit MFA code
 * - Allows switching between 'code' and 'secret' mode
 * - "Use different account" link to go to full login
 */

import { useState } from 'react';
import { desktopLogin } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils';
import { ElectronTitleBar } from './ElectronTitleBar';
import { MfaInputSection, detectMfaFormat } from './login';
import { MfaCodeCaveatsModal } from './MfaCodeCaveatsModal';

interface MfaReauthPromptProps {
  /** User's email from stored credentials */
  email: string;
  /** Initial MFA mode from stored credentials */
  initialMfaMode: 'secret' | 'code';
  /** Called when MFA re-auth succeeds */
  onSuccess: () => void;
  /** Called when user wants to use a different account (full login) */
  onUseOtherAccount: () => void;
}

export function MfaReauthPrompt({
  email,
  initialMfaMode,
  onSuccess,
  onUseOtherAccount,
}: Readonly<MfaReauthPromptProps>) {
  const { setAuthenticated } = useAuth();
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMode, setMfaMode] = useState<'secret' | 'code'>(initialMfaMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCodeCaveatsModal, setShowCodeCaveatsModal] = useState(false);

  const mfaFormat = detectMfaFormat(mfaCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get stored credentials from Electron
      const credentials = await globalThis.electron?.credentials.get();
      if (!credentials) {
        setError('Stored credentials not found. Please log in again.');
        onUseOtherAccount();
        return;
      }

      // Attempt login with stored credentials + new MFA code
      const result = await desktopLogin(
        credentials.email,
        credentials.password,
        mfaCode,
        mfaMode
      );

      if (result.success) {
        // Update stored credentials with new mfaMode (and secret if applicable)
        await globalThis.electron?.credentials.store({
          email: credentials.email,
          password: credentials.password,
          mfaMode,
          // Only store TOTP secrets, not ephemeral 6-digit codes
          ...(mfaCode && mfaMode === 'secret' && { mfaSecret: mfaCode }),
        });

        // Mark as authenticated
        setAuthenticated(true);
        onSuccess();
      } else {
        // Handle error
        const errorLower = result.error?.toLowerCase() || '';
        if (errorLower.includes('404') || errorLower.includes('not found')) {
          setError('Incorrect credentials. Please log in again.');
          onUseOtherAccount();
        } else {
          setError(result.error || 'Authentication failed');
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Mask email for privacy (show first 2 chars and domain)
  const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3');

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
            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              Welcome Back
            </h1>
            <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
              Your Monarch session has expired. Please enter your MFA code to continue.
            </p>

            {/* Show masked email */}
            <div
              className="mb-4 p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              <span
                className="text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                Logged in as
              </span>
              <p
                className="font-medium"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {maskedEmail}
              </p>
            </div>

            {error && (
              <div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--monarch-error-bg)',
                  color: 'var(--monarch-error)',
                }}
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} aria-label="MFA re-authentication form">
              <MfaInputSection
                mfaSecret={mfaCode}
                onMfaSecretChange={setMfaCode}
                mfaMode={mfaMode}
                mfaFormat={mfaFormat}
                onShowCodeCaveats={() => setShowCodeCaveatsModal(true)}
              />

              <button
                type="submit"
                disabled={loading || !mfaCode}
                aria-busy={loading}
                className="w-full px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift hover-bg-orange-to-orange-hover mt-4"
                style={{
                  backgroundColor:
                    loading || !mfaCode
                      ? 'var(--monarch-orange-disabled)'
                      : 'var(--monarch-orange)',
                }}
              >
                {loading ? 'Authenticating...' : 'Continue'}
              </button>
            </form>

            {/* Use different account link */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onUseOtherAccount}
                className="text-sm hover:underline"
                style={{ color: 'var(--monarch-orange)' }}
              >
                Use a different account
              </button>
            </div>
          </div>
        </div>
      </div>

      <MfaCodeCaveatsModal
        isOpen={showCodeCaveatsModal}
        onClose={() => setShowCodeCaveatsModal(false)}
        onAccept={() => {
          setShowCodeCaveatsModal(false);
          setMfaMode('code');
          setMfaCode('');
        }}
      />
    </>
  );
}
