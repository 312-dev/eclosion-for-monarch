/**
 * Mockup Data
 *
 * Hardcoded demo data for marketing page mockups.
 * These render actual React components at reduced scale
 * to look like polished screenshots.
 */

import type { Icons } from '../components/icons';

export interface MockupRollupItem {
  id: string;
  icon: keyof typeof Icons;
  iconColor: string;
  name: string;
  amount: number;
  status: 'funded' | 'on_track' | 'behind';
}

export interface MockupIndividualItem {
  id: string;
  icon: keyof typeof Icons;
  iconColor: string;
  name: string;
  amount: number;
  dueIn: string;
  progress: number;
  /** Current monthly budget */
  budget: number;
  /** Target monthly amount needed */
  target: number;
  status: 'funded' | 'on_track' | 'behind';
}

export const MOCKUP_ROLLUP_ITEMS: MockupRollupItem[] = [
  {
    id: 'netflix',
    icon: 'Monitor',
    iconColor: '#E50914',
    name: 'Netflix',
    amount: 15.99,
    status: 'funded',
  },
  {
    id: 'spotify',
    icon: 'Music',
    iconColor: '#1DB954',
    name: 'Spotify',
    amount: 10.99,
    status: 'funded',
  },
  {
    id: 'domain',
    icon: 'Globe',
    iconColor: '#3B82F6',
    name: 'Domain',
    amount: 1.17,
    status: 'on_track',
  },
];

export const MOCKUP_INDIVIDUAL_ITEMS: MockupIndividualItem[] = [
  {
    id: 'car-insurance',
    icon: 'Car',
    iconColor: '#8B5CF6',
    name: 'Car Insurance',
    amount: 600,
    dueIn: '3 months',
    progress: 42,
    budget: 100,
    target: 150,
    status: 'behind',
  },
  {
    id: 'amazon-prime',
    icon: 'Package',
    iconColor: '#F59E0B',
    name: 'Amazon Prime',
    amount: 139,
    dueIn: '5 months',
    progress: 25,
    budget: 28,
    target: 28,
    status: 'on_track',
  },
];

export const MOCKUP_ROLLUP_TOTAL = MOCKUP_ROLLUP_ITEMS.reduce(
  (sum, item) => sum + item.amount,
  0
);

export const MOCKUP_MONTHLY_TOTAL = 148.95;
