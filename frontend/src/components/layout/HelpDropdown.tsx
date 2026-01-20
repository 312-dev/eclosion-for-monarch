/**
 * HelpDropdown - Help button with dropdown menu for documentation and support links
 *
 * Behavior varies by environment:
 * - Desktop: Dropdown with "Interactive Guide" (when tour available), "User Guide", and "Get Support"
 * - Web + tour available: Direct start tour (no dropdown)
 * - Web + no tour: Direct link to user guide (no dropdown)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { HelpCircle, BookOpen, Play, ChevronRight, Mail, HeartHandshake, X } from 'lucide-react';
import { FaReddit } from 'react-icons/fa';
import { getDocsUrl } from '../../utils';
import { Z_INDEX } from '../../constants';

// Vite injects app version at build time
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
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportMenuRef = useRef<HTMLDivElement>(null);

  // Detect desktop (Electron) mode
  const isDesktop = globalThis.window !== undefined && !!globalThis.electron;

  // Always show dropdown in desktop mode
  const hasDropdown = isDesktop;

  // Close dropdown when clicking outside
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

  // Close support submenu when mouse leaves both the trigger and submenu
  useEffect(() => {
    if (!showSupportSubmenu) return;

    function handleMouseMove(event: MouseEvent) {
      const target = event.target as Node;
      const isOverDropdown = dropdownRef.current?.contains(target);
      const isOverSubmenu = supportMenuRef.current?.contains(target);
      if (!isOverDropdown && !isOverSubmenu) {
        setShowSupportSubmenu(false);
      }
    }

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [showSupportSubmenu]);

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

  const handleEmailClick = () => {
    setShowDropdown(false);
    setShowSupportSubmenu(false);
    setShowDiagnosticsPrompt(true);
  };

  const openEmailWithoutDiagnostics = useCallback(() => {
    const subject = `[Eclosion v${__APP_VERSION__}] Support request`;
    globalThis.location.href = `mailto:ope@312.dev?subject=${encodeURIComponent(subject)}`;
    setShowDiagnosticsPrompt(false);
  }, []);

  const openEmailWithDiagnostics = useCallback(async () => {
    if (!globalThis.electron?.openEmailWithDiagnostics) {
      // Fallback if not in desktop mode
      openEmailWithoutDiagnostics();
      return;
    }

    setIsLoadingDiagnostics(true);
    try {
      const subject = `[Eclosion v${__APP_VERSION__}] Support request`;
      const recipient = 'ope@312.dev';

      const result = await globalThis.electron.openEmailWithDiagnostics(subject, recipient);

      if (result.method === 'native') {
        // macOS: Mail opened with attachment, we're done
        setShowDiagnosticsPrompt(false);
      } else {
        // Windows/Linux: File was opened, now open mailto with instructions
        const body = `[Please attach the diagnostics file that was just opened: ${result.filename}]\n\nDescribe your issue here:\n`;
        globalThis.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setShowDiagnosticsPrompt(false);
      }
    } catch (error) {
      console.error('Failed to open email with diagnostics:', error);
      // Fall back to email without diagnostics
      openEmailWithoutDiagnostics();
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }, [openEmailWithoutDiagnostics]);

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
          {/* Get Support with submenu */}
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

      {/* Diagnostics prompt dialog */}
      {showDiagnosticsPrompt && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: Z_INDEX.MODAL }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="diagnostics-dialog-title"
              className="rounded-lg p-6 max-w-md shadow-xl mx-4"
              style={{ backgroundColor: 'var(--monarch-bg-card)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3
                  id="diagnostics-dialog-title"
                  className="text-lg font-semibold"
                  style={{ color: 'var(--monarch-text-dark)' }}
                >
                  Include diagnostic logs?
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsPrompt(false)}
                  className="p-1 rounded transition-colors hover:bg-(--monarch-bg-page)"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" style={{ color: 'var(--monarch-text-muted)' }} />
                </button>
              </div>
              <p
                className="text-sm mb-5"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                We do our best to strip out any personally identifying information (PII),
                but you should review the logs yourself if you&apos;re worried about sending
                anything private.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={openEmailWithoutDiagnostics}
                  className="px-4 py-2 text-sm rounded-lg transition-colors hover:bg-(--monarch-bg-page)"
                  style={{
                    color: 'var(--monarch-text-dark)',
                    border: '1px solid var(--monarch-border)',
                  }}
                  disabled={isLoadingDiagnostics}
                >
                  Don&apos;t attach
                </button>
                <button
                  type="button"
                  onClick={openEmailWithDiagnostics}
                  className="px-4 py-2 text-sm rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--monarch-orange)',
                    color: 'white',
                  }}
                  disabled={isLoadingDiagnostics}
                >
                  {isLoadingDiagnostics ? 'Loading...' : 'Attach diagnostics'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
