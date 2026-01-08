/**
 * Settings Mutations
 *
 * Mutations for settings, config, and import/export operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';

/**
 * Update settings (auto-sync, threshold, auto-update targets, auto-categorize, show category group)
 */
export function useUpdateSettingsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: {
      auto_sync_new?: boolean;
      auto_track_threshold?: number | null;
      auto_update_targets?: boolean;
      auto_categorize_enabled?: boolean;
      show_category_group?: boolean;
    }) =>
      isDemo
        ? demoApi.updateSettings(settings)
        : api.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Set initial config (target group)
 */
export function useSetConfigMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, groupName }: { groupId: string; groupName: string }) =>
      isDemo
        ? demoApi.setConfig(groupId, groupName)
        : api.setConfig(groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Export settings to a portable format
 */
export function useExportSettingsMutation() {
  const isDemo = useDemo();
  return useMutation({
    mutationFn: () => (isDemo ? demoApi.exportSettings() : api.exportSettings()),
  });
}

/**
 * Import settings from a backup file
 */
export function useImportSettingsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, options }: { data: Parameters<typeof api.importSettings>[0]; options?: Parameters<typeof api.importSettings>[1] }) =>
      isDemo
        ? demoApi.importSettings(data, options)
        : api.importSettings(data, options),
    onSuccess: () => {
      // Invalidate all relevant caches after import
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.dashboard, isDemo) });
    },
  });
}

/**
 * Preview what an import file contains
 */
export function usePreviewImportMutation() {
  const isDemo = useDemo();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.previewImport>[0]) =>
      isDemo ? demoApi.previewImport(data) : api.previewImport(data),
  });
}
