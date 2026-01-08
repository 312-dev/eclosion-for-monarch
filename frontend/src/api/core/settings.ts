/**
 * Settings API Functions
 *
 * Settings and export/import operations.
 */

import type { EclosionExport, ImportOptions, ImportResult, ImportPreviewResponse } from '../../types';
import { fetchApi } from './fetchApi';

export async function getSettings(): Promise<{ auto_sync_new: boolean }> {
  return fetchApi('/recurring/settings');
}

export async function updateSettings(settings: {
  auto_sync_new?: boolean;
  auto_track_threshold?: number | null;
  auto_update_targets?: boolean;
  auto_categorize_enabled?: boolean;
  show_category_group?: boolean;
}): Promise<void> {
  await fetchApi('/recurring/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function exportSettings(): Promise<EclosionExport> {
  return fetchApi<EclosionExport>('/settings/export');
}

export async function importSettings(
  data: EclosionExport,
  options?: ImportOptions
): Promise<ImportResult> {
  return fetchApi<ImportResult>('/settings/import', {
    method: 'POST',
    body: JSON.stringify({ data, options }),
  });
}

export async function previewImport(data: EclosionExport): Promise<ImportPreviewResponse> {
  return fetchApi<ImportPreviewResponse>('/settings/import/preview', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}
