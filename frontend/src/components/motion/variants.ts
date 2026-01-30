/**
 * Shared Animation Variants
 *
 * Centralized animation definitions that match the CSS timing variables.
 * Use these with motion components for consistent animations across the app.
 */

import type { Variants, Transition } from 'motion/react';

/**
 * Animation timing constants (in seconds)
 * Matches CSS variables: --animation-fast, --animation-normal, --animation-slow
 */
export const TIMING = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
} as const;

/**
 * Easing curves matching CSS variables
 */
export const EASING = {
  smooth: [0.25, 0.46, 0.45, 0.94],
  back: [0.34, 1.56, 0.64, 1],
  inOut: [0.4, 0, 0.2, 1],
} as const;

/**
 * Standard transitions
 */
export const transitions = {
  fast: { duration: TIMING.fast, ease: EASING.smooth } satisfies Transition,
  normal: { duration: TIMING.normal, ease: EASING.smooth } satisfies Transition,
  slow: { duration: TIMING.slow, ease: EASING.smooth } satisfies Transition,
  spring: { type: 'spring', damping: 25, stiffness: 300 } satisfies Transition,
  springBouncy: { type: 'spring', damping: 20, stiffness: 400 } satisfies Transition,
} as const;

/**
 * Fade in/out animation
 */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.normal },
  exit: { opacity: 0, transition: transitions.fast },
};

/**
 * Scale in/out animation (for modals, dialogs)
 */
export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: transitions.normal },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
};

/**
 * Slide up animation (for toasts, notifications)
 */
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: transitions.spring },
  exit: { opacity: 0, x: -100, transition: transitions.fast },
};

/**
 * Slide down animation (for dropdowns)
 */
export const slideDownVariants: Variants = {
  initial: { opacity: 0, y: -8, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: transitions.fast },
  exit: { opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.1 } },
};

/**
 * List container with staggered children
 */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

/**
 * List item animation (use with staggerContainerVariants)
 */
export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: transitions.normal },
};

/**
 * Accordion/collapsible content animation
 */
export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: TIMING.normal } },
  exit: { height: 0, opacity: 0, transition: { duration: TIMING.fast } },
};

/**
 * Error shake animation - matches CSS errorShake keyframes
 */
export const shakeVariants: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -3, 3, -2, 2, 0],
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
};

/**
 * Button press animation props (use with whileTap)
 */
export const buttonPressProps = {
  whileTap: { scale: 0.97 },
  transition: transitions.fast,
} as const;

/**
 * Card hover animation props (use with whileHover)
 */
export const cardHoverProps = {
  whileHover: { y: -2, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)' },
  transition: transitions.fast,
} as const;
