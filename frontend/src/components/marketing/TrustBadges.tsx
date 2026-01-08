/**
 * TrustBadges
 *
 * Displays trust indicators: open source badge, MIT license, GitHub link.
 */

import { GitHubIcon, ExternalLinkIcon } from '../icons';

interface TrustBadgesProps {
  readonly variant?: 'inline' | 'stacked';
}

const GITHUB_REPO_URL = 'https://github.com/GraysonCAdams/eclosion-for-monarch';
const LICENSE_URL = `${GITHUB_REPO_URL}/blob/main/LICENSE`;

export function TrustBadges({ variant = 'inline' }: TrustBadgesProps) {
  const containerClass = variant === 'inline'
    ? 'flex flex-wrap items-center justify-center gap-3 sm:gap-4'
    : 'flex flex-col items-center gap-2';

  return (
    <div className={containerClass}>
      {/* Open Source Badge */}
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--monarch-bg-hover)] text-[var(--monarch-text)] hover:bg-[var(--monarch-bg-page)] transition-colors"
        aria-label="View source code on GitHub"
      >
        <GitHubIcon size={14} />
        Open Source
      </a>

      {/* MIT License Badge */}
      <a
        href={LICENSE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--monarch-bg-hover)] text-[var(--monarch-text)] hover:bg-[var(--monarch-bg-page)] transition-colors"
        aria-label="View MIT license"
      >
        <span className="text-[var(--monarch-success)]">MIT</span>
        License
        <ExternalLinkIcon size={10} className="text-[var(--monarch-text-muted)]" />
      </a>

      {/* GitHub Link */}
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--monarch-bg-hover)] text-[var(--monarch-text)] hover:bg-[var(--monarch-bg-page)] transition-colors"
        aria-label="View project on GitHub"
      >
        <GitHubIcon size={14} />
        GitHub
        <ExternalLinkIcon size={10} className="text-[var(--monarch-text-muted)]" />
      </a>
    </div>
  );
}
