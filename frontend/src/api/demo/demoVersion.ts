/**
 * Demo Version Functions
 *
 * Version info, changelog, releases, and update information.
 */

import type { VersionInfo, VersionCheckResult, ChangelogStatusResult, MarkChangelogReadResult } from '../../types';
import { DEMO_VERSION, simulateDelay } from './demoState';

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

/**
 * Get current version info.
 */
export async function getVersion(): Promise<VersionInfo> {
  await simulateDelay(50);
  return {
    version: `${DEMO_VERSION}-demo`,
    build_time: new Date().toISOString(),
    channel: 'demo',
    is_beta: false,
    schema_version: '1.0',
    git_sha: 'demo',
  };
}

/**
 * Check for version updates.
 */
export async function checkVersion(clientVersion: string): Promise<VersionCheckResult> {
  await simulateDelay(50);
  return {
    client_version: clientVersion,
    server_version: DEMO_VERSION,
    update_available: false,
    update_type: null,
  };
}

/**
 * Get changelog read status.
 */
export async function getChangelogStatus(): Promise<ChangelogStatusResult> {
  await simulateDelay(50);
  return {
    current_version: `${DEMO_VERSION}-demo`,
    last_read_version: DEMO_VERSION,
    has_unread: false,
  };
}

/**
 * Mark changelog as read.
 */
export async function markChangelogRead(): Promise<MarkChangelogReadResult> {
  await simulateDelay(50);
  return { success: true, marked_version: `${DEMO_VERSION}-demo` };
}

/**
 * Get available releases.
 */
export async function getAvailableReleases(): Promise<ReleasesResponse> {
  await simulateDelay(100);
  return {
    current_version: DEMO_VERSION,
    current_channel: 'demo',
    stable_releases: [
      {
        version: DEMO_VERSION,
        tag: `v${DEMO_VERSION}`,
        name: `v${DEMO_VERSION}`,
        published_at: new Date().toISOString(),
        is_prerelease: false,
        html_url: 'https://github.com/monarchmoney/eclosion/releases',
        is_current: true,
      },
    ],
    beta_releases: [],
  };
}

/**
 * Get update instructions.
 */
export async function getUpdateInfo(): Promise<UpdateInfo> {
  await simulateDelay(100);
  return {
    deployment_type: 'local',
    current_version: DEMO_VERSION,
    current_channel: 'demo',
    instructions: {
      steps: [
        'This is demo mode - no updates are needed!',
        'In a real deployment, you would see update instructions here.',
        'Visit the documentation for deployment options.',
      ],
    },
  };
}
