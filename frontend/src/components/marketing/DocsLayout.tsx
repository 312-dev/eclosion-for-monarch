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
        className="text-sm font-medium text-[var(--monarch-text)] hover:text-[var(--monarch-text-dark)] transition-colors"
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
          ? 'text-[var(--monarch-orange)]'
          : 'text-[var(--monarch-text)] hover:text-[var(--monarch-text-dark)]'
      }`}
    >
      {children}
    </Link>
  );
}

export function DocsLayout({ children, minimal = false }: DocsLayoutProps) {
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
      <header className="sticky top-0 z-sticky bg-[var(--monarch-bg-card)] border-b border-[var(--monarch-border)] backdrop-blur-sm bg-opacity-95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <AppIcon size={32} />
              <span
                className="text-xl font-bold text-[var(--monarch-text-dark)]"
                style={{ fontFamily: "'Unbounded', sans-serif" }}
              >
                Eclosion
              </span>
            </Link>

            {/* Navigation */}
            {!minimal && (
              <nav className="hidden md:flex items-center gap-8">
                <NavLink to="/features">Features</NavLink>
                <a
                  href="/docs"
                  className="text-sm font-medium text-[var(--monarch-text)] hover:text-[var(--monarch-text-dark)] transition-colors"
                >
                  User Guide
                </a>
                <NavLink to="/demo">Demo</NavLink>
                <NavLink
                  to="https://github.com/graysoncadams/eclosion-for-monarch/wiki"
                  external
                >
                  Self-Hosting
                </NavLink>
                <NavLink to="https://github.com/graysoncadams/eclosion-for-monarch" external>
                  GitHub
                </NavLink>
              </nav>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* User Guide & Self-Hosting Links (shown on landing page) */}
              {minimal && (
                <>
                  <a
                    href="/docs"
                    className="text-sm font-medium text-[var(--monarch-text)] hover:text-[var(--monarch-text-dark)] transition-colors mr-2"
                  >
                    User Guide
                  </a>
                  <a
                    href="https://github.com/graysoncadams/eclosion-for-monarch/wiki"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--monarch-text)] hover:text-[var(--monarch-text-dark)] transition-colors mr-2"
                  >
                    Self-Hosting
                  </a>
                </>
              )}

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-[var(--monarch-text-muted)] hover:text-[var(--monarch-text-dark)] hover:bg-[var(--monarch-bg-hover)] transition-colors"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
              </button>

              {/* GitHub Link (mobile) */}
              <a
                href="https://github.com/graysoncadams/eclosion-for-monarch"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-lg text-[var(--monarch-text-muted)] hover:text-[var(--monarch-text-dark)] hover:bg-[var(--monarch-bg-hover)] transition-colors md:hidden"
                aria-label="View on GitHub"
              >
                <GitHubIcon size={20} />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[var(--monarch-border)] bg-[var(--monarch-bg-card)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <AppIcon size={24} />
              <span className="text-sm text-[var(--monarch-text-muted)] italic">
                An evolving toolkit for Monarch Money
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-[var(--monarch-text-muted)]">
              <a
                href="https://github.com/graysoncadams/eclosion-for-monarch"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[var(--monarch-text-dark)] transition-colors"
              >
                <GitHubIcon size={16} />
                GitHub
              </a>
              <span>•</span>
              <span>
                Built for{' '}
                <a
                  href="https://monarchmoney.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--monarch-orange)] hover:underline"
                >
                  Monarch Money
                </a>
              </span>
            </div>
          </div>

          {/* Attribution */}
          <div className="mt-4 pt-4 border-t border-[var(--monarch-border)] text-center text-xs text-[var(--monarch-text-muted)]">
            <p>
              Logo by{' '}
              <a
                href="https://thenounproject.com/rosa991/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--monarch-text-dark)]"
              >
                Rosa Lia
              </a>{' '}
              from{' '}
              <a
                href="https://thenounproject.com/icon/butterfly-7666562/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--monarch-text-dark)]"
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
