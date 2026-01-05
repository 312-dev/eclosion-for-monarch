/**
 * useLandingContent
 *
 * Hook to access landing page content based on current coder mode.
 * Returns appropriate text content for coder vs non-coder audiences.
 */

import { useCallback } from 'react';
import { useCoderModeSafe } from '../context';
import {
  LANDING_CONTENT,
  type ContentVariant,
  type LandingContentSection,
  type LandingContentKey,
} from '../data/landingContent';

interface UseLandingContentReturn {
  /** Get content for a specific section and key */
  getContent: <T extends LandingContentSection>(
    section: T,
    key: LandingContentKey<T>
  ) => string;
  /** Whether coder mode is active */
  isCoderMode: boolean;
}

export function useLandingContent(): UseLandingContentReturn {
  const coderMode = useCoderModeSafe();
  const isCoderMode = coderMode?.isCoderMode ?? false;

  const getContent = useCallback(
    <T extends LandingContentSection>(section: T, key: LandingContentKey<T>): string => {
      const variant = LANDING_CONTENT[section][key] as ContentVariant;
      return isCoderMode ? variant.coder : variant.friendly;
    },
    [isCoderMode]
  );

  return { getContent, isCoderMode };
}
