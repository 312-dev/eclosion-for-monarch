/**
 * BetaBanner - Warning banner shown on beta.eclosion.app
 *
 * Alerts users they're viewing a pre-release version and provides
 * a link to the stable production site.
 */

import { useMemo } from 'react';
import { Icons } from '../icons';

const BETA_HOSTNAME = 'beta.eclosion.app';
const STABLE_URL = 'https://eclosion.app';

/**
 * Check if current site is the beta environment
 */
function useIsBeta(): boolean {
  return useMemo(() => {
    return globalThis.location.hostname === BETA_HOSTNAME;
  }, []);
}

export function BetaBanner() {
  const isBeta = useIsBeta();

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
