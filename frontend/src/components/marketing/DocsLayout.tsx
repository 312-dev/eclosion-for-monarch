/**
 * Docs Layout Component
 *
 * Shared layout for all marketing and documentation pages.
 * Provides header with branding, navigation, theme toggle, and footer.
 */

import { Link, useLocation } from 'react-router-dom';
import { GitHubIcon, MoonIcon, SunIcon } from '../icons';
import { AppIcon } from '../wizards/SetupWizardIcons';
import { useTheme } from '../../context/ThemeContext';
import { MarketingVersionIndicator } from './MarketingVersionIndicator';
import { useLandingContent } from '../../hooks';

interface DocsLayoutProps {
  children: React.ReactNode;
  /** Show a simpler header for landing page */
  minimal?: boolean;
}

function NavLink({
  to,
  children,
  external,
}: {
  to: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-(--monarch-text) hover:text-(--monarch-text-dark) transition-colors"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        isActive
          ? 'text-(--monarch-orange)'
          : 'text-(--monarch-text) hover:text-(--monarch-text-dark)'
      }`}
    >
      {children}
    </Link>
  );
}

export function DocsLayout({ children, minimal = false }: DocsLayoutProps) {
  const { isCoderMode } = useLandingContent();
  const { theme, setTheme } = useTheme();

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-sticky bg-(--monarch-bg-card) border-b border-(--monarch-border) backdrop-blur-sm bg-opacity-95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <AppIcon size={32} />
                <span
                  className="text-lg sm:text-xl font-bold text-(--monarch-text-dark)"
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  Eclosion
                </span>
              </Link>
              <div className="hidden xs:block">
                <MarketingVersionIndicator />
              </div>
            </div>

            {/* Navigation */}
            {!minimal && (
              <nav className="hidden md:flex items-center gap-8">
                <NavLink to="/features">Features</NavLink>
                <a
                  href="/docs"
                  className="text-sm font-medium text-(--monarch-text) hover:text-(--monarch-text-dark) transition-colors"
                >
                  User Guide
                </a>
                <NavLink to="/demo/">Demo</NavLink>
                {isCoderMode && (
                  <>
                    <NavLink to="https://github.com/312-dev/eclosion/wiki" external>
                      Self-Hosting
                    </NavLink>
                    <NavLink to="https://github.com/312-dev/eclosion" external>
                      GitHub
                    </NavLink>
                  </>
                )}
              </nav>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* User Guide & Self-Hosting Links (shown on landing page, hidden on mobile) */}
              {minimal && (
                <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                  <a
                    href="/docs"
                    className="text-sm font-medium text-(--monarch-text) hover:text-(--monarch-text-dark) transition-colors px-2"
                  >
                    User Guide
                  </a>
                  {isCoderMode && (
                    <a
                      href="https://github.com/312-dev/eclosion/wiki"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-(--monarch-text) hover:text-(--monarch-text-dark) transition-colors px-2"
                    >
                      Self-Hosting
                    </a>
                  )}
                </div>
              )}

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className="flex items-center justify-center gap-1.5 h-10 px-2 sm:px-3 rounded-lg text-(--monarch-text-muted) hover:text-(--monarch-text-dark) hover:bg-(--monarch-bg-hover) transition-colors"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
                <span className="hidden sm:inline text-sm font-medium">
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </span>
              </button>

              {/* GitHub Link (mobile) */}
              {isCoderMode && (
                <a
                  href="https://github.com/312-dev/eclosion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-(--monarch-text-muted) hover:text-(--monarch-text-dark) hover:bg-(--monarch-bg-hover) transition-colors md:hidden"
                  aria-label="View on GitHub"
                >
                  <GitHubIcon size={20} />
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-(--monarch-border) bg-(--monarch-bg-card)">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col items-center gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <AppIcon size={24} />
              <span className="text-xs sm:text-sm text-(--monarch-text-muted) italic text-center">
                An evolving toolkit for Monarch Money
              </span>
            </div>

            {/* Links - stack on mobile, inline on larger screens */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-x-4 sm:gap-y-2 text-sm text-(--monarch-text-muted)">
              {isCoderMode && (
                <div className="flex items-center gap-3 sm:gap-4">
                  <a
                    href="https://github.com/312-dev/eclosion"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-(--monarch-text-dark) transition-colors"
                  >
                    <GitHubIcon size={16} />
                    <span className="hidden xs:inline">GitHub</span>
                  </a>
                </div>
              )}
              {isCoderMode && <span className="hidden sm:inline text-(--monarch-border)">•</span>}
              <span className="text-center">
                Built for{' '}
                <a
                  href="https://monarchmoney.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--monarch-orange) hover:text-(--monarch-text-dark) transition-colors"
                >
                  Monarch Money
                </a>
              </span>
              <span className="hidden sm:inline text-(--monarch-border)">•</span>
              <MarketingVersionIndicator />
            </div>
          </div>

          {/* Attribution */}
          <div className="mt-4 pt-4 border-t border-(--monarch-border) text-center text-xs text-(--monarch-text-muted)">
            <p>
              Logo by{' '}
              <a
                href="https://thenounproject.com/rosa991/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-(--monarch-text-dark)"
              >
                Rosa Lia
              </a>{' '}
              from{' '}
              <a
                href="https://thenounproject.com/icon/butterfly-7666562/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-(--monarch-text-dark)"
              >
                Noun Project
              </a>
            </p>
            <p className="mt-2">
              Eclosion is not affiliated with, endorsed by, or sponsored by Monarch Money.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
