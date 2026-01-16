/**
 * Developer Section
 *
 * Desktop-only settings section for enabling developer mode.
 * When enabled, shows Reload, Force Reload, and Toggle DevTools in the View menu.
 */

import { useState, useEffect, useCallback } from 'react';
import { Code } from 'lucide-react';
import { ToggleSwitch } from './ToggleSwitch';

export function DeveloperSection() {
  const [developerMode, setDeveloperMode] = useState(false);
  const [isBetaBuild, setIsBetaBuild] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!globalThis.electron?.getDeveloperMode) return;
    try {
      // Check if this is a beta build
      const channel = await globalThis.electron.getUpdateChannel();
      const isBeta = channel === 'beta';
      setIsBetaBuild(isBeta);

      // In beta builds, developer mode is always on
      if (isBeta) {
        setDeveloperMode(true);
      } else {
        const enabled = await globalThis.electron.getDeveloperMode();
        setDeveloperMode(enabled);
      }
    } catch {
      // Default to false if we can't fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (globalThis.electron?.getDeveloperMode) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [fetchSettings]);

  const handleToggle = async () => {
    if (!globalThis.electron?.setDeveloperMode) return;
    try {
      const newValue = !developerMode;
      await globalThis.electron.setDeveloperMode(newValue);
      setDeveloperMode(newValue);
    } catch {
      // Ignore errors
    }
  };

  // Don't render if not in desktop mode or API not available
  if (!globalThis.electron?.getDeveloperMode) return null;

  return (
    <section className="mb-8">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <Code size={12} />
        Developer
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                <Code size={20} style={{ color: 'var(--monarch-text-muted)' }} />
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                  Developer Mode
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                  {isBetaBuild
                    ? 'Always enabled in beta builds'
                    : 'Enable Chrome DevTools and other developer features'}
                </div>
              </div>
            </div>
            {loading ? (
              <div
                className="w-9 h-5 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--monarch-border)' }}
              />
            ) : (
              <ToggleSwitch
                checked={developerMode}
                onChange={handleToggle}
                ariaLabel="Toggle developer mode"
                disabled={isBetaBuild}
              />
            )}
          </div>
        </div>
        {developerMode && (
          <div
            className="px-4 py-3 text-xs"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              color: 'var(--monarch-text-muted)',
              borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))',
            }}
          >
            View menu now shows: Reload, Force Reload, and Toggle Developer Tools
          </div>
        )}
      </div>
    </section>
  );
}
