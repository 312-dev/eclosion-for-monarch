/**
 * GetStartedDeploymentContent - Deployment guide for self-hosting with Docker
 */

import { ExternalLinkIcon, GitHubIcon, ServerIcon, GiftIcon } from '../icons';

export function GetStartedDeploymentContent() {
  return (
    <div className="space-y-4">
      {/* Self-hosting intro */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        style={{ backgroundColor: 'var(--monarch-orange-bg, rgba(255, 107, 0, 0.08))' }}
      >
        <GiftIcon size={16} color="var(--monarch-orange)" className="shrink-0" />
        <span style={{ color: 'var(--monarch-text-dark)' }}>
          <strong>Free forever</strong>
          <span style={{ color: 'var(--monarch-text-muted)' }}> — self-host on your own hardware or cloud provider</span>
        </span>
      </div>

      {/* What you'll need */}
      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          What you'll need
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--monarch-text)' }}>
          <li className="flex items-start gap-2">
            <ServerIcon size={16} color="var(--monarch-orange)" className="shrink-0 mt-0.5" />
            <span>A server with Docker installed (your own hardware, VPS, or any cloud provider)</span>
          </li>
          <li className="flex items-start gap-2">
            <ServerIcon size={16} color="var(--monarch-orange)" className="shrink-0 mt-0.5" />
            <span>Basic command-line knowledge</span>
          </li>
          <li className="flex items-start gap-2">
            <ServerIcon size={16} color="var(--monarch-orange)" className="shrink-0 mt-0.5" />
            <span>~10 minutes for initial setup</span>
          </li>
        </ul>
      </div>

      {/* Action Button */}
      <a
        href="https://github.com/312-dev/eclosion/wiki"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-white transition-all hover:scale-[1.01] hover:shadow-md"
        style={{ backgroundColor: 'var(--monarch-orange)' }}
      >
        <GitHubIcon size={18} />
        <span className="font-semibold">View Self-Hosting Guide</span>
        <ExternalLinkIcon size={14} className="opacity-70" />
      </a>

      <p className="text-xs text-center" style={{ color: 'var(--monarch-text-muted)' }}>
        The wiki includes Docker Compose setup, reverse proxy configuration, and platform-specific guides.
      </p>
    </div>
  );
}
