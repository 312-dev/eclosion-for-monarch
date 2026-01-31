/**
 * Radio/Broadcast Icon with Animation
 *
 * Animated icon showing signal waves emanating from a central point.
 * Used to indicate remote access status.
 */

import type { Variants } from 'motion/react';
import { motion, useAnimation } from 'motion/react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from 'react';

export interface RadioIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface RadioIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  color?: string;
  /** If true, loops animation automatically */
  autoAnimate?: boolean;
  /** Interval between animation loops in ms (default: 3000) */
  animationInterval?: number;
}

const VARIANTS: Variants = {
  normal: {
    opacity: 1,
    transition: {
      duration: 0.4,
    },
  },
  fadeOut: {
    opacity: 0,
    transition: { duration: 0.3 },
  },
  fadeIn: (i: number) => ({
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      delay: i * 0.1,
    },
  }),
};

export const RadioIcon = forwardRef<RadioIconHandle, RadioIconProps>(
  (
    {
      className,
      size = 20,
      color = 'currentColor',
      autoAnimate = false,
      animationInterval = 3000,
      ...props
    },
    ref
  ) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const runAnimation = useCallback(async () => {
      await controls.start('fadeOut');
      controls.start('fadeIn');
    }, [controls]);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: runAnimation,
        stopAnimation: () => controls.start('normal'),
      };
    });

    // Auto-animate loop
    useEffect(() => {
      if (autoAnimate && !isControlledRef.current) {
        // Run once immediately
        runAnimation();

        // Then loop
        intervalRef.current = setInterval(() => {
          runAnimation();
        }, animationInterval);

        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      }
    }, [autoAnimate, animationInterval, runAnimation]);

    return (
      <div className={className} {...props}>
        <svg
          fill="none"
          height={size}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={controls}
            custom={1}
            d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"
            initial={{ opacity: 1 }}
            variants={VARIANTS}
          />
          <motion.path
            animate={controls}
            custom={0}
            d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"
            initial={{ opacity: 1 }}
            variants={VARIANTS}
          />
          <circle cx="12" cy="12" r="2" fill={color} stroke="none" />
          <motion.path
            animate={controls}
            custom={0}
            d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"
            initial={{ opacity: 1 }}
            variants={VARIANTS}
          />
          <motion.path
            animate={controls}
            custom={1}
            d="M19.1 4.9C23 8.8 23 15.1 19.1 19"
            initial={{ opacity: 1 }}
            variants={VARIANTS}
          />
        </svg>
      </div>
    );
  }
);

RadioIcon.displayName = 'RadioIcon';
