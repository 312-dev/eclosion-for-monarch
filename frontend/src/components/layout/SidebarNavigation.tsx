/**
 * Sidebar Navigation
 *
 * Vertical navigation sidebar with tabs for different app sections.
 * Converts to bottom navigation on mobile screens.
 */

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Settings,
  Lock,
  Lightbulb,
  LayoutDashboard,
  Paintbrush,
  Wrench,
  User,
  Download,
  Zap,
  Monitor,
  Shield,
  Database,
  FileText,
  AlertTriangle,
  RotateCcw,
  Radio,
} from 'lucide-react';
import { RecurringIcon, NotesIcon, StashIcon } from '../wizards/WizardComponents';
import { ToolSettingsModal, type ToolType } from '../ui/ToolSettingsModal';
import { useDemo } from '../../context/DemoContext';
import { useMediaQuery } from '../../hooks';
import { isDesktopMode } from '../../utils/apiBase';

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  showInDemo?: boolean;
  desktopOnly?: boolean;
  webOnly?: boolean;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'remote-access', label: 'Remote', icon: <Radio size={16} />, desktopOnly: true },
  { id: 'demo', label: 'Demo Mode', icon: <RotateCcw size={16} />, showInDemo: true },
  { id: 'appearance', label: 'Appearance', icon: <Paintbrush size={16} /> },
  { id: 'tool-settings', label: 'Tool Settings', icon: <Wrench size={16} /> },
  { id: 'account', label: 'Account', icon: <User size={16} /> },
  { id: 'updates', label: 'Updates', icon: <Download size={16} /> },
  { id: 'syncing', label: 'Automation', icon: <Zap size={16} /> },
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={16} />, desktopOnly: true },
  { id: 'security', label: 'Security', icon: <Shield size={16} />, webOnly: true },
  { id: 'data', label: 'Data', icon: <Database size={16} /> },
  { id: 'logs', label: 'Logs', icon: <FileText size={16} />, desktopOnly: true },
  { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={16} /> },
];

interface SidebarNavigationProps {
  onLock: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  settingsHash?: string;
}

function getNavItems(isDemo: boolean): {
  dashboardItem: NavItem;
  toolkitItems: NavItem[];
  otherItems: NavItem[];
} {
  const prefix = isDemo ? '/demo' : '';
  return {
    dashboardItem: {
      path: `${prefix}/dashboard`,
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    toolkitItems: [
      {
        path: `${prefix}/notes`,
        label: 'Notes',
        icon: <NotesIcon size={20} />,
        settingsHash: '#notes',
      },
      {
        path: `${prefix}/recurring`,
        label: 'Recurring',
        icon: <RecurringIcon size={20} />,
        settingsHash: '#recurring',
      },
      {
        path: `${prefix}/stashes`,
        label: 'Stashes',
        icon: <StashIcon size={20} />,
        settingsHash: '#stash',
      },
    ],
    otherItems: [{ path: `${prefix}/settings`, label: 'Settings', icon: <Settings size={20} /> }],
  };
}

function NavItemLink({
  item,
  onSettingsClick,
}: Readonly<{ item: NavItem; onSettingsClick?: (hash: string) => void }>) {
  const settingsHash = item.settingsHash;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }: { isActive: boolean }) =>
        `sidebar-nav-item sidebar-nav-item-with-settings ${isActive ? 'sidebar-nav-item-active' : ''}`
      }
    >
      <span className="sidebar-nav-icon" aria-hidden="true">
        {item.icon}
      </span>
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

export function SidebarNavigation({ onLock }: Readonly<SidebarNavigationProps>) {
  const location = useLocation();
  const isDemo = useDemo();
  const isDesktop = isDesktopMode();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [showLockButton, setShowLockButton] = useState(!isDesktop);
  const [settingsModalTool, setSettingsModalTool] = useState<ToolType | null>(null);
  const { dashboardItem, toolkitItems, otherItems } = getNavItems(isDemo);
  const prefix = isDemo ? '/demo' : '';

  // In desktop mode, only show lock button if biometric is required
  useEffect(() => {
    if (isDesktop && globalThis.electron?.credentials) {
      globalThis.electron.credentials.getRequireBiometric().then((required: boolean) => {
        setShowLockButton(required);
      });
    }
  }, [isDesktop]);

  // Check if we're on the settings page
  const isSettingsPage = location.pathname === `${prefix}/settings`;

  // Filter settings sections based on context (only used when on settings page)
  const visibleSettingsSections = SETTINGS_SECTIONS.filter((section) => {
    if (section.showInDemo && !isDemo) return false;
    if (section.desktopOnly && !isDesktop) return false;
    if (section.webOnly && isDesktop) return false;
    if (isDemo && section.id === 'demo') return true;
    if (section.showInDemo) return isDemo;
    return true;
  });

  const handleSettingsClick = (hash: string) => {
    // Convert hash to tool type: #notes -> 'notes', #recurring -> 'recurring', #stash -> 'stash'
    const toolMap: Record<string, ToolType> = {
      '#notes': 'notes',
      '#recurring': 'recurring',
      '#stash': 'stash',
    };
    const tool = toolMap[hash];
    if (tool) {
      setSettingsModalTool(tool);
    }
  };

  const handleSettingsSectionClick = (sectionId: string) => {
    // Scroll to section on the settings page
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {/* Tools section - scrollable on mobile */}
      <div className="sidebar-nav-tools">
        <div className="sidebar-nav-sections">
          {/* Dashboard link - desktop only (on mobile it's in the scrollable list) */}
          <div className="sidebar-nav-section sidebar-desktop-only">
            <ul className="sidebar-nav-list">
              <li>
                <NavItemLink item={dashboardItem} />
              </li>
            </ul>
          </div>
          <div className="sidebar-nav-divider" aria-hidden="true" />

          <div className="sidebar-nav-section">
            <div className="sidebar-nav-header-row">
              <div className="sidebar-nav-header" id="toolkit-heading">
                TOOLKIT
              </div>
              <a
                href="https://www.reddit.com/user/Ok-Quantity7501/comments/1qhb5zu/eclosion_app_support/?sort=qa#comment-tree"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-suggest-btn"
                aria-label="Suggest an idea"
              >
                <Lightbulb size={12} aria-hidden="true" />
                <span>Suggest</span>
              </a>
            </div>
            {/* All nav items - scrollable on mobile */}
            <div className="sidebar-toolkit-wrapper">
              <ul className="sidebar-nav-list" aria-labelledby="toolkit-heading">
                {/* Dashboard in scrollable list - mobile only */}
                <li className="sidebar-mobile-only">
                  <NavItemLink item={dashboardItem} />
                </li>
                {toolkitItems.map((item) => (
                  <li key={item.path}>
                    <NavItemLink item={item} onSettingsClick={handleSettingsClick} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="sidebar-nav-divider" aria-hidden="true" />
        </div>
      </div>

      {/* Separator - mobile only */}
      <div className="sidebar-nav-mobile-separator" aria-hidden="true" />

      {/* Settings - fixed position on mobile, nested options on desktop when on settings page */}
      <div className="sidebar-nav-settings">
        {isMobile ? (
          /* Mobile: simple link */
          otherItems.map((item) => <NavItemLink key={item.path} item={item} />)
        ) : (
          <div className="sidebar-settings-expandable">
            {/* Settings main link */}
            <NavLink
              to={`${prefix}/settings`}
              className={({ isActive }: { isActive: boolean }) =>
                `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`
              }
            >
              <span className="sidebar-nav-icon" aria-hidden="true">
                <Settings size={20} />
              </span>
              <span className="sidebar-nav-label">Settings</span>
            </NavLink>

            {/* Nested settings sections - only shown when on settings page */}
            {isSettingsPage && (
              <ul className="sidebar-settings-submenu">
                {visibleSettingsSections.map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => handleSettingsSectionClick(section.id)}
                      className="sidebar-settings-submenu-item"
                    >
                      <span className="sidebar-settings-submenu-icon" aria-hidden="true">
                        {section.icon}
                      </span>
                      <span className="sidebar-settings-submenu-label">{section.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Footer - at the bottom (desktop only, not in demo mode, only if lock is available) */}
      {!isDemo && showLockButton && (
        <div className="sidebar-nav-footer sidebar-desktop-only">
          <div className="sidebar-nav-list">
            <button
              type="button"
              onClick={onLock}
              className="sidebar-nav-item sidebar-lock"
              aria-label="Lock Eclosion"
            >
              <span className="sidebar-nav-icon" aria-hidden="true">
                <Lock size={20} />
              </span>
              <span className="sidebar-nav-label">Lock</span>
            </button>
          </div>
        </div>
      )}

      {/* Tool Settings Modal */}
      {settingsModalTool && (
        <ToolSettingsModal
          isOpen={true}
          onClose={() => setSettingsModalTool(null)}
          tool={settingsModalTool}
        />
      )}
    </nav>
  );
}
