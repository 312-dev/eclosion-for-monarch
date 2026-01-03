/**
 * Sidebar Navigation
 *
 * Vertical navigation sidebar with tabs for different app sections.
 * Converts to bottom navigation on mobile screens.
 */

import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Settings, LogOut, Lightbulb, Github, LayoutDashboard } from 'lucide-react';
import { RecurringIcon } from '../wizards/WizardComponents';
import { useClickOutside } from '../../hooks';
import { RedditIcon } from '../icons';
import { useDemo } from '../../context/DemoContext';

interface SidebarNavigationProps {
  onSignOut: () => void;
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

export function SidebarNavigation({ onSignOut }: Readonly<SidebarNavigationProps>) {
  const navigate = useNavigate();
  const isDemo = useDemo();
  const [ideaMenuOpen, setIdeaMenuOpen] = useState(false);
  const ideaMenuRef = useRef<HTMLDivElement>(null);
  const { dashboardItem, toolkitItems, otherItems } = getNavItems(isDemo);

  useClickOutside([ideaMenuRef], () => setIdeaMenuOpen(false), ideaMenuOpen);

  const handleSettingsClick = (hash: string) => {
    const prefix = isDemo ? '/demo' : '';
    navigate(`${prefix}/settings${hash}`);
  };

  // Handle keyboard navigation for idea menu
  const handleIdeaMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIdeaMenuOpen(false);
    }
  };

  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
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
              <div className="sidebar-suggest-dropdown" ref={ideaMenuRef}>
                <button
                  type="button"
                  className="sidebar-suggest-btn"
                  onClick={() => setIdeaMenuOpen(!ideaMenuOpen)}
                  aria-expanded={ideaMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Suggest a feature"
                >
                  <Lightbulb size={12} aria-hidden="true" />
                  <span>Suggest</span>
                </button>
                {ideaMenuOpen && (
                  <div
                    className="sidebar-idea-menu"
                    role="menu"
                    aria-label="Suggestion options"
                    onKeyDown={handleIdeaMenuKeyDown}
                    tabIndex={-1}
                  >
                    <a
                      href="https://github.com/chrislee973/ynab-scripts/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-idea-option"
                      onClick={() => setIdeaMenuOpen(false)}
                      role="menuitem"
                    >
                      <Github size={16} aria-hidden="true" />
                      <span>GitHub Discussions</span>
                    </a>
                    <a
                      href="https://www.reddit.com/r/Eclosion/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-idea-option"
                      onClick={() => setIdeaMenuOpen(false)}
                      role="menuitem"
                    >
                      <RedditIcon size={16} />
                      <span>Reddit Community</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
            <ul className="sidebar-nav-list" aria-labelledby="toolkit-heading">
              {toolkitItems.map((item) => (
                <li key={item.path}>
                  <NavItemLink item={item} onSettingsClick={handleSettingsClick} />
                </li>
              ))}
            </ul>
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

      {/* Sign Out - at the bottom */}
      <div className="sidebar-nav-footer sidebar-desktop-only">
        <div className="sidebar-nav-list">
          <button
            type="button"
            onClick={onSignOut}
            className="sidebar-nav-item sidebar-signout"
            aria-label="Sign out of your account"
          >
            <span className="sidebar-nav-icon" aria-hidden="true"><LogOut size={20} /></span>
            <span className="sidebar-nav-label">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
