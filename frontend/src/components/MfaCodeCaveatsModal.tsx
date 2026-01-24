import { useState } from 'react';
import { CancelButton, WarningButton } from './ui/ModalButtons';

interface MfaCodeCaveatsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onAccept: () => void;
}

/**
 * Modal explaining the caveats of using 6-digit codes instead of the MFA secret.
 * Users must acknowledge they understand the limitations before proceeding.
 */
export function MfaCodeCaveatsModal({ isOpen, onClose, onAccept }: MfaCodeCaveatsModalProps) {
  const [understood, setUnderstood] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (understood) {
      onAccept();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="w-6 h-6"
            style={{ color: 'var(--monarch-orange)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-lg font-bold" style={{ color: 'var(--monarch-text-dark)' }}>
            Using 6-Digit Code
          </h2>
        </div>

        <div className="space-y-3 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          <p>
            You&apos;re choosing to use a one-time 6-digit code instead of your MFA secret key.
            Please understand these limitations:
          </p>

          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong style={{ color: 'var(--monarch-text-dark)' }}>
                Manual re-authentication required
              </strong>
              <br />
              When your Monarch session expires, you&apos;ll need to enter a new code from your
              authenticator app.
            </li>
            <li>
              <strong style={{ color: 'var(--monarch-text-dark)' }}>
                Background syncs will pause
              </strong>
              <br />
              Automatic syncing will stop until you re-authenticate. Your data may become stale.
            </li>
            <li>
              <strong style={{ color: 'var(--monarch-text-dark)' }}>We&apos;ll notify you</strong>
              <br />
              You&apos;ll receive a notification when re-authentication is needed.
            </li>
          </ul>

          <div
            className="mt-4 p-3 rounded-lg"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <p className="text-xs">
              <strong>Tip:</strong> If you can find your MFA secret key later, you can update your
              credentials in Settings to enable automatic re-authentication.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
            I understand I&apos;ll need to manually re-authenticate when my session expires
          </span>
        </label>

        <div className="flex gap-3 mt-6">
          <CancelButton onClick={onClose} fullWidth>
            Cancel
          </CancelButton>
          <WarningButton onClick={handleAccept} disabled={!understood} fullWidth>
            Continue with Code
          </WarningButton>
        </div>
      </div>
    </div>
  );
}
