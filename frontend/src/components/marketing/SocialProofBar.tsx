/**
 * SocialProofBar
 *
 * Horizontal bar displaying credibility stats.
 * Shows GitHub stars, self-hosted badge, and privacy message.
 */

import { GitHubIcon, ShieldCheckIcon, ServerIcon } from '../icons';

export function SocialProofBar() {
  return (
    <section className="px-4 sm:px-6 py-8 bg-[var(--monarch-bg-page)] border-y border-[var(--monarch-border)]">
      <div className="max-w-4xl mx-auto">
        <div className="social-proof-bar">
          {/* Open source */}
          <div className="social-proof-stat">
            <GitHubIcon size={18} />
            <span>100% open source</span>
          </div>

          {/* Self-hosted */}
          <div className="social-proof-stat">
            <ServerIcon size={18} />
            <span>Self-hosted</span>
          </div>

          {/* Privacy */}
          <div className="social-proof-stat">
            <ShieldCheckIcon size={18} />
            <span>Your data never leaves your server</span>
          </div>
        </div>
      </div>
    </section>
  );
}
