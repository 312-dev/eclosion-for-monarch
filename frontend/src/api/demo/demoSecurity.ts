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

// Demo security events data
const DEMO_SECURITY_EVENTS = [
  {
    id: 1,
    event_type: 'LOGIN_ATTEMPT',
    success: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    ip_address: '73.45.123.89',
    country: 'United States',
    city: 'San Francisco',
    details: 'User: dem***@example.com',
  },
  {
    id: 2,
    event_type: 'LOGIN_ATTEMPT',
    success: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    ip_address: '185.220.101.45',
    country: 'Germany',
    city: 'Frankfurt',
    details: 'Invalid credentials',
  },
  {
    id: 3,
    event_type: 'UNLOCK_ATTEMPT',
    success: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    ip_address: '73.45.123.89',
    country: 'United States',
    city: 'San Francisco',
    details: null,
  },
  {
    id: 4,
    event_type: 'LOGIN_ATTEMPT',
    success: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    ip_address: '91.243.82.116',
    country: 'Russia',
    city: 'Moscow',
    details: 'Invalid credentials',
  },
];

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
  return {
    total_events: DEMO_SECURITY_EVENTS.length,
    successful_logins: 23,
    failed_logins: 3,
    failed_unlock_attempts: 1,
    unique_ips: 4,
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
