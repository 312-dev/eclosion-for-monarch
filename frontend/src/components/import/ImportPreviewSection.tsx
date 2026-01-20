/**
 * ImportPreviewSection - Preview of import data with tool selection
 */

import { AlertTriangle, Check } from 'lucide-react';
import type { ImportPreview } from '../../types';

interface ImportPreviewSectionProps {
  readonly preview: ImportPreview;
  readonly selectedTools: Set<string>;
  readonly importing: boolean;
  readonly onToolToggle: (tool: string) => void;
}

/** Render preview details for the recurring tool */
function RecurringPreviewDetails({
  info,
}: {
  info: NonNullable<ImportPreview['tools']['recurring']>;
}) {
  return (
    <>
      {info.has_config && (
        <div className="flex items-center gap-1">
          <Check size={12} /> Configuration settings
        </div>
      )}
      {info.enabled_items_count > 0 && (
        <div className="flex items-center gap-1">
          <Check size={12} /> {info.enabled_items_count} tracked items
        </div>
      )}
      {info.categories_count > 0 && (
        <div className="flex items-center gap-1">
          <Check size={12} /> {info.categories_count} category mappings
        </div>
      )}
      {info.has_rollup && (
        <div className="flex items-center gap-1">
          <Check size={12} /> Rollup with {info.rollup_items_count} items
        </div>
      )}
    </>
  );
}

/** Render preview details for the notes tool */
function NotesPreviewDetails({ info }: { info: NonNullable<ImportPreview['tools']['notes']> }) {
  const totalNotes = info.category_notes_count + info.general_notes_count;
  return (
    <>
      {totalNotes > 0 && (
        <div className="flex items-center gap-1">
          <Check size={12} /> {totalNotes} note{totalNotes === 1 ? '' : 's'}
        </div>
      )}
      {info.category_notes_count > 0 && (
        <div className="flex items-center gap-1 ml-4">
          {info.category_notes_count} category note{info.category_notes_count === 1 ? '' : 's'}
        </div>
      )}
      {info.general_notes_count > 0 && (
        <div className="flex items-center gap-1 ml-4">
          {info.general_notes_count} general note{info.general_notes_count === 1 ? '' : 's'}
        </div>
      )}
      {info.archived_notes_count > 0 && (
        <div className="flex items-center gap-1">
          <Check size={12} /> {info.archived_notes_count} archived note
          {info.archived_notes_count === 1 ? '' : 's'}
        </div>
      )}
      {info.has_checkbox_states && (
        <div className="flex items-center gap-1">
          <Check size={12} /> Checkbox states
        </div>
      )}
    </>
  );
}

/** Render preview details for the wishlist tool */
function WishlistPreviewDetails({
  info,
}: {
  info: NonNullable<ImportPreview['tools']['wishlist']>;
}) {
  return (
    <>
      {info.has_config && (
        <div className="flex items-center gap-1">
          <Check size={12} /> Configuration settings
        </div>
      )}
      {info.items_count > 0 && (
        <div className="flex items-center gap-1">
          <Check size={12} /> {info.items_count} wishlist item{info.items_count === 1 ? '' : 's'}
        </div>
      )}
      {info.archived_items_count > 0 && (
        <div className="flex items-center gap-1">
          <Check size={12} /> {info.archived_items_count} archived item
          {info.archived_items_count === 1 ? '' : 's'}
        </div>
      )}
      {info.pending_bookmarks_count > 0 && (
        <div className="flex items-center gap-1">
          <Check size={12} /> {info.pending_bookmarks_count} pending bookmark
          {info.pending_bookmarks_count === 1 ? '' : 's'}
        </div>
      )}
    </>
  );
}

/** Render preview details based on tool type */
function ToolPreviewDetails({ tool, preview }: { tool: string; preview: ImportPreview }) {
  if (tool === 'recurring' && preview.tools.recurring) {
    return <RecurringPreviewDetails info={preview.tools.recurring} />;
  }
  if (tool === 'notes' && preview.tools.notes) {
    return <NotesPreviewDetails info={preview.tools.notes} />;
  }
  if (tool === 'wishlist' && preview.tools.wishlist) {
    return <WishlistPreviewDetails info={preview.tools.wishlist} />;
  }
  return null;
}

export function ImportPreviewSection({
  preview,
  selectedTools,
  importing,
  onToolToggle,
}: ImportPreviewSectionProps) {
  return (
    <div className="space-y-3">
      {/* Export info */}
      <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
        <div className="flex justify-between mb-1">
          <span style={{ color: 'var(--monarch-text-muted)' }}>Exported</span>
          <span style={{ color: 'var(--monarch-text-dark)' }}>
            {new Date(preview.exported_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--monarch-text-muted)' }}>Source</span>
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor:
                preview.source_mode === 'demo'
                  ? 'var(--monarch-orange-light)'
                  : 'var(--monarch-success-bg)',
              color:
                preview.source_mode === 'demo' ? 'var(--monarch-orange)' : 'var(--monarch-success)',
            }}
          >
            {preview.source_mode === 'demo' ? 'Demo' : 'Production'}
          </span>
        </div>
      </div>

      {/* Tool selection */}
      <div>
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Select tools to import:
        </div>
        <div className="space-y-2">
          {Object.keys(preview.tools).map((tool) => (
            <label
              key={tool}
              className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
              style={{
                backgroundColor: selectedTools.has(tool)
                  ? 'var(--monarch-orange-light)'
                  : 'var(--monarch-bg-page)',
                border: `1px solid ${selectedTools.has(tool) ? 'var(--monarch-orange)' : 'var(--monarch-border)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={selectedTools.has(tool)}
                onChange={() => onToolToggle(tool)}
                disabled={importing}
                className="mt-1"
              />
              <div className="flex-1">
                <div
                  className="font-medium capitalize"
                  style={{ color: 'var(--monarch-text-dark)' }}
                >
                  {tool} Tool
                </div>
                <div
                  className="text-xs mt-1 space-y-0.5"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  <ToolPreviewDetails tool={tool} preview={preview} />
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div
        className="p-3 rounded-lg flex items-start gap-2 text-sm"
        style={{ backgroundColor: 'var(--monarch-warning-bg)', color: 'var(--monarch-warning)' }}
      >
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <span>Importing will overwrite your current settings for the selected tools.</span>
      </div>
    </div>
  );
}
