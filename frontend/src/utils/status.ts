/**
 * Status Utilities
 *
 * Centralized status label and styling functions.
 * Eliminates duplication across RecurringList, RollupZone, and CategoryCard.
 */

import type { ItemStatus } from '../types';

/**
 * Status style properties.
 */
export interface StatusStyles {
  /** Background color */
  bg: string;
  /** Text/icon color */
  color: string;
}

/**
 * Extended status style properties with progress bar color.
 */
export interface StatusStylesExtended extends StatusStyles {
  /** Progress bar color */
  progressColor: string;
}

/**
 * Get human-readable label for a status.
 *
 * @param status - The item status
 * @param isEnabled - Whether the item is enabled (optional, defaults to true)
 * @returns Human-readable status label
 */
export function getStatusLabel(status: ItemStatus, isEnabled = true): string {
  if (!isEnabled) return 'Untracked';

  switch (status) {
    case 'on_track':
      return 'On Track';
    case 'funded':
      return 'Funded';
    case 'ahead':
      return 'Ahead';
    case 'behind':
      return 'Behind';
    case 'critical':
      return 'Off Track';
    case 'due_now':
      return 'Due Now';
    case 'inactive':
      return 'Inactive';
    case 'disabled':
      return 'Untracked';
  }
}

/**
 * Get CSS styles for a status.
 *
 * @param status - The item status
 * @param isEnabled - Whether the item is enabled (optional, defaults to true)
 * @returns Object with bg and color CSS values
 */
export function getStatusStyles(status: ItemStatus, isEnabled = true): StatusStyles {
  if (!isEnabled) {
    return {
      bg: 'var(--monarch-bg-page)',
      color: 'var(--monarch-text-muted)',
    };
  }

  switch (status) {
    case 'funded':
    case 'on_track':
    case 'ahead':
      return {
        bg: 'var(--monarch-success-bg)',
        color: 'var(--monarch-success)',
      };
    case 'behind':
      return {
        bg: 'var(--monarch-warning-bg)',
        color: 'var(--monarch-warning)',
      };
    case 'critical':
      return {
        bg: 'var(--monarch-error-bg)',
        color: 'var(--monarch-error)',
      };
    case 'due_now':
      return {
        bg: '#f3e8ff',
        color: '#7c3aed',
      };
    case 'inactive':
    case 'disabled':
    default:
      return {
        bg: 'var(--monarch-bg-page)',
        color: 'var(--monarch-text-muted)',
      };
  }
}

/**
 * Calculate the display status for an item based on its properties.
 * Used to determine if item is in catch-up mode vs stable rate.
 *
 * @param item - Object with item properties
 * @returns The calculated display status
 */
export function calculateDisplayStatus(item: {
  is_enabled?: boolean;
  frozen_monthly_target: number;
  ideal_monthly_rate: number;
  planned_budget?: number;
  current_balance?: number;
  amount?: number;
  status: ItemStatus;
}): ItemStatus {
  // If disabled, return disabled status
  if (item.is_enabled === false) {
    return 'disabled';
  }

  const plannedBudget = item.planned_budget ?? 0;

  // If frozen target exists, determine status based on budgeted vs target
  // Use rounded target since budget inputs round up to nearest dollar
  if (item.frozen_monthly_target > 0) {
    const targetRounded = Math.ceil(item.frozen_monthly_target);
    if (plannedBudget > targetRounded) {
      // Budgeting more than needed - ahead
      return 'ahead';
    } else if (plannedBudget >= targetRounded) {
      // Budgeting exactly what's needed - on track
      return 'on_track';
    } else {
      // Budgeting less than needed - behind
      return 'behind';
    }
  }

  return item.status;
}

/**
 * Determine if a status indicates the item needs attention.
 *
 * @param status - The item status
 * @returns True if the status indicates attention needed
 */
export function isAttentionStatus(status: ItemStatus): boolean {
  return status === 'critical' || status === 'due_now';
}

/**
 * Determine if a status indicates the item is healthy.
 *
 * @param status - The item status
 * @returns True if the status indicates healthy progress
 */
export function isHealthyStatus(status: ItemStatus): boolean {
  return (
    status === 'funded' ||
    status === 'on_track' ||
    status === 'ahead'
  );
}

/**
 * Get extended CSS styles for a status including progress bar color.
 * Used by components that need progress bar styling (e.g., CategoryCard).
 *
 * @param status - The item status
 * @returns Object with bg, color, and progressColor CSS values
 */
export function getStatusStylesExtended(status: ItemStatus): StatusStylesExtended {
  switch (status) {
    case 'funded':
      return {
        bg: 'var(--monarch-success-bg)',
        color: 'var(--monarch-success)',
        progressColor: 'var(--monarch-success)',
      };
    case 'ahead':
      return {
        bg: 'var(--monarch-info-bg)',
        color: 'var(--monarch-info)',
        progressColor: 'var(--monarch-info)',
      };
    case 'on_track':
      return {
        bg: 'var(--monarch-bg-hover)',
        color: 'var(--monarch-text-muted)',
        progressColor: 'var(--monarch-text-muted)',
      };
    case 'behind':
      return {
        bg: 'var(--monarch-warning-bg)',
        color: 'var(--monarch-warning)',
        progressColor: 'var(--monarch-warning)',
      };
    case 'critical':
    case 'due_now':
      return {
        bg: 'var(--monarch-error-bg)',
        color: 'var(--monarch-error)',
        progressColor: 'var(--monarch-error)',
      };
    case 'inactive':
    case 'disabled':
    default:
      return {
        bg: 'var(--monarch-bg-hover)',
        color: 'var(--monarch-text-light)',
        progressColor: 'var(--monarch-border)',
      };
  }
}
