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
  InfoIcon,
  type IconProps,
} from '../icons';
import { Tooltip } from '../ui/Tooltip';
import type { Platform } from '../../utils/platformDetection';
import { PLATFORM_LABELS, PLATFORM_REQUIREMENTS } from '../../utils/platformDetection';

interface PlatformDownloadCardProps {
  readonly platform: Platform;
  readonly downloadUrl: string | null;
  readonly version?: string | undefined;
  readonly fileSize?: string | undefined;
  readonly checksum?: string | null;
  readonly architecture?: string | undefined;
  readonly primary?: boolean;
  readonly onClick?: () => void;
}

const PLATFORM_ICONS: Record<Platform, ComponentType<IconProps>> = {
  windows: WindowsIcon,
  macos: AppleIcon,
  linux: LinuxIcon,
  unknown: GlobeIcon,
};

function SystemRequirementsTooltip({ platform }: { platform: Exclude<Platform, 'unknown'> }) {
  const req = PLATFORM_REQUIREMENTS[platform];
  return (
    <div className="space-y-1 text-left">
      <div className="font-medium text-[var(--monarch-text-dark)] mb-2">
        System Requirements
      </div>
      <div><span className="text-[var(--monarch-text-muted)]">OS:</span> {req.os}</div>
      <div><span className="text-[var(--monarch-text-muted)]">CPU:</span> {req.arch}</div>
      <div><span className="text-[var(--monarch-text-muted)]">Memory:</span> {req.ram}</div>
      <div><span className="text-[var(--monarch-text-muted)]">Storage:</span> {req.disk}</div>
      {req.notes && (
        <div className="mt-2 text-xs text-[var(--monarch-text-muted)] italic">{req.notes}</div>
      )}
    </div>
  );
}

export function PlatformDownloadCard({
  platform,
  downloadUrl,
  version,
  fileSize,
  checksum,
  architecture,
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
      <div className="flex-1 min-w-0">
        <div
          className={`font-semibold ${primary ? 'text-lg' : ''}`}
          style={{ color: primary ? 'white' : 'var(--monarch-text-dark)' }}
        >
          {label}
          {architecture && (
            <span
              className="ml-2 text-xs font-normal"
              style={{ color: primary ? 'rgba(255, 255, 255, 0.7)' : 'var(--monarch-text-muted)' }}
            >
              ({architecture})
            </span>
          )}
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
        {checksum && (
          <div
            className="text-xs font-mono truncate mt-1"
            style={{
              color: primary ? 'rgba(255, 255, 255, 0.6)' : 'var(--monarch-text-muted)',
            }}
            title={`SHA256: ${checksum}`}
          >
            SHA256: {checksum.slice(0, 12)}...
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {platform !== 'unknown' && (
          <Tooltip
            content={<SystemRequirementsTooltip platform={platform} />}
            side="left"
          >
            <button
              type="button"
              className="p-1 rounded hover:bg-white/10 transition-colors"
              onClick={(e) => e.preventDefault()}
              aria-label={`System requirements for ${label}`}
            >
              <InfoIcon
                size={primary ? 18 : 16}
                color={primary ? 'rgba(255, 255, 255, 0.7)' : 'var(--monarch-text-muted)'}
              />
            </button>
          </Tooltip>
        )}
        <DownloadIcon
          size={primary ? 24 : 20}
          color={primary ? 'white' : 'var(--monarch-text-muted)'}
        />
      </div>
    </a>
  );
}
