/**
 * AI Release Notes Summarizer
 *
 * Takes technical release notes and generates a brief, user-friendly summary.
 * - Stable releases: proportional tone (brief for fixes, warmer for features)
 * - Beta releases: technical, matter-of-fact tone
 */

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'gpt-4o'; // Using GPT-4o for release notes summarization

/**
 * Build the prompt for generating user-friendly release notes
 */
function buildPrompt(
  technicalNotes: string,
  version: string,
  isPrerelease: boolean,
  context?: string,
  diffContent?: string
): string {
  const releaseType = isPrerelease ? 'beta pre-release' : 'stable release';
  const contextSection = context ? `\n## Additional Context\n${context}\n` : '';

  // Include structured change summary if provided
  const changeSection = diffContent
    ? `\n## Code Change Analysis
This shows WHAT files were added, modified, renamed, or deleted. Use this to understand the scope and nature of changes:

${diffContent}
`
    : '';

  // Different tone for beta vs stable releases
  const toneGuidelines = isPrerelease
    ? `**Voice & Tone:**
- Technical and straightforward, like a changelog summary
- Matter-of-fact language without marketing fluff
- No exclamation points or celebratory language
- Focus on what changed, not how exciting it is
- Neutral, informative tone suitable for beta testers`
    : `**Voice & Tone:**
- Match your enthusiasm to the significance of the changes
- For bug fixes and minor updates: straightforward and brief ("Fixes an issue with...", "Resolves...")
- For notable features: warm but not over-the-top ("You can now...", "Adds support for...")
- For major releases only: celebratory language is appropriate
- Avoid marketing superlatives ("amazing", "exciting", "incredible") - just describe what changed
- Plain language a non-technical user would understand`;

  const formatGuidelines = isPrerelease
    ? `**Format:**
- Write 2-4 sentences as a brief summary
- Start directly with what changed (no greetings or fanfare)
- Keep it factual and concise
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "Internal improvements and maintenance updates."`
    : `**Format:**
- Write 1-4 sentences - shorter is better for minor updates
- Get straight to the point - no fanfare for small fixes
- For bug fixes: a single sentence is often enough
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "Internal improvements and maintenance."`;

  const examples = isPrerelease
    ? `**Good Examples:**
- "This beta adds a new Stash feature for saving toward goals. The burndown chart now shows progress over time."
- "You can now edit stash items inline. Several display issues with tooltips have been addressed."

**Bad Examples:**
- "Get ready for awesome improvements!" (too marketing-focused for beta)
- "Bug fixes and improvements" (too vague)
- "Fixed NSIS installer BUILD_UNINSTALLER check" (too low-level technical)
- "Refactored useEditStashHandlers hook" (too technical - describe the USER benefit)`
    : `**Good Examples (bug fix release):**
- "Fixes an issue where the app could become slow after auto-updating."
- "Resolves a display problem with the savings progress bar."

**Good Examples (feature release):**
- "You can now track savings goals with the new Stash feature. Also includes improved chart visualizations."
- "Adds burndown charts to show your savings progress over time. Several tooltip display issues have been fixed."

**Bad Examples:**
- "Bug fixes and improvements" (too vague - say WHAT was fixed)
- "Say hello to amazing new features!" (over-the-top for minor updates)
- "We're excited to announce..." (unnecessary preamble)
- "Fixed NSIS installer BUILD_UNINSTALLER check" (too technical for users)
- "Refactored API core layer" (too technical - users don't care about code structure)`;

  return `You are writing release notes for Eclosion, a desktop and web app that extends Monarch Money (a personal finance app).

**IMPORTANT: Only describe what changed in THIS release. Do not mention existing app features that aren't new.**

## Your Task
Transform the changes below into a ${isPrerelease ? 'concise technical summary' : 'friendly, conversational paragraph summary'} (2-4 sentences).

**CRITICAL: Use the Code Change Analysis to understand what REALLY changed!**
The structured summary shows new components, hooks, and APIs - use these to identify user-facing features.

## Commit Messages (For Reference Only)
${technicalNotes}
${changeSection}

## Version Info
- Version: ${version}
- Release type: ${releaseType}
${contextSection}

## Priority Order (FOLLOW THIS STRICTLY)
Your summary MUST prioritize in this order:

1. **NEW UX FEATURES (Core Features)** - Brand new capabilities users can now do
   - Look at the NEW section: new components, hooks, and API modules indicate new features
   - Example: "You can now track savings goals with the new Stash feature"

2. **RENAMED FEATURES** - If you see renames like "Wishlist → Stash", mention the rebrand
   - Example: "Wishlists have been renamed to Stashes"

3. **UI/UX IMPROVEMENTS** - Enhancements to existing features
   - Look at the MODIFIED section for improved components
   - Example: "The progress bar now animates smoothly"

4. **BUG FIXES** - Keep these BRIEF and in plain layman's terms
   - DON'T list every fix in detail - that's what Technical Details are for
   - DO summarize: "Several display issues have been addressed"
   - DON'T say: "Fixed the tooltip z-index calculation in AnimatedEmoji component"

## Writing Guidelines

${toneGuidelines}

**What to Include (based on the Code Change Analysis):**
- New features (look at NEW components, hooks, and API modules)
- Renamed features indicate major refactoring (e.g., Wishlist → Stash means the feature was renamed)
- Modified components suggest improvements or fixes
- A brief mention that bugs were fixed (without technical details)

**What to Exclude:**
- CI/CD pipeline changes, internal refactoring, dependency updates
- Build system changes (PyInstaller, signing, installers, universal binaries, architecture changes)
- Distribution details (how the app is packaged, notarized, or delivered)
- Code organization changes (moving files, renaming internal variables)
- Developer tooling, test changes
- Don't list every single bug fix - summarize them briefly

${formatGuidelines}

${examples}

Generate ONLY the paragraph. No headers, no bullets, no sign-off.`;
}

/**
 * Call Azure OpenAI API to generate the summary
 */
async function callAzureOpenAI(prompt: string): Promise<string> {
  // MODELS_TOKEN is preferred, fall back to GH_TOKEN for backwards compatibility
  const token = process.env.MODELS_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('MODELS_TOKEN environment variable is required');
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
      max_tokens: 1000,
      temperature: 0.5, // Lower temperature for more consistent output
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

  return content.trim();
}

/**
 * Generate a user-friendly summary from technical release notes
 */
export async function generateSummary(
  technicalNotes: string,
  version: string,
  isPrerelease: boolean,
  context?: string,
  diffContent?: string
): Promise<string> {
  console.log(`Generating user-friendly summary for ${version}...`);
  if (diffContent) {
    console.log(`Including ${diffContent.length} chars of diff content for analysis`);
  }

  const prompt = buildPrompt(technicalNotes, version, isPrerelease, context, diffContent);
  const summary = await callAzureOpenAI(prompt);

  return summary;
}

/**
 * Combine the AI summary with the original technical notes
 */
export function buildUpdatedReleaseBody(summary: string, originalBody: string): string {
  return `${summary}

---

## Technical Details

${originalBody}`;
}
