/**
 * Reduced Motion Hook
 *
 * Provides accessibility support for users who prefer reduced motion.
 * Use this hook to conditionally disable or simplify animations.
 */

import { useReducedMotion as useMotionReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';

/**
 * Empty variants for when motion is disabled
 */
const emptyVariants: Variants = {
  initial: {},
  animate: {},
  exit: {},
};

/**
 * Hook for checking and handling reduced motion preferences.
 *
 * @returns Object with:
 * - `prefersReduced`: boolean indicating if user prefers reduced motion
 * - `getVariants`: function that returns empty variants when reduced motion is preferred
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const { prefersReduced, getVariants } = useReducedMotion();
 *   const variants = getVariants(fadeVariants);
 *
 *   return (
 *     <motion.div variants={variants} initial="initial" animate="animate" exit="exit">
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useReducedMotion() {
  const prefersReduced = useMotionReducedMotion() ?? false;

  return {
    prefersReduced,
    /**
     * Returns empty variants if reduced motion is preferred,
     * otherwise returns the provided variants unchanged.
     */
    getVariants: <T extends Variants>(variants: T): T | Variants => {
      return prefersReduced ? emptyVariants : variants;
    },
  };
}
