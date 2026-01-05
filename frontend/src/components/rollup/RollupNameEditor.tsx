/**
 * Rollup Name Editor
 *
 * Inline editable name display with flip animation between
 * category name and "Rollup Category" label.
 */

import { useRef, useEffect, useCallback, type KeyboardEvent } from 'react';

interface RollupNameEditorProps {
  readonly isEditing: boolean;
  readonly nameValue: string;
  readonly currentName: string;
  readonly isUpdating: boolean;
  readonly showAlternateName: boolean;
  readonly isHovering: boolean;
  readonly itemCount: number;
  readonly onStartEdit: () => void;
  readonly onNameChange: (value: string) => void;
  readonly onSubmit: () => Promise<void>;
  readonly onCancel: () => void;
  readonly onHoverStart: () => void;
  readonly onHoverEnd: () => void;
}

const DEFAULT_ROLLUP_NAME = 'Rollup Category';

export function RollupNameEditor({
  isEditing,
  nameValue,
  currentName,
  isUpdating,
  showAlternateName,
  isHovering,
  itemCount,
  onStartEdit,
  onNameChange,
  onSubmit,
  onCancel,
  onHoverStart,
  onHoverEnd,
}: RollupNameEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  const displayName = currentName || DEFAULT_ROLLUP_NAME;

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={nameValue}
        onChange={(e) => onNameChange(e.target.value)}
        onBlur={onSubmit}
        onKeyDown={handleKeyDown}
        disabled={isUpdating}
        onClick={(e) => e.stopPropagation()}
        aria-label="Rollup category name"
        className="font-medium px-1 py-0.5 rounded text-sm text-monarch-text-dark bg-monarch-bg-card border border-monarch-orange outline-none min-w-30"
      />
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Rollup category name: ${displayName}. Press Enter to edit`}
        className="font-medium cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded -mx-1 grid text-monarch-text-dark"
        style={{ perspective: '400px' }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onStartEdit();
          }
        }}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        onTouchEnd={onHoverEnd}
      >
        <span
          className="col-start-1 row-start-1 transition-all duration-500"
          style={{
            transform: showAlternateName && !isHovering ? 'rotateX(90deg)' : 'rotateX(0deg)',
            opacity: showAlternateName && !isHovering ? 0 : 1,
          }}
        >
          {displayName}
        </span>
        <span
          className="col-start-1 row-start-1 transition-all duration-500 whitespace-nowrap"
          style={{
            transform: showAlternateName && !isHovering ? 'rotateX(0deg)' : 'rotateX(-90deg)',
            opacity: showAlternateName && !isHovering ? 1 : 0,
          }}
        >
          Rollup Category
        </span>
      </div>
      <span className="text-xs text-monarch-text-muted">
        ({itemCount})
      </span>
    </>
  );
}
