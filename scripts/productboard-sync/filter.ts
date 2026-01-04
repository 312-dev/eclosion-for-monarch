import type { ProductBoardIdea } from './types.js';

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'gpt-4o-mini'; // Fast and cheap for classification

export interface FilterResult {
  idea: ProductBoardIdea;
  feasible: boolean;
  reason: string;
}

/**
 * Build the prompt for AI feasibility evaluation
 */
function buildFilterPrompt(ideas: ProductBoardIdea[]): string {
  const ideasJson = ideas.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description.substring(0, 300),
    votes: i.votes,
  }));

  return `You are evaluating feature requests from Monarch Money's roadmap to determine if they could be built by Eclosion, an EXTERNAL third-party tool.

## About Eclosion
Eclosion is a self-hosted toolkit that EXTENDS Monarch Money. It can:
- Read data from Monarch's API (transactions, accounts, categories, balances)
- Build NEW features on top of that data (reports, forecasting, analysis)
- Provide alternative UIs for viewing/analyzing financial data

Eclosion CANNOT:
- Modify Monarch's core app or UI
- Access Monarch's internal systems (aggregators, Plaid connections)
- Change how Monarch stores data (currency, data model)
- Access data Monarch doesn't expose via API
- Build features requiring Monarch's anonymized user base

## Task
For each idea below, determine if Eclosion could realistically build it.

Return JSON array with this structure:
[
  { "id": "uuid", "feasible": true/false, "reason": "brief explanation" }
]

## Ideas to evaluate:
${JSON.stringify(ideasJson, null, 2)}

Return ONLY the JSON array, no other text.`;
}

/**
 * Call GitHub Models API to evaluate feasibility
 */
async function callAI(prompt: string): Promise<string> {
  const token = process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GH_TOKEN environment variable required for AI filtering');
  }

  const response = await fetch(GITHUB_MODELS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3, // Lower for more consistent classification
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Models API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in API response');
  }

  return content;
}

/**
 * Use AI to filter ideas based on feasibility for Eclosion
 */
export async function filterFeasibleIdeasWithAI(
  ideas: ProductBoardIdea[]
): Promise<FilterResult[]> {
  console.log(`\nEvaluating ${ideas.length} ideas with AI...`);

  const prompt = buildFilterPrompt(ideas);
  const response = await callAI(prompt);

  // Parse JSON response
  let evaluations: Array<{ id: string; feasible: boolean; reason: string }>;
  try {
    // Handle potential markdown code blocks
    const jsonStr = response.replaceAll(/```json\n?|\n?```/g, '').trim();
    evaluations = JSON.parse(jsonStr) as Array<{
      id: string;
      feasible: boolean;
      reason: string;
    }>;
  } catch {
    console.error('Failed to parse AI response:', response);
    throw new Error('AI returned invalid JSON');
  }

  // Map evaluations back to ideas
  const evalMap = new Map(evaluations.map((e) => [e.id, e]));

  return ideas.map((idea) => {
    const evaluation = evalMap.get(idea.id);
    return {
      idea,
      feasible: evaluation?.feasible ?? true,
      reason: evaluation?.reason ?? 'No evaluation returned',
    };
  });
}

/**
 * Get only feasible ideas (using AI evaluation)
 */
export async function getFeasibleIdeas(
  ideas: ProductBoardIdea[]
): Promise<ProductBoardIdea[]> {
  const results = await filterFeasibleIdeasWithAI(ideas);
  return results.filter((r) => r.feasible).map((r) => r.idea);
}

/**
 * Print a summary of the filtering results
 */
export function printFilterSummary(results: FilterResult[]): void {
  const feasible = results.filter((r) => r.feasible);
  const infeasible = results.filter((r) => !r.feasible);

  console.log('\n' + '='.repeat(60));
  console.log('AI Feasibility Analysis');
  console.log('='.repeat(60));

  console.log(`\n✅ FEASIBLE FOR ECLOSION (${feasible.length}):`);
  for (const r of feasible) {
    console.log(`  ● ${r.idea.title} (${r.idea.votes.toLocaleString()} votes)`);
    console.log(`    → ${r.reason}`);
  }

  console.log(`\n❌ NOT FEASIBLE - Requires Monarch internals (${infeasible.length}):`);
  for (const r of infeasible) {
    console.log(`  ✗ ${r.idea.title} (${r.idea.votes.toLocaleString()} votes)`);
    console.log(`    → ${r.reason}`);
  }
}
