/**
 * HelpDropdown - Help button with dropdown menu for documentation and support links
 *
 * Behavior varies by environment:
 * - Desktop: Dropdown with "Interactive Guide" (when tour available), "User Guide", and "Get Support"
 * - Web + tour available: Direct start tour (no dropdown)
 * - Web + no tour: Direct link to user guide (no dropdown)
 */

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, BookOpen, Play, ChevronRight, Mail, HeartHandshake } from 'lucide-react';
import { FaReddit } from 'react-icons/fa';
import { getDocsUrl } from '../../utils';
import { DiagnosticsPromptDialog } from './DiagnosticsPromptDialog';

declare const __APP_VERSION__: string;

interface HelpDropdownProps {
  readonly hasTour: boolean;
  readonly onStartTour: () => void;
}

const SUPPORT_REDDIT_URL =
  'https://www.reddit.com/user/Ok-Quantity7501/comments/1qhb5zu/eclosion_app_support/?sort=qa#comment-tree';

export function HelpDropdown({ hasTour, onStartTour }: HelpDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSupportSubmenu, setShowSupportSubmenu] = useState(false);
  const [showDiagnosticsPrompt, setShowDiagnosticsPrompt] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportMenuRef = useRef<HTMLDivElement>(null);

  const isDesktop = globalThis.window !== undefined && !!globalThis.electron;
  const hasDropdown = isDesktop;
  const userGuideUrl = getDocsUrl(__APP_VERSION__);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowSupportSubmenu(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  useEffect(() => {
    if (!showSupportSubmenu) return;
    function handleMouseMove(event: MouseEvent) {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target) && !supportMenuRef.current?.contains(target)) {
        setShowSupportSubmenu(false);
      }
    }
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [showSupportSubmenu]);

  const openUserGuide = () => window.open(userGuideUrl, '_blank');

  const handleClick = () => {
    if (hasDropdown) {
      setShowDropdown(!showDropdown);
    } else if (hasTour) {
      onStartTour();
    } else {
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
  const handleEmailClick = () => {
    setShowDropdown(false);
    setShowSupportSubmenu(false);
    setShowDiagnosticsPrompt(true);
  };

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
          {hasTour && (
            <button
              type="button"
              onClick={handleStartTour}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
              style={{ color: 'var(--monarch-text-dark)' }}
              role="menuitem"
            >
              <Play
                className="h-4 w-4"
                style={{ color: 'var(--monarch-orange)' }}
                aria-hidden="true"
              />
              Interactive Guide
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenGuide}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
            style={{ color: 'var(--monarch-text-dark)' }}
            role="menuitem"
          >
            <BookOpen
              className="h-4 w-4"
              style={{ color: 'var(--monarch-orange)' }}
              aria-hidden="true"
            />
            User Guide
          </button>
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowSupportSubmenu(true)}
              onClick={() => setShowSupportSubmenu(!showSupportSubmenu)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
              style={{ color: 'var(--monarch-text-dark)' }}
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={showSupportSubmenu}
            >
              <span className="flex items-center gap-3">
                <HeartHandshake
                  className="h-4 w-4"
                  style={{ color: 'var(--monarch-orange)' }}
                  aria-hidden="true"
                />
                Get Support
              </span>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </button>
            {showSupportSubmenu && (
              <div
                ref={supportMenuRef}
                className="absolute right-full top-0 mr-1 w-40 rounded-lg shadow-lg py-1 z-50"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  border: '1px solid var(--monarch-border)',
                }}
                role="menu"
                aria-orientation="vertical"
              >
                <a
                  href={SUPPORT_REDDIT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
                  style={{ color: 'var(--monarch-text-dark)', textDecoration: 'none' }}
                  role="menuitem"
                  onClick={() => {
                    setShowDropdown(false);
                    setShowSupportSubmenu(false);
                  }}
                >
                  <FaReddit
                    size={16}
                    style={{ color: 'var(--monarch-orange)' }}
                    aria-hidden="true"
                  />
                  via Reddit
                </a>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
                  style={{ color: 'var(--monarch-text-dark)' }}
                  role="menuitem"
                  onClick={handleEmailClick}
                >
                  <Mail
                    className="h-4 w-4"
                    style={{ color: 'var(--monarch-orange)' }}
                    aria-hidden="true"
                  />
                  via Email
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <DiagnosticsPromptDialog
        isOpen={showDiagnosticsPrompt}
        onClose={() => setShowDiagnosticsPrompt(false)}
      />
    </div>
  );
}
