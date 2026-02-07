/**
 * Tunnel Status Hook
 *
 * Provides shared access to the current tunnel status for remote access.
 * Subscribes to tunnel status change events for live updates.
 * Supports named tunnels with claimed *.eclosion.me subdomains.
 */

import { useState, useEffect, useCallback } from 'react';
import type { TunnelStatus } from '../types/electron';

export interface UseTunnelStatusReturn {
  status: TunnelStatus | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useTunnelStatus(): UseTunnelStatusReturn {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!globalThis.electron?.tunnel) {
      setLoading(false);
      return;
    }
    try {
      const tunnelStatus = await globalThis.electron.tunnel.getStatus();
      setStatus(tunnelStatus);
    } catch {
      // Non-critical - keep previous status
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Subscribe to status change events for live updates
    const unsubscribe = globalThis.electron?.tunnel?.onStatusChanged?.(setStatus);
    return () => unsubscribe?.();
  }, [fetchStatus]);

  return { status, loading, refetch: fetchStatus };
}
