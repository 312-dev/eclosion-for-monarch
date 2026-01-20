/**
 * Folder tree utility functions for wishlist bookmark folder selection.
 */

import type { FolderTreeNode } from '../../../../types/bookmarks';

/**
 * Recursively filter folder tree by search term.
 * A folder matches if its name contains the search term or any of its children match.
 */
export function filterFolderTree(nodes: FolderTreeNode[], searchTerm: string): FolderTreeNode[] {
  if (!searchTerm.trim()) return nodes;
  const lowerSearch = searchTerm.toLowerCase();

  function nodeMatches(node: FolderTreeNode): FolderTreeNode | null {
    const nameMatches = node.name.toLowerCase().includes(lowerSearch);
    const filteredChildren = node.children
      .map(nodeMatches)
      .filter((child): child is FolderTreeNode => child !== null);
    if (nameMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }

  return nodes.map(nodeMatches).filter((node): node is FolderTreeNode => node !== null);
}

/** Get all folder IDs from a tree (for auto-expanding when searching) */
export function getAllFolderIds(nodes: FolderTreeNode[]): Set<string> {
  const ids = new Set<string>();
  function collect(node: FolderTreeNode) {
    ids.add(node.id);
    node.children.forEach(collect);
  }
  nodes.forEach(collect);
  return ids;
}

/** Get the last visible descendant of a node (deepest last child) */
export function getLastDescendant(node: FolderTreeNode): string {
  const lastChild = node.children.at(-1);
  return lastChild ? getLastDescendant(lastChild) : node.id;
}
