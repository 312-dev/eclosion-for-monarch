/**
 * Backup Restore Modal
 *
 * Modal dialog for restoring from an encrypted backup.
 * Handles credential prompting when decryption fails with stored credentials.
 */

import { useState } from 'react';
import type { AutoBackupFileInfo } from '../../types/electron';

interface BackupRestoreModalProps {
  backup: AutoBackupFileInfo;
  onClose: () => void;
  onRestore: (passphrase?: string) => Promise<void>;
}

export function BackupRestoreModal({ backup, onClose, onRestore }: BackupRestoreModalProps) {
  const [needsCredentials, setNeedsCredentials] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);

    try {
      const passphrase = needsCredentials ? email + password : undefined;
      await onRestore(passphrase);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Invalid credentials') || message.includes('decryption failed')) {
        setNeedsCredentials(true);
        setError(
          'Decryption failed. Please enter the credentials you were using when this backup was created.'
        );
      } else {
        setError(message);
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const backupDate = new Date(backup.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="rounded-xl p-6 max-w-md w-full mx-4"
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
      >
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          {needsCredentials ? 'Enter Backup Credentials' : 'Restore Backup'}
        </h3>

        {needsCredentials ? (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
              This backup was encrypted with different credentials. Enter the Monarch credentials
              you were using on {backupDate}.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--monarch-bg-page)',
                    border: '1px solid var(--monarch-border)',
                    color: 'var(--monarch-text-dark)',
                  }}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--monarch-bg-page)',
                    border: '1px solid var(--monarch-border)',
                    color: 'var(--monarch-text-dark)',
                  }}
                  placeholder="Password at time of backup"
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
            Restore settings from the backup created on {backupDate}? This will replace your current
            configuration.
          </p>
        )}

        {error && <p className="text-sm mb-4 text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              color: 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring || (needsCredentials && (!email || !password))}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--monarch-primary)',
              color: 'white',
              opacity: isRestoring || (needsCredentials && (!email || !password)) ? 0.5 : 1,
            }}
          >
            {(() => {
              if (isRestoring) return 'Restoring...';
              if (needsCredentials) return 'Decrypt & Restore';
              return 'Restore';
            })()}
          </button>
        </div>
      </div>
    </div>
  );
}
