/**
 * Log Viewer Section
 *
 * In-app log viewer for desktop app troubleshooting.
 * Shows last N lines from log files with search functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Search, RefreshCw, ChevronDown } from 'lucide-react';
import { SectionHeader } from './settingsSections';
import type { LogFileInfo, LogFileContent } from '../../types/electron';

const MAX_LINES = 500;
const AUTO_REFRESH_INTERVAL = 5000;

export function LogViewerSection() {
  const [logFiles, setLogFiles] = useState<LogFileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<LogFileInfo | null>(null);
  const [logContent, setLogContent] = useState<LogFileContent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLPreElement>(null);

  const fetchLogFiles = useCallback(async () => {
    if (!globalThis.electron) return;
    try {
      const files = await globalThis.electron.getLogFiles();
      setLogFiles(files);
      // Auto-select first file if none selected
      if (!selectedFile && files.length > 0) {
        setSelectedFile(files[0] ?? null);
      }
    } catch {
      // Ignore errors
    }
  }, [selectedFile]);

  const fetchLogContent = useCallback(async () => {
    if (!globalThis.electron || !selectedFile) return;
    setLoading(true);
    try {
      const content = await globalThis.electron.readLogFile(selectedFile.path, {
        lines: MAX_LINES,
        ...(searchTerm ? { search: searchTerm } : {}),
      });
      setLogContent(content);
      // Auto-scroll to bottom
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    } catch {
      setLogContent({ error: 'Failed to load log file' });
    } finally {
      setLoading(false);
    }
  }, [selectedFile, searchTerm]);

  useEffect(() => {
    if (globalThis.electron && expanded) {
      fetchLogFiles();
    }
  }, [fetchLogFiles, expanded]);

  useEffect(() => {
    if (expanded && selectedFile) {
      fetchLogContent();
    }
  }, [selectedFile, expanded, fetchLogContent]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !expanded) return;
    const interval = setInterval(fetchLogContent, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, expanded, fetchLogContent]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Don't render if not in desktop mode
  if (!globalThis.electron) return null;

  return (
    <section className="mb-8">
      <SectionHeader sectionId="logs" />
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header - always visible */}
        <button
          type="button"
          className="w-full p-4 flex items-center justify-between hover:bg-(--monarch-bg-page) transition-colors"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse log viewer' : 'Expand log viewer'}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
              <FileText size={20} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
            <div className="text-left">
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Log Viewer
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                View application logs for troubleshooting
              </div>
            </div>
          </div>
          <ChevronDown
            size={20}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--monarch-text-muted)' }}
          />
        </button>

        {/* Expandable content */}
        {expanded && (
          <>
            <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

            {/* Controls */}
            <div className="p-4 flex flex-wrap items-center gap-3">
              {/* File selector */}
              <select
                value={selectedFile?.path || ''}
                onChange={(e) => {
                  const file = logFiles.find((f) => f.path === e.target.value);
                  setSelectedFile(file || null);
                }}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--monarch-bg-page)',
                  border: '1px solid var(--monarch-border)',
                  color: 'var(--monarch-text-dark)',
                }}
                aria-label="Select log file"
              >
                {logFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name} ({formatFileSize(file.size)})
                  </option>
                ))}
              </select>

              {/* Add spacing between elements to fix ambiguous spacing */}
              <span style={{ marginLeft: 8 }} />

              {/* Search */}

              <div className="relative flex-1 min-w-50">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--monarch-text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--monarch-bg-page)',
                    border: '1px solid var(--monarch-border)',
                    color: 'var(--monarch-text-dark)',
                  }}
                  aria-label="Search log content"
                />
              </div>

              {/* Refresh button */}
              <button
                type="button"
                onClick={fetchLogContent}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-(--monarch-bg-page) transition-colors"
                style={{ border: '1px solid var(--monarch-border)' }}
                aria-label="Refresh logs"
              >
                <RefreshCw
                  size={16}
                  className={loading ? 'animate-spin' : ''}
                  style={{ color: 'var(--monarch-text-muted)' }}
                />
              </button>

              <span style={{ marginLeft: 8 }} />

              {/* Auto-refresh toggle */}
              <label
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                  aria-label="Auto-refresh logs"
                />{' '}
                Auto-refresh
              </label>
            </div>

            {/* Log content */}
            <div style={{ borderTop: '1px solid var(--monarch-border)' }} />
            <div className="p-4">
              {logContent?.error ? (
                <div
                  className="text-sm p-4 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--monarch-red)',
                  }}
                >
                  {logContent.error}
                </div>
              ) : (
                <>
                  {logContent?.truncated && (
                    <div
                      className="text-xs mb-2 px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--monarch-bg-page)',
                        color: 'var(--monarch-text-muted)',
                      }}
                    >
                      Showing last {logContent.displayedLines} of {logContent.totalLines} lines
                      {searchTerm && ` (filtered by "${searchTerm}")`}
                    </div>
                  )}
                  <pre
                    ref={contentRef}
                    className="text-xs overflow-auto rounded-lg p-3"
                    style={{
                      backgroundColor: 'var(--monarch-bg-page)',
                      color: 'var(--monarch-text-dark)',
                      maxHeight: '400px',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {logContent?.content || 'No log content available'}
                  </pre>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
