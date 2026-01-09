import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils';
import { ElectronTitleBar } from './ElectronTitleBar';

interface CredentialUpdateFormProps {
  /** The passphrase that successfully decrypted the old credentials */
  passphrase: string;
  /** Called when new credentials are successfully saved */
  onSuccess: () => void;
  /** Called if user wants to cancel */
  onCancel: () => void;
}

export function CredentialUpdateForm({ passphrase, onSuccess, onCancel }: CredentialUpdateFormProps) {
  const { updateCredentials } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await updateCredentials(email, password, passphrase, mfaSecret);
      if (result.success) {
        toast.success('Credentials updated successfully');
        onSuccess();
      } else if (result.needs_mfa) {
        setShowMfa(true);
        setError('MFA required. Please enter your TOTP secret key.');
      } else {
        const errorMsg = result.error || 'Failed to update credentials';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
      {/* Draggable title bar for macOS Electron */}
      <ElectronTitleBar />
      <div className="rounded-xl shadow-lg max-w-md w-full p-6" style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}>
        {/* Warning banner */}
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--monarch-orange-bg)' }}>
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-orange)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium" style={{ color: 'var(--monarch-orange)' }}>
              Your Monarch credentials are no longer valid
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Your password may have changed, or your session expired. Please enter your current Monarch credentials.
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Update Monarch Credentials
        </h1>
        <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
          Your new credentials will be encrypted with the same passphrase you used before.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2"
              style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
            />
          </div>

          {showMfa && (
            <div className="mb-4">
              <label
                htmlFor="mfaSecret"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                MFA Secret Key
              </label>
              <input
                type="text"
                id="mfaSecret"
                value={mfaSecret}
                onChange={(e) => setMfaSecret(e.target.value)}
                className="w-full rounded-lg px-3 py-2 font-mono"
                style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
                placeholder="JBSWY3DPEHPK3PXP"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                The base32 secret key from your authenticator app setup.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-elevated)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift hover-bg-orange-enabled"
              style={{
                backgroundColor: loading ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
              }}
            >
              {loading ? 'Saving...' : 'Save Credentials'}
            </button>
          </div>
        </form>

        {/* Security note */}
        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--monarch-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
              <p className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>Same encryption passphrase</p>
              <p>Your new credentials will be encrypted with the passphrase you used to unlock. You won't need to remember a new passphrase.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
