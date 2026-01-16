/* eslint-disable max-lines */
/**
 * Notes Export Utilities
 *
 * Functions for generating print-friendly HTML from notes data.
 */

import type { MonthKey, CategoryGroupWithNotes, Note, GeneralMonthNote } from '../types/notes';
import type { AllNotesResponse } from '../api/core/notes';

/**
 * Format month key for display
 */
export function formatMonth(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format month key for short display
 */
export function formatMonthShort(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Get month key from a date
 */
export function getMonthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Generate an array of months between start and end (inclusive)
 */
export function getMonthRange(startMonth: MonthKey, endMonth: MonthKey): MonthKey[] {
  const months: MonthKey[] = [];
  const [startYear, startMo] = startMonth.split('-').map(Number) as [number, number];
  const [endYear, endMo] = endMonth.split('-').map(Number) as [number, number];

  const startDate = new Date(startYear, startMo - 1, 1);
  const endDate = new Date(endYear, endMo - 1, 1);

  // Calculate total months
  const totalMonths =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1;

  for (let i = 0; i < totalMonths; i++) {
    const date = new Date(startYear, startMo - 1 + i, 1);
    months.push(getMonthKey(date));
  }

  return months;
}

/**
 * Get effective note for a category/group at a given month
 */
export function getEffectiveNote(
  categoryType: 'group' | 'category',
  categoryId: string,
  targetMonth: MonthKey,
  notes: Note[]
): { note: Note; sourceMonth: MonthKey; isInherited: boolean } | null {
  const categoryNotes = notes.filter(
    (n) => n.categoryRef.id === categoryId && n.categoryRef.type === categoryType
  );
  categoryNotes.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  for (const note of categoryNotes) {
    if (note.monthKey <= targetMonth) {
      return {
        note,
        sourceMonth: note.monthKey,
        isInherited: note.monthKey !== targetMonth,
      };
    }
  }
  return null;
}

/**
 * Get effective general note for a given month
 */
export function getEffectiveGeneralNote(
  targetMonth: MonthKey,
  generalNotes: Record<MonthKey, GeneralMonthNote>
): { note: GeneralMonthNote; sourceMonth: MonthKey; isInherited: boolean } | null {
  const months = Object.keys(generalNotes).sort((a, b) => b.localeCompare(a));
  for (const month of months) {
    if (month <= targetMonth) {
      const note = generalNotes[month];
      if (note) {
        return {
          note,
          sourceMonth: month,
          isInherited: month !== targetMonth,
        };
      }
    }
  }
  return null;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Process inline markdown (bold, italic, code, links)
 */
function processInlineMarkdown(text: string): string {
  let result = escapeHtml(text);

  /* eslint-disable sonarjs/slow-regex -- Using negated char classes to prevent backtracking */
  // Bold
  result = result.replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replaceAll(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic
  result = result.replaceAll(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replaceAll(/_([^_]+)_/g, '<em>$1</em>');

  // Inline code
  result = result.replaceAll(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  result = result.replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  /* eslint-enable sonarjs/slow-regex */

  return result;
}

/**
 * Convert markdown to HTML with checkbox state rendering
 */
function renderMarkdownToHtml(markdown: string, checkboxStates: boolean[]): string {
  let checkboxIndex = 0;

  // Process line by line for better control
  const lines = markdown.split('\n');
  /* eslint-disable sonarjs/slow-regex -- Safe: patterns operate on single lines, .* can't span newlines */
  const processedLines = lines.map((line) => {
    // Handle task list items
    const taskMatch = /^(\s*)[-*]\s*\[([xX ])\]\s*(.*)$/.exec(line);
    if (taskMatch) {
      const indent = taskMatch[1] ?? '';
      const isChecked = checkboxStates[checkboxIndex] ?? (taskMatch[2] ?? '').toLowerCase() === 'x';
      const text = taskMatch[3] ?? '';
      checkboxIndex++;
      const textClass = isChecked ? 'task-text completed' : 'task-text';
      return `${indent}<div class="task-item"><span class="checkbox ${isChecked ? 'checked' : ''}"></span><span class="${textClass}">${processInlineMarkdown(text)}</span></div>`;
    }

    // Handle regular list items
    const listMatch = /^(\s*)[-*]\s+(.*)$/.exec(line);
    if (listMatch) {
      return `${listMatch[1] ?? ''}<li>${processInlineMarkdown(listMatch[2] ?? '')}</li>`;
    }

    // Handle numbered list items
    const numMatch = /^(\s*)\d+\.\s+(.*)$/.exec(line);
    if (numMatch) {
      return `${numMatch[1] ?? ''}<li>${processInlineMarkdown(numMatch[2] ?? '')}</li>`;
    }

    // Handle headers
    if (line.startsWith('### ')) {
      return `<h3>${processInlineMarkdown(line.slice(4))}</h3>`;
    }
    if (line.startsWith('## ')) {
      return `<h2>${processInlineMarkdown(line.slice(3))}</h2>`;
    }
    if (line.startsWith('# ')) {
      return `<h1>${processInlineMarkdown(line.slice(2))}</h1>`;
    }

    // Handle blockquotes
    if (line.startsWith('> ')) {
      return `<blockquote>${processInlineMarkdown(line.slice(2))}</blockquote>`;
    }

    // Handle horizontal rules
    if (/^[-*_]{3,}$/.test(line.trim())) {
      return '<hr>';
    }

    // Handle empty lines
    if (!line.trim()) {
      return '';
    }

    // Regular paragraph
    return `<p>${processInlineMarkdown(line)}</p>`;
  });
  /* eslint-enable sonarjs/slow-regex */

  // Join and wrap lists properly
  let html = processedLines.join('\n');

  // Wrap consecutive <li> elements in <ul>
  html = html.replaceAll(/(<li>.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  return html;
}

/**
 * Look up checkbox states for a general note, trying multiple key formats.
 * The bulk query returns keys as "general:{sourceMonth}" but we also need
 * to handle cases where the key format might differ.
 */
function lookupGeneralCheckboxStates(
  checkboxStates: Record<string, boolean[]>,
  monthKey: string,
  sourceMonth: string
): boolean[] {
  // Try the standard format first (what getMonthCheckboxStates returns)
  const standardKey = `general:${sourceMonth}`;
  if (checkboxStates[standardKey]) {
    return checkboxStates[standardKey];
  }

  // Try with viewing month if different from source month
  if (monthKey !== sourceMonth) {
    const viewingKey = `general:${monthKey}`;
    if (checkboxStates[viewingKey]) {
      return checkboxStates[viewingKey];
    }
  }

  // Try keys with scope suffix (in case backend returns different format)
  const keysToTry = [
    `general:${sourceMonth}:global`,
    `general:${sourceMonth}:${monthKey}`,
    `general:${monthKey}:global`,
    `general:${monthKey}:${monthKey}`,
  ];

  for (const key of keysToTry) {
    if (checkboxStates[key]) {
      return checkboxStates[key];
    }
  }

  return [];
}

/**
 * Build export HTML with markdown rendered and checkbox states
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- HTML generation with nested loops for months, groups, and categories
export function buildExportHtml(
  monthRange: MonthKey[],
  allNotesData: AllNotesResponse,
  groups: CategoryGroupWithNotes[],
  selectedGroups: Set<string>,
  selectedCategories: Set<string>,
  includeMonthNotes: boolean,
  checkboxStates: Record<string, boolean[]>
): string {
  const isSingleMonth = monthRange.length === 1;
  const firstMonth = monthRange[0] ?? '';
  const lastMonth = monthRange.at(-1) ?? '';
  const title = isSingleMonth
    ? `Notes for ${formatMonth(firstMonth)}`
    : `Notes for ${formatMonthShort(firstMonth)} - ${formatMonthShort(lastMonth)}`;

  let content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 32px;
      color: #1a1a1a;
      line-height: 1.6;
      font-size: 13px;
      background: #fff;
    }
    .header {
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 600;
      color: #111;
      margin-bottom: 4px;
    }
    .header .subtitle {
      font-size: 12px;
      color: #666;
    }
    .month-section {
      margin-bottom: 20px;
    }
    .month-header {
      font-size: 16px;
      font-weight: 600;
      color: #f59e0b;
      margin: 28px 0 14px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #f59e0b;
    }
    .general-note {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      padding: 14px 16px;
      border-radius: 8px;
      margin-bottom: 18px;
      border-left: 4px solid #f59e0b;
    }
    .general-note-label {
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .group-section {
      margin-bottom: 16px;
      padding: 12px 14px;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #eee;
    }
    .group-name {
      font-weight: 600;
      font-size: 13px;
      color: #333;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e5e5;
    }
    .category-item {
      margin: 10px 0;
      padding-left: 12px;
    }
    .category-name {
      font-weight: 600;
      font-size: 12px;
      color: #444;
      margin-bottom: 4px;
    }
    .note-content {
      padding-left: 12px;
      border-left: 2px solid #ddd;
      margin-left: 2px;
    }
    .inherited {
      display: inline-block;
      font-size: 10px;
      color: #888;
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 10px;
      margin-bottom: 4px;
    }
    /* Markdown styling */
    .md { color: #333; }
    .md p { margin: 3px 0; }
    .md ul, .md ol { margin: 6px 0; padding-left: 18px; }
    .md li { margin: 2px 0; }
    .md blockquote {
      margin: 8px 0;
      padding: 8px 12px;
      background: #f9f9f9;
      border-left: 3px solid #f59e0b;
      border-radius: 0 4px 4px 0;
      color: #555;
      font-style: italic;
    }
    .md code {
      background: #f3f4f6;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 11px;
      color: #e11d48;
    }
    .md pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 11px;
      margin: 8px 0;
    }
    .md a { color: #f59e0b; text-decoration: none; }
    .md a:hover { text-decoration: underline; }
    .md h1, .md h2, .md h3 { margin: 10px 0 6px 0; font-weight: 600; }
    .md h1 { font-size: 15px; color: #222; }
    .md h2 { font-size: 14px; color: #333; }
    .md h3 { font-size: 13px; color: #444; }
    /* Checkbox styling */
    .task-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 4px 0;
      padding: 2px 0;
    }
    .checkbox {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      background: #fff;
      margin-top: 1px;
    }
    .checkbox.checked {
      background: #f59e0b;
      border-color: #f59e0b;
    }
    .checkbox.checked::after {
      content: '✓';
      color: white;
      font-size: 11px;
      font-weight: bold;
      line-height: 1;
    }
    .task-text {
      flex: 1;
      line-height: 1.5;
    }
    .task-text.completed {
      text-decoration: line-through;
      color: #888;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      font-size: 10px;
      color: #999;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .month-header { page-break-before: auto; }
      .month-section { page-break-inside: avoid; }
      .group-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="subtitle">Exported from Eclosion</div>
  </div>
`;

  // Process each month in the range
  for (const monthKey of monthRange) {
    const monthLabel = formatMonth(monthKey);

    // Get effective notes for this month
    const effectiveGenNote = getEffectiveGeneralNote(monthKey, allNotesData.general_notes);

    // Check if this month has any content to show
    let hasContent = false;

    // Check general note
    if (includeMonthNotes && effectiveGenNote?.note?.content) {
      hasContent = true;
    }

    // Check category/group notes
    for (const group of groups) {
      if (selectedGroups.has(group.id)) {
        const effectiveGroupNote = getEffectiveNote(
          'group',
          group.id,
          monthKey,
          allNotesData.notes
        );
        if (effectiveGroupNote?.note?.content) {
          hasContent = true;
          break;
        }
      }
      for (const category of group.categories) {
        if (selectedCategories.has(category.id)) {
          const effectiveCatNote = getEffectiveNote(
            'category',
            category.id,
            monthKey,
            allNotesData.notes
          );
          if (effectiveCatNote?.note?.content) {
            hasContent = true;
            break;
          }
        }
      }
      if (hasContent) break;
    }

    // Skip months with no content
    if (!hasContent) continue;

    // Add month header (only if multiple months)
    if (!isSingleMonth) {
      content += `<div class="month-header">${monthLabel}</div>\n`;
    }

    content += `<div class="month-section">\n`;

    // General notes
    if (includeMonthNotes && effectiveGenNote?.note?.content) {
      content += `<div class="general-note">`;
      content += `<div class="general-note-label">General Notes</div>`;
      if (effectiveGenNote.isInherited && effectiveGenNote.sourceMonth) {
        content += `<div class="inherited">from ${formatMonthShort(effectiveGenNote.sourceMonth)}</div>`;
      }
      // Look up checkbox states using helper that tries multiple key formats
      const sourceMonth = effectiveGenNote.sourceMonth ?? monthKey;
      const states = lookupGeneralCheckboxStates(checkboxStates, monthKey, sourceMonth);
      content += `<div class="md">${renderMarkdownToHtml(effectiveGenNote.note.content, states)}</div>`;
      content += `</div>\n`;
    }

    // Category/group notes
    for (const group of groups) {
      const showGroup = selectedGroups.has(group.id);
      const categoriesInGroup = group.categories.filter((c) => selectedCategories.has(c.id));

      if (!showGroup && categoriesInGroup.length === 0) continue;

      const effectiveGroupNote = getEffectiveNote('group', group.id, monthKey, allNotesData.notes);
      const hasGroupNote = showGroup && effectiveGroupNote?.note?.content;

      // Check if any category in this group has notes
      const categoryNotes = categoriesInGroup
        .map((cat) => ({
          category: cat,
          effectiveNote: getEffectiveNote('category', cat.id, monthKey, allNotesData.notes),
        }))
        .filter((x) => x.effectiveNote?.note?.content);

      if (!hasGroupNote && categoryNotes.length === 0) continue;

      content += `<div class="group-section">`;
      content += `<div class="group-name">${escapeHtml(group.name)}</div>`;

      if (hasGroupNote && effectiveGroupNote) {
        content += `<div class="note-content">`;
        if (effectiveGroupNote.isInherited && effectiveGroupNote.sourceMonth) {
          content += `<div class="inherited">from ${formatMonthShort(effectiveGroupNote.sourceMonth)}</div>`;
        }
        const noteId = effectiveGroupNote.note.id;
        const states = checkboxStates[noteId] ?? [];
        content += `<div class="md">${renderMarkdownToHtml(effectiveGroupNote.note.content, states)}</div>`;
        content += `</div>`;
      }

      for (const { category, effectiveNote } of categoryNotes) {
        if (!effectiveNote) continue;
        content += `<div class="category-name">${category.icon ? category.icon + ' ' : ''}${escapeHtml(category.name)}</div>`;
        content += `<div class="note-content">`;
        if (effectiveNote.isInherited && effectiveNote.sourceMonth) {
          content += `<div class="inherited">from ${formatMonthShort(effectiveNote.sourceMonth)}</div>`;
        }
        const noteId = effectiveNote.note.id;
        const states = checkboxStates[noteId] ?? [];
        content += `<div class="md">${renderMarkdownToHtml(effectiveNote.note.content, states)}</div>`;
        content += `</div>`;
      }

      content += `</div>\n`;
    }

    content += `</div>\n`;
  }

  content += `
  <div class="footer">
    Exported from Eclosion on ${new Date().toLocaleDateString()}
  </div>
</body>
</html>
`;

  return content;
}
