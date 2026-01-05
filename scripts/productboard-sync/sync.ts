import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { ProductBoardIdea, SyncState, TrackedIdea } from './types.js';
import { CONFIG } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, 'state.json');

/**
 * Load sync state from file
 */
function loadState(): SyncState {
  if (!existsSync(STATE_FILE)) {
    return {
      lastSync: new Date().toISOString(),
      trackedIdeas: {},
    };
  }
  const content = readFileSync(STATE_FILE, 'utf-8');
  return JSON.parse(content) as SyncState;
}

/**
 * Save sync state to file
 */
function saveState(state: SyncState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Execute a gh CLI command and return the result
 * Uses spawnSync to avoid shell parsing issues with special characters
 */
function gh(args: string[]): string {
  const result = spawnSync('gh', args, { encoding: 'utf-8' });
  if (result.error) {
    console.error('gh command failed:', result.error.message);
    throw result.error;
  }
  if (result.status !== 0) {
    console.error('gh command failed:', result.stderr);
    throw new Error(`Command failed: gh ${args.join(' ')}\n${result.stderr}`);
  }
  return result.stdout;
}

/**
 * Get the repository owner and name from git remote
 */
function getRepoInfo(): { owner: string; repo: string } {
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
  // Handle both HTTPS and SSH URLs
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) {
    throw new Error(`Could not parse GitHub repo from remote URL: ${remoteUrl}`);
  }
  return { owner: match[1], repo: match[2] };
}

/**
 * Get the category ID for the Ideas category
 */
async function getCategoryId(): Promise<string> {
  const { owner, repo } = getRepoInfo();

  const query = `
    query {
      repository(owner: "${owner}", name: "${repo}") {
        discussionCategories(first: 20) {
          nodes {
            id
            name
          }
        }
      }
    }
  `;

  const result = gh(['api', 'graphql', '-f', `query=${query.replaceAll('\n', ' ')}`]);
  const data = JSON.parse(result) as {
    data: {
      repository: {
        discussionCategories: {
          nodes: Array<{ id: string; name: string }>;
        };
      };
    };
  };

  const category = data.data.repository.discussionCategories.nodes.find(
    (c) => c.name.toLowerCase() === CONFIG.DISCUSSIONS_CATEGORY.toLowerCase()
  );

  if (!category) {
    throw new Error(
      `Discussion category "${CONFIG.DISCUSSIONS_CATEGORY}" not found. ` +
        `Please create it in your repository's Discussion settings first.`
    );
  }

  return category.id;
}

/** Label used to mark ideas shipped by Eclosion */
const ECLOSION_SHIPPED_LABEL = 'eclosion-shipped';

/** Structure returned from getExistingDiscussions */
export interface ExistingDiscussion {
  id: string;
  number: number;
  title: string;
  body: string;
  closed: boolean;
  closedAt: string | null;
  thumbsUpCount: number;
  labels: string[];
}

/**
 * Get all existing discussions in the Ideas category
 */
async function getExistingDiscussions(): Promise<ExistingDiscussion[]> {
  const { owner, repo } = getRepoInfo();

  const query = `
    query {
      repository(owner: "${owner}", name: "${repo}") {
        discussions(first: 100, categoryId: null) {
          nodes {
            id
            number
            title
            body
            closed
            closedAt
            category {
              name
            }
            reactions(content: THUMBS_UP) {
              totalCount
            }
            labels(first: 10) {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  `;

  const result = gh(['api', 'graphql', '-f', `query=${query.replaceAll('\n', ' ')}`]);
  const data = JSON.parse(result) as {
    data: {
      repository: {
        discussions: {
          nodes: Array<{
            id: string;
            number: number;
            title: string;
            body: string;
            closed: boolean;
            closedAt: string | null;
            category: { name: string };
            reactions: { totalCount: number };
            labels: { nodes: Array<{ name: string }> };
          }>;
        };
      };
    };
  };

  return data.data.repository.discussions.nodes
    .filter(
      (d) => d.category.name.toLowerCase() === CONFIG.DISCUSSIONS_CATEGORY.toLowerCase()
    )
    .map((d) => ({
      id: d.id,
      number: d.number,
      title: d.title,
      body: d.body,
      closed: d.closed,
      closedAt: d.closedAt,
      thumbsUpCount: d.reactions.totalCount,
      labels: d.labels.nodes.map((l) => l.name),
    }));
}

/**
 * Create a new discussion for a ProductBoard idea
 */
async function createDiscussion(
  idea: ProductBoardIdea,
  categoryId: string
): Promise<{ id: string; number: number }> {
  const { owner, repo } = getRepoInfo();

  const body = formatDiscussionBody(idea);
  const title = idea.title;

  const mutation = `
    mutation {
      createDiscussion(input: {
        repositoryId: "REPO_ID_PLACEHOLDER",
        categoryId: "${categoryId}",
        title: "${escapeGraphQL(title)}",
        body: "${escapeGraphQL(body)}"
      }) {
        discussion {
          id
          number
        }
      }
    }
  `;

  // First get the repository ID
  const repoQuery = `query { repository(owner: "${owner}", name: "${repo}") { id } }`;
  const repoResult = gh(['api', 'graphql', '-f', `query=${repoQuery}`]);
  const repoData = JSON.parse(repoResult) as { data: { repository: { id: string } } };
  const repoId = repoData.data.repository.id;

  const finalMutation = mutation.replace('REPO_ID_PLACEHOLDER', repoId);
  const result = gh(['api', 'graphql', '-f', `query=${finalMutation.replaceAll('\n', ' ')}`]);
  const data = JSON.parse(result) as {
    data: { createDiscussion: { discussion: { id: string; number: number } } };
  };

  return data.data.createDiscussion.discussion;
}

/**
 * Update a discussion's body with new vote count
 */
async function updateDiscussionVotes(
  discussionId: string,
  idea: ProductBoardIdea,
  oldVotes: number
): Promise<void> {
  const newBody = formatDiscussionBody(idea);

  const mutation = `
    mutation {
      updateDiscussion(input: {
        discussionId: "${discussionId}",
        body: "${escapeGraphQL(newBody)}"
      }) {
        discussion { id }
      }
    }
  `;

  gh(['api', 'graphql', '-f', `query=${mutation.replaceAll('\n', ' ')}`]);
  console.log(
    `    Updated votes: ${oldVotes.toLocaleString()} → ${idea.votes.toLocaleString()}`
  );
}

/**
 * Close a discussion with a comment explaining why
 */
async function closeDiscussion(discussionId: string, reason: string): Promise<void> {
  // Add a comment explaining the closure
  const commentMutation = `
    mutation {
      addDiscussionComment(input: {
        discussionId: "${discussionId}",
        body: "${escapeGraphQL(reason)}"
      }) {
        comment { id }
      }
    }
  `;
  gh(['api', 'graphql', '-f', `query=${commentMutation.replaceAll('\n', ' ')}`]);

  // Close the discussion
  const closeMutation = `
    mutation {
      closeDiscussion(input: {
        discussionId: "${discussionId}",
        reason: RESOLVED
      }) {
        discussion { id }
      }
    }
  `;
  gh(['api', 'graphql', '-f', `query=${closeMutation.replaceAll('\n', ' ')}`]);
}

/**
 * Format the discussion body for a ProductBoard idea
 */
function formatDiscussionBody(idea: ProductBoardIdea): string {
  return `**Votes on ProductBoard**: ${idea.votes.toLocaleString()}
**Category**: ${idea.category}
**ProductBoard Link**: [View on Monarch's Roadmap](${idea.url})

## Description

${idea.description || '_No description available_'}

---

*This discussion tracks a feature request from Monarch Money's public roadmap.*
*Discuss implementation ideas and vote with :+1: if you'd like Eclosion to build this.*

<!-- productboard-id: ${idea.id} -->`;
}

/**
 * Escape special characters for GraphQL strings
 */
function escapeGraphQL(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Extract ProductBoard ID from discussion body
 */
function extractProductBoardId(body: string): string | null {
  const match = body.match(/<!-- productboard-id: (.+?) -->/);
  return match ? match[1] : null;
}

/**
 * Normalize title for fuzzy matching
 */
function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replaceAll(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Get closed reason from a discussion
 */
function getClosedReason(disc: ExistingDiscussion): TrackedIdea['closedReason'] {
  if (!disc.closed) return undefined;
  return disc.labels.includes(ECLOSION_SHIPPED_LABEL) ? 'eclosion-shipped' : 'monarch-committed';
}

/**
 * Remove HTML comments completely, looping until no more are found.
 * This prevents incomplete multi-character sanitization vulnerabilities.
 */
function removeHtmlComments(text: string): string {
  const commentPattern = /<!--[\s\S]*?-->/g;
  let result = text;
  let previous = '';
  // Loop until no changes occur to handle nested/malformed comments
  while (result !== previous) {
    previous = result;
    result = result.replaceAll(commentPattern, '');
  }
  return result;
}

/**
 * Extract description from discussion body (first paragraph or first 200 chars)
 */
function extractDescription(body: string): string {
  // Remove markdown formatting and get first meaningful content
  const cleaned = body
    .replaceAll(/\*\*[^*]+\*\*:?\s*/g, '') // Remove bold labels
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replaceAll(/^#+\s+.+$/gm, '') // Remove headers
    .replaceAll(/^-+$/gm, '') // Remove horizontal rules
    .replaceAll(/^\s*[-*]\s+/gm, '') // Remove list markers
    .trim();

  // Remove HTML comments with loop to handle incomplete sanitization
  const withoutComments = removeHtmlComments(cleaned);

  // Get first paragraph or first 200 chars
  const firstPara = withoutComments.split(/\n\n/)[0]?.trim() || '';
  return firstPara.length > 200 ? `${firstPara.slice(0, 197)}...` : firstPara;
}

/**
 * Sync ProductBoard ideas to GitHub Discussions
 */
export async function syncToDiscussions(ideas: ProductBoardIdea[]): Promise<void> {
  console.log('Loading sync state...');
  const state = loadState();

  console.log('Getting discussion category ID...');
  const categoryId = await getCategoryId();

  console.log('Fetching existing discussions...');
  const existingDiscussions = await getExistingDiscussions();

  // Build a map of ProductBoard ID to existing discussion
  const existingByPbId = new Map<string, ExistingDiscussion>();
  // Also track discussions by normalized title for matching manually-created ones
  const existingByTitle = new Map<string, ExistingDiscussion>();
  for (const disc of existingDiscussions) {
    const pbId = extractProductBoardId(disc.body);
    if (pbId) {
      existingByPbId.set(pbId, disc);
    }
    // Index by normalized title for fallback matching
    existingByTitle.set(normalizeTitle(disc.title), disc);
  }

  // Import any manually-created discussions that match scraped ideas by title
  console.log('\nChecking for manually-created discussions to import...');
  const matchedDiscussionIds = new Set<string>();
  for (const idea of ideas) {
    // Skip if already tracked by ProductBoard ID
    if (existingByPbId.has(idea.id)) {
      matchedDiscussionIds.add(existingByPbId.get(idea.id)!.id);
      continue;
    }
    if (state.trackedIdeas[idea.id]?.discussionNumber) continue;

    // Try to match by title
    const matchingDisc = existingByTitle.get(normalizeTitle(idea.title));
    if (matchingDisc) {
      console.log(`  Found manual discussion #${matchingDisc.number} matching "${idea.title}"`);
      state.trackedIdeas[idea.id] = {
        discussionId: matchingDisc.id,
        discussionNumber: matchingDisc.number,
        status: matchingDisc.closed ? 'closed' : 'open',
        lastVoteCount: idea.votes,
        lastProductBoardStatus: idea.status,
        githubVotes: matchingDisc.thumbsUpCount,
        closedReason: getClosedReason(matchingDisc),
        closedAt: matchingDisc.closedAt ?? undefined,
        source: 'productboard',
      };
      // Add to the map so we don't create a duplicate
      existingByPbId.set(idea.id, matchingDisc);
      matchedDiscussionIds.add(matchingDisc.id);
    }
  }

  // Import GitHub-only discussions (community ideas not on ProductBoard)
  console.log('\nChecking for GitHub-only community ideas...');
  for (const disc of existingDiscussions) {
    // Skip if already matched to a ProductBoard idea
    if (matchedDiscussionIds.has(disc.id)) continue;
    // Skip if already in state (use discussion number as key for GitHub-only ideas)
    const githubKey = `github-${disc.number}`;
    if (state.trackedIdeas[githubKey]) {
      // Update vote count
      state.trackedIdeas[githubKey].githubVotes = disc.thumbsUpCount;
      state.trackedIdeas[githubKey].status = disc.closed ? 'closed' : 'open';
      if (disc.closed) {
        state.trackedIdeas[githubKey].closedReason = getClosedReason(disc);
        state.trackedIdeas[githubKey].closedAt = disc.closedAt ?? undefined;
      }
      continue;
    }

    console.log(`  Importing GitHub-only idea #${disc.number}: "${disc.title}"`);
    state.trackedIdeas[githubKey] = {
      discussionId: disc.id,
      discussionNumber: disc.number,
      status: disc.closed ? 'closed' : 'open',
      lastVoteCount: 0, // No ProductBoard votes
      githubVotes: disc.thumbsUpCount,
      closedReason: getClosedReason(disc),
      closedAt: disc.closedAt ?? undefined,
      source: 'github',
      title: disc.title,
      description: extractDescription(disc.body),
      category: 'Community',
    };
  }

  // Update GitHub votes for all tracked discussions
  console.log('\nUpdating GitHub vote counts...');
  for (const disc of existingDiscussions) {
    const pbId = extractProductBoardId(disc.body);
    if (pbId && state.trackedIdeas[pbId]) {
      const tracked = state.trackedIdeas[pbId];
      tracked.githubVotes = disc.thumbsUpCount;

      // Check for eclosion-shipped label on closed discussions
      if (disc.closed && disc.labels.includes(ECLOSION_SHIPPED_LABEL)) {
        if (tracked.closedReason !== 'eclosion-shipped') {
          console.log(`  Detected "${disc.title}" shipped by Eclosion`);
          tracked.closedReason = 'eclosion-shipped';
          tracked.closedAt = disc.closedAt ?? new Date().toISOString();
          tracked.status = 'closed';
        }
      }
    }
  }

  // Separate ideas by status
  const uncommittedIdeas = ideas.filter((i) => i.status === 'idea');
  const committedIdeas = ideas.filter((i) => i.status === 'in_progress' || i.status === 'up_next');

  // Create discussions for new high-vote uncommitted ideas
  const highVoteUncommitted = uncommittedIdeas.filter((i) => i.votes >= CONFIG.VOTE_THRESHOLD);
  console.log(`\nFound ${highVoteUncommitted.length} high-vote uncommitted ideas`);

  for (const idea of highVoteUncommitted) {
    const existing = existingByPbId.get(idea.id);
    if (existing) {
      // Check if votes changed significantly (10% or 50+ votes difference)
      const tracked = state.trackedIdeas[idea.id];
      const oldVotes = tracked?.lastVoteCount ?? 0;
      const voteDiff = Math.abs(idea.votes - oldVotes);
      const shouldUpdate = voteDiff >= 50 || voteDiff / oldVotes >= 0.1;

      if (shouldUpdate && !existing.closed) {
        console.log(`  Updating "${idea.title}" (#${existing.number}) - votes changed`);
        try {
          await updateDiscussionVotes(existing.id, idea, oldVotes);
          if (tracked) {
            tracked.lastVoteCount = idea.votes;
          }
        } catch (error) {
          console.error(`    Failed to update votes:`, error);
        }
      } else {
        console.log(`  Skipping "${idea.title}" - no significant changes`);
      }
      continue;
    }

    console.log(`  Creating discussion for "${idea.title}" (${idea.votes} votes)...`);
    try {
      const discussion = await createDiscussion(idea, categoryId);
      state.trackedIdeas[idea.id] = {
        discussionId: discussion.id,
        discussionNumber: discussion.number,
        status: 'open',
        lastVoteCount: idea.votes,
        lastProductBoardStatus: idea.status,
        githubVotes: 0, // New discussions start with 0 GitHub votes
        source: 'productboard',
      };
      console.log(`    Created discussion #${discussion.number}`);
    } catch (error) {
      console.error(`    Failed to create discussion:`, error);
    }
  }

  // Close discussions for ideas that Monarch has committed to
  console.log(`\nChecking for ideas Monarch has committed to...`);
  for (const idea of committedIdeas) {
    const existing = existingByPbId.get(idea.id);
    if (existing && !existing.closed) {
      console.log(`  Closing "${idea.title}" - Monarch is now building this (${idea.status})`);
      try {
        const statusText = idea.status === 'in_progress' ? 'In Progress' : 'Up Next';
        await closeDiscussion(
          existing.id,
          `## Monarch is Building This!\n\n` +
            `This feature has moved to **${statusText}** on Monarch's roadmap. ` +
            `Monarch is now committed to building this feature.\n\n` +
            `[View on ProductBoard](${idea.url})`
        );
        if (state.trackedIdeas[idea.id]) {
          state.trackedIdeas[idea.id].status = 'closed';
          state.trackedIdeas[idea.id].lastProductBoardStatus = idea.status;
          state.trackedIdeas[idea.id].closedReason = 'monarch-committed';
          state.trackedIdeas[idea.id].closedAt = new Date().toISOString();
        }
        console.log(`    Closed discussion #${existing.number}`);
      } catch (error) {
        console.error(`    Failed to close discussion:`, error);
      }
    }
  }

  // Update state
  state.lastSync = new Date().toISOString();
  saveState(state);
  console.log(`\nSync complete. State saved.`);
}
