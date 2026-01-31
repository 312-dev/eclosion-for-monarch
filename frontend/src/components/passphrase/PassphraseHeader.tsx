/**
 * Passphrase Header
 *
 * Header component for the passphrase prompt.
 * Supports different styles for create, unlock, and remote access modes.
 */

import { LockIcon } from '../icons';

interface PassphraseHeaderProps {
  mode: 'create' | 'unlock';
  remoteMode?: boolean;
}

export function PassphraseHeader({ mode, remoteMode = false }: Readonly<PassphraseHeaderProps>) {
  // Remote mode: centered branding with "Eclosion / Remote Access"
  if (remoteMode) {
    return (
      <div className="text-center mb-4">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: 'var(--monarch-orange)' }}
        >
          <LockIcon size={32} color="white" />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Eclosion
        </h1>
        <p style={{ color: 'var(--monarch-text-muted)' }}>Remote Access</p>
      </div>
    );
  }

  // Local mode: side-by-side icon and title
  return (
    <div className="flex items-center gap-3 mb-2">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--monarch-orange-bg)' }}
      >
        <LockIcon size={20} color="var(--monarch-orange)" />
      </div>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--monarch-text-dark)' }}>
        {mode === 'create' ? 'Create Encryption Passphrase' : 'Log back in'}
      </h1>
    </div>
  );
}
