/**
 * Import Settings Modal
 *
 * Allows users to import settings from a backup file.
 * Supports selective import of individual tools.
 */

import { useState, useRef } from 'react';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import { useApiClient } from '../../hooks';
import type { EclosionExport, ImportPreview } from '../../types';
import { FilePickerSection } from './FilePickerSection';
import { ImportPreviewSection } from './ImportPreviewSection';
import { Portal } from '../Portal';
import { CancelButton, WarningButton } from '../ui/ModalButtons';

interface ImportSettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function ImportSettingsModal({ isOpen, onClose }: ImportSettingsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<EclosionExport | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toast = useToast();
  const queryClient = useQueryClient();
  const client = useApiClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setExportData(null);
    setPreview(null);
    setImportError(null);

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text) as EclosionExport;

      if (!data.eclosion_export?.version) {
        setParseError('Invalid backup file: missing version information');
        return;
      }

      setExportData(data);

      const previewResult = await client.previewImport(data);
      if (!previewResult.success || !previewResult.valid) {
        setParseError(previewResult.errors?.join(', ') || 'Invalid backup file');
        return;
      }

      setPreview(previewResult.preview!);

      const tools = Object.keys(previewResult.preview!.tools);
      setSelectedTools(new Set(tools));
    } catch {
      setParseError('Failed to parse file. Please ensure it is a valid JSON backup.');
    }
  };

  const handleToolToggle = (tool: string) => {
    const newSelected = new Set(selectedTools);
    if (newSelected.has(tool)) {
      newSelected.delete(tool);
    } else {
      newSelected.add(tool);
    }
    setSelectedTools(newSelected);
  };

  const handleImport = async () => {
    if (!exportData || selectedTools.size === 0) return;

    setImporting(true);
    setImportError(null);

    try {
      const result = await client.importSettings(exportData, {
        tools: Array.from(selectedTools) as ('recurring' | 'notes' | 'stash')[],
      });

      if (!result.success) {
        setImportError(result.error || 'Import failed');
        return;
      }

      if (result.warnings.length > 0) {
        toast.warning(`Import completed with warnings: ${result.warnings.join(', ')}`);
      } else {
        toast.success('Settings imported successfully');
      }

      queryClient.invalidateQueries();
      handleClose();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importing) return;
    setFile(null);
    setParseError(null);
    setExportData(null);
    setPreview(null);
    setSelectedTools(new Set());
    setImportError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 modal-backdrop"
          onClick={handleClose}
          onKeyDown={(e) => e.key === 'Escape' && handleClose()}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        />
        <div
          className="relative w-full max-w-md mx-4 rounded-xl shadow-xl modal-content"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {/* Header */}
          <div
            className="p-4 border-b rounded-t-xl"
            style={{ borderColor: 'var(--monarch-border)', backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={20} style={{ color: 'var(--monarch-orange)' }} />
                <h2 className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                  Import Settings
                </h2>
              </div>
              {!importing && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: 'var(--monarch-text-muted)' }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <FilePickerSection
              file={file}
              importing={importing}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
            />

            {parseError && (
              <div
                className="p-3 rounded-lg flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--monarch-error-bg)',
                  color: 'var(--monarch-error)',
                }}
              >
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span className="text-sm">{parseError}</span>
              </div>
            )}

            {preview && (
              <ImportPreviewSection
                preview={preview}
                selectedTools={selectedTools}
                importing={importing}
                onToolToggle={handleToolToggle}
              />
            )}

            {importError && (
              <div
                className="p-3 rounded-lg flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--monarch-error-bg)',
                  color: 'var(--monarch-error)',
                }}
              >
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span className="text-sm">{importError}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-4 border-t rounded-b-xl flex gap-3"
            style={{ borderColor: 'var(--monarch-border)', backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <CancelButton onClick={handleClose} disabled={importing} fullWidth>
              Cancel
            </CancelButton>
            <WarningButton
              onClick={handleImport}
              disabled={!preview || selectedTools.size === 0}
              isLoading={importing}
              loadingText="Importing..."
              fullWidth
            >
              Import
            </WarningButton>
          </div>
        </div>
      </div>
    </Portal>
  );
}
