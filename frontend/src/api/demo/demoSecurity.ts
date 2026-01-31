/**
 * Demo Security Functions
 *
 * Security status, events, and alerts for demo mode.
 */

import type {
  SecurityStatus,
  SecurityEventsResponse,
  SecurityEventSummary,
  SecurityAlertsResponse,
  SecurityEventsQueryOptions,
} from '../../types';
import { simulateDelay } from './demoState';
import { DEMO_SECURITY_EVENTS } from './demoSecurityData';

/**
 * Get security status information.
 */
export async function getSecurityStatus(): Promise<SecurityStatus> {
  await simulateDelay(50);
  return {
    encryption_enabled: true,
    encryption_algorithm: 'AES-256-GCM',
    key_derivation: 'PBKDF2',
    file_permissions: '600',
    passphrase_requirements: {
      min_length: 8,
      requires_uppercase: true,
      requires_lowercase: true,
      requires_number: true,
      requires_special: false,
    },
  };
}

/**
 * Get security events with optional filtering.
 */
export async function getSecurityEvents(
  options?: SecurityEventsQueryOptions
): Promise<SecurityEventsResponse> {
  await simulateDelay(100);

  let events = [...DEMO_SECURITY_EVENTS];

  // Support both single eventType and array of eventTypes
  if (options?.eventTypes?.length) {
    events = events.filter((e) => options.eventTypes!.includes(e.event_type));
  } else if (options?.eventType) {
    events = events.filter((e) => e.event_type === options.eventType);
  }
  if (options?.success !== undefined) {
    events = events.filter((e) => e.success === options.success);
  }

  const total = events.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;

  return {
    events: events.slice(offset, offset + limit),
    total,
    limit,
    offset,
  };
}

/**
 * Get security events summary.
 */
export async function getSecuritySummary(): Promise<SecurityEventSummary> {
  await simulateDelay(50);
  // Calculate actual counts from demo data
  const successfulLogins = DEMO_SECURITY_EVENTS.filter(
    (e) => e.event_type === 'LOGIN_ATTEMPT' && e.success
  ).length;
  const failedLogins = DEMO_SECURITY_EVENTS.filter(
    (e) => e.event_type === 'LOGIN_ATTEMPT' && !e.success
  ).length;
  const failedUnlocks = DEMO_SECURITY_EVENTS.filter(
    (e) => e.event_type === 'UNLOCK_ATTEMPT' && !e.success
  ).length;
  const uniqueIps = new Set(DEMO_SECURITY_EVENTS.map((e) => e.ip_address)).size;

  return {
    total_events: DEMO_SECURITY_EVENTS.length,
    successful_logins: successfulLogins,
    failed_logins: failedLogins,
    failed_unlock_attempts: failedUnlocks,
    unique_ips: uniqueIps,
    last_successful_login: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    last_failed_login: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  };
}

/**
 * Export security events as CSV.
 */
export async function exportSecurityEvents(): Promise<Blob> {
  await simulateDelay(100);
  const csv = [
    'ID,Event Type,Success,Timestamp,IP Address,Country,City,Details',
    ...DEMO_SECURITY_EVENTS.map(
      (e) =>
        `${e.id},${e.event_type},${e.success ? 'Yes' : 'No'},${e.timestamp},${e.ip_address || ''},${e.country || ''},${e.city || ''},${e.details || ''}`
    ),
  ].join('\n');
  return new Blob([csv], { type: 'text/csv' });
}

/**
 * Get security alerts (failed logins since last successful login).
 * Includes both LOGIN_ATTEMPT and REMOTE_UNLOCK events.
 */
export async function getSecurityAlerts(): Promise<SecurityAlertsResponse> {
  await simulateDelay(50);

  // Authentication event types that count as logins
  const authEventTypes = new Set([
    'LOGIN_ATTEMPT',
    'REMOTE_UNLOCK',
    'UNLOCK_ATTEMPT',
    'UNLOCK_AND_VALIDATE',
  ]);

  // Find all authentication events, sorted by time
  const authEvents = DEMO_SECURITY_EVENTS.filter((e) => authEventTypes.has(e.event_type)).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const lastSuccessfulLogin = authEvents.find((e) => e.success);
  const lastSuccessTime = lastSuccessfulLogin
    ? new Date(lastSuccessfulLogin.timestamp).getTime()
    : 0;

  // Find failed auth attempts that happened after the last successful login
  const failedSinceLastSuccess = authEvents.filter(
    (e) => !e.success && new Date(e.timestamp).getTime() > lastSuccessTime
  );

  return {
    has_alerts: failedSinceLastSuccess.length > 0,
    count: failedSinceLastSuccess.length,
    events: failedSinceLastSuccess.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      timestamp: e.timestamp,
      ip_address: e.ip_address,
      country: e.country,
      city: e.city,
    })),
  };
}

/**
 * Dismiss security alerts.
 */
export async function dismissSecurityAlerts(): Promise<{ success: boolean }> {
  await simulateDelay(50);
  return { success: true };
}
