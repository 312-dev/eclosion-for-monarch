/**
 * Passphrase Header
 *
 * Header component for the passphrase prompt.
 */

import { LockIcon } from '../icons';

interface PassphraseHeaderProps {
  mode: 'create' | 'unlock';
}

export function PassphraseHeader({ mode }: PassphraseHeaderProps) {
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
