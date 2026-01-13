/**
 * Backups List
 *
 * Displays available backups with restore functionality.
 */

import { History } from 'lucide-react';
import { formatBytes, formatBackupDate } from './backupUtils';
import type { AutoBackupFileInfo } from '../../types/electron';

interface BackupsListProps {
  backups: AutoBackupFileInfo[];
  onRestore: (backup: AutoBackupFileInfo) => void;
}

export function BackupsList({ backups, onRestore }: BackupsListProps) {
  if (backups.length === 0) return null;

  return (
    <div className="px-4 py-3 ml-14">
      <div className="flex items-center gap-2 mb-2">
        <History size={14} style={{ color: 'var(--monarch-text-muted)' }} />
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          Available Backups ({backups.length})
        </span>
      </div>
      <div
        className="rounded-lg overflow-hidden"
        style={{
          border: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))',
        }}
      >
        {backups.slice(0, 5).map((backup, index) => (
          <div
            key={backup.filename}
            className="flex items-center justify-between px-3 py-2"
            style={{
              backgroundColor: index % 2 === 0 ? 'var(--monarch-bg-page)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-sm"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {formatBackupDate(backup.createdAt)}
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                {formatBytes(backup.sizeBytes)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRestore(backup)}
              className="px-2 py-1 rounded text-xs font-medium hover-bg-page-to-hover"
              style={{
                color: 'var(--monarch-primary)',
                border: '1px solid var(--monarch-border)',
              }}
              aria-label={`Restore backup from ${backup.date}`}
            >
              Restore
            </button>
          </div>
        ))}
      </div>
      {backups.length > 5 && (
        <p
          className="text-xs mt-2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Showing 5 most recent backups
        </p>
      )}
    </div>
  );
}
