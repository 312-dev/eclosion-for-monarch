/**
 * Remote Access Passphrase Modal
 *
 * Prompts user to create a passphrase when enabling remote access for the first time.
 * This passphrase will be used to authenticate remote users and encrypts session
 * credentials on the backend.
 */

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Loader2 } from 'lucide-react';
import { saveForRemote } from '../../../api/core/auth';
import { PasswordInput, RequirementsList } from '../../passphrase/PassphraseFormFields';
import { validatePassphrase } from '../../passphrase/PassphraseUtils';
import { Z_INDEX } from '../../../constants';

interface RemoteAccessPassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** 'create' for first-time setup, 'change' for updating existing passphrase */
  mode?: 'create' | 'change';
}

export function RemoteAccessPassphraseModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'create',
}: Readonly<RemoteAccessPassphraseModalProps>) {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requirements = useMemo(() => validatePassphrase(passphrase), [passphrase]);
  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = passphrase === confirmPassphrase;
  const isValid = allRequirementsMet && passwordsMatch && confirmPassphrase.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Get the desktop notes key so tunnel users can decrypt notes
      const notesKey = await globalThis.electron?.credentials.getNotesKey();
      const result = await saveForRemote(passphrase, notesKey);
      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        setError(result.error || 'Failed to save passphrase');
      }
    } catch {
      setError('Failed to save passphrase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassphrase('');
    setConfirmPassphrase('');
    setShowPassphrase(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} role="presentation" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl shadow-xl"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          zIndex: Z_INDEX.MODAL,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remote-passphrase-title"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--monarch-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              <Globe size={20} style={{ color: 'var(--monarch-orange)' }} />
            </div>
            <h2
              id="remote-passphrase-title"
              className="text-lg font-semibold"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              {mode === 'change' ? 'Change Passphrase' : 'Set Up Remote Access'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <p className="mb-4 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            {mode === 'change'
              ? 'Enter a new passphrase. Remote users will need to use this new passphrase to connect.'
              : 'Create a passphrase to secure remote access. Anyone accessing Eclosion from another device will need this passphrase to connect.'}
          </p>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              {error}
            </div>
          )}

          <PasswordInput
            id="remote-passphrase"
            label="Passphrase"
            value={passphrase}
            onChange={setPassphrase}
            showPassword={showPassphrase}
            onToggleShow={() => setShowPassphrase(!showPassphrase)}
            placeholder="Create a strong passphrase"
          />

          <PasswordInput
            id="remote-passphrase-confirm"
            label="Confirm Passphrase"
            value={confirmPassphrase}
            onChange={setConfirmPassphrase}
            showPassword={showPassphrase}
            onToggleShow={() => setShowPassphrase(!showPassphrase)}
            placeholder="Confirm your passphrase"
            error={confirmPassphrase && !passwordsMatch ? 'Passphrases do not match' : null}
          />

          <RequirementsList requirements={requirements} />

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                border: '1px solid var(--monarch-border)',
                color: 'var(--monarch-text-dark)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor:
                  !isValid || loading ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
                color: 'white',
              }}
            >
              {loading && (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              )}
              {!loading && mode === 'change' && 'Update Passphrase'}
              {!loading && mode === 'create' && 'Enable Remote Access'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
