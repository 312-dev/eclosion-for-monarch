/**
 * VersionBadge - Shows BETA or STABLE badge based on version string
 */

export interface VersionBadgeProps {
  version: string;
  channel: string | undefined;
  size?: 'sm' | 'md';
  className?: string;
}

export function VersionBadge({ version, channel, size = 'sm', className = '' }: VersionBadgeProps) {
  // Determine if this is a beta version based on version string or channel
  const isBeta =
    channel === 'beta' ||
    version.includes('-beta') ||
    version.includes('-rc') ||
    version.includes('-alpha');

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  if (isBeta) {
    return (
      <span
        className={`${sizeClasses} rounded font-medium ${className}`}
        style={{
          backgroundColor: 'var(--monarch-accent-bg)',
          color: 'var(--monarch-accent)',
        }}
      >
        BETA
      </span>
    );
  }

  return (
    <span
      className={`${sizeClasses} rounded font-medium ${className}`}
      style={{
        backgroundColor: 'var(--monarch-success-bg)',
        color: 'var(--monarch-success)',
      }}
    >
      STABLE
    </span>
  );
}
