/**
 * Data Management Section
 *
 * Export and import settings functionality.
 */

import { Database, Download, Upload, ChevronRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useApiClient } from '../../hooks';

interface DataManagementSectionProps {
  onShowImportModal: () => void;
}

export function DataManagementSection({ onShowImportModal }: DataManagementSectionProps) {
  const toast = useToast();
  const client = useApiClient();

  const handleExport = async () => {
    try {
      const exportData = await client.exportSettings();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eclosion-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch {
      toast.error('Failed to export settings');
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
        <Database size={12} />
        Data Management
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Export Settings */}
        <button
          type="button"
          onClick={handleExport}
          className="w-full p-4 flex items-center gap-4 text-left hover-bg-transparent-to-hover"
          style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
        >
          <div
            className="p-2.5 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <Download size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Export Settings
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Download your configuration as a backup file
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
        </button>

        {/* Import Settings */}
        <button
          type="button"
          onClick={onShowImportModal}
          className="w-full p-4 flex items-center gap-4 text-left hover-bg-transparent-to-hover"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div
            className="p-2.5 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <Upload size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Import Settings
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Restore configuration from a backup file
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
        </button>
      </div>
    </section>
  );
}
