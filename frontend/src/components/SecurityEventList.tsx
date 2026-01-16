/**
 * Security Event List
 *
 * Displays a list of security events with icons and formatting.
 */

import { memo } from 'react';
import { LogIn, LogOut, Lock, Unlock, Clock, AlertTriangle, Shield } from 'lucide-react';
import type { SecurityEvent } from '../types';

interface SecurityEventListProps {
  events: SecurityEvent[];
  loading?: boolean;
}

const EVENT_CONFIG: Record<string, { icon: typeof LogIn; label: string }> = {
  LOGIN_ATTEMPT: { icon: LogIn, label: 'Login' },
  LOGOUT: { icon: LogOut, label: 'Logout' },
  UNLOCK_ATTEMPT: { icon: Unlock, label: 'Unlock' },
  UNLOCK_AND_VALIDATE: { icon: Unlock, label: 'Unlock & Validate' },
  SESSION_TIMEOUT: { icon: Clock, label: 'Session Timeout' },
  SESSION_LOCK: { icon: Lock, label: 'Session Locked' },
  SESSION_RESTORE: { icon: Unlock, label: 'Session Restored' },
  SET_PASSPHRASE: { icon: Shield, label: 'Passphrase Set' },
  UPDATE_CREDENTIALS: { icon: Shield, label: 'Credentials Updated' },
  INSTANCE_ACCESS: { icon: Shield, label: 'Instance Access' },
  SECURITY_LOGS_CLEARED: { icon: Shield, label: 'Logs Cleared' },
};

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const EventItem = memo(function EventItem({ event }: { event: SecurityEvent }) {
  const config = EVENT_CONFIG[event.event_type] ?? {
    icon: AlertTriangle,
    label: event.event_type.replaceAll('_', ' '),
  };
  const Icon = config.icon;
  const location = [event.city, event.country].filter(Boolean).join(', ');

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div
        className="p-2 rounded-lg shrink-0"
        style={{
          backgroundColor: event.success
            ? 'var(--monarch-success-bg, rgba(34, 197, 94, 0.1))'
            : 'var(--monarch-error-bg, rgba(239, 68, 68, 0.1))',
        }}
      >
        <Icon
          size={16}
          style={{
            color: event.success
              ? 'var(--monarch-success, #22c55e)'
              : 'var(--monarch-error, #ef4444)',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
            {config.label}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-xs"
            style={{
              backgroundColor: event.success
                ? 'var(--monarch-success-bg, rgba(34, 197, 94, 0.1))'
                : 'var(--monarch-error-bg, rgba(239, 68, 68, 0.1))',
              color: event.success
                ? 'var(--monarch-success, #22c55e)'
                : 'var(--monarch-error, #ef4444)',
            }}
          >
            {event.success ? 'Success' : 'Failed'}
          </span>
        </div>

        <div className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
          {formatRelativeTime(event.timestamp)}
          {location && ` • ${location}`}
          {event.ip_address && ` • ${event.ip_address}`}
        </div>

        {event.details && (
          <div className="text-xs mt-1 truncate" style={{ color: 'var(--monarch-text-muted)' }}>
            {event.details}
          </div>
        )}
      </div>
    </div>
  );
});

export function SecurityEventList({ events, loading }: SecurityEventListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg animate-pulse"
            style={{ backgroundColor: 'var(--monarch-bg-page)' }}
          />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        className="text-center py-8 rounded-lg"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <Shield
          size={32}
          className="mx-auto"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-hidden="true"
        />
        <p className="mt-2 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          No security events recorded
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
    </div>
  );
}
