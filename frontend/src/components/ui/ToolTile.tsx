/**
 * Tool Tile Component
 *
 * Clickable card for selecting a tool from the dashboard.
 */

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface ToolTileProps {
  name: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function ToolTile({ name, description, icon, onClick, disabled }: ToolTileProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full text-left p-5 rounded-xl group ${disabled ? 'cursor-default' : 'hover-tool-tile cursor-pointer'}`}
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 p-3 rounded-lg"
          style={{
            backgroundColor: disabled ? 'var(--monarch-bg-page)' : 'var(--monarch-orange-light)',
            color: disabled ? 'var(--monarch-text-muted)' : 'var(--tool-header-icon)',
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--monarch-text-dark)' }}>
              {name}
            </h3>
            {!disabled && (
              <ChevronRight
                size={20}
                className="shrink-0 transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--monarch-text-muted)' }}
              />
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
