/**
 * ToolSettingsHeader - Reusable header for tool settings cards
 *
 * Displays a consistent tool header with icon, title, status badge, description, and accordion toggle.
 * The entire header is clickable to expand/collapse sub-settings.
 * Used by RecurringToolSettings and NotesToolSettings for visual consistency.
 */

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface ToolSettingsHeaderProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: ReactNode;
  readonly isActive: boolean;
  readonly statusBadge?: ReactNode;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

export function ToolSettingsHeader({
  icon,
  title,
  description,
  isActive,
  statusBadge,
  isExpanded,
  onToggle,
}: ToolSettingsHeaderProps) {
  return (
    <button
      type="button"
      className="w-full p-4 text-left hover:bg-(--monarch-bg-hover) transition-colors cursor-pointer"
      style={{ background: 'none', border: 'none' }}
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} settings`}
    >
      <div className="flex items-center gap-4">
        <div
          className="p-2.5 rounded-lg shrink-0"
          style={{
            backgroundColor: isActive ? 'var(--monarch-orange-light)' : 'var(--monarch-bg-page)',
            color: 'var(--tool-header-icon)',
          }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="font-medium flex items-center gap-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            {title}
            {statusBadge}
          </div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
            {description}
          </div>
        </div>

        <div
          className="p-2 shrink-0 transition-transform"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronDown size={20} style={{ color: 'var(--monarch-text-muted)' }} />
        </div>
      </div>
    </button>
  );
}
