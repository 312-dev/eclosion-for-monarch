/**
 * SettingsSectionHeader - Lightweight section divider for tool settings
 *
 * Used within tool settings cards to group related settings together.
 */

interface SettingsSectionHeaderProps {
  readonly title: string;
  readonly variant?: 'page' | 'modal';
}

export function SettingsSectionHeader({ title, variant = 'page' }: SettingsSectionHeaderProps) {
  const marginClass = variant === 'modal' ? '' : 'ml-14';

  return (
    <div
      className={`px-4 pt-4 pb-2 ${marginClass}`}
      style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        {title}
      </h3>
    </div>
  );
}
