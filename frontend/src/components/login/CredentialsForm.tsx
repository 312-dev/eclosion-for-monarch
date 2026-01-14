/**
 * Credentials Form
 *
 * The actual email/password/MFA form for the login flow.
 */

import { MfaInputSection } from './MfaInputSection';
import type { MfaInputFormat } from './loginUtils';

interface CredentialsFormProps {
  email: string;
  password: string;
  mfaSecret: string;
  showMfa: boolean;
  mfaFormat: MfaInputFormat;
  loading: boolean;
  error: string | null;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onMfaSecretChange: (mfaSecret: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CredentialsForm({
  email,
  password,
  mfaSecret,
  showMfa,
  mfaFormat,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onMfaSecretChange,
  onSubmit,
}: CredentialsFormProps) {
  return (
    <>
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

      <form onSubmit={onSubmit} aria-label="Login form">
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            autoComplete="email"
            aria-required="true"
            className="w-full rounded-lg px-3 py-2"
            style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
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
            onMfaSecretChange={onMfaSecretChange}
            mfaFormat={mfaFormat}
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
    </>
  );
}
