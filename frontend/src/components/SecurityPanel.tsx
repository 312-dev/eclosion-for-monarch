/**
 * Security Panel
 *
 * Displays security events, login history, and summary statistics.
 * Used in the Settings tab.
 */

import { useState } from 'react';
import { CheckCircle, AlertCircle, Globe, Clock, Download, Trash2 } from 'lucide-react';
import {
  useSecuritySummaryQuery,
  useSecurityEventsQuery,
  useClearSecurityEventsMutation,
  useExportSecurityEventsMutation,
} from '../api/queries';
import { SecurityEventList } from './SecurityEventList';
import { useToast } from '../context/ToastContext';

interface SecurityPanelProps {
  className?: string;
}

type EventFilter = 'all' | 'LOGIN_ATTEMPT' | 'UNLOCK_ATTEMPT' | 'LOGOUT' | 'SESSION_TIMEOUT';

export function SecurityPanel({ className = '' }: SecurityPanelProps) {
  const [filter, setFilter] = useState<EventFilter>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const toast = useToast();

  const { data: summary, isLoading: summaryLoading } = useSecuritySummaryQuery();
  const { data: events, isLoading: eventsLoading } = useSecurityEventsQuery({
    limit: 20,
    eventType: filter === 'all' ? undefined : filter,
  });
  const clearMutation = useClearSecurityEventsMutation();
  const exportMutation = useExportSecurityEventsMutation();

  const handleClear = async () => {
    try {
      await clearMutation.mutateAsync();
      toast.success('Security logs cleared');
      setShowClearConfirm(false);
    } catch {
      toast.error('Failed to clear logs');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_events_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Security logs exported');
    } catch {
      toast.error('Failed to export logs');
    }
  };

  const summaryCards = [
    {
      label: 'Total Logins',
      value: summary?.successful_logins ?? 0,
      icon: CheckCircle,
      color: 'var(--monarch-success, #22c55e)',
    },
    {
      label: 'Failed Attempts',
      value: (summary?.failed_logins ?? 0) + (summary?.failed_unlock_attempts ?? 0),
      icon: AlertCircle,
      color: 'var(--monarch-error, #ef4444)',
    },
    {
      label: 'Unique IPs',
      value: summary?.unique_ips ?? 0,
      icon: Globe,
      color: 'var(--monarch-orange, #ff692d)',
    },
    {
      label: 'Session Timeouts',
      value: summary?.session_timeouts ?? 0,
      icon: Clock,
      color: 'var(--monarch-text-muted)',
    },
  ];

  return (
    <div className={className}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <card.icon size={16} style={{ color: card.color }} aria-hidden="true" />
              <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                {card.label}
              </span>
            </div>
            <div
              className="text-xl font-semibold"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              {summaryLoading ? '...' : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EventFilter)}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text-dark)',
          }}
          aria-label="Filter events"
        >
          <option value="all">All Events</option>
          <option value="LOGIN_ATTEMPT">Logins</option>
          <option value="UNLOCK_ATTEMPT">Unlocks</option>
          <option value="LOGOUT">Logouts</option>
          <option value="SESSION_TIMEOUT">Timeouts</option>
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
            style={{
              color: 'var(--monarch-text-dark)',
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
            }}
            aria-label="Export security logs as CSV"
          >
            <Download size={14} aria-hidden="true" />
            Export
          </button>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:opacity-80 transition-opacity"
            style={{
              color: 'var(--monarch-error, #ef4444)',
              backgroundColor: 'transparent',
              border: '1px solid var(--monarch-error, #ef4444)',
            }}
            aria-label="Clear security logs"
          >
            <Trash2 size={14} aria-hidden="true" />
            Clear
          </button>
        </div>
      </div>

      {/* Events List */}
      <SecurityEventList events={events?.events ?? []} loading={eventsLoading} />

      {/* Retention Notice */}
      <p
        className="text-xs mt-3 text-center"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        Logs auto-delete after 90 days
      </p>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowClearConfirm(false)}
            aria-hidden="true"
          />
          <div
            className="relative p-4 rounded-xl max-w-sm mx-4"
            style={{ backgroundColor: 'var(--monarch-bg-card)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-dialog-title"
          >
            <h3
              id="clear-dialog-title"
              className="font-semibold mb-2"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              Clear Security Logs?
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
              This will permanently delete all security event history.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={clearMutation.isPending}
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white"
                style={{ backgroundColor: 'var(--monarch-error, #ef4444)' }}
              >
                {clearMutation.isPending ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
