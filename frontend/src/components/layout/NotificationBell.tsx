/**
 * NotificationBell - Bell icon with badge and dropdown notification center
 *
 * Displays in the app header. Shows unread count badge.
 * Click opens a dropdown panel listing recent notifications
 * (IFTTT action results, queued action executions, etc.).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Icons } from '../icons';
import { useNotifications, type Notification } from '../../context/NotificationContext';
import { motion, AnimatePresence, slideDownVariants } from '../motion';

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationItem({
  notification,
  onRemove,
}: {
  readonly notification: Notification;
  readonly onRemove: (id: string) => void;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-(--monarch-bg-page)"
      style={{
        borderBottom: '1px solid var(--monarch-border)',
        opacity: notification.read ? 0.7 : 1,
      }}
    >
      <div
        className="shrink-0 mt-0.5 w-2 h-2 rounded-full"
        style={{
          backgroundColor: notification.read
            ? 'transparent'
            : 'var(--monarch-orange)',
        }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-semibold truncate"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          {notification.title}
        </div>
        <div
          className="text-xs mt-0.5 truncate"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          {notification.message}
        </div>
        <div
          className="text-xs mt-1"
          style={{ color: 'var(--monarch-text-muted)', opacity: 0.7 }}
        >
          {formatRelativeTime(notification.timestamp)}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.id);
        }}
        className="shrink-0 p-0.5 rounded transition-colors hover:bg-(--monarch-bg-hover)"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label="Dismiss notification"
      >
        <Icons.X size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

export function NotificationBell() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead, clearAll, removeNotification } =
    useNotifications();

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Escape key to close
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowDropdown(false);
    }
    if (showDropdown) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showDropdown]);

  const handleToggle = useCallback(() => {
    setShowDropdown((prev) => !prev);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    markAllRead();
  }, [markAllRead]);

  const handleClearAll = useCallback(() => {
    clearAll();
    setShowDropdown(false);
  }, [clearAll]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-(--monarch-bg-hover)"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-expanded={showDropdown}
        aria-haspopup="menu"
      >
        <Icons.Bell size={16} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-white font-semibold"
            style={{
              backgroundColor: 'var(--monarch-orange)',
              fontSize: '9px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="absolute right-0 mt-2 w-72 rounded-lg shadow-lg z-50 origin-top-right overflow-hidden"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              border: '1px solid var(--monarch-border)',
            }}
            role="menu"
            aria-orientation="vertical"
            variants={slideDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--monarch-border)' }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                Notifications
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs transition-colors hover:underline"
                    style={{ color: 'var(--monarch-orange)' }}
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs transition-colors hover:underline"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Notification list */}
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div
                  className="flex items-center justify-center py-8 text-sm"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRemove={removeNotification}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
