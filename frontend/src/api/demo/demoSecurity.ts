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

  if (options?.eventType) {
    events = events.filter((e) => e.event_type === options.eventType);
  }
  if (options?.success !== undefined) {
    events = events.filter((e) => e.success === options.success);
  }

  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;

  return {
    events: events.slice(offset, offset + limit),
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
 * Get security alerts.
 */
export async function getSecurityAlerts(): Promise<SecurityAlertsResponse> {
  await simulateDelay(50);
  return {
    has_alerts: false,
    count: 0,
    events: [],
  };
}

/**
 * Dismiss security alerts.
 */
export async function dismissSecurityAlerts(): Promise<{ success: boolean }> {
  await simulateDelay(50);
  return { success: true };
}
