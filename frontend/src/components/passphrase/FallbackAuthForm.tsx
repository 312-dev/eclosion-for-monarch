/**
 * Fallback Authentication Form
 *
 * Shown when Touch ID fails repeatedly or user requests credential fallback.
 * Validates email + password against stored credentials (works offline).
 */

import { useState } from 'react';
import { EyeIcon, EyeOffIcon, SpinnerIcon, MailIcon, LockIcon } from '../icons';

interface FallbackAuthFormProps {
  /** Called when user wants to go back to Touch ID */
  onCancel: () => void;
  /** Optional error from previous attempts */
  initialError?: string | null;
  /** Auth state setter - sets authenticated to true */
  setAuthenticated?: (value: boolean) => void;
  /** Auth state setter - sets needsUnlock to false */
  setNeedsUnlock?: (value: boolean) => void;
}

export function FallbackAuthForm({
  onCancel,
  initialError,
  setAuthenticated,
  setNeedsUnlock,
}: Readonly<FallbackAuthFormProps>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await globalThis.electron?.biometric.validateFallback(
        email.trim(),
        password
      );

      if (result?.success) {
        // Update auth state - useEffect in UnlockPage will handle navigation
        // Don't call onSuccess() directly as React state updates are async
        setAuthenticated?.(true);
        setNeedsUnlock?.(false);
      } else {
        setError(result?.error ?? 'Invalid credentials');
      }
    } catch {
      setError('Failed to validate credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-6">
        <h2
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          Sign In with Credentials
        </h2>
        <p
          className="text-sm"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Use the last credentials you used for Eclosion
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field */}
        <div>
          <label
            htmlFor="fallback-email"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Email
          </label>
          <div className="relative">
            <MailIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
            <input
              type="email"
              id="fallback-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              className="w-full rounded-lg pl-10 pr-3 py-2"
              style={{
                border: '1px solid var(--monarch-border)',
                backgroundColor: 'var(--monarch-bg-card)',
              }}
              placeholder="your@email.com"
            />
          </div>
        </div>

        {/* Password field */}
        <div>
          <label
            htmlFor="fallback-password"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Password
          </label>
          <div className="relative">
            <LockIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              id="fallback-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg pl-10 pr-10 py-2"
              style={{
                border: '1px solid var(--monarch-border)',
                backgroundColor: 'var(--monarch-bg-card)',
              }}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--monarch-error-bg, rgba(239, 68, 68, 0.1))',
              color: 'var(--monarch-error)',
            }}
          >
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--monarch-primary)',
            color: 'white',
            opacity: loading || !email.trim() || !password ? 0.6 : 1,
          }}
        >
          {loading ? (
            <>
              <SpinnerIcon size={20} className="animate-spin" />
              Verifying...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        {/* Cancel link */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Try Touch ID again
        </button>
      </form>

      {/* Info note */}
      <p
        className="text-xs text-center mt-6"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        If you&apos;ve changed your Monarch password since logging into Eclosion,
        you&apos;ll need to log out and sign in again.
      </p>
    </div>
  );
}
