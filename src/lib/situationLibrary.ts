/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Creator Situation Diagnostic Scenario Catalog
 * Structured scenario definitions used by the Situation Lab Engine.
 * Contains testable workflow hypotheses and clarifying questions—never
 * fabricated statistics or undisclosed algorithm guarantees.
 */

export interface SituationScenarioDefinition {
  id: string;
  label: string;
  shortTag: string;
  description: string;
  keywords: string[];
  clarifyingQuestions: string[];
  baseHypotheses: Array<{
    statement: string;
    testToValidate: string;
  }>;
  recommendedWorkspaces: Array<{
    label: string;
    detail: string;
    targetView: 'analytics' | 'tools' | 'ideas' | 'content-pack' | 'builder' | 'radar';
  }>;
}

export const SITUATION_SCENARIOS: SituationScenarioDefinition[] = [
  {
    id: 'low_ctr',
    label: 'Impressions Without Clicks (Low CTR)',
    shortTag: 'Packaging & CTR',
    description:
      'YouTube is showing your video in feeds or search, but viewers scroll past instead of clicking.',
    keywords: ['ctr', 'click', 'thumbnail', 'title', 'impression', 'nobody clicks'],
    clarifyingQuestions: [
      'Does your thumbnail focus on a single clear visual subject with 2–4 large mobile-readable words?',
      'Does the title highlight a specific viewer outcome or curiosity gap rather than repeating thumbnail text verbatim?',
      'Check YouTube Studio traffic sources: are clicks low primarily on Suggested/Browse feeds or Search?',
    ],
    baseHypotheses: [
      {
        statement:
          'Hypothesis (to test): Thumbnail text and title text may be repeating the same words instead of complementing each other.',
        testToValidate:
          'Contrast a 2–3 word reaction/outcome phrase on the thumbnail against a clear curiosity or comparison title on your next upload.',
      },
      {
        statement:
          'Hypothesis (to test): The thumbnail composition may lose clarity at mobile feed sizes.',
        testToValidate:
          'Preview your thumbnail at small mobile card width and remove secondary clutter until one focal subject dominates.',
      },
    ],
    recommendedWorkspaces: [
      {
        label: 'Generate Title & Thumbnail Variations',
        detail: 'Compare curiosity, comparison, and problem-solving title pairs with 3-word overlay text.',
        targetView: 'tools',
      },
      {
        label: 'Inspect Packaging Metrics',
        detail: 'Review CTR per video in Creator Analytics to isolate which titles earned above-average clicks.',
        targetView: 'analytics',
      },
    ],
  },
  {
    id: 'early_retention_drop',
    label: 'Early Drop-Off in First 30 Seconds',
    shortTag: 'Hooks & Pacing',
    description:
      'Viewers click the video but leave rapidly during the intro before reaching your core explanation.',
    keywords: ['retention', 'drop', 'first 30', 'hook', 'intro', 'clicked off', 'leave early'],
    clarifyingQuestions: [
      'Look at YouTube Studio’s audience retention chart: does the steepest drop happen before 0:15 or after the promise?',
      'Do your first 10 seconds directly confirm the title promise, or spend time on channel greetings/logos?',
      'Does a visual change (B-roll, cut, on-screen proof) occur within the first 5 seconds?',
    ],
    baseHypotheses: [
      {
        statement:
          'Hypothesis (to test): A slow pre-value greeting or setup may delay fulfilling the click promise.',
        testToValidate:
          'Open your next script immediately with the conflict or visual outcome shown in your thumbnail within 0:00–0:05.',
      },
      {
        statement:
          'Hypothesis (to test): Visual pacing may remain static during the opening explanation.',
        testToValidate:
          'Insert 2–3 purposeful visual transitions or on-screen proof points during the first 25 seconds.',
      },
    ],
    recommendedWorkspaces: [
      {
        label: 'Test Opening Hooks',
        detail: 'Draft alternate 5-second visual + spoken hooks tailored to your tone.',
        targetView: 'tools',
      },
      {
        label: 'Tighten Script Beats in Builder',
        detail: 'Trim intro preamble and tighten first-minute visual cues inside Video Builder.',
        targetView: 'builder',
      },
    ],
  },
  {
    id: 'inconsistent_uploads',
    label: 'Hard to Publish Consistently Each Week',
    shortTag: 'Workflow & Burnout',
    description:
      'Drafts pile up unfinished or filming/editing takes too many hours compared to your weekly schedule.',
    keywords: ['consistent', 'schedule', 'burnout', 'time', 'unfinished', 'stuck', 'slow'],
    clarifyingQuestions: [
      'Which single stage consumes the most hours right now: topic picking, scripting, recording, or editing?',
      'Are you targeting 10-minute deep dives when your daily window fits cleaner 3-minute guides or Shorts?',
    ],
    baseHypotheses: [
      {
        statement:
          'Hypothesis (to test): Project scope may exceed your realistic weekly hours, stalling drafts before export.',
        testToValidate:
          'Time-box your next two uploads to a smaller repeatable format or pre-batched script structure and track completion rate.',
      },
      {
        statement:
          'Hypothesis (to test): Switching formats or over-polishing secondary B-roll could be extending edit cycles.',
        testToValidate:
          'Reuse one fixed visual template across 3 consecutive uploads before introducing custom motion graphics.',
      },
    ],
    recommendedWorkspaces: [
      {
        label: 'Scope Fit Ideas in Planner',
        detail: 'Pick lower-friction ideas matched to your daily time window and production gear.',
        targetView: 'ideas',
      },
      {
        label: 'Resume an Unfinished Draft',
        detail: 'Complete one existing project in Video Builder instead of starting from scratch.',
        targetView: 'builder',
      },
    ],
  },
  {
    id: 'shorts_to_longform',
    label: 'Shorts Views Aren’t Turning Into Long-Form Viewers',
    shortTag: 'Format Bridge',
    description:
      'Short-form clips reach viewers quickly, but subscriber conversion or long-form carry-over remains flat.',
    keywords: ['shorts', 'long-form', 'subscriber', 'convert', 'bridge', 'subscribe'],
    clarifyingQuestions: [
      'Do your Shorts cover the same core topic pillar as your long-form tutorials, or different viral themes?',
      'Do your Shorts point viewers toward a specific related breakdown or playlist?',
    ],
    baseHypotheses: [
      {
        statement:
          'Hypothesis (to test): Broad Shorts topics may attract casual scrollers who aren’t searching for deeper uploads.',
        testToValidate:
          'Create 2–3 Shorts extracted directly from high-interest sub-questions of an existing long-form guide and track pinned-link/related-video traffic.',
      },
    ],
    recommendedWorkspaces: [
      {
        label: 'Align Topic Pillars in Radar',
        detail: 'Use Daily Radar to plan paired Shorts + Long-Form topics around one core audience need.',
        targetView: 'radar',
      },
      {
        label: 'Generate Linked Content Pack',
        detail: 'Build aligned Shorts script + Long-form titles & pinned follow-up comments together.',
        targetView: 'content-pack',
      },
    ],
  },
  {
    id: 'zero_budget_bottleneck',
    label: 'Limited Gear, Zero Budget, or Solo Production Constraints',
    shortTag: 'Resource Fit',
    description:
      'Production feels overwhelming when trying to match complex studio setups without paid tools.',
    keywords: ['budget', 'free', 'phone', 'gear', 'no camera', 'faceless', 'equipment'],
    clarifyingQuestions: [
      'Which production method feels simplest to repeat weekly: voiceover + screen recording, talking head on phone, or slide/text explainers?',
      'Are your current scripts calling for B-roll or effects that take hours to source manually?',
    ],
    baseHypotheses: [
      {
        statement:
          'Hypothesis (to test): Choosing formats built around clarity (screen walkthroughs, tight voiceover, clear slides) reduces production friction without hurting viewer value.',
        testToValidate:
          'Produce one single-take screen or phone guide focused purely on clean audio and clear structure.',
      },
    ],
    recommendedWorkspaces: [
      {
        label: 'Build a Free-Tier Pack',
        detail: 'Generate tailored prompts and asset checklists suited to ₹0 / free-tier workflows.',
        targetView: 'content-pack',
      },
      {
        label: 'Use Idea & Hook Generators',
        detail: 'Lean on crisp scripting and hook clarity instead of heavy visual effects.',
        targetView: 'tools',
      },
    ],
  },
  {
    id: 'stalled_growth',
    label: 'Views Plateaued Across Recent Uploads',
    shortTag: 'Momentum & Focus',
    description:
      'Recent uploads perform steadily or flatline below earlier videos, making next-topic selection unclear.',
    keywords: ['plateau', 'stalled', 'flat', 'same views', 'no growth', 'views dropped'],
    clarifyingQuestions: [
      'Are recent topics serving the same core viewer intent as your highest-performing past uploads?',
      'Have upload titles leaned into generic broad terms rather than specific viewer problems?',
    ],
    baseHypotheses: [
      {
        statement:
          'Hypothesis (to test): Topic drift or broader framing may dilute return viewers who subscribed for a specific problem.',
        testToValidate:
          'Launch a focused 3-part mini-series digging deeper into whichever topic category produced your best recorded watch time or retention.',
      },
    ],
    recommendedWorkspaces: [
      {
        label: 'Compare Logged Videos in Analytics',
        detail: 'Spot which topics and traffic sources drove your strongest logged responses.',
        targetView: 'analytics',
      },
      {
        label: 'Find Follow-Up Angles in Radar',
        detail: 'Discover structured follow-up ideas built around your primary niche.',
        targetView: 'radar',
      },
    ],
  },
  {
    id: 'audio_pacing_drop',
    label: 'Mid-Video Drop-Off & Flat Delivery Pacing',
    shortTag: 'Mid-Roll Retention',
    description:
      'Viewers survive the intro but dip sharply once you move into explanations or step-by-step instructions.',
    keywords: ['mid-video', 'boring', 'pacing', 'ramble', 'audio', 'middle'],
    clarifyingQuestions: [
      'Where do viewers dip most on your retention curve: transitions between points or long monologues?',
      'Do you signal clear progress markers (e.g., "Step 2 changes...") between sections?',
    ],
    baseHypotheses: [
      {
        statement:
          'Hypothesis (to test): Removing unedited pauses and adding clear mini-hooks before each main section keeps mid-video momentum active.',
        testToValidate:
          'Add one explicit transition teaser before every new script section in your next long-form recording.',
      },
    ],
    recommendedWorkspaces: [
      {
        label: 'Refine Section Beats in Builder',
        detail: 'Review script section lengths and add pattern-interrupt visual cues inside Video Builder.',
        targetView: 'builder',
      },
    ],
  },
  {
    id: 'multilingual_audience_split',
    label: 'Language / Regional Dialect Mismatch',
    shortTag: 'Language Fit',
    description:
      'Titles, hooks, or on-screen phrasing feel formal or unnatural for your target Tamil, Tanglish, Hindi, or bilingual audience.',
    keywords: ['language', 'tamil', 'tanglish', 'hindi', 'regional', 'translation', 'dialect'],
    clarifyingQuestions: [
      'Do your viewers naturally search in English terms even when watching Tamil/Hindi spoken explanations (or vice-versa)?',
      'Are your titles written in a different register than how you speak on camera?',
    ],
    baseHypotheses: [
      {
        statement:
          'Hypothesis (to test): Aligning title wording with how your audience actually types searches—while keeping spoken hooks conversational—reduces click mismatch.',
        testToValidate:
          'Test pairing conversational spoken hooks in your native dialect with clear search terms viewers actively type.',
      },
    ],
    recommendedWorkspaces: [
      {
        label: 'Generate Localized Content Packs',
        detail: 'Test English, Tamil, Tanglish, and Hindi framing side-by-side in Content Packs.',
        targetView: 'content-pack',
      },
    ],
  },
];

export function matchScenarioFromText(text: string): SituationScenarioDefinition {
  const lower = (text || '').toLowerCase();
  let best = SITUATION_SCENARIOS[0];
  let bestScore = -1;

  for (const scenario of SITUATION_SCENARIOS) {
    let score = 0;
    for (const kw of scenario.keywords) {
      if (lower.includes(kw)) score += 2;
    }
    if (lower.includes(scenario.label.toLowerCase())) score += 5;
    if (score > bestScore) {
      bestScore = score;
      best = scenario;
    }
  }

  return bestScore > 0 ? best : SITUATION_SCENARIOS[5]; // Default to Momentum & Focus if free-text is generic
}
