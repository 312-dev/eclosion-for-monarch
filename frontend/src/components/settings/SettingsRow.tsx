/**
 * SettingsRow - Reusable settings row with label, description, and control
 */

import type { ReactNode } from 'react';

interface SettingsRowProps {
  readonly label: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly isLast?: boolean;
}

export function SettingsRow({ label, description, children, isLast }: SettingsRowProps) {
  return (
    <div
      className="px-4 py-3 ml-14"
      style={isLast ? undefined : { borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
            {label}
          </div>
          {description && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              {description}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
