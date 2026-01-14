/**
 * App Header Component
 *
 * Header with logo/brand, left-to-budget badge, sync button, and help dropdown.
 */

import { Link } from 'react-router-dom';
import { SyncButton } from '../SyncButton';
import { HelpDropdown } from './HelpDropdown';
import { VersionIndicator } from '../VersionIndicator';
import { LeftToBudgetBadge } from '../LeftToBudgetBadge';
import { AppIcon } from '../wizards/WizardComponents';
import type { ReadyToAssign } from '../../types';

interface AppHeaderProps {
  isDemo: boolean;
  isDesktop: boolean;
  isMacOSElectron: boolean;
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
  pathPrefix,
  readyToAssign,
  lastSync,
  isSyncing,
  isFetching,
  hasTour,
  onSync,
  onStartTour,
}: AppHeaderProps) {
  return (
    <header className="app-header" role="banner">
      <div
        className="app-header-content relative"
        style={isDesktop ? {
          justifyContent: 'center',
          paddingLeft: isMacOSElectron ? '80px' : undefined,
          paddingTop: isMacOSElectron ? '20px' : undefined,
        } : undefined}
      >
        {/* Logo/brand - hidden on desktop app (shown in sidebar instead) */}
        {!isDesktop && (
          <div className="app-brand">
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
            {isDemo ? (
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
            ) : (
              <div
                className="hidden md:block"
                style={{
                  marginLeft: '12px',
                  paddingLeft: '12px',
                  borderLeft: '1px solid var(--monarch-border)',
                }}
              >
                <VersionIndicator />
              </div>
            )}
          </div>
        )}
        <LeftToBudgetBadge data={readyToAssign} />
        <div
          className="app-header-actions"
          role="group"
          aria-label="Header actions"
          style={isDesktop ? { position: 'absolute', right: '1rem' } : undefined}
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
