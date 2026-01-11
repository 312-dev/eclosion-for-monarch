/**
 * Sidebar Navigation
 *
 * Vertical navigation sidebar with tabs for different app sections.
 * Converts to bottom navigation on mobile screens.
 */

import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Settings, Lock, Lightbulb, LayoutDashboard } from 'lucide-react';
import { RecurringIcon, AppIcon } from '../wizards/WizardComponents';
import { IdeasModal } from '../IdeasModal';
import { Portal } from '../Portal';
import { Tooltip } from '../ui/Tooltip';
import { Icons } from '../icons';
import { useDemo } from '../../context/DemoContext';
import { useMediaQuery } from '../../hooks';
import { getComingSoonFeatures } from '../../data/features';
import { isDesktopMode } from '../../utils/apiBase';

interface SidebarNavigationProps {
  onLock: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  settingsHash?: string;
}

function getNavItems(isDemo: boolean): { dashboardItem: NavItem; toolkitItems: NavItem[]; otherItems: NavItem[] } {
  const prefix = isDemo ? '/demo' : '';
  return {
    dashboardItem: { path: `${prefix}/dashboard`, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    toolkitItems: [
      { path: `${prefix}/recurring`, label: 'Recurring', icon: <RecurringIcon size={20} />, settingsHash: '#recurring' },
    ],
    otherItems: [
      { path: `${prefix}/settings`, label: 'Settings', icon: <Settings size={20} /> },
    ],
  };
}

function NavItemLink({ item, onSettingsClick }: Readonly<{ item: NavItem; onSettingsClick?: (hash: string) => void }>) {
  const settingsHash = item.settingsHash;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }: { isActive: boolean }) =>
        `sidebar-nav-item sidebar-nav-item-with-settings ${isActive ? 'sidebar-nav-item-active' : ''}`
      }
    >
      <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
      <span className="sidebar-nav-label">{item.label}</span>
      {settingsHash !== undefined && onSettingsClick && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSettingsClick(settingsHash);
          }}
          className="sidebar-settings-cog"
          aria-label={`${item.label} settings`}
        >
          <Settings size={14} aria-hidden="true" />
        </button>
      )}
    </NavLink>
  );
}

function ComingSoonNavItem({ label, icon, isMobile }: Readonly<{ label: string; icon: React.ReactNode; isMobile: boolean }>) {
  return (
    <Tooltip content="Coming Soon" side={isMobile ? 'top' : 'right'} delayDuration={100}>
      <span
        className="sidebar-nav-item sidebar-nav-item-disabled"
        aria-label={`${label} - Coming Soon`}
      >
        <span className="sidebar-nav-icon" aria-hidden="true">{icon}</span>
        <span className="sidebar-nav-label">{label}</span>
      </span>
    </Tooltip>
  );
}

export function SidebarNavigation({ onLock }: Readonly<SidebarNavigationProps>) {
  const navigate = useNavigate();
  const isDemo = useDemo();
  const isDesktop = isDesktopMode();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [ideasModalOpen, setIdeasModalOpen] = useState(false);
  const { dashboardItem, toolkitItems, otherItems } = getNavItems(isDemo);
  const comingSoonFeatures = getComingSoonFeatures();
  const prefix = isDemo ? '/demo' : '';

  const handleSettingsClick = (hash: string) => {
    navigate(`${prefix}/settings${hash}`);
  };

  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {/* Logo section - desktop app only */}
      {isDesktop && (
        <div className="sidebar-logo sidebar-desktop-only">
          <Link to={`${prefix}/`} className="sidebar-logo-link" aria-label="Eclosion - Go to home">
            <AppIcon size={28} />
            <span className="sidebar-logo-text">Eclosion</span>
          </Link>
        </div>
      )}

      {/* Tools section - scrollable on mobile */}
      <div className="sidebar-nav-tools">
        <div className="sidebar-nav-sections">
          {/* Dashboard link */}
          <div className="sidebar-nav-section">
            <ul className="sidebar-nav-list">
              <li>
                <NavItemLink item={dashboardItem} />
              </li>
            </ul>
          </div>
          <div className="sidebar-nav-divider" aria-hidden="true" />

          <div className="sidebar-nav-section">
            <div className="sidebar-nav-header-row">
              <div className="sidebar-nav-header" id="toolkit-heading">TOOLKIT</div>
              <button
                type="button"
                className="sidebar-suggest-btn"
                onClick={() => setIdeasModalOpen(true)}
                aria-label="Browse and suggest ideas"
              >
                <Lightbulb size={12} aria-hidden="true" />
                <span>Suggest</span>
              </button>
            </div>
            <ul className="sidebar-nav-list" aria-labelledby="toolkit-heading">
              {toolkitItems.map((item) => (
                <li key={item.path}>
                  <NavItemLink item={item} onSettingsClick={handleSettingsClick} />
                </li>
              ))}
            </ul>
            {/* Coming soon features - scrollable on mobile */}
            <div className="sidebar-coming-soon-wrapper">
              <ul className="sidebar-nav-list sidebar-coming-soon-list">
                {comingSoonFeatures.map((feature) => {
                  const IconComponent = Icons[feature.icon];
                  return (
                    <li key={feature.id}>
                      <ComingSoonNavItem
                        label={feature.name}
                        icon={<IconComponent size={20} />}
                        isMobile={isMobile}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div className="sidebar-nav-divider" aria-hidden="true" />
        </div>
      </div>

      {/* Separator - mobile only */}
      <div className="sidebar-nav-mobile-separator" aria-hidden="true" />

      {/* Settings - fixed position on mobile */}
      <div className="sidebar-nav-settings">
        {otherItems.map((item) => (
          <NavItemLink key={item.path} item={item} />
        ))}
      </div>

      {/* Footer - at the bottom (desktop only, not in demo mode) */}
      {!isDemo && (
        <div className="sidebar-nav-footer sidebar-desktop-only">
          <div className="sidebar-nav-list">
            <button
              type="button"
              onClick={onLock}
              className="sidebar-nav-item sidebar-lock"
              aria-label="Lock Eclosion"
            >
              <span className="sidebar-nav-icon" aria-hidden="true"><Lock size={20} /></span>
              <span className="sidebar-nav-label">Lock</span>
            </button>
          </div>
        </div>
      )}

      {/* Ideas Modal - rendered via Portal to escape sidebar stacking context */}
      <Portal>
        <IdeasModal isOpen={ideasModalOpen} onClose={() => setIdeasModalOpen(false)} />
      </Portal>
    </nav>
  );
}
