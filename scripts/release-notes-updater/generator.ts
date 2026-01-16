/**
 * AI Release Notes Summarizer
 *
 * Takes technical release notes and generates a summary paragraph.
 * - Stable releases: friendly, conversational tone (2-4 sentences)
 * - Beta releases: technical, matter-of-fact tone (2-3 sentences)
 */

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const MODEL = 'gpt-4o'; // Using GPT-4o for release notes summarization

/**
 * Build the prompt for generating user-friendly release notes
 */
function buildPrompt(technicalNotes: string, version: string, isPrerelease: boolean, context?: string): string {
  const releaseType = isPrerelease ? 'beta pre-release' : 'stable release';
  const contextSection = context ? `\n## Additional Context\n${context}\n` : '';

  // Different tone for beta vs stable releases
  const toneGuidelines = isPrerelease
    ? `**Voice & Tone:**
- Technical and straightforward, like a changelog summary
- Matter-of-fact language without marketing fluff
- No exclamation points or celebratory language
- Focus on what changed, not how exciting it is
- Neutral, informative tone suitable for beta testers`
    : `**Voice & Tone:**
- Casual and celebratory, like announcing something you're genuinely proud of
- Action-oriented language with moderate enthusiasm (exclamation points welcome!)
- Benefit-first: focus on what users gain, not technical details
- Conversational but professional - like a product team sharing good news
- Use "you" and "your" to make it personal ("See more of your...", "Now you can...")`;

  const formatGuidelines = isPrerelease
    ? `**Format:**
- Write 2-3 sentences as a brief summary
- Start directly with what changed (no greetings or fanfare)
- Keep it factual and concise
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "Internal improvements and maintenance updates."`
    : `**Format:**
- Write 2-4 sentences as a flowing paragraph
- Start with a casual, celebratory opener
- Keep sentences punchy and benefit-focused
- If ALL changes are truly internal/technical with no user impact, respond with exactly: "This release includes internal improvements and maintenance updates under the hood."`;

  const examples = isPrerelease
    ? `**Good Examples:**
- "This beta adds ESLint accessibility and code quality plugins. Several components have been updated with improved hover states and standardized window references."
- "Adds developer mode settings section and updates the build system for differential CI support."

**Bad Examples:**
- "Get ready for awesome improvements!" (too marketing-focused for beta)
- "Bug fixes and improvements" (too vague)
- "Fixed NSIS installer BUILD_UNINSTALLER check" (too low-level technical)`
    : `**Good Examples:**
- "Say hello to a fresh new look on Windows! This release brings a modern frameless window design and new focus settings so you can customize exactly how Eclosion behaves. Plus, we've squashed several installer bugs for a smoother experience."
- "Get more control over your desktop experience with new window focus settings and a sleek title bar redesign on Windows!"

**Bad Examples:**
- "Bug fixes and improvements" (too vague)
- "We've made some exciting updates!" (empty marketing, no substance)
- "Fixed NSIS installer BUILD_UNINSTALLER check" (too technical)
- Long lists of every change (focus on highlights instead)`;

  return `You are writing release notes for Eclosion, a desktop and web app that extends Monarch Money (a personal finance app) with additional features like recurring expense tracking and category notes.

## Your Task
Transform the technical release notes below into a ${isPrerelease ? 'concise technical summary' : 'friendly, conversational paragraph summary'} (2-${isPrerelease ? '3' : '4'} sentences).

## Technical Release Notes
${technicalNotes}

## Version Info
- Version: ${version}
- Release type: ${releaseType}
${contextSection}

## Writing Guidelines

${toneGuidelines}

**What to Include:**
- The most impactful features or improvements users will notice
- Bug fixes that affected user experience (briefly, if significant)
${isPrerelease ? '- Technical changes that beta testers should be aware of' : '- Frame improvements as meaningful upgrades ("new level of", "reimagined")'}

**What to Exclude:**
- CI/CD pipeline changes, internal refactoring, dependency updates
- Build system changes (PyInstaller, signing, installers)
- Beta-related changes (beta ribbons, banners, channels)
- Developer tooling, test changes
- Don't list every single change - focus on the highlights

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
  context?: string
): Promise<string> {
  console.log(`Generating user-friendly summary for ${version}...`);

  const prompt = buildPrompt(technicalNotes, version, isPrerelease, context);
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
