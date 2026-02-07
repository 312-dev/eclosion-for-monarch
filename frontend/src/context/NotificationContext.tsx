/**
 * Notification Context
 *
 * Manages persistent notifications (IFTTT action results, etc.).
 * Notifications are stored in localStorage and displayed in the NotificationBell dropdown.
 * Also fires toast notifications for immediate feedback.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '../constants';

export interface Notification {
  id: string;
  type: 'ifttt_action' | 'ifttt_queue' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  source: string;
}

interface NotificationState {
  notifications: Notification[];
  lastReadAt: number;
}

type NewNotification = Omit<Notification, 'id' | 'timestamp' | 'read'>;

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: NewNotification) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const MAX_NOTIFICATIONS = 50;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function loadPersistedState(): NotificationState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!stored) return null;
    return JSON.parse(stored) as NotificationState;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    return null;
  }
}

function persistState(state: NotificationState): void {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(state));
}

function pruneOldNotifications(notifications: Notification[]): Notification[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return notifications
    .filter((n) => n.timestamp > cutoff)
    .slice(0, MAX_NOTIFICATIONS);
}

export function NotificationProvider({ children }: { readonly children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const persisted = loadPersistedState();
    return persisted ? pruneOldNotifications(persisted.notifications) : [];
  });

  const [lastReadAt, setLastReadAt] = useState<number>(() => {
    const persisted = loadPersistedState();
    return persisted?.lastReadAt ?? Date.now();
  });

  // Persist state changes
  useEffect(() => {
    persistState({ notifications, lastReadAt });
  }, [notifications, lastReadAt]);

  // Listen for custom notification events (dispatched by IFTTT action responses)
  useEffect(() => {
    function handleNotificationEvent(event: Event) {
      const customEvent = event as CustomEvent<Omit<Notification, 'id' | 'timestamp' | 'read'>>;
      const notification: Notification = {
        ...customEvent.detail,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) =>
        pruneOldNotifications([notification, ...prev]),
      );
    }

    globalThis.addEventListener('eclosion-notification', handleNotificationEvent);
    return () =>
      globalThis.removeEventListener('eclosion-notification', handleNotificationEvent);
  }, []);

  const addNotification = useCallback(
    (partial: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const notification: Notification = {
        ...partial,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) =>
        pruneOldNotifications([notification, ...prev]),
      );
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setLastReadAt(Date.now());
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setLastReadAt(Date.now());
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAllRead,
      clearAll,
      removeNotification,
    }),
    [notifications, unreadCount, addNotification, markAllRead, clearAll, removeNotification],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
