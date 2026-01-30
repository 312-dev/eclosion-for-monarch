/**
 * Monarch Goal Types
 *
 * Types for Monarch Money savings goals displayed in Stash view.
 * Goals are read-only and use Monarch's time-based status calculation.
 */

export type GoalStatus = 'ahead' | 'on_track' | 'at_risk' | 'completed' | 'no_target';

export interface MonarchGoal {
  type: 'monarch_goal'; // Discriminator for union type with StashItem
  id: string;
  name: string;

  // Financial data (from Monarch API)
  currentBalance: number; // Current available balance (after spending)
  netContribution: number; // Total amount saved (for display - includes spent amounts)
  targetAmount: number | null; // Can be null for goals without target
  targetDate: string | null; // ISO date string or null
  createdAt: string; // ISO date string when goal was created
  progress: number; // Percentage from Monarch (0-100+)

  // Time-based forecasting (from Monarch API)
  estimatedMonthsUntilCompletion: number | null;
  forecastedCompletionDate: string | null;
  plannedMonthlyContribution: number;

  // Status (calculated from Monarch's data - NOT from Stash calculations)
  status: GoalStatus;
  monthsAheadBehind: number | null; // Positive = ahead, negative = behind

  // Grid layout fields (same as StashItem)
  grid_x: number;
  grid_y: number;
  col_span: number;
  row_span: number;
  sort_order: number;

  // UI state
  isArchived: boolean;
  isCompleted: boolean;

  // Image data (from Monarch API)
  imageStorageProvider: string | null;
  imageStorageProviderId: string | null;

  // Icon/emoji (if set by user in Monarch)
  icon: string | null;
}

export interface MonarchGoalLayoutUpdate {
  goal_id: string;
  grid_x: number;
  grid_y: number;
  col_span: number;
  row_span: number;
  sort_order: number;
}
