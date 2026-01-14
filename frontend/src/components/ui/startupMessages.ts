/**
 * Startup Loading Screen Messages
 *
 * Humorous messages displayed during startup, organized by wait time.
 */

/** Message phases based on elapsed time */
export const STARTUP_MESSAGES = {
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
export const STARTUP_THRESHOLDS = {
  ACKNOWLEDGE_DELAY: 30,
  GETTING_LONG: 60,
  VERY_LONG: 90,
  CRISIS: 120,
  TIMEOUT: 180,
};

/** Message rotation interval in milliseconds */
export const MESSAGE_INTERVAL = 10000;

/** Progress bar animation - estimate based on typical startup times */
export const ESTIMATED_STARTUP_TIME = 10000; // 10 seconds typical

/** Error message shown when startup times out */
export const TIMEOUT_ERROR_MESSAGE = 'Please restart the application or check the logs for errors.';

/**
 * Get the appropriate message pool based on elapsed time.
 */
export function getMessagePool(seconds: number): string[] {
  if (seconds >= STARTUP_THRESHOLDS.CRISIS) return STARTUP_MESSAGES.crisis;
  if (seconds >= STARTUP_THRESHOLDS.VERY_LONG) return STARTUP_MESSAGES.veryLong;
  if (seconds >= STARTUP_THRESHOLDS.GETTING_LONG) return STARTUP_MESSAGES.gettingLong;
  if (seconds >= STARTUP_THRESHOLDS.ACKNOWLEDGE_DELAY) return STARTUP_MESSAGES.acknowledgingDelay;
  return STARTUP_MESSAGES.early;
}

/**
 * Get status text based on elapsed time.
 */
export function getStatusText(elapsedSeconds: number, isTimedOut: boolean): string {
  if (isTimedOut) return 'Unable to connect to server';
  if (elapsedSeconds >= STARTUP_THRESHOLDS.CRISIS) return 'This is taking much longer than expected...';
  if (elapsedSeconds >= STARTUP_THRESHOLDS.VERY_LONG) return 'Still trying to connect...';
  if (elapsedSeconds >= STARTUP_THRESHOLDS.GETTING_LONG) return 'Hang tight...';
  if (elapsedSeconds >= STARTUP_THRESHOLDS.ACKNOWLEDGE_DELAY) return 'This is taking a bit longer than usual...';
  return 'Starting up...';
}
