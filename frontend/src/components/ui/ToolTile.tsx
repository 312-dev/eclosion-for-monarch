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
  onClick: () => void;
}

export function ToolTile({ name, description, icon, onClick }: ToolTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-5 rounded-xl group hover-tool-tile"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 p-3 rounded-lg"
          style={{ backgroundColor: 'var(--monarch-orange-light)' }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3
              className="font-semibold text-lg"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              {name}
            </h3>
            <ChevronRight
              size={20}
              className="shrink-0 transition-transform group-hover:translate-x-1"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </div>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
