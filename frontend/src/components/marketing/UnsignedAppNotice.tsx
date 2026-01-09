/**
 * UnsignedAppNotice
 *
 * Displays a notice explaining that the app is not code-signed,
 * with reassurance about open-source nature and links to bypass instructions.
 */

import { useState } from 'react';
import { WarningIcon, ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from '../icons';
import type { Platform } from '../../utils/platformDetection';

interface UnsignedAppNoticeProps {
  readonly platform: Platform;
}

const PLATFORM_WARNINGS: Record<Exclude<Platform, 'unknown'>, {
  warning: string;
  bypassHint: string;
}> = {
  macos: {
    warning: 'macOS Gatekeeper may show "App is damaged" or "cannot be opened"',
    bypassHint: 'See installation instructions below for bypass steps',
  },
  windows: {
    warning: 'Windows SmartScreen may show "Windows protected your PC"',
    bypassHint: 'Click "More info" then "Run anyway" to proceed',
  },
  linux: {
    warning: 'Some Linux distributions may require manual permissions',
    bypassHint: 'Run chmod +x on the AppImage to make it executable',
  },
};

export function UnsignedAppNotice({ platform }: UnsignedAppNoticeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (platform === 'unknown') return null;

  const { warning, bypassHint } = PLATFORM_WARNINGS[platform];

  return (
    <div
      className="p-4 rounded-lg border border-[var(--monarch-warning)] bg-[var(--monarch-warning)]/5"
    >
      <div className="flex items-start gap-3">
        <WarningIcon
          size={20}
          className="shrink-0 mt-0.5 text-[var(--monarch-warning)]"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--monarch-text-dark)]">
            App Not Code-Signed
          </p>
          <p className="text-sm text-[var(--monarch-text-muted)] mt-1">
            {warning}. {bypassHint}.
          </p>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 mt-2 text-xs font-medium text-[var(--monarch-orange)] hover:opacity-80 transition-opacity"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Hide details about unsigned apps' : 'Learn more about unsigned apps'}
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon size={14} />
                Hide details
              </>
            ) : (
              <>
                <ChevronDownIcon size={14} />
                Why isn&apos;t it signed?
              </>
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-[var(--monarch-border)] text-xs text-[var(--monarch-text-muted)] space-y-2">
              <p>
                Code signing certificates cost $99-500/year. As an open-source project,
                we prioritize development over certificates.
              </p>
              <p>
                <strong className="text-[var(--monarch-text)]">Your security:</strong>{' '}
                You can verify downloads using the SHA256 checksums above and review
                our source code on GitHub.
              </p>
              <a
                href="https://github.com/312-dev/eclosion"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--monarch-orange)] hover:underline"
              >
                View source code
                <ExternalLinkIcon size={12} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
