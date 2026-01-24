/**
 * BrowserSelectionStep - Browser selection for stash bookmark sync
 *
 * Shows detected browsers with accessibility status.
 * Handles Safari Full Disk Access permission flow.
 */

import { FaChrome, FaEdge, FaSafari } from 'react-icons/fa';
import { SiBrave } from 'react-icons/si';
import type { DetectedBrowser, BrowserType, PermissionResult } from '../../../../types/bookmarks';
import { Icons } from '../../../icons';

/** Browser icon component */
function BrowserIcon({ type }: { type: BrowserType }) {
  const size = 32;
  switch (type) {
    case 'chrome':
      return <FaChrome size={size} />;
    case 'edge':
      return <FaEdge size={size} />;
    case 'safari':
      return <FaSafari size={size} />;
    case 'brave':
      return <SiBrave size={size} />;
    default:
      return <Icons.Globe size={size} />;
  }
}

/** Get short browser name */
function getBrowserName(type: BrowserType): string {
  switch (type) {
    case 'chrome':
      return 'Chrome';
    case 'edge':
      return 'Edge';
    case 'safari':
      return 'Safari';
    case 'brave':
      return 'Brave';
    default:
      return type;
  }
}

/** All supported browser types for display */
const ALL_BROWSER_TYPES: BrowserType[] = ['chrome', 'edge', 'safari', 'brave'];

interface BrowserSelectionStepProps {
  readonly browsers: DetectedBrowser[];
  readonly selectedBrowser: BrowserType | null;
  readonly permissionGranted: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onSelectBrowser: (browserType: BrowserType) => void;
  readonly onRequestPermission: () => Promise<PermissionResult>;
  readonly onRefresh: () => Promise<void>;
  readonly onNext: () => void;
}

export function BrowserSelectionStep({
  browsers,
  selectedBrowser,
  permissionGranted,
  isLoading,
  error,
  onSelectBrowser,
  onRequestPermission,
  onRefresh,
  onNext,
}: BrowserSelectionStepProps) {
  const needsPermission = selectedBrowser && !permissionGranted;
  const isSafari = selectedBrowser === 'safari';

  // Get browser data by type
  const getBrowserData = (type: BrowserType): DetectedBrowser | undefined => {
    return browsers.find((b) => b.type === type);
  };

  // Handle browser selection with auto-advance
  const handleSelectBrowser = (type: BrowserType) => {
    const browser = getBrowserData(type);
    const isAccessible = browser?.accessible ?? false;

    onSelectBrowser(type);

    // Auto-advance after a brief delay if browser is accessible (has permission)
    if (isAccessible) {
      setTimeout(() => {
        onNext();
      }, 400);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Select Your Browser
      </h2>
      <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
        Choose the browser whose bookmarks you want to sync with your stash.
      </p>
      <div className="flex justify-end mb-3">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`p-1.5 rounded-lg transition-colors hover:bg-black/5 ${
            isLoading ? 'cursor-wait' : 'cursor-pointer'
          }`}
          aria-label="Refresh browsers"
        >
          <Icons.Refresh
            size={16}
            className={isLoading ? 'animate-spin' : ''}
            style={{ color: 'var(--monarch-text-muted)' }}
          />
        </button>
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div className="py-8 text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Detecting installed browsers...
        </div>
      )}

      {!isLoading && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ALL_BROWSER_TYPES.map((type) => {
              const browser = getBrowserData(type);
              const isInstalled = !!browser;
              const isSelected = selectedBrowser === type;
              const isAccessible = browser?.accessible ?? false;
              const needsPermissionWarning = isInstalled && !isAccessible && type === 'safari';
              const isDisabled = !isInstalled || (!isAccessible && type !== 'safari');

              return (
                <button
                  key={type}
                  onClick={() => !isDisabled && handleSelectBrowser(type)}
                  className="relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all h-28"
                  style={{
                    borderColor: isSelected ? 'var(--monarch-orange)' : 'var(--monarch-border)',
                    backgroundColor: isSelected ? 'var(--monarch-orange-bg)' : undefined,
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  disabled={isDisabled}
                >
                  {/* Warning badge for permission required */}
                  {needsPermissionWarning && !isSelected && (
                    <div className="absolute top-2 right-2" title="Requires permission">
                      <Icons.AlertCircle size={16} style={{ color: 'var(--monarch-warning)' }} />
                    </div>
                  )}

                  {/* Check mark for selected */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Icons.Check size={18} style={{ color: 'var(--monarch-orange)' }} />
                    </div>
                  )}

                  <BrowserIcon type={type} />
                  <div className="font-medium mt-2" style={{ color: 'var(--monarch-text-dark)' }}>
                    {getBrowserName(type)}
                  </div>

                  {/* Status text - only show for non-installed */}
                  {!isInstalled && (
                    <div className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                      Not installed
                    </div>
                  )}

                  {/* Permission required text */}
                  {needsPermissionWarning && (
                    <div className="text-xs mt-1" style={{ color: 'var(--monarch-warning)' }}>
                      Requires permission
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Safari permission flow */}
          {needsPermission && isSafari && (
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                borderColor: 'var(--monarch-warning)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icons.AlertCircle size={18} style={{ color: 'var(--monarch-warning)' }} />
                <h3 className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                  Safari Requires Full Disk Access
                </h3>
              </div>

              <p className="text-sm mb-3" style={{ color: 'var(--monarch-text-muted)' }}>
                To read Safari bookmarks, you need to grant Eclosion Full Disk Access in System
                Settings.
              </p>

              <ol
                className="text-sm mb-4 space-y-1 list-decimal list-inside"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                <li>Click the button below to open System Settings</li>
                <li>Go to Privacy & Security → Full Disk Access</li>
                <li>Click the "+" button at the bottom</li>
                <li>Navigate to Applications and select "Eclosion"</li>
                <li>Click "Open" and restart Eclosion</li>
              </ol>

              <button
                onClick={onRequestPermission}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--monarch-orange)',
                  color: 'white',
                }}
              >
                Open System Settings
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
