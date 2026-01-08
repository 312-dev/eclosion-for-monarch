/**
 * Landing Page Content
 *
 * Language pack system for coder/non-coder modes.
 * Each key has two versions: coder (technical) and friendly (simplified).
 */

export interface ContentVariant {
  coder: string;
  friendly: string;
}

export const LANDING_CONTENT = {
  // WhyEclosionSection
  whyEclosion: {
    communityDescription: {
      coder: 'Open source means your idea could ship next week.',
      friendly: 'Your idea could become a real feature next week.',
    } as ContentVariant,
    fullyYoursDescription: {
      coder:
        'Self-hosted. Your credentials stay encrypted on your server. No one else can access them. Ever.',
      friendly:
        'Runs on your own private server. Your login stays safe and encrypted. No one else can see it.',
    } as ContentVariant,
  },

  // SocialProofBar
  socialProof: {
    openSource: {
      coder: '% open source',
      friendly: '% transparent',
    } as ContentVariant,
  },

  // IdeaTextInput
  ideaSubmission: {
    submitAriaLabel: {
      coder: 'Submit idea to GitHub Discussions',
      friendly: 'Share your idea',
    } as ContentVariant,
    helperText: {
      coder: 'Opens GitHub Discussions in a new tab',
      friendly: 'Share with the community',
    } as ContentVariant,
  },

  // CustomProblemCard
  customProblem: {
    helperText: {
      coder: 'Press Enter to share on GitHub Discussions',
      friendly: 'Press Enter to share with the community',
    } as ContentVariant,
  },
} as const;

export type LandingContentSection = keyof typeof LANDING_CONTENT;

export type LandingContentKey<T extends LandingContentSection> =
  keyof (typeof LANDING_CONTENT)[T];
