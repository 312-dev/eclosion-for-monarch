/**
 * HelpDropdown - Help button with dropdown menu for documentation links
 *
 * Behavior varies by environment:
 * - Desktop + tour available: Dropdown with "Interactive Guide" and "User Guide"
 * - Desktop + no tour: Direct link to user guide (no dropdown)
 * - Web + tour available: Direct start tour (no dropdown)
 * - Web + no tour: Direct link to user guide (no dropdown)
 */

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, BookOpen, Play } from 'lucide-react';
import { getDocsUrl } from '../../utils';

// Vite injects app version at build time
declare const __APP_VERSION__: string;

interface HelpDropdownProps {
  readonly hasTour: boolean;
  readonly onStartTour: () => void;
}

export function HelpDropdown({ hasTour, onStartTour }: HelpDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect desktop (Electron) mode
  const isDesktop = globalThis.window !== undefined && !!globalThis.electron;

  // Show dropdown only in desktop mode when a tour is available
  const hasDropdown = isDesktop && hasTour;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Build versioned docs URL (environment-aware: beta -> beta.eclosion.app)
  const userGuideUrl = getDocsUrl(__APP_VERSION__);

  const openUserGuide = () => {
    window.open(userGuideUrl, '_blank');
  };

  const handleClick = () => {
    if (hasDropdown) {
      // Desktop with tour: show dropdown
      setShowDropdown(!showDropdown);
    } else if (hasTour) {
      // Web with tour: start tour directly
      onStartTour();
    } else {
      // No tour: go directly to user guide
      openUserGuide();
    }
  };

  const handleStartTour = () => {
    setShowDropdown(false);
    onStartTour();
  };

  const handleOpenGuide = () => {
    setShowDropdown(false);
    openUserGuide();
  };

  // Determine aria-label based on current mode
  const getAriaLabel = () => {
    if (hasDropdown) return 'Get help';
    if (hasTour) return 'Show tutorial';
    return 'Open user guide';
  };

  return (
    <div className="relative hidden sm:block" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleClick}
        className="app-header-btn flex items-center gap-1"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label={getAriaLabel()}
        aria-expanded={hasDropdown ? showDropdown : undefined}
        aria-haspopup={hasDropdown ? 'menu' : undefined}
      >
        <HelpCircle className="app-header-icon" aria-hidden="true" />
      </button>
      {showDropdown && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-50"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
          role="menu"
          aria-orientation="vertical"
        >
          <button
            type="button"
            onClick={handleStartTour}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
            style={{ color: 'var(--monarch-text-dark)' }}
            role="menuitem"
          >
            <Play className="h-4 w-4" style={{ color: 'var(--monarch-orange)' }} aria-hidden="true" />
            Interactive Guide
          </button>
          <button
            type="button"
            onClick={handleOpenGuide}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
            style={{ color: 'var(--monarch-text-dark)' }}
            role="menuitem"
          >
            <BookOpen className="h-4 w-4" style={{ color: 'var(--monarch-orange)' }} aria-hidden="true" />
            User Guide
          </button>
        </div>
      )}
    </div>
  );
}
