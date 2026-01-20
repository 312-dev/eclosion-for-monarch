/**
 * Bookmark Normalizer
 *
 * Utilities for converting and filtering bookmark data.
 */

import type { Bookmark, BookmarkFolder, FolderTreeNode } from './types';

/**
 * Extract flat list of folders from bookmark tree.
 * Used for the folder selection UI.
 */
export function extractFolders(root: Bookmark): BookmarkFolder[] {
  const folders: BookmarkFolder[] = [];

  function traverse(node: Bookmark, currentPath: string): void {
    if (node.type !== 'folder') return;

    const fullPath = currentPath ? `${currentPath} > ${node.name}` : node.name;

    const bookmarkCount = node.children?.filter((c) => c.type === 'url').length ?? 0;
    const subfolderCount = node.children?.filter((c) => c.type === 'folder').length ?? 0;

    folders.push({
      id: node.id,
      name: node.name,
      path: fullPath,
      bookmarkCount,
      subfolderCount,
    });

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        traverse(child, fullPath);
      }
    }
  }

  traverse(root, '');
  return folders;
}

/**
 * Filter bookmark tree to only include selected folders and their contents.
 * Used when syncing only specific folders.
 *
 * Logic:
 * - If a folder is selected, include it and ALL its descendants (URLs and subfolders)
 * - If a folder is not selected, only include it if it's an ancestor of a selected folder
 *   (to maintain tree structure), but don't include its direct URL children
 */
export function filterToSelectedFolders(
  root: Bookmark,
  selectedFolderIds: Set<string>
): Bookmark | null {
  function filterNode(node: Bookmark, parentSelected: boolean): Bookmark | null {
    if (node.type === 'url') {
      // Only include URLs if their parent folder is selected
      return parentSelected ? node : null;
    }

    // For folders, check if this folder is selected
    const isSelected = selectedFolderIds.has(node.id);
    const includeAllChildren = parentSelected || isSelected;

    const filteredChildren = node.children
      ?.map((child) => filterNode(child, includeAllChildren))
      .filter((c): c is Bookmark => c !== null);

    // Include folder if:
    // 1. It's directly selected, OR
    // 2. A parent is selected (so include all children), OR
    // 3. It has children that passed the filter (ancestor of selected folder)
    if (isSelected || parentSelected || (filteredChildren && filteredChildren.length > 0)) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  }

  return filterNode(root, false);
}

/**
 * Flatten a bookmark tree to a map of id -> bookmark.
 * Used for change detection.
 */
export function flattenToMap(root: Bookmark): Map<string, Bookmark> {
  const map = new Map<string, Bookmark>();

  function traverse(node: Bookmark): void {
    map.set(node.id, node);
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return map;
}

/**
 * Count total items (both URLs and folders) in a tree.
 */
export function countItems(node: Bookmark): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countItems(child);
    }
  }
  return count;
}

/**
 * Count only URL bookmarks (not folders) in a tree.
 */
export function countBookmarks(node: Bookmark): number {
  let count = node.type === 'url' ? 1 : 0;
  if (node.children) {
    for (const child of node.children) {
      count += countBookmarks(child);
    }
  }
  return count;
}

/**
 * Find a bookmark or folder by ID in the tree.
 */
export function findById(root: Bookmark, id: string): Bookmark | null {
  if (root.id === id) {
    return root;
  }

  if (root.children) {
    for (const child of root.children) {
      const found = findById(child, id);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Get all bookmarks (URLs only) from a node and its descendants.
 * Returns a flat array.
 */
export function getAllBookmarks(node: Bookmark): Bookmark[] {
  const bookmarks: Bookmark[] = [];

  function traverse(n: Bookmark): void {
    if (n.type === 'url') {
      bookmarks.push(n);
    }
    if (n.children) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return bookmarks;
}

/**
 * Convert a bookmark tree to a hierarchical folder tree.
 * Used for the folder selection UI with expand/collapse support.
 * Returns an array of top-level folder nodes.
 */
export function getFolderTree(root: Bookmark): FolderTreeNode[] {
  function convertNode(node: Bookmark): FolderTreeNode | null {
    if (node.type !== 'folder') return null;

    // Count direct bookmarks in this folder
    const bookmarkCount = node.children?.filter((c) => c.type === 'url').length ?? 0;

    // Recursively convert child folders
    const children: FolderTreeNode[] = [];
    if (node.children) {
      for (const child of node.children) {
        const childNode = convertNode(child);
        if (childNode) {
          children.push(childNode);
        }
      }
    }

    // Calculate total bookmark count (this folder + all descendants)
    const childBookmarkTotal = children.reduce((sum, c) => sum + c.totalBookmarkCount, 0);
    const totalBookmarkCount = bookmarkCount + childBookmarkTotal;

    return {
      id: node.id,
      name: node.name,
      bookmarkCount,
      totalBookmarkCount,
      children,
    };
  }

  // The root is typically a virtual folder containing top-level folders
  // Return its children as the top-level tree
  if (root.type === 'folder' && root.children) {
    const result: FolderTreeNode[] = [];
    for (const child of root.children) {
      const node = convertNode(child);
      if (node) {
        result.push(node);
      }
    }
    return result;
  }

  // If root itself is a folder we want to include
  const node = convertNode(root);
  return node ? [node] : [];
}
