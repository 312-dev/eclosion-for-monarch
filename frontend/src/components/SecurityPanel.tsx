/**
 * Security Panel
 *
 * Displays security events, login history, and summary statistics.
 * Used in the Settings tab.
 */

import { useState } from 'react';
import { CheckCircle, AlertCircle, Globe, Download } from 'lucide-react';
import {
  useSecuritySummaryQuery,
  useSecurityEventsQuery,
  useExportSecurityEventsMutation,
} from '../api/queries';
import { SecurityEventList } from './SecurityEventList';
import { useToast } from '../context/ToastContext';

interface SecurityPanelProps {
  className?: string;
}

type EventFilter = 'all' | 'LOGIN_ATTEMPT' | 'UNLOCK_ATTEMPT';

const PAGE_SIZE = 3;

export function SecurityPanel({ className = '' }: SecurityPanelProps) {
  const [filter, setFilter] = useState<EventFilter>('all');
  const [page, setPage] = useState(0);
  const toast = useToast();

  const { data: summary, isLoading: summaryLoading } = useSecuritySummaryQuery();
  const { data: events, isLoading: eventsLoading } = useSecurityEventsQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    eventType: filter === 'all' ? undefined : filter,
  });
  const exportMutation = useExportSecurityEventsMutation();

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
  ];

  // Calculate total pages from summary data
  const totalEvents = summary?.total_events ?? 0;
  const totalPages = Math.ceil(totalEvents / PAGE_SIZE);

  return (
    <div className={className}>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
            <div className="text-xl font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
              {summaryLoading ? '...' : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as EventFilter);
            setPage(0); // Reset to first page when filter changes
          }}
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
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm hover:opacity-80 transition-opacity ${
              exportMutation.isPending ? 'cursor-wait' : 'cursor-pointer'
            }`}
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
        </div>
      </div>

      {/* Events List */}
      <SecurityEventList events={events?.events ?? []} loading={eventsLoading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              color: 'var(--monarch-text-dark)',
            }}
            aria-label="Previous page"
          >
            ←
          </button>
          <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              color: 'var(--monarch-text-dark)',
            }}
            aria-label="Next page"
          >
            →
          </button>
        </div>
      )}

      {/* Retention Notice */}
      <p className="text-xs mt-3 text-center" style={{ color: 'var(--monarch-text-muted)' }}>
        Logs auto-delete after 90 days
      </p>
    </div>
  );
}
