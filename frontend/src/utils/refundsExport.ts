/* eslint-disable max-lines */
/**
 * Refunds Export Utilities
 *
 * Generates a print-friendly HTML table of selected refund transactions
 * for record-keeping and audit purposes. Includes full transaction details,
 * match/refund information, and notes.
 *
 * Uses the same iframe → print() pattern as notes export.
 */

import { decodeHtmlEntities } from './decodeHtmlEntities';
import { getUserNotes } from './refunds';
import type { Transaction, RefundsMatch, CreditGroup } from '../types/refunds';

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSignedCurrency(amount: number): string {
  const prefix = amount > 0 ? '+' : '-';
  return `${prefix}${formatCurrency(amount)}`;
}

type Status = 'Matched' | 'Expected' | 'Skipped' | 'Unmatched';

function getStatus(match: RefundsMatch | undefined): Status {
  if (!match) return 'Unmatched';
  if (match.expectedRefund) return 'Expected';
  if (match.skipped) return 'Skipped';
  return 'Matched';
}

function getStatusColor(status: Status): string {
  switch (status) {
    case 'Matched':
      return '#16a34a';
    case 'Expected':
      return '#6366f1';
    case 'Skipped':
      return '#9ca3af';
    default:
      return '#f59e0b';
  }
}

function getExpectedParts(match: RefundsMatch): string[] {
  const parts: string[] = [];
  if (match.expectedAmount != null)
    parts.push(`Expected amount: ${formatCurrency(match.expectedAmount)}`);
  if (match.expectedDate) parts.push(`Expected by: ${formatDate(match.expectedDate)}`);
  if (match.expectedAccount) parts.push(`Expected to: ${escapeHtml(match.expectedAccount)}`);
  if (match.expectedNote) parts.push(`Note: ${escapeHtml(match.expectedNote)}`);
  return parts;
}

function getRefundParts(match: RefundsMatch): string[] {
  const parts: string[] = [];
  if (match.refundAmount != null)
    parts.push(`Refund received: ${formatCurrency(match.refundAmount)}`);
  if (match.refundDate) parts.push(`Refund date: ${formatDate(match.refundDate)}`);
  if (match.refundMerchant) parts.push(`Refund from: ${escapeHtml(match.refundMerchant)}`);
  if (match.refundAccount) parts.push(`Refund to: ${escapeHtml(match.refundAccount)}`);
  return parts;
}

/** Build detail lines for match/expected info shown beneath the main row. */
function buildMatchDetails(match: RefundsMatch | undefined): string {
  if (!match) return '';
  let parts: string[] = [];
  if (match.expectedRefund) {
    parts = getExpectedParts(match);
  } else if (match.skipped) {
    parts = [];
  } else {
    parts = getRefundParts(match);
  }
  if (parts.length === 0) return '';
  return `<div class="match-details">${parts.join(' · ')}</div>`;
}

function buildRow(txn: Transaction, match: RefundsMatch | undefined): string {
  const merchant = escapeHtml(decodeHtmlEntities(txn.merchant?.name ?? txn.originalName));
  const bankDesc = txn.plaidName ? escapeHtml(txn.plaidName) : null;
  const category = txn.category
    ? escapeHtml(`${txn.category.icon} ${decodeHtmlEntities(txn.category.name)}`)
    : '';
  const account = txn.account ? escapeHtml(txn.account.displayName) : '';
  const status = getStatus(match);
  const statusColor = getStatusColor(status);
  const amountClass = txn.amount > 0 ? 'amount-positive' : '';
  const notes = getUserNotes(txn.notes);
  const notesHtml = notes
    ? escapeHtml(notes).replaceAll('\n', '<br>')
    : '<span class="no-notes">—</span>';
  const matchDetails = buildMatchDetails(match);
  const tags =
    txn.tags.length > 0
      ? txn.tags.map((t) => `<span class="tag">${escapeHtml(t.name)}</span>`).join(' ')
      : '';

  return `
      <tr>
        <td class="date-col">${formatDate(txn.date)}</td>
        <td>
          <div class="merchant-name">${merchant}</div>
          ${bankDesc ? `<div class="bank-desc">${bankDesc}</div>` : ''}
          ${matchDetails}
        </td>
        <td>${category}</td>
        <td>${account}</td>
        <td class="amount-col ${amountClass}">${formatSignedCurrency(txn.amount)}</td>
        <td><span class="status-badge" style="background:${statusColor}20;color:${statusColor}">${status}</span></td>
        <td class="notes-col">${tags ? `<div class="tags-row">${tags}</div>` : ''}${notesHtml}</td>
      </tr>`;
}

function buildCreditGroupRows(group: CreditGroup, txnMap: Map<string, Transaction>): string {
  const isRefund = group.type === 'refund';
  const bgColor = isRefund ? '#16a34a' : '#6366f1';
  const label = isRefund ? escapeHtml(group.merchant ?? 'Refund') : 'Expecting';
  const statusLabel = isRefund ? 'Refund' : 'Expected';
  const originals = group.originalTransactionIds
    .map((id) => txnMap.get(id))
    .filter((t): t is Transaction => t != null);

  let html = `
      <tr class="credit-group-header" style="background:${bgColor}08">
        <td class="date-col">${formatDate(group.date)}</td>
        <td><span style="font-weight:600;color:${bgColor}">↻ ${label}</span>${group.note ? `<div class="bank-desc">${escapeHtml(group.note)}</div>` : ''}</td>
        <td></td>
        <td>${group.account ? escapeHtml(group.account) : ''}</td>
        <td class="amount-col" style="color:${bgColor}">+${formatCurrency(group.amount)}</td>
        <td><span class="status-badge" style="background:${bgColor}20;color:${bgColor}">${statusLabel}</span></td>
        <td></td>
      </tr>`;

  for (const txn of originals) {
    const merchant = escapeHtml(decodeHtmlEntities(txn.merchant?.name ?? txn.originalName));
    const category = txn.category
      ? escapeHtml(`${txn.category.icon} ${decodeHtmlEntities(txn.category.name)}`)
      : '';
    const account = txn.account ? escapeHtml(txn.account.displayName) : '';
    html += `
      <tr class="credit-sub-row" style="background:${bgColor}04">
        <td></td>
        <td style="padding-left:24px;color:#666">↳ ${merchant}</td>
        <td style="color:#888">${category}</td>
        <td style="color:#888">${account}</td>
        <td class="amount-col">${formatSignedCurrency(txn.amount)}</td>
        <td></td>
        <td></td>
      </tr>`;
  }

  if (group.remaining > 0) {
    html += `
      <tr class="credit-sub-row" style="background:${bgColor}04">
        <td></td>
        <td style="padding-left:24px;font-weight:500;color:#f59e0b">Remaining: ${formatCurrency(group.remaining)}</td>
        <td colspan="5"></td>
      </tr>`;
  }

  return html;
}

function getRefundedAmount(match: RefundsMatch | undefined): number {
  if (!match || match.skipped || match.expectedRefund) return 0;
  return Math.abs(match.refundAmount ?? 0);
}

/** Open browser print dialog with the given HTML content via a hidden iframe. */
export function printHtml(htmlContent: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  document.body.appendChild(iframe);
  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 250);
  }
}

/**
 * Build a print-friendly HTML document with a comprehensive transaction table
 * suitable for IRS audit documentation.
 */
export function buildRefundsExportHtml(
  transactions: Transaction[],
  matches: RefundsMatch[],
  creditGroups: CreditGroup[] = [],
  allTransactions: Transaction[] = []
): string {
  const matchMap = new Map(matches.map((m) => [m.originalTransactionId, m]));
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  const count = sorted.length;
  const totalAmount = sorted.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  const matchedCount = sorted.filter((txn) => getStatus(matchMap.get(txn.id)) === 'Matched').length;
  const expectedCount = sorted.filter(
    (txn) => getStatus(matchMap.get(txn.id)) === 'Expected'
  ).length;
  const unmatchedCount = sorted.filter(
    (txn) => getStatus(matchMap.get(txn.id)) === 'Unmatched'
  ).length;
  const refundedTotal = sorted.reduce(
    (sum, txn) => sum + getRefundedAmount(matchMap.get(txn.id)),
    0
  );

  // Build a transaction map for looking up originals in credit groups
  const txnMap = new Map<string, Transaction>();
  for (const txn of allTransactions) txnMap.set(txn.id, txn);
  // Also include selected transactions (they may not be in allTransactions if lists differ)
  for (const txn of transactions) txnMap.set(txn.id, txn);

  // Filter credit groups to those relevant to the selected transactions
  const selectedIdSet = new Set(transactions.map((t) => t.id));
  const relevantGroups = creditGroups.filter((g) =>
    g.originalTransactionIds.some((id) => selectedIdSet.has(id))
  );

  // Build a unified date-sorted list of transactions and credit groups
  type ExportItem =
    | { kind: 'transaction'; date: string; txn: Transaction }
    | { kind: 'credit'; date: string; group: CreditGroup };

  const items: ExportItem[] = [
    ...sorted.map((txn): ExportItem => ({ kind: 'transaction', date: txn.date, txn })),
    ...relevantGroups.map((group): ExportItem => ({ kind: 'credit', date: group.date, group })),
  ];
  items.sort((a, b) => a.date.localeCompare(b.date));

  const rows = items
    .map((item) => {
      if (item.kind === 'credit') return buildCreditGroupRows(item.group, txnMap);
      return buildRow(item.txn, matchMap.get(item.txn.id));
    })
    .join('');

  const dateRange =
    sorted.length > 0 ? `${formatDate(sorted[0]!.date)} – ${formatDate(sorted.at(-1)!.date)}` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Refunds & Reimbursements Record</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      margin: 0 auto;
      padding: 40px 32px;
      color: #1a1a1a;
      line-height: 1.5;
      font-size: 12px;
      background: #fff;
    }
    .header {
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 2px solid #1a1a1a;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #111;
      margin-bottom: 2px;
    }
    .header .subtitle {
      font-size: 11px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead th {
      text-align: left;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      padding: 8px 8px;
      border-bottom: 2px solid #e5e5e5;
      white-space: nowrap;
    }
    tbody td {
      padding: 8px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    .date-col { white-space: nowrap; color: #555; }
    .merchant-name { font-weight: 500; }
    .bank-desc {
      font-size: 10px;
      color: #888;
      font-style: italic;
      margin-top: 1px;
    }
    .match-details {
      font-size: 10px;
      color: #16a34a;
      margin-top: 2px;
    }
    .amount-col {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
      white-space: nowrap;
    }
    .amount-positive { color: #16a34a; }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }
    .notes-col {
      max-width: 220px;
      color: #444;
      font-size: 11px;
      line-height: 1.4;
    }
    .no-notes { color: #ccc; }
    .tags-row {
      margin-bottom: 3px;
    }
    .tag {
      display: inline-block;
      font-size: 9px;
      font-weight: 600;
      color: #666;
      background: #f0f0f0;
      padding: 1px 6px;
      border-radius: 8px;
      margin-right: 3px;
    }
    .summary {
      margin-top: 20px;
      padding: 14px 16px;
      background: #f9f9f9;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
    }
    .summary-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      margin-bottom: 8px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px 24px;
      font-size: 12px;
      color: #555;
    }
    .summary-grid strong { color: #111; }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
      font-size: 9px;
      color: #999;
      text-align: center;
    }
    @media print {
      body { padding: 16px; }
      .footer { margin-top: 16px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Refunds & Reimbursements Record</h1>
    <div class="subtitle">${dateRange ? `${dateRange} · ` : ''}${count} transaction${count === 1 ? '' : 's'} · Exported ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Category</th>
        <th>Account</th>
        <th style="text-align:right">Amount</th>
        <th>Status</th>
        <th>Tags / Notes</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>
  <div class="summary">
    <div class="summary-title">Summary</div>
    <div class="summary-grid">
      <span>Total transactions: <strong>${count}</strong></span>
      <span>Total amount: <strong>${formatCurrency(totalAmount)}</strong></span>
      <span>Refunds received: <strong>${formatCurrency(refundedTotal)}</strong></span>
      <span>Matched: <strong>${matchedCount}</strong></span>
      <span>Expected: <strong>${expectedCount}</strong></span>
      <span>Unmatched: <strong>${unmatchedCount}</strong></span>
    </div>
  </div>
  <div class="footer">
    Exported from Eclosion for Monarch on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · This document is for record-keeping purposes
  </div>
</body>
</html>`;
}
