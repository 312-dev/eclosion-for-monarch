/**
 * FolderSelectionStep - Bookmark folder selection for wishlist wizard
 *
 * Tree view with expand/collapse, checkbox selection, and bookmark counts.
 */

import { useState, useMemo } from 'react';
import { Icons } from '../../../icons';
import type { FolderTreeNode } from '../../../../types/bookmarks';

/**
 * Recursively filter folder tree by search term.
 * A folder matches if its name contains the search term or any of its children match.
 */
function filterFolderTree(nodes: FolderTreeNode[], searchTerm: string): FolderTreeNode[] {
  if (!searchTerm.trim()) return nodes;

  const lowerSearch = searchTerm.toLowerCase();

  function nodeMatches(node: FolderTreeNode): FolderTreeNode | null {
    const nameMatches = node.name.toLowerCase().includes(lowerSearch);
    const filteredChildren = node.children
      .map(nodeMatches)
      .filter((child): child is FolderTreeNode => child !== null);

    // Include if name matches or has matching children
    if (nameMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }
    return null;
  }

  return nodes.map(nodeMatches).filter((node): node is FolderTreeNode => node !== null);
}

/**
 * Get all folder IDs from a tree (for auto-expanding when searching)
 */
function getAllFolderIds(nodes: FolderTreeNode[]): Set<string> {
  const ids = new Set<string>();
  function collect(node: FolderTreeNode) {
    ids.add(node.id);
    node.children.forEach(collect);
  }
  nodes.forEach(collect);
  return ids;
}

/**
 * Get the last visible descendant of a node (deepest last child)
 * Used for continuous border radius styling
 */
function getLastDescendant(node: FolderTreeNode): string {
  const lastChild = node.children.at(-1);
  if (lastChild) {
    return getLastDescendant(lastChild);
  }
  return node.id;
}

interface FolderSelectionStepProps {
  readonly folderTree: FolderTreeNode[];
  readonly expandedIds: Set<string>;
  readonly selectedFolderId: string | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onToggleExpanded: (folderId: string) => void;
  readonly onSelectFolder: (folderId: string) => void;
}

interface FolderTreeItemProps {
  readonly node: FolderTreeNode;
  readonly level: number;
  readonly expandedIds: Set<string>;
  readonly selectedFolderId: string | null;
  readonly isChildOfSelected: boolean;
  readonly lastDescendantId: string | null;
  readonly onToggleExpanded: (folderId: string) => void;
  readonly onSelectFolder: (folderId: string) => void;
}

function FolderTreeItem({
  node,
  level,
  expandedIds,
  selectedFolderId,
  isChildOfSelected,
  lastDescendantId,
  onToggleExpanded,
  onSelectFolder,
}: FolderTreeItemProps) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedFolderId === node.id;
  const isIncluded = isSelected || isChildOfSelected;
  const hasChildren = node.children.length > 0;

  // Force expand selected folder and all its children (can't collapse them)
  const isForceExpanded = isIncluded && hasChildren;
  const effectiveExpanded = isForceExpanded || isExpanded;

  // Compute last descendant ID for selected folder to pass to children
  const effectiveLastDescendantId = isSelected ? getLastDescendant(node) : lastDescendantId;
  const isLastInSelection = node.id === effectiveLastDescendantId;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't allow collapsing selected folder or any of its children
    if (hasChildren && !isIncluded) {
      onToggleExpanded(node.id);
    }
  };

  // Determine styles based on selection state
  const getBackgroundColor = () => {
    if (isSelected) return 'var(--monarch-orange)';
    if (isChildOfSelected) return 'var(--monarch-bg-hover)';
    return undefined;
  };

  // Determine border radius for continuous selection styling
  const getBorderRadius = () => {
    if (!isIncluded) return '0.5rem'; // rounded-lg for non-selected
    if (isSelected && isLastInSelection) return '0.5rem'; // Selected with no children
    if (isSelected) return '0.5rem 0.5rem 0 0'; // Selected parent: round top only
    if (isLastInSelection) return '0 0 0.5rem 0.5rem'; // Last child: round bottom only
    return '0'; // Middle children: no rounding
  };

  const getTextColor = () => {
    if (isSelected) return 'white';
    if (isChildOfSelected) return 'var(--monarch-text-muted)';
    return 'var(--monarch-text-dark)';
  };

  const getCheckboxIcon = () => {
    if (isSelected) {
      return <Icons.FolderCheck size={18} style={{ color: 'white' }} />;
    }
    if (isChildOfSelected) {
      return <Icons.FolderCheck size={18} style={{ color: 'var(--monarch-orange)', opacity: 0.6 }} />;
    }
    return <Icons.Folder size={18} style={{ color: 'var(--monarch-text-muted)' }} />;
  };

  // Child folders of selected parent are locked - not clickable
  const handleRowClick = () => {
    if (!isChildOfSelected) {
      onSelectFolder(node.id);
    }
  };

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isChildOfSelected) {
      e.preventDefault();
      onSelectFolder(node.id);
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={isChildOfSelected ? -1 : 0}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        className="w-full flex items-center py-2 px-2 transition-colors"
        style={{
          paddingLeft: `${level * 20 + 8}px`,
          backgroundColor: getBackgroundColor(),
          borderRadius: getBorderRadius(),
          cursor: isChildOfSelected ? 'default' : 'pointer',
        }}
      >
        {/* Expand/Collapse area */}
        <button
          type="button"
          onClick={handleExpandClick}
          className="w-5 h-5 flex items-center justify-center mr-1 transition-colors"
          style={{
            visibility: hasChildren ? 'visible' : 'hidden',
            color: isSelected ? 'white' : 'var(--monarch-text-muted)',
            cursor: isIncluded ? 'default' : 'pointer',
          }}
          tabIndex={hasChildren && !isIncluded ? 0 : -1}
          aria-label={effectiveExpanded ? 'Collapse folder' : 'Expand folder'}
          aria-expanded={hasChildren ? effectiveExpanded : undefined}
          disabled={isIncluded}
        >
          <Icons.ChevronRight
            size={14}
            style={{
              transform: effectiveExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
            }}
          />
        </button>

        {/* Checkbox icon */}
        <span className="mr-2 shrink-0">{getCheckboxIcon()}</span>

        {/* Folder name */}
        <span
          className="flex-1 text-left text-sm select-none"
          style={{ color: getTextColor(), fontWeight: isIncluded ? 600 : 'normal' }}
        >
          {node.name}
        </span>

        {/* Bookmark count */}
        <span
          className="text-xs mx-2 select-none"
          style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--monarch-text-muted)' }}
        >
          {node.totalBookmarkCount} bookmark{node.totalBookmarkCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Children */}
      {hasChildren && effectiveExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              selectedFolderId={selectedFolderId}
              isChildOfSelected={isIncluded}
              lastDescendantId={effectiveLastDescendantId}
              onToggleExpanded={onToggleExpanded}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderSelectionStep({
  folderTree,
  expandedIds,
  selectedFolderId,
  loading,
  error,
  onToggleExpanded,
  onSelectFolder,
}: FolderSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter folder tree based on search term
  const filteredTree = useMemo(
    () => filterFolderTree(folderTree, searchTerm),
    [folderTree, searchTerm]
  );

  // When searching, show all matching folders as expanded
  const effectiveExpandedIds = useMemo(() => {
    if (searchTerm.trim()) {
      return getAllFolderIds(filteredTree);
    }
    return expandedIds;
  }, [searchTerm, filteredTree, expandedIds]);

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Choose Bookmark Folder
      </h2>
      <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
        Select a bookmark folder to sync with your wishlist. New bookmarks in this folder will
        automatically create wishlist items.
      </p>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="py-8 text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Loading bookmark folders...
        </div>
      )}

      {!loading && folderTree.length === 0 && (
        <div className="py-4">
          <p style={{ color: 'var(--monarch-text-muted)' }}>
            No bookmark folders found. Make sure the selected browser has bookmarks.
          </p>
        </div>
      )}

      {!loading && folderTree.length > 0 && (
        <>
          {/* Search bar */}
          <div className="relative mb-3">
            <Icons.Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search folders..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border outline-none transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                borderColor: 'var(--monarch-border)',
                color: 'var(--monarch-text-dark)',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5"
                aria-label="Clear search"
              >
                <Icons.X size={14} style={{ color: 'var(--monarch-text-muted)' }} />
              </button>
            )}
          </div>

          {/* Folder tree */}
          <div
            className="border rounded-lg p-2 max-h-[300px] overflow-y-auto"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            {filteredTree.length === 0 ? (
              <div
                className="py-4 text-center text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                No folders match "{searchTerm}"
              </div>
            ) : (
              filteredTree.map((node) => (
                <FolderTreeItem
                  key={node.id}
                  node={node}
                  level={0}
                  expandedIds={effectiveExpandedIds}
                  selectedFolderId={selectedFolderId}
                  isChildOfSelected={false}
                  lastDescendantId={null}
                  onToggleExpanded={onToggleExpanded}
                  onSelectFolder={onSelectFolder}
                />
              ))
            )}
          </div>

          <p className="mt-3 text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Selecting a folder includes all bookmarks within it and its subfolders.
          </p>
        </>
      )}
    </div>
  );
}
