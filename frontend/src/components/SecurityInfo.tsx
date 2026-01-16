/* eslint-disable max-lines -- Security dashboard with multiple collapsible sections */
import { useState, useEffect } from 'react';
import { getSecurityStatus } from '../api/client';
import { isDesktopMode } from '../utils/apiBase';
import type { SecurityStatus } from '../types';

/**
 * Check if running in Electron desktop app with credential storage available.
 */
function isElectronDesktop(): boolean {
  return (
    typeof globalThis.window !== 'undefined' &&
    'electron' in globalThis &&
    globalThis.electron?.credentials !== undefined
  );
}

interface SecurityInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecurityInfo({ isOpen, onClose }: SecurityInfoProps) {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const isDesktop = isDesktopMode();
  const isElectron = isElectronDesktop();

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Loading state for async fetch
      setLoading(true);
      getSecurityStatus()
        .then((security) => {
          setSecurityStatus(security);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--monarch-orange-bg)' }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: 'var(--monarch-orange)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--monarch-text-dark)' }}>
                Security Information
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: 'var(--monarch-orange)' }}
              ></div>
            </div>
          ) : (
            (() => {
              // Compute platform-specific text outside JSX to avoid nested ternaries
              let storageTitle: string;
              let storageDescription: string;

              if (isElectron) {
                storageTitle = 'Protected by Your Device';
                storageDescription =
                  "This is a desktop application. Your credentials are stored in your operating system's secure storage (Keychain on macOS, Credential Manager on Windows) — protected by your device login and never sent to external servers.";
              } else if (isDesktop) {
                storageTitle = 'Stored Locally on Your Computer';
                storageDescription =
                  'This is a desktop application. Your credentials are stored and processed entirely on your computer — nothing is sent to external servers.';
              } else {
                storageTitle = 'You Are Self-Hosting';
                storageDescription =
                  'This application runs on your own infrastructure. Your credentials are stored and processed only on your self-hosted instance.';
              }

              return (
                <div className="space-y-6">
                  {/* Encryption Status */}
                  <section>
                    <h3
                      className="text-sm font-semibold mb-3 flex items-center gap-2"
                      style={{ color: 'var(--monarch-text-dark)' }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: 'var(--monarch-success)' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Your Credentials Are Protected
                    </h3>
                    <div
                      className="rounded-lg p-4"
                      style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}
                    >
                      {isElectron ? (
                        <dl className="space-y-4 text-sm">
                          <div>
                            <dt className="mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                              Protection Method
                            </dt>
                            <dd
                              className="font-mono text-sm"
                              style={{ color: 'var(--monarch-text-dark)' }}
                            >
                              OS Secure Storage
                            </dd>
                          </div>
                          <div>
                            <dt className="mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                              Encryption
                            </dt>
                            <dd
                              className="font-mono text-sm"
                              style={{ color: 'var(--monarch-text-dark)' }}
                            >
                              Keychain / Credential Manager
                            </dd>
                          </div>
                          <div>
                            <dt className="mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                              Biometric Support
                            </dt>
                            <dd
                              className="font-mono text-sm"
                              style={{ color: 'var(--monarch-text-dark)' }}
                            >
                              Touch ID / Windows Hello
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <dl className="space-y-4 text-sm">
                          <div>
                            <dt className="mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                              Encryption Algorithm
                            </dt>
                            <dd
                              className="font-mono text-sm"
                              style={{ color: 'var(--monarch-text-dark)' }}
                            >
                              {securityStatus?.encryption_algorithm || 'AES-256'}
                            </dd>
                          </div>
                          <div>
                            <dt className="mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                              Key Derivation
                            </dt>
                            <dd
                              className="font-mono text-sm"
                              style={{ color: 'var(--monarch-text-dark)' }}
                            >
                              {securityStatus?.key_derivation || 'PBKDF2-SHA256'}
                            </dd>
                          </div>
                          <div>
                            <dt className="mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                              File Permissions
                            </dt>
                            <dd
                              className="font-mono text-sm"
                              style={{ color: 'var(--monarch-text-dark)' }}
                            >
                              {securityStatus?.file_permissions || '0600'}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  </section>

                  {/* How It Works */}
                  <section>
                    <h3
                      className="text-sm font-semibold mb-3"
                      style={{ color: 'var(--monarch-text-dark)' }}
                    >
                      How Your Data Is Protected
                    </h3>
                    <ul
                      className="space-y-3 text-sm"
                      style={{ color: 'var(--monarch-text-muted)' }}
                    >
                      {isElectron ? (
                        <>
                          <li className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 mt-0.5 shrink-0"
                              style={{ color: 'var(--monarch-orange)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            <span>
                              Your Monarch credentials are stored in your{' '}
                              <strong>operating system&apos;s secure storage</strong> (Keychain on
                              macOS, Credential Manager on Windows).
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 mt-0.5 shrink-0"
                              style={{ color: 'var(--monarch-orange)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                              />
                            </svg>
                            <span>
                              Credentials are <strong>encrypted by your OS</strong> and protected by
                              your device login.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 mt-0.5 shrink-0"
                              style={{ color: 'var(--monarch-orange)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                              />
                            </svg>
                            <span>
                              Optional <strong>Touch ID or Windows Hello</strong> adds biometric
                              protection when you enable &quot;Require biometric to unlock&quot; in
                              settings.
                            </span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 mt-0.5 shrink-0"
                              style={{ color: 'var(--monarch-orange)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            <span>
                              Your Monarch credentials are encrypted using{' '}
                              <strong>your passphrase</strong> before being stored.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 mt-0.5 shrink-0"
                              style={{ color: 'var(--monarch-orange)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                              />
                            </svg>
                            <span>
                              Your credentials <strong>cannot be decrypted</strong> without your
                              passphrase{isDesktop ? '.' : ' — not even by the server.'}
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 mt-0.5 shrink-0"
                              style={{ color: 'var(--monarch-orange)' }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                              />
                            </svg>
                            <span>
                              Your passphrase is used to derive an encryption key using{' '}
                              <strong>480,000 PBKDF2 iterations</strong>.
                            </span>
                          </li>
                        </>
                      )}
                    </ul>
                  </section>

                  {/* Why Your Password Is Needed */}
                  <section>
                    <h3
                      className="text-sm font-semibold mb-3"
                      style={{ color: 'var(--monarch-text-dark)' }}
                    >
                      Why Your Monarch Password Is Needed
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                      Monarch Money does not currently offer OAuth or API tokens for third-party
                      integrations. Direct authentication with your email and password is the only
                      way to access your data.
                      {isElectron
                        ? " Your credentials are securely stored in your operating system's credential manager."
                        : ' Your credentials are encrypted with your passphrase so that only you can access them.'}
                    </p>
                  </section>

                  {/* Open Source */}
                  <section>
                    <h3
                      className="text-sm font-semibold mb-3"
                      style={{ color: 'var(--monarch-text-dark)' }}
                    >
                      Open Source & Transparent
                    </h3>
                    <p className="text-sm mb-3" style={{ color: 'var(--monarch-text-muted)' }}>
                      This application is open source. You can audit the code yourself to verify how
                      your credentials are handled.
                    </p>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium"
                      style={{ color: 'var(--monarch-orange)' }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                        />
                      </svg>
                      View Source Code
                    </a>
                  </section>

                  {/* Storage Location Notice */}
                  <section
                    className="rounded-lg p-4"
                    style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}
                  >
                    <h3
                      className="text-sm font-semibold mb-2 flex items-center gap-2"
                      style={{ color: 'var(--monarch-text-dark)' }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: 'var(--monarch-orange)' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {isDesktop ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                          />
                        )}
                      </svg>
                      {storageTitle}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                      {storageDescription}
                    </p>
                  </section>
                </div>
              );
            })()
          )}

          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-2 rounded-lg font-medium hover-bg-orange-to-orange-hover"
            style={{ color: 'white' }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
