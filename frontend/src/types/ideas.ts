/**
 * Ideas Types
 *
 * Shared type definitions for the community ideas feature.
 * Used by IdeasModal, IdeasBoard, and the ideas API.
 */

/** Author info from GitHub Discussion */
export interface IdeaAuthor {
  username: string;
  avatarUrl: string;
}

/** Public idea from the ideas.json export */
export interface PublicIdea {
  id: string;
  title: string;
  description: string;
  votes: number;
  category: string;
  productboardUrl: string | null;
  discussionUrl: string | null;
  discussionNumber: number | null;
  status: 'open' | 'closed';
  closedReason: 'monarch-committed' | 'eclosion-shipped' | null;
  closedAt: string | null;
  source: 'productboard' | 'github';
  author: IdeaAuthor | null;
}

/** Full ideas data response from the API */
export interface IdeasData {
  generatedAt: string;
  votesThreshold: number;
  totalIdeas: number;
  openCount: number;
  closedCount: number;
  ideas: PublicIdea[];
}

/** Development cycle stages for visualization */
export type DevCycleStage = 'idea' | 'in-progress' | 'shipped';
