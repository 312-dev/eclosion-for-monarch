/* eslint-disable max-lines -- Feature data file; keeping all features together aids maintainability */
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
        description: 'Combine small subscriptions into a single category for simplified budgeting.',
      },
      {
        icon: 'CheckCircle',
        title: 'Progress Tracking',
        description: "See at a glance if you're on track, behind, or ahead on each expense.",
      },
      {
        icon: 'Sync',
        title: 'Monarch Sync',
        description: 'Syncs directly with your Monarch Money account to update budget targets.',
      },
    ],
    demoPath: '/demo/recurring/',
    appPath: '/recurring',
    sourcePaths: [
      'frontend/src/components/tabs/RecurringTab.tsx',
      'frontend/src/components/recurring/',
      'frontend/src/components/RollupZone.tsx',
      'frontend/src/components/wizards/',
      'backend/recurring/',
    ],
  },
  {
    id: 'notes',
    name: 'Monthly Notes',
    tagline: 'Remember why you set each budget',
    description:
      'Add notes to any Monarch category or category group. Write once, and your notes automatically carry forward each month until you change them.',
    icon: 'Edit',
    status: 'available',
    benefits: [
      {
        icon: 'Edit',
        title: 'Category Notes',
        description:
          'Attach notes to any category or group to remember why you set certain budgets.',
      },
      {
        icon: 'Calendar',
        title: 'Carry Forward Monthly',
        description: 'Your notes automatically appear in future months until you change them.',
      },
      {
        icon: 'Clock',
        title: 'Revision History',
        description: 'See how your notes evolved over time and jump between versions.',
      },
      {
        icon: 'Zap',
        title: 'Inline Math',
        description: 'Type math expressions and press Tab to evaluate them inline.',
      },
    ],
    demoPath: '/demo/notes/',
    appPath: '/notes',
    sourcePaths: ['frontend/src/components/tabs/NotesTab.tsx', 'frontend/src/components/notes/'],
  },
  {
    id: 'stashes',
    name: 'Stashes',
    tagline: 'Track and reach your savings goals',
    description:
      'Create a visual dashboard of savings goals for things you want. Set target amounts and dates, track your progress with status badges, and organize cards your way with drag and drop.',
    icon: 'Coins',
    status: 'available',
    benefits: [
      {
        icon: 'Package',
        title: 'Visual Dashboard',
        description: 'Drag, drop, and resize cards to organize your savings goals your way.',
      },
      {
        icon: 'CheckCircle',
        title: 'Progress Tracking',
        description: "See status badges showing if you're funded, on track, or behind.",
      },
      {
        icon: 'Target',
        title: 'Target Dates',
        description: 'Set goal dates and see monthly savings targets calculated automatically.',
      },
      {
        icon: 'Bookmark',
        title: 'Browser Sync',
        description: 'Optionally sync stashes from Firefox, Chrome, Edge, or Safari bookmarks.',
      },
    ],
    demoPath: '/demo/stashes/',
    appPath: '/stashes',
    sourcePaths: [
      'frontend/src/components/tabs/StashTab.tsx',
      'frontend/src/components/stash/',
      'services/stash_service.py',
    ],
  },
  {
    id: 'ifttt',
    name: 'IFTTT Integration',
    tagline: 'Connect to 900+ apps and services',
    description:
      'Automate your financial workflows by connecting Eclosion to IFTTT. Trigger actions when goals are funded, budgets are exceeded, or sync completes. Send notifications, update spreadsheets, or connect to smart home devices.',
    icon: 'Ifttt',
    status: 'coming-soon',
    releaseDate: 'February 2026',
    benefits: [
      {
        icon: 'Zap',
        title: 'Powerful Automation',
        description:
          'Create automated workflows triggered by budget events, goal milestones, and sync completions.',
      },
      {
        icon: 'Globe',
        title: '900+ App Connections',
        description:
          'Connect to Slack, Google Sheets, smart lights, email, SMS, and hundreds more via IFTTT.',
      },
      {
        icon: 'Bell',
        title: 'Custom Notifications',
        description:
          'Get notified your way when you hit savings milestones or exceed budget limits.',
      },
      {
        icon: 'Shield',
        title: 'Secure by Design',
        description:
          'Your financial data stays private—only trigger events are shared, never account details.',
      },
    ],
    appPath: '/settings',
    sourcePaths: [
      'blueprints/ifttt.py',
      'services/ifttt_service.py',
      'frontend/src/components/settings/desktop/IftttSection.tsx',
      'workers/ifttt-service/',
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
          "See when you'll reach goals together based on both contributions, without seeing each other's details.",
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
    tagline: 'Automatic transaction splits—without cloud or third-party providers',
    description:
      'Connect your email and automatically extract itemized receipts from Walmart, Costco, Uber, DoorDash, and more—all processed locally without cloud or third-party providers.',
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
        description: 'Automatically splits transactions by item with accurate categories.',
      },
      {
        icon: 'Shield',
        title: 'Completely Private',
        description: 'Your emails are processed locally and never sent anywhere.',
      },
      {
        icon: 'Sync',
        title: 'Growing Coverage',
        description: 'New merchants added regularly. Walmart, Costco, Uber, DoorDash, and more.',
      },
    ],
    appPath: '/inbox-sync',
    originIssue: 84,
  },
  {
    id: 'shared-budget',
    name: 'Shared Budget',
    tagline: 'Track and split shared expenses each month',
    description:
      "Tag expenses you share with a roommate or partner—rent, utilities, groceries, date nights—and split them automatically each month. Set a default ratio, adjust individual transactions when needed, and settle up when you're ready.",
    icon: 'Split',
    status: 'coming-soon',
    benefits: [
      {
        icon: 'Bookmark',
        title: 'Tag Shared Expenses',
        description:
          'Mark transactions as shared—rent, utilities, groceries, date nights, or anything you split.',
      },
      {
        icon: 'Split',
        title: 'Automatic Ratio Splitting',
        description:
          'Set a default split ratio (50/50, 60/40, income-based) that applies to all tagged transactions.',
      },
      {
        icon: 'Edit',
        title: 'Adjust Per Transaction',
        description:
          'Override the ratio on specific transactions—you paid for dinner, they paid for the movie.',
      },
      {
        icon: 'CheckCircle',
        title: 'Settle Debt',
        description:
          "See who owes what at month's end and mark debts as settled when you square up.",
      },
    ],
    appPath: '/shared-budget',
  },
  {
    id: 'allowance',
    name: 'Allowance',
    tagline: 'Reward yourself for building good habits',
    description:
      'Award yourself an allowance based on completing habits and chores in real life. Connect your daily wins to your spending money and build financial discipline through positive reinforcement.',
    icon: 'Wallet',
    status: 'coming-soon',
    benefits: [
      {
        icon: 'CheckCircle',
        title: 'Habit Tracking',
        description:
          'Define habits and chores you want to complete—exercise, cleaning, reading, etc.',
      },
      {
        icon: 'Coins',
        title: 'Earn Your Allowance',
        description: 'Complete habits to earn allowance credits that add up over time.',
      },
      {
        icon: 'Target',
        title: 'Flexible Rewards',
        description:
          'Set your own reward values—a workout might be worth $5, while deep cleaning earns $20.',
      },
      {
        icon: 'TrendUp',
        title: 'Positive Reinforcement',
        description:
          'Build financial discipline by connecting good habits to tangible spending power.',
      },
    ],
    appPath: '/allowance',
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
