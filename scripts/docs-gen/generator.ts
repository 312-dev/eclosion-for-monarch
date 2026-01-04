/**
 * AI Documentation Generator - Uses Azure OpenAI to generate MDX docs
 */

import type { ExtractedContent, DocMapping } from './types.js';

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'claude-3.5-sonnet'; // Better for documentation writing than gpt-4o-mini

interface GeneratedDoc {
  topic: string;
  frontmatter: {
    title: string;
    description: string;
    sidebar_position: number;
  };
  content: string;
}

/**
 * Build the prompt for AI doc generation
 */
function buildPrompt(
  topic: string,
  contents: ExtractedContent[],
  mapping: DocMapping
): string {
  const contentJson = JSON.stringify(contents, null, 2);

  return `You are writing user documentation for Eclosion, a modular self-hosted toolkit that extends Monarch Money with additional features.

## Important Framing
Eclosion is NOT a single-purpose app. It is a growing toolkit that adds multiple features to Monarch Money. The Recurring Expenses feature is just one module among several (with more planned). Never frame Eclosion as "a recurring expense tracker" or center the entire app around any single feature. Each doc page should present its feature as one part of a larger toolkit.

## Task
Generate a comprehensive user guide in MDX format based on the extracted UI help content below.

## Extracted Content
${contentJson}

## Context
- Feature: ${mapping.feature}
- User Flow: ${mapping.userFlow}
- Topic: ${topic}
- Parent Feature: ${mapping.parentFeature || 'none (top-level)'}
- Sidebar Position: ${mapping.sidebarPosition || 'auto'}

## Writing Style Guide

**Tone & Voice:**
- Write like you're chatting with a friend who uses Monarch Money
- Be warm and conversational, not stiff or corporate
- Use contractions naturally (you'll, it's, don't)
- Assume the reader isn't tech-savvy but don't be condescending
- Be direct and confident, avoid hedging language

**Structure:**
- Use bullet points and numbered lists for instructions
- Keep paragraphs short (2-3 sentences max)
- Use clear heading hierarchy (## for sections, ### for subsections)

**Length:**
- Be concise, but cover common edge cases users might encounter
- Don't over-explain obvious things

**Word Choices:**
- Use "select" instead of "click"
- Avoid overusing: "simply", "just", "easy", "easily"
- Never use em-dashes (—)
- No emojis

**CRITICAL: Avoid Repetition**
- Never repeat the same information twice in different words
- Each paragraph should introduce NEW information, not rephrase the previous one
- If you explain something in one section, don't explain it again in another
- Vary your sentence structures and openings

**Admonitions (:::tip, :::note, :::warning):**
- Use sparingly for genuinely important callouts
- CRITICAL: Admonitions must contain STANDALONE information that is NOT already stated in the surrounding text
- Bad: Explaining something in a paragraph, then adding a :::tip that says the same thing differently
- Good: A :::tip that adds a genuinely useful shortcut, gotcha, or insight not mentioned elsewhere
- If you can't think of something new to say in an admonition, don't use one

**Avoid AI Tell-Tales:**
- No overly formal phrasing ("It is important to note that...")
- No excessive hedging ("You may want to consider...")
- No filler phrases ("In order to...", "As you can see...")
- No repetitive summary sentences at the end of sections
- Write naturally, as a human would

## Requirements
1. Write a clear, friendly guide that explains the feature to regular users
2. Use the extracted tour steps, wizard content, and descriptions as source material
3. Include step-by-step instructions where applicable
4. Reference specific UI elements when explaining how to use features
5. Do NOT invent features not present in the source content
6. Do NOT repeat yourself - every sentence should add new information

## Format
Generate valid MDX with:
- Frontmatter with title, description, and sidebar_position
- Proper heading hierarchy (# for title, ## for sections)
- Code blocks with \`\`\` if showing any code
- Admonitions for tips/notes (used sparingly)

## Interactive Components (use these to make docs engaging)

### FeatureGrid + FeatureCard
Use near the top of feature overview pages to highlight 2-4 key capabilities:

\`\`\`mdx
import { FeatureCard, FeatureGrid } from '@site/src/components/FeatureCard';

<FeatureGrid>
  <FeatureCard
    icon="📦"
    title="Rollup Zone"
    description="Combine small subscriptions into a single budget category"
  />
  <FeatureCard
    icon="📋"
    title="Individual Tracking"
    description="Track major bills separately with their own categories"
  />
</FeatureGrid>
\`\`\`

### WorkflowSteps
Use for step-by-step instructions (3-5 steps work best):

\`\`\`mdx
import { WorkflowSteps } from '@site/src/components/WorkflowSteps';

<WorkflowSteps
  title="Add a Recurring Expense"
  steps={[
    { title: "Select Add Item", description: "Click the Add Item button..." },
    { title: "Enter Details", description: "Fill in the expense name..." },
  ]}
/>
\`\`\`

### AnnotatedImage
Use for screenshots with numbered callouts (when images are available):

\`\`\`mdx
import { AnnotatedImage } from '@site/src/components/AnnotatedImage';

<AnnotatedImage
  src="/img/recurring-tab.png"
  alt="Recurring tab overview"
  callouts={[
    { x: 20, y: 15, label: "1", description: "The rollup zone" },
    { x: 70, y: 40, label: "2", description: "Individual items" },
  ]}
/>
\`\`\`

ALWAYS include at least one interactive component (FeatureGrid or WorkflowSteps) in feature documentation.

Generate the complete MDX document:`;
}

/**
 * Call Azure OpenAI API to generate documentation
 */
async function callAzureOpenAI(prompt: string): Promise<string> {
  const token = process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GH_TOKEN environment variable is required');
  }

  const response = await fetch(GITHUB_MODELS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Models API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in API response');
  }

  return content;
}

/**
 * Parse MDX frontmatter and content from generated text
 */
function parseMdxOutput(text: string, topic: string, position: number): GeneratedDoc {
  // Extract frontmatter if present
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
  let frontmatter = {
    title: formatTopicTitle(topic),
    description: '',
    sidebar_position: position,
  };

  let content = text;

  if (frontmatterMatch) {
    const fmText = frontmatterMatch[1];
    content = text.slice(frontmatterMatch[0].length).trim();

    // Parse YAML-like frontmatter
    const titleMatch = fmText.match(/title:\s*["']?([^"'\n]+)["']?/);
    const descMatch = fmText.match(/description:\s*["']?([^"'\n]+)["']?/);
    const posMatch = fmText.match(/sidebar_position:\s*(\d+)/);

    if (titleMatch) frontmatter.title = titleMatch[1].trim();
    if (descMatch) frontmatter.description = descMatch[1].trim();
    if (posMatch) frontmatter.sidebar_position = Number.parseInt(posMatch[1], 10);
  }

  return { topic, frontmatter, content };
}

/**
 * Format topic name into readable title
 */
function formatTopicTitle(topic: string): string {
  return topic
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate documentation for a single topic
 */
export async function generateDocForTopic(
  topic: string,
  contents: ExtractedContent[],
  mapping: DocMapping,
  position: number
): Promise<GeneratedDoc> {
  console.log(`Generating documentation for: ${topic}`);

  const prompt = buildPrompt(topic, contents, mapping);
  const generated = await callAzureOpenAI(prompt);

  return parseMdxOutput(generated, topic, position);
}

/**
 * Generate documentation for multiple topics
 */
export async function generateDocs(
  contentByTopic: Map<string, ExtractedContent[]>,
  mappings: DocMapping[]
): Promise<GeneratedDoc[]> {
  const results: GeneratedDoc[] = [];

  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    const contents = contentByTopic.get(mapping.topic) ?? [];

    if (contents.length === 0) {
      console.log(`Skipping ${mapping.topic} - no content extracted`);
      continue;
    }

    try {
      const doc = await generateDocForTopic(mapping.topic, contents, mapping, i + 1);
      results.push(doc);

      // Rate limiting - wait between requests
      if (i < mappings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to generate ${mapping.topic}:`, error);
    }
  }

  return results;
}
