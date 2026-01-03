/**
 * Import Settings Modal
 *
 * Allows users to import settings from a backup file.
 * Supports selective import of individual tools.
 */

import { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, Check, FileJson } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../context/DemoContext';
import { useToast } from '../context/ToastContext';
import * as api from '../api/client';
import * as demoApi from '../api/demoClient';
import type { EclosionExport, ImportPreview } from '../types';

interface ImportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

  const isDemo = useDemo();
  const toast = useToast();
  const queryClient = useQueryClient();
  const client = isDemo ? demoApi : api;

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

      // Validate basic structure
      if (!data.eclosion_export?.version) {
        setParseError('Invalid backup file: missing version information');
        return;
      }

      setExportData(data);

      // Get preview from API
      const previewResult = await client.previewImport(data);
      if (!previewResult.success || !previewResult.valid) {
        setParseError(previewResult.errors?.join(', ') || 'Invalid backup file');
        return;
      }

      setPreview(previewResult.preview!);

      // Select all tools by default
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
        tools: Array.from(selectedTools),
      });

      if (!result.success) {
        setImportError(result.error || 'Import failed');
        return;
      }

      // Show warnings if any
      if (result.warnings.length > 0) {
        toast.warning(`Import completed with warnings: ${result.warnings.join(', ')}`);
      } else {
        toast.success('Settings imported successfully');
      }

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();

      // Close modal
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
        style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
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
          {/* File picker */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
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

          {/* Parse error */}
          {parseError && (
            <div
              className="p-3 rounded-lg flex items-start gap-2"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span className="text-sm">{parseError}</span>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              {/* Export info */}
              <div
                className="p-3 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                <div className="flex justify-between mb-1">
                  <span style={{ color: 'var(--monarch-text-muted)' }}>Exported</span>
                  <span style={{ color: 'var(--monarch-text-dark)' }}>
                    {new Date(preview.exported_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--monarch-text-muted)' }}>Source</span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: preview.source_mode === 'demo'
                        ? 'var(--monarch-orange-light)'
                        : 'var(--monarch-success-bg)',
                      color: preview.source_mode === 'demo'
                        ? 'var(--monarch-orange)'
                        : 'var(--monarch-success)',
                    }}
                  >
                    {preview.source_mode === 'demo' ? 'Demo' : 'Production'}
                  </span>
                </div>
              </div>

              {/* Tool selection */}
              <div>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  Select tools to import:
                </div>
                <div className="space-y-2">
                  {Object.entries(preview.tools).map(([tool, info]) => (
                    <label
                      key={tool}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                      style={{
                        backgroundColor: selectedTools.has(tool)
                          ? 'var(--monarch-orange-light)'
                          : 'var(--monarch-bg-page)',
                        border: `1px solid ${selectedTools.has(tool) ? 'var(--monarch-orange)' : 'var(--monarch-border)'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTools.has(tool)}
                        onChange={() => handleToolToggle(tool)}
                        disabled={importing}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium capitalize" style={{ color: 'var(--monarch-text-dark)' }}>
                          {tool} Tool
                        </div>
                        <div className="text-xs mt-1 space-y-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                          {info.has_config && (
                            <div className="flex items-center gap-1">
                              <Check size={12} /> Configuration settings
                            </div>
                          )}
                          {info.enabled_items_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Check size={12} /> {info.enabled_items_count} tracked items
                            </div>
                          )}
                          {info.categories_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Check size={12} /> {info.categories_count} category mappings
                            </div>
                          )}
                          {info.has_rollup && (
                            <div className="flex items-center gap-1">
                              <Check size={12} /> Rollup with {info.rollup_items_count} items
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div
                className="p-3 rounded-lg flex items-start gap-2 text-sm"
                style={{ backgroundColor: 'var(--monarch-warning-bg)', color: 'var(--monarch-warning)' }}
              >
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>
                  Importing will overwrite your current settings for the selected tools.
                </span>
              </div>
            </div>
          )}

          {/* Import error */}
          {importError && (
            <div
              className="p-3 rounded-lg flex items-start gap-2"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span className="text-sm">{importError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3" style={{ borderColor: 'var(--monarch-border)' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="flex-1 px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--monarch-bg-elevated)',
              color: 'var(--monarch-text-dark)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!preview || selectedTools.size === 0 || importing}
            className="flex-1 px-4 py-2 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
            style={{
              backgroundColor: importing ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
              opacity: (!preview || selectedTools.size === 0) && !importing ? 0.5 : 1,
            }}
          >
            {importing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Importing...
              </>
            ) : (
              'Import'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
