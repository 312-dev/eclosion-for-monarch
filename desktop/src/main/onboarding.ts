/**
 * First-Run Onboarding
 *
 * Detects first run and provides onboarding content for desktop-specific features.
 * The actual UI is rendered in the frontend; this module handles state and content.
 */

import Store from 'electron-store';
import { debugLog } from './logger';

const store = new Store();

/**
 * Store key for tracking onboarding completion.
 */
const ONBOARDING_COMPLETE_KEY = 'onboarding.complete';
const ONBOARDING_VERSION_KEY = 'onboarding.version';

/**
 * Current onboarding version. Increment when adding significant new features
 * that warrant showing onboarding again to existing users.
 */
const CURRENT_ONBOARDING_VERSION = 1;

/**
 * Onboarding step content.
 */
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: 'tray' | 'rocket' | 'keyboard' | 'link' | 'sync' | 'settings';
  tip?: string;
}

/**
 * Onboarding content for desktop-specific features.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Eclosion Desktop',
    description:
      'Eclosion runs in the background to keep your recurring expenses synced with Monarch Money. Here are some desktop-specific features to help you get the most out of it.',
    icon: 'rocket',
  },
  {
    id: 'tray',
    title: 'System Tray',
    description:
      "Eclosion lives in your system tray (menu bar on macOS). You can access quick actions like Sync, Settings, and Quit from there. The app continues running even when you close the window.",
    icon: 'tray',
    tip: 'On macOS, you can enable "Hide from Dock" in Settings > Desktop to run Eclosion as a menu bar-only app.',
  },
  {
    id: 'autostart',
    title: 'Start at Login',
    description:
      'Enable "Start at Login" in Settings > Desktop to have Eclosion automatically start when you log in. Your recurring expenses will always stay synced.',
    icon: 'settings',
    tip: 'Combined with "Run in Background", Eclosion can sync silently without interrupting your workflow.',
  },
  {
    id: 'hotkeys',
    title: 'Keyboard Shortcuts',
    description:
      'Use global keyboard shortcuts to quickly access Eclosion from anywhere:\n\n• Cmd/Ctrl+Shift+E — Show/hide window\n• Cmd/Ctrl+Shift+S — Trigger sync',
    icon: 'keyboard',
    tip: 'You can customize these shortcuts in Settings > Desktop > Keyboard Shortcuts.',
  },
  {
    id: 'deeplinks',
    title: 'Deep Links',
    description:
      'Use eclosion:// links to open specific views directly:\n\n• eclosion://recurring — Open recurring expenses\n• eclosion://settings — Open settings\n• eclosion://sync — Trigger a sync',
    icon: 'link',
    tip: 'You can create automation shortcuts using these links with tools like Alfred, Raycast, or system shortcuts.',
  },
  {
    id: 'sync',
    title: 'Automatic Sync',
    description:
      'Eclosion automatically syncs after your computer wakes from sleep. You can also trigger a manual sync anytime from the tray menu or using the keyboard shortcut.',
    icon: 'sync',
  },
];

/**
 * Check if onboarding should be shown.
 * Returns true if:
 * - This is the first run, OR
 * - The onboarding version has increased since last completion
 */
export function shouldShowOnboarding(): boolean {
  const isComplete = store.get(ONBOARDING_COMPLETE_KEY, false) as boolean;
  const completedVersion = store.get(ONBOARDING_VERSION_KEY, 0) as number;

  // Show if never completed
  if (!isComplete) {
    debugLog('Onboarding: First run detected');
    return true;
  }

  // Show if new onboarding version available
  if (completedVersion < CURRENT_ONBOARDING_VERSION) {
    debugLog(`Onboarding: New version available (completed: ${completedVersion}, current: ${CURRENT_ONBOARDING_VERSION})`);
    return true;
  }

  return false;
}

/**
 * Mark onboarding as complete.
 */
export function completeOnboarding(): void {
  store.set(ONBOARDING_COMPLETE_KEY, true);
  store.set(ONBOARDING_VERSION_KEY, CURRENT_ONBOARDING_VERSION);
  debugLog('Onboarding: Marked as complete');
}

/**
 * Reset onboarding state (for testing or re-showing).
 */
export function resetOnboarding(): void {
  store.delete(ONBOARDING_COMPLETE_KEY);
  store.delete(ONBOARDING_VERSION_KEY);
  debugLog('Onboarding: Reset');
}

/**
 * Get onboarding data for the frontend.
 */
export function getOnboardingData(): {
  shouldShow: boolean;
  steps: OnboardingStep[];
  version: number;
} {
  return {
    shouldShow: shouldShowOnboarding(),
    steps: ONBOARDING_STEPS,
    version: CURRENT_ONBOARDING_VERSION,
  };
}
