/**
 * useLocalStorage Hook
 *
 * Type-safe localStorage access with JSON serialization.
 * SSR-safe - handles server-side rendering gracefully.
 *
 * Usage:
 *   const [theme, setTheme] = useLocalStorage('theme', 'light');
 *   setTheme('dark'); // Persists to localStorage
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for type-safe localStorage access with JSON serialization.
 *
 * @param key - The localStorage key
 * @param initialValue - The initial value if no stored value exists
 * @returns A tuple of [storedValue, setValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use provided initial value
  const getStoredValue = useCallback((): T => {
    // SSR-safe: check if window is defined
    if (typeof globalThis.window === 'undefined') {
      return initialValue;
    }

    try {
      const item = globalThis.localStorage.getItem(key);
      return item === null ? initialValue : (JSON.parse(item) as T);
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  /**
   * Set value in state and localStorage
   */
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function for same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        // SSR-safe: check if window is defined
        if (typeof globalThis.window !== 'undefined') {
          globalThis.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Sync with localStorage changes from other tabs/windows
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch (error) {
          console.warn(`Error parsing localStorage change for "${key}":`, error);
        }
      }
    };

    globalThis.addEventListener('storage', handleStorageChange);
    return () => globalThis.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
