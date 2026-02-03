/**
 * Navigation Item Link
 *
 * Reusable navigation link component for sidebar items with optional settings cog.
 */

import { NavLink } from 'react-router-dom';
import { Settings } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  settingsHash?: string;
  badge?: number;
}

interface NavItemLinkProps {
  item: NavItem;
  onSettingsClick?: (hash: string) => void;
}

export function NavItemLink({ item, onSettingsClick }: Readonly<NavItemLinkProps>) {
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
        {item.badge !== undefined && item.badge > 0 && (
          <span className="sidebar-nav-badge sidebar-nav-badge-mobile">{item.badge}</span>
        )}
      </span>
      <span className="sidebar-nav-label">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="sidebar-nav-badge sidebar-nav-badge-desktop">{item.badge}</span>
      )}
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

export type { NavItem };
