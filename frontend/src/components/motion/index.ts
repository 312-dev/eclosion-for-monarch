/**
 * Motion Components and Utilities
 *
 * Re-exports animation primitives for use throughout the app.
 * Import from this module for consistent animation behavior.
 */

// Re-export motion and AnimatePresence from library
export { motion, AnimatePresence } from 'motion/react';
export type { Variants, Transition } from 'motion/react';

// Animation variants
export {
  TIMING,
  EASING,
  transitions,
  fadeVariants,
  scaleVariants,
  slideUpVariants,
  slideDownVariants,
  staggerContainerVariants,
  staggerItemVariants,
  collapseVariants,
  shakeVariants,
  buttonPressProps,
  cardHoverProps,
} from './variants';

// Hooks
export { useReducedMotion } from './useReducedMotion';
