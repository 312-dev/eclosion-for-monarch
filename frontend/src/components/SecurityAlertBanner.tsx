/**
 * Security Alert Banner
 *
 * Displays a dismissable warning banner when there have been failed login
 * attempts since the user's last successful login. Shown at the top of
 * all pages via AppShell.
 */

import { useState } from 'react';
import { AlertTriangle, X, MapPin } from 'lucide-react';
import { useSecurityAlertsQuery, useDismissSecurityAlertsMutation } from '../api/queries';

export function SecurityAlertBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: alerts, isLoading } = useSecurityAlertsQuery({ enabled: !dismissed });
  const dismissMutation = useDismissSecurityAlertsMutation();

  // Don't show if loading, no alerts, already dismissed, or mutation in progress
  if (isLoading || !alerts?.has_alerts || dismissed || dismissMutation.isPending) {
    return null;
  }

  // Get unique locations from failed attempts
  const locations = Array.from(
    new Set(
      alerts.events
        .map((e) => [e.city, e.country].filter(Boolean).join(', '))
        .filter(Boolean)
    )
  );

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await dismissMutation.mutateAsync();
    } catch {
      // If dismiss fails, still keep it hidden for this session
    }
  };

  return (
    <div
      className="mx-4 mt-4 px-4 py-3 flex items-start gap-3 rounded-lg"
      style={{
        backgroundColor: 'var(--monarch-error-bg, rgba(239, 68, 68, 0.1))',
        border: '1px solid var(--monarch-error, #ef4444)',
      }}
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle
        size={20}
        className="shrink-0 mt-0.5"
        style={{ color: 'var(--monarch-error, #ef4444)' }}
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <div
          className="font-medium text-sm"
          style={{ color: 'var(--monarch-error, #ef4444)' }}
        >
          {alerts.count} failed login attempt{alerts.count > 1 ? 's' : ''} since your last
          sign-in
        </div>

        {locations.length > 0 && (
          <div
            className="flex items-center gap-1 mt-1 text-xs"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            <MapPin size={12} aria-hidden="true" />
            <span>From: {locations.join(' • ')}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        style={{ color: 'var(--monarch-error, #ef4444)' }}
        aria-label="Dismiss security alert"
      >
        <X size={18} />
      </button>
    </div>
  );
}
