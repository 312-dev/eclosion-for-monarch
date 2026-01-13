/**
 * MFA Input Section
 *
 * Handles MFA secret/code input with format detection and guidance.
 */

import type { MfaInputFormat } from './loginUtils';

interface MfaInputSectionProps {
  mfaSecret: string;
  onMfaSecretChange: (value: string) => void;
  mfaFormat: MfaInputFormat;
}

export function MfaInputSection({
  mfaSecret,
  onMfaSecretChange,
  mfaFormat,
}: MfaInputSectionProps) {
  // Auto-detect mode from format
  const isCodeMode = mfaFormat === 'six_digit_code';
  return (
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
        name="mfaSecret"
        value={mfaSecret}
        onChange={(e) => onMfaSecretChange(e.target.value)}
        autoComplete="one-time-code"
        aria-describedby="mfa-help"
        className="w-full rounded-lg px-3 py-2 font-mono"
        style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
        placeholder="JBSWY3DPEHPK3PXP"
      />

      {/* Format feedback */}
      {isCodeMode && (
        <div className="mt-2 p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--monarch-warning-bg, rgba(234, 179, 8, 0.1))', color: 'var(--monarch-warning, #ca8a04)' }}>
          <p className="font-medium">This looks like a 6-digit verification code.</p>
          <p className="mt-1">We recommend using the secret key from your password manager instead, but you can proceed with the 6-digit code if needed.</p>
        </div>
      )}

      {mfaFormat === 'otpauth_uri' && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--monarch-success)' }}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          otpauth:// URI detected - we&apos;ll extract the secret automatically
        </p>
      )}

      {mfaFormat === 'base32_secret' && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--monarch-success)' }}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Secret key format detected
        </p>
      )}

      {(mfaFormat === 'empty' || mfaFormat === 'unknown') && (
        <p id="mfa-help" className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
          The base32 secret key from your authenticator app setup.
        </p>
      )}

      {/* How to find secret key - collapsible */}
      {!isCodeMode && (
        <details className="mt-3">
          <summary className="text-xs cursor-pointer" style={{ color: 'var(--monarch-text-muted)' }}>
            How to find your secret key
          </summary>
          <div className="mt-2 space-y-2 text-xs p-2 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)', color: 'var(--monarch-text-muted)' }}>
            <div><strong>1Password:</strong> Edit entry → One-Time Password field → copy secret or otpauth:// URI</div>
            <div><strong>Bitwarden:</strong> Edit item → Authenticator key field</div>
            <div><strong>Google Authenticator:</strong> Secret must be saved when first setting up MFA (no export available)</div>
            <div><strong>Apple Passwords:</strong> No export available - must disable and re-enable 2FA to get new secret</div>
            <div><strong>Authy:</strong> No official export - requires third-party tools</div>
          </div>
        </details>
      )}
    </div>
  );
}
