/**
 * Settings Sections Configuration
 *
 * Single source of truth for settings section metadata.
 * Used by both the sidebar navigation and settings page.
 *
 * IMPORTANT: When adding a new section:
 * 1. Add it to SETTINGS_SECTIONS below
 * 2. Add a renderer in SettingsTab.tsx's SECTION_RENDERERS
 * 3. The section component should use <SectionHeader sectionId="xxx" /> for its header
 */

import { cloneElement, isValidElement, type ReactElement } from 'react';
import {
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
  Wifi,
} from 'lucide-react';

export type SectionId =
  | 'demo'
  | 'appearance'
  | 'connectivity'
  | 'tool-settings'
  | 'account'
  | 'updates'
  | 'syncing'
  | 'desktop'
  | 'security'
  | 'data'
  | 'logs'
  | 'danger';

export interface SettingsSection {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  /** Only show when in demo mode */
  showInDemo?: boolean;
  /** Only show in desktop app */
  desktopOnly?: boolean;
  /** Only show in web (not desktop) */
  webOnly?: boolean;
  /** Custom visibility function for complex conditions */
  isVisible?: (context: { isDemo: boolean; isDesktop: boolean; isRemoteActive: boolean }) => boolean;
  /** Color variant for special sections */
  variant?: 'default' | 'warning' | 'danger';
}

/**
 * All settings sections in display order.
 * This is the single source of truth for section metadata.
 * The sidebar navigation and SettingsTab both derive from this array.
 */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'demo', label: 'Demo Mode', icon: <RotateCcw size={16} />, showInDemo: true, variant: 'warning' },
  { id: 'appearance', label: 'Appearance', icon: <Paintbrush size={16} /> },
  { id: 'connectivity', label: 'Connectivity', icon: <Wifi size={16} />, desktopOnly: true },
  { id: 'tool-settings', label: 'Tool Settings', icon: <Wrench size={16} /> },
  { id: 'account', label: 'Account', icon: <User size={16} /> },
  { id: 'updates', label: 'Updates', icon: <Download size={16} /> },
  { id: 'syncing', label: 'Syncing', icon: <Zap size={16} /> },
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={16} />, desktopOnly: true },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield size={16} />,
    isVisible: ({ isDesktop, isRemoteActive }) => !isDesktop || isRemoteActive,
  },
  { id: 'data', label: 'Data', icon: <Database size={16} /> },
  { id: 'logs', label: 'Logs', icon: <FileText size={16} />, desktopOnly: true },
  { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={16} />, variant: 'danger' },
];

export interface SectionVisibilityContext {
  isDemo: boolean;
  isDesktop: boolean;
  isRemoteActive?: boolean;
}

/**
 * Filter sections based on current context (demo mode, desktop/web).
 */
export function getVisibleSections(
  isDemo: boolean,
  isDesktop: boolean,
  isRemoteActive = false
): SettingsSection[] {
  const context: SectionVisibilityContext = { isDemo, isDesktop, isRemoteActive };

  return SETTINGS_SECTIONS.filter((section) => {
    // Custom visibility function takes precedence
    if (section.isVisible) {
      return section.isVisible({ ...context, isRemoteActive });
    }
    if (section.showInDemo && !isDemo) return false;
    if (section.desktopOnly && !isDesktop) return false;
    if (section.webOnly && isDesktop) return false;
    if (isDemo && section.id === 'demo') return true;
    if (section.showInDemo) return isDemo;
    return true;
  });
}

/**
 * Get a section by ID.
 */
export function getSectionById(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.id === id);
}

interface SectionHeaderProps {
  /** Section ID to look up metadata */
  sectionId: string;
}

const VARIANT_COLORS: Record<string, string> = {
  default: 'var(--monarch-text-muted)',
  warning: 'var(--monarch-orange)',
  danger: 'var(--monarch-error)',
};

/**
 * Section header component that pulls metadata from the shared config.
 * Use this in section components to ensure consistent labels and icons.
 */
export function SectionHeader({ sectionId }: Readonly<SectionHeaderProps>) {
  const section = getSectionById(sectionId);
  if (!section) return null;

  // Clone icon with size 12 for the header
  const headerIcon =
    isValidElement(section.icon) && typeof section.icon.props === 'object'
      ? cloneElement(section.icon as ReactElement<{ size?: number }>, { size: 12 })
      : section.icon;

  const color = VARIANT_COLORS[section.variant ?? 'default'];

  return (
    <h2
      className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5"
      style={{ color }}
    >
      {headerIcon}
      {section.label}
    </h2>
  );
}
