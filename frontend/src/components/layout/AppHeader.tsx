/**
 * App Header Component
 *
 * Header with logo/brand, left-to-budget badge, sync button, and help dropdown.
 */

import { Link } from 'react-router-dom';
import { SyncButton } from '../SyncButton';
import { HelpDropdown } from './HelpDropdown';
import { LeftToBudgetBadge } from '../LeftToBudgetBadge';
import { AppIcon } from '../wizards/WizardComponents';
import type { ReadyToAssign } from '../../types';

interface AppHeaderProps {
  isDemo: boolean;
  isDesktop: boolean;
  isMacOSElectron: boolean;
  isWindowsElectron: boolean;
  pathPrefix: string;
  readyToAssign: ReadyToAssign;
  lastSync: string | null;
  isSyncing: boolean;
  isFetching: boolean;
  hasTour: boolean;
  onSync: () => void;
  onStartTour: () => void;
}

export function AppHeader({
  isDemo,
  isDesktop,
  isMacOSElectron,
  isWindowsElectron,
  pathPrefix,
  readyToAssign,
  lastSync,
  isSyncing,
  isFetching,
  hasTour,
  onSync,
  onStartTour,
}: Readonly<AppHeaderProps>) {
  // Platform-specific padding for desktop title bar integration
  const getDesktopPaddingTop = (): string | undefined => {
    if (isMacOSElectron) return '20px';
    // Windows title bar overlay is 32px - use 10px padding to push content below it
    if (isWindowsElectron) return '10px';
    return undefined;
  };

  return (
    <header className="app-header" role="banner">
      <div
        className={`app-header-content ${isDesktop ? 'static' : 'relative'}`}
        style={
          isDesktop
            ? {
                justifyContent: 'center',
                minHeight: '70px',
                paddingLeft: isMacOSElectron ? '80px' : undefined,
                paddingTop: getDesktopPaddingTop(),
                paddingRight: isWindowsElectron ? '150px' : undefined,
              }
            : undefined
        }
      >
        {/* Logo/brand - shown on web and Windows/Linux desktop (macOS shows in sidebar) */}
        {(!isDesktop || !isMacOSElectron) && (
          <div
            className="app-brand"
            style={
              isDesktop && !isMacOSElectron ? { position: 'absolute', left: '1rem' } : undefined
            }
          >
            <Link
              to={isDemo ? '/' : `${pathPrefix}/`}
              className="flex items-center gap-2"
              style={{ textDecoration: 'none' }}
              aria-label="Eclosion - Go to home"
              onClick={() => isDemo && window.scrollTo(0, 0)}
            >
              <AppIcon size={32} />
              <h1
                className="app-title hidden sm:block"
                style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600 }}
              >
                Eclosion
              </h1>
            </Link>
            {isDemo && (
              <span
                className="app-slogan hidden lg:block"
                style={{
                  color: 'var(--monarch-text-muted)',
                  fontSize: '14px',
                  fontStyle: 'italic',
                  marginLeft: '12px',
                  paddingLeft: '12px',
                  borderLeft: '1px solid var(--monarch-border)',
                }}
                aria-hidden="true"
              >
                Your budgeting, evolved.
              </span>
            )}
          </div>
        )}
        <div
          style={
            isDesktop
              ? {
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }
              : undefined
          }
        >
          <LeftToBudgetBadge data={readyToAssign} />
        </div>
        <div
          className="app-header-actions"
          style={
            isDesktop
              ? {
                  position: 'absolute',
                  // On Windows, position further from right to avoid window controls overlay (~140px)
                  right: isWindowsElectron ? '150px' : '1rem',
                }
              : undefined
          }
        >
          <SyncButton
            onSync={onSync}
            isSyncing={isSyncing}
            isFetching={isFetching}
            lastSync={lastSync}
            compact
          />
          <HelpDropdown hasTour={hasTour} onStartTour={onStartTour} />
        </div>
      </div>
    </header>
  );
}
