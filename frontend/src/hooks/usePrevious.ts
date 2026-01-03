/**
 * usePrevious Hook
 *
 * Tracks the previous value of a variable.
 * Useful for comparing current and previous values in effects.
 *
 * Usage:
 *   const [count, setCount] = useState(0);
 *   const prevCount = usePrevious(count);
 *
 *   useEffect(() => {
 *     if (prevCount !== undefined && count > prevCount) {
 *       console.log('Count increased!');
 *     }
 *   }, [count, prevCount]);
 */

import { useRef, useEffect } from 'react';

/**
 * Hook that returns the previous value of a variable.
 *
 * @param value - The value to track
 * @returns The previous value (undefined on first render)
 */
export function usePrevious<T>(value: T): T | undefined {
  // Use ref to store previous value
  const ref = useRef<T | undefined>(undefined);

  // Update ref with current value after render
  useEffect(() => {
    ref.current = value;
  }, [value]);

  // Return previous value (from before the current render)
  // This is an intentional pattern for usePrevious - accessing ref.current during render is the whole point
  // eslint-disable-next-line react-hooks/refs
  return ref.current;
}
