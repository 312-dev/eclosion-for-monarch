/**
 * Ideas Animation Utilities
 *
 * Constants, types, and utility functions for the Ideas Board animation.
 */

import type { PublicIdea } from '../../../types/ideas';

/** Developer contributor info */
export interface DeveloperContributor {
  id: number;
  seed: number;
  username: string;
}

// Fake usernames for ideas without authors
const FAKE_USERNAMES = [
  'BudgetPro',
  'MonarchFan',
  'SavvySaver',
  'FinanceNinja',
  'PennyPincher',
  'CashFlowKing',
  'FrugalFiona',
  'WealthBuilder',
  'SmartSpender',
  'GoalGetter',
];

// Developer usernames for animation
const DEVELOPER_USERNAMES = [
  'CodeCrafter',
  'BugSquasher',
  'FeatureSmith',
  'DevDynamo',
  'ShipItSam',
  'ReactRocket',
  'TypeScriptTitan',
  'APIArchitect',
  'FullStackFiona',
  'CommitKing',
];

// Animation timing configuration
export const ANIMATION_CONFIG = {
  STACK_SIZE: 3,
  DROP_IN_DELAY: 1500,
  DROP_IN_DELAY_INITIAL: 3500,
  POST_RESET_DELAY: 100,
  VOTE_START_DELAY: 2500,
  VOTE_ANIMATION_DURATION: 3000,
  VOTE_FRAME_INTERVAL: 16,
  RESET_FADE_DURATION: 600,
  SHIPPED_DISPLAY_DURATION: 10000,
  MORPH_DURATION: 600,
  MAX_DEVELOPERS: 5,
  DEV_APPEAR_INTERVAL_INITIAL: 1200,
  DEV_APPEAR_INTERVAL_MIN: 400,
  PROGRESS_UPDATE_INTERVAL: 50,
} as const;

/** Generate a random odd number between min and max (inclusive) */
export function getRandomOddNumber(min: number, max: number): number {
  const oddMin = min % 2 === 0 ? min + 1 : min;
  const oddMax = max % 2 === 0 ? max - 1 : max;
  const range = Math.floor((oddMax - oddMin) / 2) + 1;
  return oddMin + Math.floor(Math.random() * range) * 2;
}

/** Ease-in quadratic - starts slow, speeds up */
export function easeInQuad(t: number): number {
  return t * t;
}

/** Fisher-Yates shuffle */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/** Generate a random developer contributor */
export function generateRandomDeveloper(id: number, usedSeeds: Set<number>): DeveloperContributor {
  let seed: number;
  do {
    seed = Math.floor(Math.random() * 10000);
  } while (usedSeeds.has(seed));
  usedSeeds.add(seed);

  const usernameIndex = Math.floor(Math.random() * DEVELOPER_USERNAMES.length);
  return {
    id,
    seed,
    username: DEVELOPER_USERNAMES[usernameIndex] ?? 'Developer',
  };
}

/** Generate a deterministic hash from a string */
function hashString(str: string): number {
  return str.split('').reduce((acc, char) => acc + (char.codePointAt(0) ?? 0), 0);
}

/** Get username for an idea - uses real author if available, falls back to synthetic */
export function getUsernameForIdea(idea: PublicIdea): string {
  if (idea.author?.username) {
    return idea.author.username;
  }
  const hash = hashString(idea.id);
  return FAKE_USERNAMES[hash % FAKE_USERNAMES.length] ?? 'BudgetFan';
}

/** Get avatar URL for an idea - uses real author if available, falls back to DiceBear */
export function getAvatarUrlForIdea(idea: PublicIdea): string {
  if (idea.author?.avatarUrl) {
    return idea.author.avatarUrl;
  }
  const seed = hashString(idea.id);
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=f3f4f6`;
}
