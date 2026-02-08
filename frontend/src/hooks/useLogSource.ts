/**
 * Hook for accessing log files from desktop (Electron IPC) or remote (tunnel API).
 */

import { useCallback } from 'react';
import { fetchApi } from '../api/core';
import { isTunnelSite } from '../utils/environment';
import type { LogFileInfo, LogFileContent } from '../types/electron';

interface RemoteLogFile {
  name: string;
  size: number;
  modified: number;
}

interface RemoteLogContent {
  content?: string;
  total_lines?: number;
  displayed_lines?: number;
  truncated?: boolean;
  error?: string;
}

function toLogFileContent(data: RemoteLogContent): LogFileContent {
  if (data.error) return { error: data.error };
  const result: LogFileContent = {};
  if (data.content !== undefined) result.content = data.content;
  if (data.total_lines !== undefined) result.totalLines = data.total_lines;
  if (data.displayed_lines !== undefined) result.displayedLines = data.displayed_lines;
  if (data.truncated !== undefined) result.truncated = data.truncated;
  return result;
}

export function useLogSource() {
  const isRemote = isTunnelSite();
  const isDesktop = !!globalThis.electron;

  const getLogFiles = useCallback(async (): Promise<LogFileInfo[]> => {
    if (isDesktop) {
      return globalThis.electron!.getLogFiles();
    }
    if (isRemote) {
      const data = await fetchApi<{ files: RemoteLogFile[] }>('/remote/logs?include_debug=true');
      return data.files.map((f) => ({
        name: f.name,
        path: f.name,
        size: f.size,
        modified: new Date(f.modified * 1000).toISOString(),
      }));
    }
    return [];
  }, [isDesktop, isRemote]);

  const readLogFile = useCallback(
    async (
      filePath: string,
      options?: { lines?: number; search?: string }
    ): Promise<LogFileContent> => {
      if (isDesktop) {
        return globalThis.electron!.readLogFile(filePath, options);
      }
      if (isRemote) {
        const params = new URLSearchParams();
        if (options?.lines) params.set('lines', String(options.lines));
        if (options?.search) params.set('search', options.search);
        const qs = params.toString();
        const suffix = qs ? '?' + qs : '';
        const url = `/remote/logs/${encodeURIComponent(filePath)}` + suffix;
        const data = await fetchApi<RemoteLogContent>(url);
        return toLogFileContent(data);
      }
      return { error: 'Log viewer not available in this mode' };
    },
    [isDesktop, isRemote]
  );

  return { available: isDesktop || isRemote, getLogFiles, readLogFile };
}
