/**
 * Demo Wishlist Configuration API
 *
 * LocalStorage-based implementation of wishlist config for demo mode.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type { WishlistConfig } from '../../types';

/**
 * Get category groups for wishlist selections.
 */
export async function getWishlistCategoryGroups(): Promise<{ id: string; name: string }[]> {
  await simulateDelay();
  return getDemoState().categoryGroups;
}

/**
 * Get wishlist configuration.
 */
export async function getWishlistConfig(): Promise<WishlistConfig> {
  await simulateDelay();
  return getDemoState().wishlistConfig;
}

/**
 * Update wishlist configuration.
 */
export async function updateWishlistConfig(
  updates: Partial<WishlistConfig>
): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    wishlistConfig: { ...state.wishlistConfig, ...updates },
  }));
  return { success: true };
}

/**
 * Fetch og:image from a URL (demo mode stub).
 */
export async function fetchOgImage(_url: string): Promise<string | null> {
  return null;
}
