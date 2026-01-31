/**
 * Remote Access Indicator
 *
 * Shows the status of remote access tunnel in the header.
 * - Green with pulsing animation when active
 * - Red when enabled but not active (failing)
 * - Muted when disabled
 * - Clicks navigate to settings remote access section
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadioIcon } from './icons/RadioIcon';
import { Tooltip } from './ui/Tooltip';
import type { TunnelStatus } from '../types/electron';

export function RemoteAccessIndicator() {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      if (!globalThis.electron?.tunnel) return;
      try {
        const tunnelStatus = await globalThis.electron.tunnel.getStatus();
        if (!cancelled) {
          setStatus(tunnelStatus);
        }
      } catch {
        // Non-critical
      }
    };

    // Initial check
    void checkStatus();

    // Poll for status changes every 5 seconds
    const interval = setInterval(() => void checkStatus(), 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Don't render if not in desktop mode or no tunnel API
  if (!globalThis.electron?.tunnel) return null;

  const isActive = status?.active ?? false;
  const isEnabled = status?.enabled ?? false;
  const isFailing = isEnabled && !isActive;

  // Determine color based on state
  let color: string;
  let tooltipText: string;
  if (isActive) {
    color = 'var(--monarch-green)';
    tooltipText = 'Remote access: On';
  } else if (isFailing) {
    color = 'var(--monarch-red)';
    tooltipText = 'Remote access: Connection failed';
  } else {
    color = 'var(--monarch-text-muted)';
    tooltipText = 'Remote access: Off';
  }

  const handleClick = () => {
    navigate('/settings#remote-access');
  };

  return (
    <Tooltip content={tooltipText}>
      <button
        onClick={handleClick}
        className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
        aria-label={tooltipText}
        type="button"
      >
        <RadioIcon size={20} color={color} autoAnimate={isActive} animationInterval={3000} />
      </button>
    </Tooltip>
  );
}
