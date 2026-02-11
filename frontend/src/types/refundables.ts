/** Monarch transaction tag. */
export interface TransactionTag {
  id: string;
  name: string;
  color: string;
  order: number;
}

/** Monarch transaction (subset of fields relevant to Refundables). */
export interface Transaction {
  id: string;
  amount: number;
  date: string;
  originalName: string;
  notes: string | null;
  pending: boolean;
  hideFromReports: boolean;
  merchant: {
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    icon: string;
  } | null;
  account: {
    id: string;
    displayName: string;
    logoUrl: string | null;
    icon: string | null;
  } | null;
  tags: TransactionTag[];
}

/** Saved view configuration - a tab filtered by Monarch tags and optionally by categories. */
export interface RefundablesSavedView {
  id: string;
  name: string;
  tagIds: string[];
  categoryIds: string[] | null;
  sortOrder: number;
}

/** Refund match linking original transaction to its refund. */
export interface RefundablesMatch {
  id: string;
  originalTransactionId: string;
  refundTransactionId: string | null;
  refundAmount: number | null;
  refundMerchant: string | null;
  refundDate: string | null;
  refundAccount: string | null;
  skipped: boolean;
  transactionData: Transaction | null;
}

/** Tool-level configuration for the Refundables feature. */
export interface RefundablesConfig {
  replacementTagId: string | null;
  replaceTagByDefault: boolean;
  agingWarningDays: number;
  showBadge: boolean;
}

/** Date range preset options. */
export type DateRangePreset =
  | 'last_week'
  | 'last_month'
  | 'last_quarter'
  | 'last_year'
  | 'all_time'
  | 'custom';

/** Date range filter state. */
export interface DateRangeFilter {
  preset: DateRangePreset;
  startDate: string | null;
  endDate: string | null;
}

/** Request body for creating a refund match. */
export interface CreateMatchRequest {
  originalTransactionId: string;
  refundTransactionId?: string;
  refundAmount?: number;
  refundMerchant?: string;
  refundDate?: string;
  refundAccount?: string;
  skipped?: boolean;
  replaceTag?: boolean;
  originalTagIds?: string[];
  originalNotes?: string | null;
  viewTagIds?: string[];
  transactionData?: Transaction;
}

/** Tally summary for the current view. */
export interface RefundablesTally {
  transactionCount: number;
  totalAmount: number;
  matchedAmount: number;
  remainingAmount: number;
  matchedCount: number;
  skippedCount: number;
  unmatchedCount: number;
}
