/**
 * FilePickerSection - File selection UI for import modal
 */

import type { RefObject } from 'react';
import { Upload, FileJson } from 'lucide-react';

interface FilePickerSectionProps {
  readonly file: File | null;
  readonly importing: boolean;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FilePickerSection({ file, importing, fileInputRef, onFileSelect }: FilePickerSectionProps) {
  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={onFileSelect}
        className="hidden"
        aria-label="Select backup file"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="w-full p-6 rounded-lg border-2 border-dashed transition-colors flex flex-col items-center gap-2"
        style={{
          borderColor: file ? 'var(--monarch-success)' : 'var(--monarch-border)',
          backgroundColor: file ? 'var(--monarch-success-bg)' : 'var(--monarch-bg-page)',
        }}
      >
        {file ? (
          <>
            <FileJson size={32} style={{ color: 'var(--monarch-success)' }} />
            <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              {file.name}
            </span>
            <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Click to choose a different file
            </span>
          </>
        ) : (
          <>
            <Upload size={32} style={{ color: 'var(--monarch-text-muted)' }} />
            <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Choose backup file
            </span>
            <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Select an eclosion-backup-*.json file
            </span>
          </>
        )}
      </button>
    </div>
  );
}
