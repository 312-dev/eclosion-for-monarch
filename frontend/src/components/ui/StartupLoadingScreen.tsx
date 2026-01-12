/**
 * StartupLoadingScreen Component
 *
 * Displays a loading screen while waiting for the backend to start.
 * Features:
 * - Animated progress bar
 * - Rotating humorous messages that change every 10 seconds
 * - Self-deprecating humor that increases as wait time grows
 * - Error state after 3 minutes
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

/** Message phases based on elapsed time */
const MESSAGES = {
  // 0-30 seconds: Optimistic and confident
  early: [
    'Rome wasn\'t built in a day, but your app will be ready in seconds...',
    'Warming up the engines...',
    'Preparing something wonderful...',
    'Loading awesomeness...',
  ],
  // 30-60 seconds: Still positive but acknowledging the wait
  acknowledgingDelay: [
    'Still working on it... good things take time!',
    'Almost there... probably...',
    'The backend is doing some heavy lifting...',
    'Taking a bit longer than expected, but we\'re on it!',
  ],
  // 60-90 seconds: Getting self-deprecating
  gettingLong: [
    'Okay, this is taking a while. We apologize profusely.',
    'Our hamsters are running as fast as they can...',
    'If you\'re reading this, we owe you a coffee.',
    'Plot twist: the backend wanted a dramatic entrance.',
  ],
  // 90-120 seconds: Full self-deprecation mode
  veryLong: [
    'At this point, we\'re as surprised as you are.',
    'The intern may have unplugged something...',
    'We\'re starting to sweat over here...',
    'Fun fact: this delay is not a feature.',
  ],
  // 120-180 seconds: Crisis mode with humor
  crisis: [
    'We\'ve sent a search party for the backend.',
    'Contemplating life choices that led to this moment...',
    'The server is in witness protection. We\'re negotiating.',
    'If this were a movie, dramatic music would be playing.',
  ],
};

/** Time thresholds in seconds */
const THRESHOLDS = {
  ACKNOWLEDGE_DELAY: 30,
  GETTING_LONG: 60,
  VERY_LONG: 90,
  CRISIS: 120,
  TIMEOUT: 180,
};

/** Message rotation interval in milliseconds */
const MESSAGE_INTERVAL = 10000;

/** Progress bar animation - estimate based on typical startup times */
const ESTIMATED_STARTUP_TIME = 10000; // 10 seconds typical

/** Error message shown when startup times out */
const TIMEOUT_ERROR_MESSAGE = 'Please restart the application or check the logs for errors.';

interface StartupLoadingScreenProps {
  /** Callback when timeout (3 minutes) is reached */
  onTimeout?: () => void;
  /** Whether the backend is connected (triggers transition) */
  isConnected?: boolean;
}

export function StartupLoadingScreen({
  onTimeout,
  isConnected = false,
}: StartupLoadingScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [messageRotationCount, setMessageRotationCount] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Derive fading state and final progress from isConnected
  const isFadingOut = isConnected;
  const progress = isConnected ? 100 : animatedProgress;

  // Get the appropriate message pool based on elapsed time
  const getMessagePool = useCallback((seconds: number): string[] => {
    if (seconds >= THRESHOLDS.CRISIS) return MESSAGES.crisis;
    if (seconds >= THRESHOLDS.VERY_LONG) return MESSAGES.veryLong;
    if (seconds >= THRESHOLDS.GETTING_LONG) return MESSAGES.gettingLong;
    if (seconds >= THRESHOLDS.ACKNOWLEDGE_DELAY) return MESSAGES.acknowledgingDelay;
    return MESSAGES.early;
  }, []);

  // Derive current message from rotation count and elapsed time (no useState needed)
  const currentMessage = useMemo(() => {
    const pool = getMessagePool(elapsedSeconds);
    return pool[messageRotationCount % pool.length];
  }, [elapsedSeconds, messageRotationCount, getMessagePool]);

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= THRESHOLDS.TIMEOUT) {
          onTimeout?.();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  // Message rotation every 10 seconds
  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageRotationCount((prev) => prev + 1);
    }, MESSAGE_INTERVAL);

    return () => clearInterval(messageTimer);
  }, []);

  // Animate progress bar (only when not connected)
  useEffect(() => {
    if (isConnected) return;

    const progressTimer = setInterval(() => {
      setAnimatedProgress((prev) => {
        // Asymptotic progress - never quite reaches 100% until connected
        // Uses logarithmic slowdown to create realistic "almost there" feel
        const elapsed = elapsedSeconds * 1000;
        const baseProgress = Math.min(95, (elapsed / ESTIMATED_STARTUP_TIME) * 80);

        // Add some randomness to feel more natural
        const jitter = Math.random() * 2 - 1;

        // Slow down as we approach 95%
        const slowdown = 1 - (prev / 100) * 0.8;
        const increment = slowdown * 0.5 + jitter * 0.1;

        return Math.min(95, Math.max(prev, baseProgress + increment));
      });
    }, 100);

    return () => clearInterval(progressTimer);
  }, [elapsedSeconds, isConnected]);

  // Timeout state
  const isTimedOut = elapsedSeconds >= THRESHOLDS.TIMEOUT;

  // Get status text based on phase
  const getStatusText = (): string => {
    if (isTimedOut) return 'Unable to connect to server';
    if (elapsedSeconds >= THRESHOLDS.CRISIS) return 'This is taking much longer than expected...';
    if (elapsedSeconds >= THRESHOLDS.VERY_LONG) return 'Still trying to connect...';
    if (elapsedSeconds >= THRESHOLDS.GETTING_LONG) return 'Hang tight...';
    if (elapsedSeconds >= THRESHOLDS.ACKNOWLEDGE_DELAY) return 'This is taking a bit longer than usual...';
    return 'Starting up...';
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md px-6 text-center">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--monarch-orange)' }}
          >
            <span className="text-2xl font-bold text-white">E</span>
          </div>
          <span
            className="text-2xl font-semibold"
            style={{
              color: 'var(--monarch-text-dark)',
              fontFamily: 'var(--font-logo)',
            }}
          >
            Eclosion
          </span>
        </div>

        {/* Spinner or error icon */}
        {isTimedOut ? (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--monarch-error-bg)' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: 'var(--monarch-error)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        ) : (
          <LoadingSpinner
            size="lg"
            color="var(--monarch-orange)"
            label="Starting application"
          />
        )}

        {/* Status text */}
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          {getStatusText()}
        </p>

        {/* Progress bar */}
        <div className="w-full">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--monarch-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: isTimedOut
                  ? 'var(--monarch-error)'
                  : 'var(--monarch-orange)',
              }}
            />
          </div>
          {!isTimedOut && (
            <p
              className="mt-2 text-xs"
              style={{ color: 'var(--monarch-text-light)' }}
            >
              {Math.round(progress)}%
            </p>
          )}
        </div>

        {/* Rotating message */}
        <div
          className="min-h-[3rem] flex items-center justify-center"
          key={currentMessage}
        >
          <p
            className="text-sm italic animate-fade-in"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {isTimedOut
              ? TIMEOUT_ERROR_MESSAGE
              : `"${currentMessage}"`}
          </p>
        </div>

        {/* Elapsed time (shown after 30 seconds) */}
        {elapsedSeconds >= THRESHOLDS.ACKNOWLEDGE_DELAY && (
          <p
            className="text-xs animate-fade-in"
            style={{ color: 'var(--monarch-text-light)' }}
          >
            Waiting for {elapsedSeconds} seconds...
          </p>
        )}

        {/* Timeout action */}
        {isTimedOut && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg font-medium transition-colors btn-press"
            style={{
              backgroundColor: 'var(--monarch-orange)',
              color: 'white',
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
