/**
 * PlatformDownloadCard
 *
 * Displays a download card for a specific platform with icon, label, and download button.
 */

import type { ComponentType } from 'react';
import {
  WindowsIcon,
  AppleIcon,
  LinuxIcon,
  DownloadIcon,
  GlobeIcon,
  type IconProps,
} from '../icons';
import type { Platform } from '../../utils/platformDetection';
import { PLATFORM_LABELS } from '../../utils/platformDetection';

interface PlatformDownloadCardProps {
  readonly platform: Platform;
  readonly downloadUrl: string | null;
  readonly version?: string | undefined;
  readonly fileSize?: string | undefined;
  readonly primary?: boolean;
  readonly onClick?: () => void;
}

const PLATFORM_ICONS: Record<Platform, ComponentType<IconProps>> = {
  windows: WindowsIcon,
  macos: AppleIcon,
  linux: LinuxIcon,
  unknown: GlobeIcon,
};

export function PlatformDownloadCard({
  platform,
  downloadUrl,
  version,
  fileSize,
  primary = false,
  onClick,
}: PlatformDownloadCardProps) {
  const Icon = PLATFORM_ICONS[platform];
  const label = PLATFORM_LABELS[platform];

  const baseClasses = `
    flex items-center gap-4 p-5 rounded-xl border-2 transition-all
    hover:scale-[1.01] hover:shadow-md
    focus:outline-none focus:ring-2 focus:ring-offset-2
  `;

  const primaryClasses = primary
    ? 'border-[var(--monarch-orange)] bg-[var(--monarch-orange)] text-white'
    : 'border-[var(--monarch-border)] bg-[var(--monarch-bg-card)] hover:border-[var(--monarch-orange-light,#ff8533)]';

  if (!downloadUrl) {
    return (
      <div
        className={`${baseClasses} opacity-50 cursor-not-allowed`}
        style={{
          borderColor: 'var(--monarch-border)',
          backgroundColor: 'var(--monarch-bg-card)',
        }}
      >
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
        >
          <Icon size={32} color="var(--monarch-text-muted)" />
        </div>
        <div className="flex-1">
          <div
            className="font-semibold"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            {label}
          </div>
          <div
            className="text-sm"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Not available
          </div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={downloadUrl}
      onClick={onClick}
      className={`${baseClasses} ${primaryClasses}`}
      style={{
        // @ts-expect-error CSS custom property
        '--tw-ring-color': 'var(--monarch-orange)',
      }}
    >
      <div
        className="p-3 rounded-lg"
        style={{
          backgroundColor: primary
            ? 'rgba(255, 255, 255, 0.2)'
            : 'var(--monarch-bg-hover)',
        }}
      >
        <Icon
          size={primary ? 40 : 32}
          color={primary ? 'white' : 'var(--monarch-orange)'}
        />
      </div>
      <div className="flex-1">
        <div
          className={`font-semibold ${primary ? 'text-lg' : ''}`}
          style={{ color: primary ? 'white' : 'var(--monarch-text-dark)' }}
        >
          {label}
        </div>
        <div
          className="text-sm"
          style={{
            color: primary ? 'rgba(255, 255, 255, 0.8)' : 'var(--monarch-text-muted)',
          }}
        >
          {version && `v${version}`}
          {version && fileSize && ' · '}
          {fileSize}
        </div>
      </div>
      <DownloadIcon
        size={primary ? 24 : 20}
        color={primary ? 'white' : 'var(--monarch-text-muted)'}
      />
    </a>
  );
}
