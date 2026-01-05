/**
 * HelpDropdown - Help button with dropdown menu for documentation links
 */

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, ChevronDown, BookOpen, FileText } from 'lucide-react';
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

  const handleClick = () => {
    if (hasTour) {
      onStartTour();
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  const handleOption = (url: string) => {
    setShowDropdown(false);
    window.open(url, '_blank');
  };

  // Build versioned docs URL (environment-aware: beta -> beta.eclosion.app)
  const userGuideUrl = getDocsUrl(__APP_VERSION__);
  const wikiUrl = 'https://github.com/GraysonCAdams/eclosion-for-monarch/wiki';

  return (
    <div className="relative hidden sm:block" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleClick}
        className="app-header-btn flex items-center gap-1"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label={hasTour ? 'Show tutorial' : 'Get help'}
        aria-expanded={showDropdown}
        aria-haspopup={!hasTour}
      >
        <HelpCircle className="app-header-icon" aria-hidden="true" />
        {!hasTour && <ChevronDown className="h-3 w-3" aria-hidden="true" />}
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
            onClick={() => handleOption(userGuideUrl)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--monarch-bg-page)]"
            style={{ color: 'var(--monarch-text-dark)' }}
            role="menuitem"
          >
            <BookOpen className="h-4 w-4" style={{ color: 'var(--monarch-orange)' }} aria-hidden="true" />
            User Guide
          </button>
          <button
            type="button"
            onClick={() => handleOption(wikiUrl)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--monarch-bg-page)]"
            style={{ color: 'var(--monarch-text-dark)' }}
            role="menuitem"
          >
            <FileText className="h-4 w-4" style={{ color: 'var(--monarch-orange)' }} aria-hidden="true" />
            Self-Hosting
          </button>
        </div>
      )}
    </div>
  );
}
