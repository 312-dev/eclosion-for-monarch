/**
 * Settings Sidebar
 *
 * Floating secondary sidebar for quick navigation between settings sections.
 * Hidden on mobile screens.
 */

import { useState, useEffect } from 'react';
import {
  Paintbrush,
  Wrench,
  User,
  Download,
  Heart,
  RefreshCw,
  Monitor,
  Shield,
  Database,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
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
  { id: 'demo', label: 'Demo Mode', icon: <RotateCcw size={14} />, showInDemo: true },
  { id: 'appearance', label: 'Appearance', icon: <Paintbrush size={14} /> },
  { id: 'tool-settings', label: 'Tool Settings', icon: <Wrench size={14} /> },
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={14} />, desktopOnly: true },
  { id: 'account', label: 'Account', icon: <User size={14} /> },
  { id: 'updates', label: 'Updates', icon: <Download size={14} /> },
  { id: 'credits', label: 'Credits', icon: <Heart size={14} /> },
  { id: 'syncing', label: 'Syncing', icon: <RefreshCw size={14} /> },
  { id: 'security', label: 'Security', icon: <Shield size={14} />, webOnly: true },
  { id: 'data', label: 'Data', icon: <Database size={14} /> },
  { id: 'logs', label: 'Logs', icon: <FileText size={14} />, desktopOnly: true },
  { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={14} /> },
];

export function SettingsSidebar() {
  const [activeSection, setActiveSection] = useState<string>('appearance');
  const isDemo = useDemo();
  const isDesktop = isDesktopMode();

  // Filter sections based on context
  const visibleSections = SETTINGS_SECTIONS.filter((section) => {
    if (section.showInDemo && !isDemo) return false;
    if (section.desktopOnly && !isDesktop) return false;
    if (section.webOnly && isDesktop) return false;
    // Demo mode doesn't show certain sections
    if (isDemo && section.id === 'demo') return true;
    if (section.showInDemo) return isDemo;
    return true;
  });

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = visibleSections
        .map((s) => document.getElementById(s.id))
        .filter(Boolean) as HTMLElement[];

      // Find the section closest to the top of the viewport
      let currentSection = visibleSections[0]?.id || '';
      const scrollTop = window.scrollY + 120; // Offset for header

      for (const section of sections) {
        if (section.offsetTop <= scrollTop) {
          currentSection = section.id;
        }
      }

      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleSections]);

  const handleClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="settings-sidebar" aria-label="Settings sections">
      <ul className="settings-sidebar-list">
        {visibleSections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => handleClick(section.id)}
              className={`settings-sidebar-item ${activeSection === section.id ? 'settings-sidebar-item-active' : ''}`}
              aria-current={activeSection === section.id ? 'true' : undefined}
            >
              <span className="settings-sidebar-icon">{section.icon}</span>
              <span className="settings-sidebar-label">{section.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
