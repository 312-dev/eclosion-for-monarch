/**
 * Version API Functions
 *
 * Version info, changelog, releases, and updates.
 */

import type { VersionInfo, VersionCheckResult, ChangelogStatusResult, MarkChangelogReadResult } from '../../types';
import { fetchApi } from './fetchApi';

export interface Release {
  version: string;
  tag: string;
  name: string;
  published_at: string;
  is_prerelease: boolean;
  html_url: string;
  is_current: boolean;
}

export interface ReleasesResponse {
  current_version: string;
  current_channel: string;
  stable_releases: Release[];
  beta_releases: Release[];
  error?: string;
}

export interface UpdateInfo {
  deployment_type: 'railway' | 'docker' | 'local';
  current_version: string;
  current_channel: string;
  instructions: {
    steps: string[];
    project_url?: string;
    example_compose?: string;
  };
}

export async function getVersion(): Promise<VersionInfo> {
  return fetchApi<VersionInfo>('/version');
}

export async function checkVersion(clientVersion: string): Promise<VersionCheckResult> {
  return fetchApi<VersionCheckResult>('/version/check', {
    method: 'POST',
    body: JSON.stringify({ client_version: clientVersion }),
  });
}

export async function getChangelogStatus(): Promise<ChangelogStatusResult> {
  return fetchApi<ChangelogStatusResult>('/version/changelog/status');
}

export async function markChangelogRead(): Promise<MarkChangelogReadResult> {
  return fetchApi<MarkChangelogReadResult>('/version/changelog/read', {
    method: 'POST',
  });
}

export async function getAvailableReleases(): Promise<ReleasesResponse> {
  return fetchApi<ReleasesResponse>('/version/releases');
}

export async function getUpdateInfo(): Promise<UpdateInfo> {
  return fetchApi<UpdateInfo>('/version/update-info');
}
