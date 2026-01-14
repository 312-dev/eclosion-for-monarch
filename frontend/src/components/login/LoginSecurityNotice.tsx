/**
 * Login Security Notice
 *
 * Displays security information about credential storage on the login page.
 * Adapts messaging based on platform (Electron vs Web).
 */

import { isDesktopMode } from '../../utils/apiBase';

interface LoginSecurityNoticeProps {
  isElectronDesktop: boolean;
  onShowDetails: () => void;
}

export function LoginSecurityNotice({ isElectronDesktop, onShowDetails }: LoginSecurityNoticeProps) {
  return (
    <aside
      className="mt-3 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}
      aria-label="Security information"
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 mt-0.5 flex-shrink-0"
          style={{ color: 'var(--monarch-orange)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          <p className="font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            How Your Data is Protected
          </p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            {isElectronDesktop ? (
              <>
                <li>
                  Credentials are <strong>encrypted</strong> by your operating system&apos;s secure
                  storage
                </li>
                <li>Protected by your device&apos;s keychain or credential manager</li>
                <li>
                  Stored <strong>locally</strong> on this device only
                </li>
              </>
            ) : (
              <>
                <li>
                  Credentials are <strong>encrypted</strong> with a passphrase only you know
                </li>
                <li>
                  This is a <strong>dedicated single-user instance</strong> — not shared with other
                  accounts
                </li>
                <li>
                  Encrypted credentials are stored{' '}
                  {isDesktopMode() ? 'locally within this app' : 'on this server'}
                </li>
              </>
            )}
          </ul>
          <button
            type="button"
            onClick={onShowDetails}
            className="mt-2 font-medium hover:underline"
            style={{ color: 'var(--monarch-orange)' }}
          >
            Full security details
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * Unofficial tool notice displayed on the login page.
 */
export function UnofficialNotice() {
  return (
    <aside
      className="mt-4 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--monarch-bg-page)', border: '1px solid var(--monarch-border)' }}
      aria-label="Important notice"
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 mt-0.5 flex-shrink-0"
          style={{ color: 'var(--monarch-text-muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          <p>
            <strong>Unofficial third-party tool</strong> — not affiliated with or endorsed by Monarch
            Money.
          </p>
        </div>
      </div>
    </aside>
  );
}

/**
 * GitHub source link shown on login page (web only, not desktop).
 */
export function GithubSourceLink() {
  return (
    <a
      href="https://github.com/312-dev/eclosion"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 p-2 rounded-full transition-colors hover-text-muted-to-dark"
      style={{ color: 'var(--monarch-text-muted)' }}
      aria-label="View source on GitHub (opens in new tab)"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    </a>
  );
}
