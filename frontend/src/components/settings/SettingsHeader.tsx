/**
 * Settings Header
 *
 * Page header for the settings tab.
 */

import { Settings } from 'lucide-react';

export function SettingsHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: 'var(--monarch-orange-light)' }}
        >
          <Settings size={22} style={{ color: 'var(--monarch-orange)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--monarch-text-dark)' }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Configure your Eclosion preferences
          </p>
        </div>
      </div>
    </div>
  );
}
