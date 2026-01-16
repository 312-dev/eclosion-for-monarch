/**
 * Backup Utilities
 *
 * Formatting functions for backup file display.
 */

/**
 * Format bytes into human-readable size.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format backup date for display.
 * Shows "Today", "Yesterday", or date with time.
 */
export function formatBackupDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;

  return (
    date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    }) + ` at ${time}`
  );
}
