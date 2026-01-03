/**
 * Version Types
 *
 * Types for version information and changelog.
 */

export interface ChangelogSection {
  added?: string[];
  changed?: string[];
  deprecated?: string[];
  removed?: string[];
  fixed?: string[];
  security?: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  summary?: string;
  sections: ChangelogSection;
}

export interface VersionInfo {
  version: string;
  build_time: string | null;
  channel: string;
  is_beta: boolean;
  schema_version: string;
  git_sha: string;
}

export interface ChangelogResponse {
  current_version: string;
  entries: ChangelogEntry[];
  total_entries: number;
}

export interface VersionCheckResult {
  client_version: string;
  server_version: string;
  update_available: boolean;
  update_type: 'major' | 'minor' | 'patch' | null;
}

export interface ChangelogStatusResult {
  current_version: string;
  last_read_version: string | null;
  has_unread: boolean;
}

export interface MarkChangelogReadResult {
  success: boolean;
  marked_version: string;
}

export interface DeploymentInfo {
  is_railway: boolean;
  railway_project_url: string | null;
  railway_project_id: string | null;
}
