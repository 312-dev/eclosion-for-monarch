/**
 * Appearance Settings
 *
 * Settings section for theme and landing page preferences.
 */

import { useState } from 'react';
import { Sun, Moon, Monitor, Home } from 'lucide-react';
import { SearchableSelect } from '../SearchableSelect';
import { useTheme, type Theme } from '../../context/ThemeContext';
import { getLandingPage, setLandingPage } from '../../App';
import { RecurringIcon } from '../wizards/WizardComponents';

type LandingPage = 'dashboard' | 'recurring';

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={16} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  { value: 'system', label: 'System', icon: <Monitor size={16} /> },
];

const landingPageOptions: { value: LandingPage; label: string; icon: React.ReactNode }[] = [
  { value: 'dashboard', label: 'Dashboard', icon: <Home size={16} /> },
  { value: 'recurring', label: 'Recurring', icon: <RecurringIcon size={16} /> },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [landingPage, setLandingPageState] = useState<LandingPage>(() => {
    const stored = getLandingPage();
    return stored === '/recurring' ? 'recurring' : 'dashboard';
  });

  const handleLandingPageChange = (page: LandingPage) => {
    setLandingPageState(page);
    setLandingPage(page);
  };

  return (
    <section className="mb-8">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        Appearance
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Theme Setting */}
        <div
          className="p-4"
          style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                Theme
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Choose your preferred color scheme
              </div>
            </div>

            {/* Segmented Control Toggle */}
            <div
              className="flex rounded-lg p-1"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all border-none cursor-pointer"
                  style={{
                    backgroundColor:
                      theme === option.value ? 'var(--monarch-bg-card)' : 'transparent',
                    color:
                      theme === option.value
                        ? 'var(--monarch-orange)'
                        : 'var(--monarch-text-muted)',
                    boxShadow: theme === option.value ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                  }}
                >
                  {option.icon}
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Landing Page Setting */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                Landing Page
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Choose where to go after login
              </div>
            </div>

            <SearchableSelect
              value={landingPage}
              onChange={(val) => handleLandingPageChange(val as LandingPage)}
              options={landingPageOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              searchable={false}
              className="min-w-32"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
