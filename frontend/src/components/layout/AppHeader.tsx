/**
 * App Header Component
 *
 * Header with logo/brand, sync button, and help dropdown.
 */

import { Link } from 'react-router-dom';
import { SyncButton } from '../SyncButton';
import { HelpDropdown } from './HelpDropdown';
import { AppIcon } from '../wizards/WizardComponents';
import { RateLimitBanner } from '../ui/RateLimitBanner';
import { OfflineIndicator } from '../OfflineIndicator';
import { UpdateBanner } from '../UpdateBanner';
import { MonthTransitionBanner } from '../ui/MonthTransitionBanner';
import { DistributionModeBanner } from '../stash/DistributionModeBanner';
import { RemoteAccessIndicator } from '../RemoteAccessIndicator';
import { useMediaQuery, breakpoints } from '../../hooks/useMediaQuery';

interface AppHeaderProps {
  isDemo: boolean;
  isMacOSElectron: boolean;
  isWindowsElectron: boolean;
  pathPrefix: string;
  isSyncing: boolean;
  isFetching: boolean;
  hasTour: boolean;
  onSync: () => void;
  onStartTour: () => void;
}

export function AppHeader({
  isDemo,
  isMacOSElectron,
  isWindowsElectron,
  pathPrefix,
  isSyncing,
  isFetching,
  hasTour,
  onSync,
  onStartTour,
}: Readonly<AppHeaderProps>) {
  const isMobile = useMediaQuery(breakpoints.sm);
  // Desktop title bar: compact height with vertically centered content
  const desktopHeaderHeight = 48;
  // Account for native window controls
  const macOSTrafficLightWidth = 80;
  const windowsControlsWidth = 150;

  return (
    <header className="app-header" role="banner">
      <div
        className="app-header-content static"
        style={{
          justifyContent: 'center',
          height: `${desktopHeaderHeight}px`,
          minHeight: `${desktopHeaderHeight}px`,
          paddingLeft: isMacOSElectron ? `${macOSTrafficLightWidth}px` : undefined,
          paddingRight: isWindowsElectron ? `${windowsControlsWidth}px` : undefined,
        }}
      >
        {/* Remote access indicator - left side on mobile only */}
        {isMobile && (
          <div
            style={{
              position: 'absolute',
              left: '1rem',
            }}
          >
            <RemoteAccessIndicator />
          </div>
        )}
        {/* Centered logo - standard across all platforms */}
        <div
          className="app-brand"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <Link
            to={isDemo ? '/' : `${pathPrefix}/`}
            className="flex items-center gap-2"
            style={{ textDecoration: 'none' }}
            aria-label="Eclosion - Go to home"
            onClick={() => isDemo && window.scrollTo(0, 0)}
          >
            <AppIcon size={26} />
            <h1
              className="app-title"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600, fontSize: '16px' }}
            >
              Eclosion
            </h1>
          </Link>
        </div>
        <div
          className="app-header-actions"
          style={{
            position: 'absolute',
            right: isWindowsElectron ? `${windowsControlsWidth}px` : '1rem',
          }}
        >
          {!isMobile && <RemoteAccessIndicator />}
          <SyncButton onSync={onSync} isSyncing={isSyncing} isFetching={isFetching} compact />
          <HelpDropdown hasTour={hasTour} onStartTour={onStartTour} />
        </div>
      </div>
      <RateLimitBanner />
      <OfflineIndicator />
      <UpdateBanner />
      <MonthTransitionBanner />
      <DistributionModeBanner />
    </header>
  );
}
