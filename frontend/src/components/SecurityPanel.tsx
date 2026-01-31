/**
 * Security Panel
 *
 * Shows recent login activity in a simple, Google-style format.
 */

import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Download, MapPin } from 'lucide-react';
import {
  useSecurityEventsQuery,
  useSecurityAlertsQuery,
  useExportSecurityEventsMutation,
} from '../api/queries';
import { useToast } from '../context/ToastContext';
import type { SecurityEvent } from '../types';

interface SecurityPanelProps {
  className?: string;
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getEventLabel(event: SecurityEvent): string {
  const isRemote = event.event_type === 'REMOTE_UNLOCK';
  if (event.success) {
    return isRemote ? 'Remote sign-in' : 'Signed in';
  }
  return isRemote ? 'Failed remote sign-in' : 'Failed sign-in attempt';
}

function LoginEvent({ event }: { event: SecurityEvent }) {
  const location = [event.city, event.country].filter(Boolean).join(', ') || 'Unknown location';

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: event.success
              ? 'var(--monarch-success, #22a06b)'
              : 'var(--monarch-error, #ef4444)',
          }}
        />
        <div>
          <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
            {getEventLabel(event)}
          </div>
          <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            {location}
          </div>
        </div>
      </div>
      <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
        {formatRelativeTime(event.timestamp)}
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

export function SecurityPanel({ className = '' }: SecurityPanelProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const toast = useToast();

  // Fetch login attempts (both regular and remote)
  const { data, isLoading } = useSecurityEventsQuery({
    limit: visibleCount,
    offset: 0,
    eventTypes: ['LOGIN_ATTEMPT', 'REMOTE_UNLOCK'],
  });

  // Fetch alerts (failed logins since last successful login)
  const { data: alerts } = useSecurityAlertsQuery();

  const exportMutation = useExportSecurityEventsMutation();

  const events = data?.events ?? [];
  const totalLogins = data?.total ?? 0;

  // Get unique locations from failed attempts (same as banner)
  const failedLocations = alerts?.events
    ? Array.from(
        new Set(
          alerts.events.map((e) => [e.city, e.country].filter(Boolean).join(', ')).filter(Boolean)
        )
      )
    : [];

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_log_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Security log exported');
    } catch {
      toast.error('Failed to export');
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded"
              style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <Shield size={24} className="mx-auto mb-2" style={{ color: 'var(--monarch-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          No login activity recorded
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Failed attempts warning - same as SecurityAlertBanner */}
      {alerts?.has_alerts && alerts.count > 0 && (
        <div
          className="px-3 py-2 rounded-lg mb-3"
          style={{
            backgroundColor: 'var(--monarch-error-bg, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--monarch-error, #ef4444)',
          }}
        >
          <div className="font-medium text-sm" style={{ color: 'var(--monarch-error, #ef4444)' }}>
            {alerts.count} failed login attempt{alerts.count > 1 ? 's' : ''} since your last sign-in
          </div>
          {failedLocations.length > 0 && (
            <div
              className="flex items-center gap-1 mt-1 text-xs"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <MapPin size={12} aria-hidden="true" />
              <span>From: {failedLocations.join(' • ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Login list */}
      <div className="space-y-0.5">
        {events.map((event) => (
          <LoginEvent key={event.id} event={event} />
        ))}
      </div>

      {/* Show more / Export */}
      <div
        className="flex items-center justify-between mt-3 pt-3 border-t"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        {totalLogins > ITEMS_PER_PAGE && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const button = e.currentTarget;
              if (visibleCount >= totalLogins) {
                setVisibleCount(ITEMS_PER_PAGE);
              } else {
                setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, totalLogins));
                // Keep button visible after content expands
                requestAnimationFrame(() => {
                  button.scrollIntoView({ block: 'nearest', behavior: 'instant' });
                });
              }
            }}
            className="flex items-center gap-1 text-xs hover:opacity-80"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {visibleCount >= totalLogins ? (
              <>
                <ChevronUp size={14} />
                Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Show more ({totalLogins - visibleCount} remaining)
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="flex items-center gap-1 text-xs hover:opacity-80 ml-auto"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label="Export full security log"
        >
          <Download size={12} />
          Export
        </button>
      </div>
    </div>
  );
}
