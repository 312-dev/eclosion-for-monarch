/**
 * AI Release Notes Summarizer
 *
 * Takes technical release notes and generates a human-friendly summary
 * that focuses on end-user value.
 */

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'gpt-4o'; // Using GPT-4o for release notes summarization

/**
 * Build the prompt for generating user-friendly release notes
 */
function buildPrompt(technicalNotes: string, version: string, isPrerelease: boolean): string {
  const releaseType = isPrerelease ? 'beta pre-release' : 'stable release';

  return `You are writing release notes for Eclosion, a desktop and web app that extends Monarch Money (a personal finance app) with additional features like recurring expense tracking and category notes.

## Your Task
Transform the technical release notes below into a human-friendly summary that end users will actually want to read.

## Technical Release Notes
${technicalNotes}

## Version Info
- Version: ${version}
- Release type: ${releaseType}

## Writing Guidelines

**Voice & Tone:**
- Write from the app's perspective using "we" ("We've improved...", "You can now...")
- Be specific about what changed - never say just "bug fixes and improvements"
- Keep it matter-of-fact and concise, like 1Password's App Store notes
- NO marketing fluff, NO "exciting updates", NO "Let us know what you think!"
- NO introductory sentences like "We've made some updates..." - just go straight to bullets

**What to Include:**
- Features users will notice or benefit from
- Bug fixes that affected user experience (be specific about what was broken)
- Performance improvements users might feel
- UI/UX changes

**What to Exclude (skip entirely):**
- CI/CD pipeline changes
- Internal refactoring that doesn't change behavior
- Dependency updates unless security-related
- Backend-only changes users won't see
- Test additions/changes
- Beta-related changes (beta ribbons, beta banners, beta channels)
- Build system changes (PyInstaller, signing, Windows/Linux build fixes)
- Developer tooling changes

**Format:**
- Jump straight into bullet points - no preamble
- Use "- We've..." or "- You can now..." style for each bullet
- Group related changes if it makes sense
- Keep each bullet to 1-2 sentences max
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "Internal improvements and maintenance updates."

**Good Examples (like 1Password):**
- "We've added titles to the buttons in the tab bar."
- "You can now tap anywhere on a Watchtower card to open its details."
- "We've fixed an issue that caused the item you're viewing to close unexpectedly."
- "The scrolling experience is now smoother."

**Bad Examples:**
- "Bug fixes and improvements" (too vague)
- "Fixed issue #123" (meaningless to users)
- "Refactored authentication module" (internal detail)
- "Updated CI pipeline" (irrelevant to users)
- "We've made some exciting updates!" (marketing fluff)
- "These updates are all about making your experience better" (filler)

Generate ONLY bullet points. No intro, no outro, no headers. Just the bullets.`;
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
  isPrerelease: boolean
): Promise<string> {
  console.log(`Generating user-friendly summary for ${version}...`);

  const prompt = buildPrompt(technicalNotes, version, isPrerelease);
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
