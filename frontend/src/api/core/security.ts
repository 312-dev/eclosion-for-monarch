/**
 * Security API Functions
 *
 * Security status, events, and alerts.
 */

import type {
  SecurityStatus,
  SecurityEventsResponse,
  SecurityEventSummary,
  SecurityAlertsResponse,
  SecurityEventsQueryOptions,
} from '../../types';
import { fetchApi, fetchBlob } from './fetchApi';

export async function getSecurityStatus(): Promise<SecurityStatus> {
  return fetchApi<SecurityStatus>('/security/status');
}

export async function getSecurityEvents(
  options?: SecurityEventsQueryOptions
): Promise<SecurityEventsResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  // Support both single eventType and array of eventTypes
  if (options?.eventTypes?.length) {
    params.set('event_types', options.eventTypes.join(','));
  } else if (options?.eventType) {
    params.set('event_type', options.eventType);
  }
  if (options?.success !== undefined) params.set('success', String(options.success));

  const query = params.toString();
  const endpoint = query ? `/security/events?${query}` : '/security/events';
  return fetchApi<SecurityEventsResponse>(endpoint);
}

export async function getSecuritySummary(): Promise<SecurityEventSummary> {
  return fetchApi<SecurityEventSummary>('/security/events/summary');
}

export async function exportSecurityEvents(): Promise<Blob> {
  return fetchBlob('/security/events/export');
}

export async function getSecurityAlerts(): Promise<SecurityAlertsResponse> {
  return fetchApi<SecurityAlertsResponse>('/security/alerts');
}

export async function dismissSecurityAlerts(): Promise<{ success: boolean }> {
  return fetchApi('/security/alerts/dismiss', { method: 'POST' });
}
