/**
 * BetaBanner - Warning banner shown on beta/preview environments
 *
 * Alerts users they're viewing a pre-release version and provides
 * a link to the stable production site.
 *
 * Shows on:
 * - beta.eclosion.app (custom beta domain)
 * - *.eclosion.pages.dev (Cloudflare Pages previews)
 *
 * Does NOT show on:
 * - eclosion.app (production)
 * - localhost (development)
 */

import { Icons } from '../icons';
import { useIsBetaSite } from '../../hooks';

const STABLE_URL = 'https://eclosion.app';

export function BetaBanner() {
  const isBeta = useIsBetaSite();

  if (!isBeta) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-sm"
      style={{
        backgroundColor: 'var(--monarch-orange)',
        color: 'white',
      }}
    >
      <Icons.Warning className="h-4 w-4 shrink-0" />
      <span>
        You&apos;re viewing a <strong>beta preview</strong>. Features may be
        unstable.
      </span>
      <a
        href={STABLE_URL}
        className="ml-1 underline hover:no-underline"
        style={{ color: 'white' }}
      >
        Go to stable version
      </a>
    </div>
  );
}
