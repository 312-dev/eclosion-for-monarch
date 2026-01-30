/**
 * ToolPageHeader - Header component for tool pages
 *
 * Displays a consistent header with icon, title, and description
 * at the top of each tool's main page (Recurring, Stash, Notes).
 * Optionally includes a settings button that opens a settings modal.
 */

import { useRef, type ReactNode } from 'react';
import { SettingsIcon, type SettingsIconHandle } from './settings';

interface ToolPageHeaderProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly descriptionExtra?: ReactNode;
  /** Additional action buttons to render before the settings button */
  readonly actions?: ReactNode;
  readonly onSettingsClick?: () => void;
}

export function ToolPageHeader({
  icon,
  title,
  description,
  descriptionExtra,
  actions,
  onSettingsClick,
}: ToolPageHeaderProps) {
  const settingsRef = useRef<SettingsIconHandle>(null);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div
          className="p-3 rounded-lg shrink-0"
          style={{
            backgroundColor: 'var(--monarch-orange-light)',
            color: 'var(--tool-header-icon)',
          }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            {title}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            {description}
            {descriptionExtra}
          </p>
        </div>

        {actions}

        {onSettingsClick && (
          <button
            type="button"
            onClick={onSettingsClick}
            onMouseEnter={() => settingsRef.current?.startAnimation()}
            onMouseLeave={() => settingsRef.current?.stopAnimation()}
            className="flex items-center justify-center p-2 rounded-lg hover:bg-(--monarch-bg-hover) transition-colors shrink-0"
            aria-label={`${title} settings`}
            title="Settings"
          >
            <SettingsIcon
              ref={settingsRef}
              size={20}
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
