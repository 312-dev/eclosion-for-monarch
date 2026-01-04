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

  return `You are writing user documentation for Eclosion, a self-hosted toolkit that extends Monarch Money with recurring expense tracking and smart budgeting features.

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
- Casual and conversational, like explaining to a friend
- Assume the reader uses Monarch Money but isn't tech-savvy
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

**Admonitions:**
- Use :::tip, :::note, :::warning sparingly for important callouts
- Don't overdo visual flair

**Avoid AI Tell-Tales:**
- No overly formal phrasing ("It is important to note that...")
- No excessive hedging ("You may want to consider...")
- No filler phrases ("In order to...", "As you can see...")
- Write naturally, as a human would

## Requirements
1. Write a clear, friendly guide that explains the feature to regular users
2. Use the extracted tour steps, wizard content, and descriptions as source material
3. Include step-by-step instructions where applicable
4. Reference specific UI elements when explaining how to use features
5. Do NOT invent features not present in the source content

## Format
Generate valid MDX with:
- Frontmatter with title, description, and sidebar_position
- Import for DemoEmbed component if interactive demo is helpful
- Proper heading hierarchy (# for title, ## for sections)
- Code blocks with \`\`\` if showing any code
- Admonitions for tips/notes (used sparingly)

## Demo Embed (REQUIRED for feature docs)
ALWAYS include an interactive demo embed for feature documentation. Place it near the top of the page, after the introduction paragraph but before detailed instructions.

\`\`\`mdx
import { DemoEmbed } from '@site/src/components/DemoEmbed';

<DemoEmbed path="/recurring" height={400} />
\`\`\`

Demo paths by feature:
- recurring feature: path="/recurring"
- settings: path="/settings"
- dashboard: path="/dashboard"

Match the demo path to the feature being documented. Height can be 400-600 depending on content.

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
