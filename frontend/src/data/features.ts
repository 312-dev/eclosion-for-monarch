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
}

/**
 * All Eclosion features.
 * Order determines display order on landing page.
 */
export const FEATURES: FeatureDefinition[] = [
  {
    id: 'recurring',
    name: 'Recurring Expenses',
    tagline: 'Never miss a bill again',
    description:
      'Automatically track and manage recurring expenses with smart category allocation. Eclosion calculates monthly savings targets for annual, semi-annual, and quarterly expenses so you\'re always prepared when bills come due.',
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
  },
  {
    id: 'linked-goals',
    name: 'Linked Goals',
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
