/**
 * Feature Definitions
 *
 * Central data source for all Eclosion features.
 * Used by landing page, feature pages, and docs.
 *
 * To add a new feature:
 * 1. Add an entry to FEATURES array
 * 2. Set status: 'coming-soon' initially
 * 3. Change to 'available' when released
 */

import type { Icons } from '../components/icons';

export interface Benefit {
  icon: keyof typeof Icons;
  title: string;
  description: string;
}

export interface Screenshot {
  src: string;
  alt: string;
  caption?: string;
}

export interface FeatureDefinition {
  /** Unique identifier (used in routes) */
  id: string;

  /** Display name */
  name: string;

  /** Short tagline for cards */
  tagline: string;

  /** Full description for detail pages */
  description: string;

  /** Icon from the Icons object */
  icon: keyof typeof Icons;

  /** Feature availability status */
  status: 'available' | 'coming-soon' | 'beta';

  /** Release date for coming-soon features */
  releaseDate?: string;

  /** Feature benefits/selling points */
  benefits: Benefit[];

  /** Path to demo mode (e.g., '/demo/recurring') */
  demoPath?: string;

  /** Path in the authenticated app (e.g., '/recurring') */
  appPath: string;

  /** Screenshots for detail page */
  screenshots?: Screenshot[];

  /** GitHub issue number that originated this feature (for ideator attribution) */
  originIssue?: number;

  /** Directories/file patterns for auto-detecting contributors from git history */
  sourcePaths?: string[];
}

/**
 * All Eclosion features.
 * Order determines display order on landing page.
 */
export const FEATURES: FeatureDefinition[] = [
  {
    id: 'recurring',
    name: 'Recurring Expenses',
    tagline: 'Never be caught off guard by a bill again',
    description:
      'Automatically calculates monthly savings for annual, quarterly, and semi-annual expenses. Combine small subscriptions into a single "rollup" category.',
    icon: 'CalendarRecurring',
    status: 'available',
    benefits: [
      {
        icon: 'TrendDown',
        title: 'Smart Savings Calculation',
        description:
          'Automatically calculates monthly savings targets for annual, semi-annual, and quarterly expenses.',
      },
      {
        icon: 'Package',
        title: 'Rollup Mode',
        description:
          'Combine small subscriptions into a single category for simplified budgeting.',
      },
      {
        icon: 'CheckCircle',
        title: 'Progress Tracking',
        description:
          'See at a glance if you\'re on track, behind, or ahead on each expense.',
      },
      {
        icon: 'Sync',
        title: 'Monarch Sync',
        description:
          'Syncs directly with your Monarch Money account to update budget targets.',
      },
    ],
    demoPath: '/demo/recurring',
    appPath: '/recurring',
    // TODO: Set originIssue to the GitHub issue that originated this feature
    sourcePaths: [
      'frontend/src/components/tabs/RecurringTab.tsx',
      'frontend/src/components/recurring/',
      'frontend/src/components/RollupZone.tsx',
      'frontend/src/components/wizards/',
      'backend/recurring/',
    ],
  },
  {
    id: 'linked-goals',
    name: 'Joint Goals',
    tagline: 'Privacy-first shared goals',
    description:
      'Collaborate on financial goals without merging accounts or sacrificing privacy. Each partner keeps their own Monarch account—share only what you want to share.',
    icon: 'HeartHandshake',
    status: 'coming-soon',
    benefits: [
      {
        icon: 'Shield',
        title: 'Keep Your Privacy',
        description:
          'Share goal progress without exposing transactions, balances, or spending habits.',
      },
      {
        icon: 'Users',
        title: 'No Account Merging',
        description:
          'Both partners keep separate Monarch accounts. No need to delete or abandon existing setups.',
      },
      {
        icon: 'TrendUp',
        title: 'Combined Trajectory',
        description:
          'See when you\'ll reach goals together based on both contributions, without seeing each other\'s details.',
      },
      {
        icon: 'Gift',
        title: 'Celebrate Together',
        description:
          'Get notified when you hit milestones—without the all-or-nothing transparency.',
      },
    ],
    appPath: '/linked-goals',
  },
  {
    id: 'leaderboard',
    name: 'Leaderboard',
    tagline: 'Friendly competition with people you trust',
    description:
      'Compete with friends and family on a shared spending category. A fair scoring system factors in income so everyone can play. Daily, weekly, and monthly leaderboards keep things interesting.',
    icon: 'Trophy',
    status: 'coming-soon',
    benefits: [
      {
        icon: 'Shield',
        title: 'Privacy by Design',
        description:
          'P2P encryption means you only share your score—never your transactions, balances, or other financial data.',
      },
      {
        icon: 'Users',
        title: 'Fair Scoring',
        description:
          'Income-adjusted scoring levels the playing field so everyone can compete meaningfully.',
      },
      {
        icon: 'Trophy',
        title: 'Multiple Timeframes',
        description:
          'Daily, weekly, and monthly leaderboards let you compete at whatever pace works for your group.',
      },
      {
        icon: 'X',
        title: 'Leave Anytime',
        description:
          'Stop sharing whenever you want—like sharing Apple Health data, you stay in control.',
      },
    ],
    appPath: '/leaderboard',
  },
  {
    id: 'inbox-sync',
    name: 'Inbox Sync',
    tagline: 'Automatic transaction splits from your inbox',
    description:
      'Connect your email and automatically extract itemized receipts from Walmart, Costco, Uber, DoorDash, and more. Support for new merchants grows over time.',
    icon: 'Inbox',
    status: 'coming-soon',
    benefits: [
      {
        icon: 'Inbox',
        title: 'Email Integration',
        description: 'Securely connects to Gmail or Outlook with read-only access.',
      },
      {
        icon: 'Package',
        title: 'Smart Itemization',
        description:
          'Automatically splits transactions by item with accurate categories.',
      },
      {
        icon: 'Shield',
        title: 'Completely Private',
        description: 'Your emails are processed locally and never sent anywhere.',
      },
      {
        icon: 'Sync',
        title: 'Growing Coverage',
        description:
          'New merchants added regularly. Walmart, Costco, Uber, DoorDash, and more.',
      },
    ],
    appPath: '/inbox-sync',
    originIssue: 84,
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a feature by its ID.
 */
export function getFeatureById(id: string): FeatureDefinition | undefined {
  return FEATURES.find((f) => f.id === id);
}

/**
 * Get all available (released) features.
 */
export function getAvailableFeatures(): FeatureDefinition[] {
  return FEATURES.filter((f) => f.status === 'available');
}

/**
 * Get all coming-soon features.
 */
export function getComingSoonFeatures(): FeatureDefinition[] {
  return FEATURES.filter((f) => f.status === 'coming-soon');
}

/**
 * Get all beta features.
 */
export function getBetaFeatures(): FeatureDefinition[] {
  return FEATURES.filter((f) => f.status === 'beta');
}

/**
 * Get feature count by status.
 */
export function getFeatureCounts(): {
  available: number;
  comingSoon: number;
  beta: number;
  total: number;
} {
  return {
    available: getAvailableFeatures().length,
    comingSoon: getComingSoonFeatures().length,
    beta: getBetaFeatures().length,
    total: FEATURES.length,
  };
}
