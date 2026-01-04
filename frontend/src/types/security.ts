/**
 * Security Event Types
 *
 * Types for security events, audit logging, and the security panel.
 */

export interface SecurityEvent {
  id: number;
  event_type: string;
  success: boolean;
  timestamp: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  details: string | null;
}

export interface SecurityEventsResponse {
  events: SecurityEvent[];
  limit: number;
  offset: number;
}

export interface SecurityEventSummary {
  total_events: number;
  successful_logins: number;
  failed_logins: number;
  failed_unlock_attempts: number;
  logouts: number;
  session_timeouts: number;
  unique_ips: number;
  last_successful_login: string | null;
  last_failed_login: string | null;
}

export interface SecurityAlertsResponse {
  has_alerts: boolean;
  count: number;
  events: SecurityAlertEvent[];
}

export interface SecurityAlertEvent {
  id: number;
  event_type: string;
  timestamp: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
}

export type SecurityEventType =
  | 'LOGIN_ATTEMPT'
  | 'LOGOUT'
  | 'UNLOCK_ATTEMPT'
  | 'UNLOCK_AND_VALIDATE'
  | 'SESSION_TIMEOUT'
  | 'SESSION_LOCK'
  | 'SESSION_RESTORE'
  | 'SET_PASSPHRASE'
  | 'UPDATE_CREDENTIALS'
  | 'RESET_APP'
  | 'INSTANCE_ACCESS'
  | 'SECURITY_LOGS_CLEARED';

export interface SecurityEventsQueryOptions {
  limit?: number | undefined;
  offset?: number | undefined;
  eventType?: string | undefined;
  success?: boolean | undefined;
}
