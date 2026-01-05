/**
 * Security Queries
 *
 * Queries and mutations for security status, events, and alerts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { SecurityEventsQueryOptions } from '../../types';

/**
 * Security status
 */
export function useSecurityStatusQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.securityStatus, isDemo),
    queryFn: isDemo ? demoApi.getSecurityStatus : api.getSecurityStatus,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Security events with filtering
 */
export function useSecurityEventsQuery(options?: SecurityEventsQueryOptions) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.securityEvents, isDemo), options],
    queryFn: () =>
      isDemo ? demoApi.getSecurityEvents(options) : api.getSecurityEvents(options),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Security summary statistics
 */
export function useSecuritySummaryQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.securitySummary, isDemo),
    queryFn: isDemo ? demoApi.getSecuritySummary : api.getSecuritySummary,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Security alerts (failed attempts since last login)
 */
export function useSecurityAlertsQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.securityAlerts, isDemo),
    queryFn: isDemo ? demoApi.getSecurityAlerts : api.getSecurityAlerts,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Dismiss security alerts
 */
export function useDismissSecurityAlertsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: isDemo ? demoApi.dismissSecurityAlerts : api.dismissSecurityAlerts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.securityAlerts, isDemo) });
    },
  });
}

/**
 * Export security events as CSV
 */
export function useExportSecurityEventsMutation() {
  const isDemo = useDemo();
  return useMutation({
    mutationFn: isDemo ? demoApi.exportSecurityEvents : api.exportSecurityEvents,
  });
}
