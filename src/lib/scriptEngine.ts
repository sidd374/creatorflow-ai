/**
 * CreatorFlow AI — Phase 3D Script & Production Engine
 * Generates natural, conversational script sections, visual plans,
 * voice delivery parameters, and editing timelines based on user duration.
 */

import { 
  ScriptSection, 
  VisualPlanItem, 
  VisualType, 
  VoiceSettings, 
  EditingSettings, 
  VideoProject, 
  CreatorProfile 
} from '../types';
import { TopicProfile, analyzeTopic, toTitleCase } from './topicAnalyzer';
import { getLanguagePack, LanguagePack } from './languagePatterns';
import { cleanHumanLanguage } from './contentCleaner';

// Practical editing checklist items
export const DEFAULT_EDITING_ITEMS = [
  'Remove unnecessary pauses',
  'Add captions',
  'Emphasize important words',
  'Add relevant B-roll',
  'Keep cuts tight',
  'Check audio levels',
  'Check music volume',
  'Check spelling',
  'Watch the complete video once',
];

export const SHORTS_DURATIONS = [
  { seconds: 30, label: '30 seconds', description: 'Fast, punchy, high-retention loop' },
  { seconds: 45, label: '45 seconds', description: 'Balanced pacing with 2 clear tips' },
  { seconds: 60, label: '60 seconds', description: 'Deep breakdown with setup and payoff' },
];

export const LONG_FORM_DURATIONS = [
  { seconds: 120, label: '2 minutes', description: 'Quick tutorial or focused answer' },
  { seconds: 180, label: '3 minutes', description: 'Step-by-step beginner guide' },
  { seconds: 300, label: '5 minutes', description: 'Complete walkthrough with examples' },
  { seconds: 480, label: '8 minutes', description: 'Comprehensive guide + mid-roll pacing' },
  { seconds: 600, label: '10 minutes', description: 'Masterclass with case studies' },
];

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// Generate structured script sections based on duration
export function generateStructuredScript(
  project: VideoProject,
  durationSeconds: number,
  profile: CreatorProfile,
  lang: LanguagePack,
  seed: number = 0
): ScriptSection[] {
  const topicProfile = analyzeTopic(project.topic);
  const subj = topicProfile.subject;
  const act = topicProfile.actionPhrase;
  const isShort = durationSeconds <= 60 || project.format.includes('Short');
  const userHook = project.selectedHook;

  if (isShort) {
    return generateShortsSections(topicProfile, durationSeconds, userHook, lang, seed);
  } else {
    return generateLongFormSections(topicProfile, durationSeconds, userHook, lang, seed);
  }
}

// Shorts script generator (30s, 45s, 60s) with genuine multilingual phrasing
function generateShortsSections(
  t: TopicProfile,
  duration: number,
  userHook: string | undefined,
  lang: LanguagePack,
  seed: number
): ScriptSection[] {
  const rawSubj = t.subject.toLowerCase();
  const rawAct = t.actionPhrase.toLowerCase();

  // If non-English core language pack (TA, TA-ROM, HI, TE, ES), generate natural localized spoken audio
  if (lang && lang.code !== 'EN' && lang.shortsSpoken) {
    const sp = lang.shortsSpoken;
    const hookText = userHook || sp.hook(t);
    const setupText = sp.setup(t);
    const valueText = sp.value(t);
    const payoffText = sp.payoff(t);
    const ctaText = sp.cta;

    if (duration <= 35) {
      return [
        {
          id: 'sec-1',
          label: 'HOOK',
          timeRange: '0:00–0:05',
          text: cleanHumanLanguage(hookText),
          wordCount: countWords(hookText),
          visualCue: 'Direct eye contact, rapid zoom into face or screen',
          deliveryTip: 'High energy, punch the opening line clearly',
        },
        {
          id: 'sec-2',
          label: 'SETUP',
          timeRange: '0:05–0:12',
          text: cleanHumanLanguage(setupText),
          wordCount: countWords(setupText),
          visualCue: 'Show relatable creator mistake or cluttered workflow',
          deliveryTip: 'Warm, conversational pacing',
        },
        {
          id: 'sec-3',
          label: 'THE SHIFT',
          timeRange: '0:12–0:22',
          text: cleanHumanLanguage(valueText),
          wordCount: countWords(valueText),
          visualCue: 'Over-the-shoulder demonstration of practical step',
          deliveryTip: 'Clear, confident emphasis on key action',
        },
        {
          id: 'sec-4',
          label: 'PAYOFF & CTA',
          timeRange: '0:22–0:30',
          text: cleanHumanLanguage(`${payoffText} ${ctaText}`),
          wordCount: countWords(`${payoffText} ${ctaText}`),
          visualCue: 'Clean text overlay + subscribe cue',
          deliveryTip: 'Upbeat sign-off with seamless loop',
        },
      ];
    }

    return [
      {
        id: 'sec-1',
        label: 'HOOK',
        timeRange: '0:00–0:05',
        text: cleanHumanLanguage(hookText),
        wordCount: countWords(hookText),
        visualCue: 'Close-up with punchy 3-word caption overlay',
        deliveryTip: 'Strong vocal energy from word one',
      },
      {
        id: 'sec-2',
        label: 'SETUP',
        timeRange: '0:05–0:14',
        text: cleanHumanLanguage(setupText),
        wordCount: countWords(setupText),
        visualCue: 'Show retention challenge or common bottleneck',
        deliveryTip: 'Relatable tone validating viewer struggle',
      },
      {
        id: 'sec-3',
        label: 'POINT 1',
        timeRange: '0:14–0:28',
        text: cleanHumanLanguage(valueText),
        wordCount: countWords(valueText),
        visualCue: 'Clean screen recording / B-roll showing the step',
        deliveryTip: 'Structured and easy to follow',
      },
      {
        id: 'sec-4',
        label: 'PAYOFF',
        timeRange: '0:28–0:42',
        text: cleanHumanLanguage(payoffText),
        wordCount: countWords(payoffText),
        visualCue: 'Before vs after result comparison',
        deliveryTip: 'Confident, satisfying takeaway',
      },
      {
        id: 'sec-5',
        label: 'CTA',
        timeRange: '0:42–0:55',
        text: cleanHumanLanguage(ctaText),
        wordCount: countWords(ctaText),
        visualCue: 'Gesture down to comments & subscribe card',
        deliveryTip: 'Friendly community invitation',
      },
    ];
  }

  // 30-Second Short Structure (English)
  if (duration <= 35) {
    const hookText =
      userHook ||
      (seed % 2 === 1
        ? `Watch this before doing ${rawAct} — most beginners miss step one.`
        : `Stop making this common mistake with ${rawSubj}!`);
    const setupText = `Most creators spend hours on the wrong step, wondering why nothing clicks.`;
    const valueText = `Here's what works: simplify your process and focus entirely on ${rawAct} first.`;
    const ctaText = `Try this on your next video and subscribe for more creator guides!`;

    return [
      {
        id: 'sec-1',
        label: 'HOOK',
        timeRange: '0:00–0:05',
        text: cleanHumanLanguage(hookText),
        wordCount: countWords(hookText),
        visualCue: 'Direct eye contact, rapid zoom into face or screen',
        deliveryTip: 'High energy, punch the first 3 words',
      },
      {
        id: 'sec-2',
        label: 'SETUP',
        timeRange: '0:05–0:12',
        text: cleanHumanLanguage(setupText),
        wordCount: countWords(setupText),
        visualCue: 'Show frustrating mistake or analytics screenshot',
        deliveryTip: 'Empathetic, head shake, relatable tone',
      },
      {
        id: 'sec-3',
        label: 'THE SHIFT',
        timeRange: '0:12–0:22',
        text: cleanHumanLanguage(valueText),
        wordCount: countWords(valueText),
        visualCue: 'Over the shoulder screen capture demonstrating the fix',
        deliveryTip: 'Clear, confident, slow down slightly for clarity',
      },
      {
        id: 'sec-4',
        label: 'PAYOFF & CTA',
        timeRange: '0:22–0:30',
        text: cleanHumanLanguage(ctaText),
        wordCount: countWords(ctaText),
        visualCue: 'On-screen pointing to subscribe button with clean text overlay',
        deliveryTip: 'Smiley, encouraging, seamless loop back',
      },
    ];
  }

  // 45-Second Short Structure
  if (duration <= 50) {
    const hookText = userHook || `If you want to master ${rawSubj}, you need to know this first.`;
    const setupText = `Most people overcomplicate it with fancy gear and zero strategy.`;
    const step1Text = `Step one: nail down your core concept before opening your editing app.`;
    const step2Text = `Step two: keep your pacing tight so viewers stay engaged until the final second.`;
    const ctaText = `Save this video for your next edit, and hit subscribe for weekly creator breakdowns!`;

    return [
      {
        id: 'sec-1',
        label: 'HOOK',
        timeRange: '0:00–0:05',
        text: cleanHumanLanguage(hookText),
        wordCount: countWords(hookText),
        visualCue: 'Camera snaps into focus, holding up phone or key prop',
        deliveryTip: 'Curious, conversational, no awkward pauses',
      },
      {
        id: 'sec-2',
        label: 'SETUP',
        timeRange: '0:05–0:12',
        text: cleanHumanLanguage(setupText),
        wordCount: countWords(setupText),
        visualCue: 'Quick cut to messy desk or common creator headache',
        deliveryTip: 'Relatable, acknowledging viewer frustration',
      },
      {
        id: 'sec-3',
        label: 'POINT 1',
        timeRange: '0:12–0:24',
        text: cleanHumanLanguage(step1Text),
        wordCount: countWords(step1Text),
        visualCue: 'Text overlay "1. CORE CONCEPT" with practical screen demonstration',
        deliveryTip: 'Direct, clear emphasis on actionable advice',
      },
      {
        id: 'sec-4',
        label: 'POINT 2',
        timeRange: '0:24–0:36',
        text: cleanHumanLanguage(step2Text),
        wordCount: countWords(step2Text),
        visualCue: 'Timeline split screen showing tight edit vs dragged out footage',
        deliveryTip: 'Fast-paced, high retention vocal rhythm',
      },
      {
        id: 'sec-5',
        label: 'PAYOFF & CTA',
        timeRange: '0:36–0:45',
        text: cleanHumanLanguage(ctaText),
        wordCount: countWords(ctaText),
        visualCue: 'Creator back on camera smiling, quick gesture to subscribe',
        deliveryTip: 'Upbeat and friendly sign-off',
      },
    ];
  }

  // 60-Second Short Structure (Default standard for YouTube Shorts)
  const hookText = userHook || `Here's why your videos on ${rawSubj} aren't getting views—and how to fix it right now.`;
  const setupText = `When you're starting from scratch, it feels like nothing works. But 90% of beginners make the same simple mistake.`;
  const point1Text = `First, stop trying to make a cinematic masterpiece. Your viewer just wants clear, straightforward value without fluff.`;
  const point2Text = `Second, make sure your first five seconds show the exact payoff you promised in your title. No slow intros.`;
  const payoffText = `Once you test this, you'll immediately see your viewer retention graph stay flat instead of dropping off.`;
  const ctaText = `Drop a comment with your channel topic, and subscribe so you don't miss the next creator breakdown!`;

  return [
    {
      id: 'sec-1',
      label: 'HOOK',
      timeRange: '0:00–0:05',
      text: cleanHumanLanguage(hookText),
      wordCount: countWords(hookText),
      visualCue: 'Extreme close-up or sharp zoom-in with attention-grabbing headline',
      deliveryTip: 'Hit the first sentence with confidence and clear vocal punch',
    },
    {
      id: 'sec-2',
      label: 'SETUP',
      timeRange: '0:05–0:12',
      text: cleanHumanLanguage(setupText),
      wordCount: countWords(setupText),
      visualCue: 'Show YouTube retention curve dropping sharply in red overlay',
      deliveryTip: 'Serious, validating the viewer struggle',
    },
    {
      id: 'sec-3',
      label: 'POINT 1',
      timeRange: '0:12–0:25',
      text: cleanHumanLanguage(point1Text),
      wordCount: countWords(point1Text),
      visualCue: 'B-roll of phone camera setup with big "KEEP IT SIMPLE" graphic',
      deliveryTip: 'Passionate and direct; speak like an encouraging friend',
    },
    {
      id: 'sec-4',
      label: 'POINT 2',
      timeRange: '0:25–0:40',
      text: cleanHumanLanguage(point2Text),
      wordCount: countWords(point2Text),
      visualCue: 'Countdown graphic "FIRST 5 SECONDS" over editing timeline',
      deliveryTip: 'Emphasize "exact payoff" with hand gesture',
    },
    {
      id: 'sec-5',
      label: 'PAYOFF',
      timeRange: '0:40–0:52',
      text: cleanHumanLanguage(payoffText),
      wordCount: countWords(payoffText),
      visualCue: 'Smooth high-retention analytics graph turning bright green',
      deliveryTip: 'Satisfying, confident conclusion to the lesson',
    },
    {
      id: 'sec-6',
      label: 'CTA',
      timeRange: '0:52–1:00',
      text: cleanHumanLanguage(ctaText),
      wordCount: countWords(ctaText),
      visualCue: 'Creator gesturing downward to comments, subscribe button animation',
      deliveryTip: 'Welcoming and community-driven call to action',
    },
  ];
}

// Long-Form script generator (2m, 3m, 5m, 8m, 10m) with localized phrasing support
function generateLongFormSections(
  t: TopicProfile,
  duration: number,
  userHook: string | undefined,
  lang: LanguagePack,
  seed: number
): ScriptSection[] {
  const rawSubj = t.subject.toLowerCase();
  const rawAct = t.actionPhrase.toLowerCase();

  // Localized Long-Form Scripts for TA, TA-ROM, HI, TE, ES
  if (lang && lang.code !== 'EN') {
    const hookCuriosity = lang.hooks.curiosity(t).spoken;
    const hookProblem = lang.hooks.problem(t).spoken;
    const hookPromise = lang.hooks.promise(t).spoken;

    const localizedMap: Record<
      string,
      { trap: string; step1: string; workflow: string; avoid: string; cta: string }
    > = {
      TA: {
        trap: `பல கிரியேட்டர்கள் ${t.subject} தொடங்கும்போதே பெரிய கேமரா அல்லது சிக்கலான எடிட்டிங் தேடி நேரத்தை வீணாக்குகிறார்கள்.`,
        step1: `முதல் படி: உங்கள் பார்வையாளர்களுக்குத் தேவையான முக்கிய கருத்தை முதல் 60 வினாடிகளில் தெளிவாகச் சொல்லுங்கள்.`,
        workflow: `அடுத்து, தேவையற்ற இடைவெளிகளை வெட்டிவிட்டு, ${t.subject} உதாரணங்களை எளிமையாகக் காட்டுங்கள்.`,
        avoid: `அதிக நாட்களாக ஒரு வீடியோவைத் தள்ளிப் போடுவதை விட, வாரா வாரம் எளிய கருவிகளுடன் பதிவேற்றுவது சிறந்தது.`,
        cta: `${lang.description.cta}`,
      },
      'TA-ROM': {
        trap: `Neraya creators ${t.subject} panrapo expensive camera or heavy setup-kaga wait panni time waste pandranga.`,
        step1: `Step 1: Video-oda main value-va first 60 seconds-kulla clear-ah audience-ku sollunga.`,
        workflow: `Next, unnecessary pauses ellam trim panni, simple example-oda ${t.subject} workflow-va explain pannunga.`,
        avoid: `Perfection expect panni upload delay pannadhinga — consistency-kaga weekly oru crisp video release pannunga.`,
        cta: `${lang.description.cta}`,
      },
      HI: {
        trap: `ज़्यादातर क्रिएटर्स ${t.subject} शुरू करते समय महंगे गियर और कठिन एडिटिंग के चक्कर में उलझ जाते हैं।`,
        step1: `पहला कदम: पहले 60 सेकंड में ही दर्शकों को साफ बता दें कि इस वीडियो से उन्हें क्या सीखने को मिलेगा।`,
        workflow: `अगला कदम: बेकार के पॉज़ हटाएँ और ${t.subject} का प्रैक्टिकल उदाहरण स्क्रीन पर दिखाएँ।`,
        avoid: `परफेक्शन के इंतज़ार में अपलोड न रोकें — हर हफ्ते सरल और लगातार सुधार ही असली ग्रोथ देता है।`,
        cta: `${lang.description.cta}`,
      },
    };

    const body = localizedMap[lang.code] || {
      trap: hookProblem,
      step1: hookPromise,
      workflow: lang.shortsSpoken.value(t),
      avoid: lang.shortsSpoken.payoff(t),
      cta: lang.description.cta,
    };

    return [
      {
        id: 'sec-1',
        label: lang.chapters.intro.toUpperCase(),
        timeRange: '0:00–0:25',
        text: cleanHumanLanguage(userHook || hookCuriosity),
        wordCount: countWords(userHook || hookCuriosity),
        visualCue: 'Host direct to camera with clean lower-third title badge',
        deliveryTip: 'Clear, engaging, natural pace',
      },
      {
        id: 'sec-2',
        label: lang.chapters.problem.toUpperCase(),
        timeRange: '0:25–1:10',
        text: cleanHumanLanguage(body.trap),
        wordCount: countWords(body.trap),
        visualCue: 'Relatable screen capture showing common bottleneck',
        deliveryTip: 'Warm, relatable storytelling rhythm',
      },
      {
        id: 'sec-3',
        label: lang.chapters.stepByStep.toUpperCase(),
        timeRange: '1:10–2:20',
        text: cleanHumanLanguage(body.step1),
        wordCount: countWords(body.step1),
        visualCue: '3 clear animated step callouts on screen',
        deliveryTip: 'Measured, didactic, slow down on key steps',
      },
      {
        id: 'sec-4',
        label: lang.chapters.breakdown.toUpperCase(),
        timeRange: '2:20–3:30',
        text: cleanHumanLanguage(body.workflow),
        wordCount: countWords(body.workflow),
        visualCue: 'Editing timeline or live workflow screen demonstration',
        deliveryTip: 'Practical, upbeat demonstration',
      },
      {
        id: 'sec-5',
        label: lang.chapters.mistakes.toUpperCase(),
        timeRange: '3:30–4:25',
        text: cleanHumanLanguage(body.avoid),
        wordCount: countWords(body.avoid),
        visualCue: 'Side-by-side comparison graphic',
        deliveryTip: 'Honest reality check for creators',
      },
      {
        id: 'sec-6',
        label: lang.chapters.conclusion.toUpperCase(),
        timeRange: '4:25–5:00',
        text: cleanHumanLanguage(body.cta),
        wordCount: countWords(body.cta),
        visualCue: 'End-screen layout with next recommended video',
        deliveryTip: 'Friendly invitation to subscribe and comment',
      },
    ];
  }

  if (duration <= 150) {
    // 2-Minute Long-Form (Focused Quick Guide)
    const hook =
      userHook ||
      (seed % 2 === 1
        ? `Let's skip the fluff and build a reliable ${rawSubj} workflow you can apply immediately.`
        : `Want to understand ${rawSubj}? In this quick video, we're cutting through the noise to give you the exact steps you can use today.`);

    return [
      {
        id: 'sec-1',
        label: 'HOOK & OVERVIEW',
        timeRange: '0:00–0:15',
        text: cleanHumanLanguage(hook),
        wordCount: countWords(hook),
        visualCue: 'Talking-head host with clean minimalist background and dynamic lower third title',
        deliveryTip: 'Engaging, warm smile, crisp tempo',
      },
      {
        id: 'sec-2',
        label: 'THE COMMON TRAP',
        timeRange: '0:15–0:45',
        text: cleanHumanLanguage(`Most creators get stuck because they try to do everything at once. They spend hours tweaking minor settings instead of focusing on what viewers actually care about.`),
        wordCount: 30,
        visualCue: 'Screen capture of messy timeline or confused creator',
        deliveryTip: 'Relatable and clear storytelling tone',
      },
      {
        id: 'sec-3',
        label: 'PRACTICAL BREAKDOWN',
        timeRange: '0:45–1:20',
        text: cleanHumanLanguage(`Here is the simple framework: focus on ${rawAct} first. Build one solid video every week, track which topics get comments, and iterate without overthinking your setup.`),
        wordCount: 32,
        visualCue: 'Clean 3-step animated bullet points appearing sequentially on screen',
        deliveryTip: 'Measured, authoritative, and encouraging',
      },
      {
        id: 'sec-4',
        label: 'COMMON PITFALL',
        timeRange: '1:20–1:45',
        text: cleanHumanLanguage(`The biggest trap is comparing your day one to someone else's year five. Consistency with simple tools will always beat irregular perfection.`),
        wordCount: 24,
        visualCue: 'Side-by-side graphic of "Done with Free Tools" vs "Unfinished Drafts"',
        deliveryTip: 'Honest and grounding insight',
      },
      {
        id: 'sec-5',
        label: 'SUMMARY & CTA',
        timeRange: '1:45–2:00',
        text: cleanHumanLanguage(`If this helped you see ${rawSubj} more clearly, hit like and subscribe for more practical creator tutorials. See you in the next one!`),
        wordCount: 25,
        visualCue: 'End-screen card template with subscribe circle and next video teaser',
        deliveryTip: 'Friendly sign-off with clear eye contact',
      },
    ];
  }

  // 3-Minute to 10-Minute Long-Form Structure (English)
  return [
    {
      id: 'sec-1',
      label: 'HOOK & PROMISE',
      timeRange: '0:00–0:25',
      text: cleanHumanLanguage(userHook || `If you've been trying to master ${rawSubj} without much progress, you're not alone. In this video, we're breaking down the practical approach that works even if you're starting from zero.`),
      wordCount: 35,
      visualCue: 'Host direct to camera with subtle push-in zoom and clean title badge',
      deliveryTip: 'Start with strong clarity and direct viewer connection',
    },
    {
      id: 'sec-2',
      label: 'WHY MOST STRUGGLE',
      timeRange: '0:25–1:10',
      text: cleanHumanLanguage(`Here's the honest truth: most advice tells you to buy expensive equipment or copy top channels. But that usually leaves you overwhelmed with unfinished projects. What you actually need is a repeatable routine.`),
      wordCount: 38,
      visualCue: 'B-roll montage of camera gear and cluttered workspace with cross graphic',
      deliveryTip: 'Conversational, authentic, addressing viewer pain points',
    },
    {
      id: 'sec-3',
      label: 'PILLAR 1: THE CORE STEP',
      timeRange: '1:10–2:15',
      text: cleanHumanLanguage(`Step number one is mastering ${rawAct}. Before touching effects or transitions, make sure your core message is crystal clear in the first sixty seconds. When your message is simple, viewers stay hooked.`),
      wordCount: 36,
      visualCue: 'Screen demonstration highlighting scripting notes and simple setup',
      deliveryTip: 'Structured and didactic; slow down on key rules',
    },
    {
      id: 'sec-4',
      label: 'PILLAR 2: PRACTICAL WORKFLOW',
      timeRange: '2:15–3:30',
      text: cleanHumanLanguage(`Next, build a lightweight editing rhythm. Cut all dead air, keep your B-roll purposeful, and let your natural voice carry the story. You don't need complex motion graphics to keep attention.`),
      wordCount: 34,
      visualCue: 'Editing timeline demonstrating jump cuts and tight audio transitions',
      deliveryTip: 'Practical, upbeat, pointing out actionable tips on screen',
    },
    {
      id: 'sec-5',
      label: 'BIGGEST TRAP TO AVOID',
      timeRange: '3:30–4:25',
      text: cleanHumanLanguage(`A common trap is spending three weeks on one video that nobody watches. It's much better to publish weekly, learn what your audience likes, and improve five percent with each upload.`),
      wordCount: 33,
      visualCue: 'Graphic comparison showing 1 video/month vs 4 videos/month momentum',
      deliveryTip: 'Supportive reality check for growing creators',
    },
    {
      id: 'sec-6',
      label: 'ACTION STEP & CTA',
      timeRange: '4:25–5:00',
      text: cleanHumanLanguage(`Pick one technique from this video to try on your next project. Drop your thoughts in the comments, hit subscribe, and I'll catch you in the next breakdown!`),
      wordCount: 30,
      visualCue: 'End-screen layout with playlist teaser and subscribe button',
      deliveryTip: 'Inspiring call to immediate creator action',
    },
  ];
}

// Regenerate only a specific section without losing others (respects language)
export function regenerateSingleSection(
  sectionId: string,
  sections: ScriptSection[],
  project: VideoProject,
  profile: CreatorProfile,
  lang: LanguagePack,
  seed: number
): ScriptSection[] {
  const target = sections.find((s) => s.id === sectionId);
  if (!target) return sections;

  const topicProfile = analyzeTopic(project.topic);
  const rawSubj = topicProfile.subject.toLowerCase();
  const rawAct = topicProfile.actionPhrase.toLowerCase();

  let newText = '';
  if (lang && lang.code !== 'EN') {
    const localizedPool = [
      lang.hooks.curiosity(topicProfile).spoken,
      lang.hooks.problem(topicProfile).spoken,
      lang.hooks.promise(topicProfile).spoken,
      lang.shortsSpoken.value(topicProfile),
      lang.shortsSpoken.payoff(topicProfile),
    ];
    newText = cleanHumanLanguage(localizedPool[seed % localizedPool.length]);
  } else {
    const variations: { [label: string]: string[] } = {
      HOOK: [
        `Here is the single biggest shift you need to make with ${rawSubj}.`,
        `If you're still doing ${rawAct} the old way, watch this before your next upload.`,
        `Why does almost everyone get ${rawSubj} wrong? Here's the real answer.`,
        `Most people never realize this one simple truth about ${rawSubj}.`,
      ],
      SETUP: [
        `We see creators making things ten times harder than they need to be, especially when starting out.`,
        `You don't need fancy studio setups or years of experience to get this right.`,
        `The problem isn't your effort—it's that you're putting effort into the wrong steps first.`,
      ],
      'THE SHIFT': [
        `The game-changer is focusing strictly on ${rawAct} and ignoring the distractions.`,
        `Here is the secret: nail this one fundamental and everything else falls right into place.`,
      ],
      'POINT 1': [
        `First, clarify your central premise so viewers instantly know why they should keep watching.`,
        `Rule number one: eliminate any intro fluff and jump directly into the practical value.`,
      ],
      'POINT 2': [
        `Second, maintain visual momentum every few seconds with simple text cues and tight cuts.`,
        `Next, deliver the exact payoff you promised without dragging out the video.`,
      ],
      PAYOFF: [
        `When you apply this consistently, your retention curve flattens and your watch time climbs.`,
        `Notice how much more enjoyable the creation process becomes when you keep it simple.`,
      ],
      CTA: [
        `Save this breakdown for your next recording session, and subscribe for weekly creator tools!`,
        `Which part of ${rawSubj} do you struggle with most? Tell me in the comments below!`,
        `Subscribe for more practical creator guides and share this with a fellow creator who needs it!`,
      ],
    };

    const pool = variations[target.label] || [
      `Focus on keeping ${rawSubj} simple, direct, and actionable for your viewers.`,
      `Here is another perspective: prioritize viewer value over technical perfection every single time.`,
    ];

    newText = cleanHumanLanguage(pool[seed % pool.length]);
  }

  return sections.map((sec) => {
    if (sec.id === sectionId) {
      return {
        ...sec,
        text: newText,
        wordCount: countWords(newText),
      };
    }
    return sec;
  });
}

// Generate matching visual plan from script sections
export function generateVisualPlanFromScript(
  sections: ScriptSection[],
  project: VideoProject
): VisualPlanItem[] {
  const visualTypesPool: VisualType[] = [
    'Camera shot',
    'Screen recording',
    'B-roll',
    'Text animation',
    'Chart / graphic',
    'Image',
  ];

  return sections.map((sec, idx) => {
    const isHook = sec.label.includes('HOOK');
    const isCta = sec.label.includes('CTA');
    const isStep = sec.label.includes('POINT') || sec.label.includes('STEP') || sec.label.includes('PILLAR') || sec.label.includes('SHIFT');

    let visualType: VisualType = 'Camera shot';
    let cameraFraming = 'Medium talking-head shot';
    let transition = 'Cut on beat';

    if (isHook) {
      visualType = 'Camera shot';
      cameraFraming = 'Close-up on speaker, rapid punch-in';
      transition = 'Instant cut';
    } else if (isStep) {
      visualType = idx % 2 === 0 ? 'Screen recording' : 'Text animation';
      cameraFraming = 'Split-screen or over-the-shoulder capture';
      transition = 'Smooth slide right';
    } else if (isCta) {
      visualType = 'Text animation';
      cameraFraming = 'Medium shot with end-screen graphics';
      transition = 'Fade to black';
    } else {
      visualType = 'B-roll';
      cameraFraming = 'B-roll illustrative footage';
      transition = 'Fast cut';
    }

    // Extract short on-screen text punchline
    const words = sec.text.split(' ');
    const onScreenText = words.slice(0, 5).join(' ').replace(/[.,!?]/g, '').toUpperCase();

    return {
      id: `vis-${sec.id}`,
      timeRange: sec.timeRange,
      spokenLine: sec.text.length > 85 ? sec.text.slice(0, 85) + '...' : sec.text,
      visualDirection: sec.visualCue || 'Creator addressing viewer with clear visual focus',
      onScreenText: onScreenText || 'KEY TAKEAWAY',
      visualType,
      cameraFraming,
      transition,
    };
  });
}

// Extract vocal emphasis words from script text
export function extractEmphasisWords(sections: ScriptSection[]): string[] {
  const allText = sections.map((s) => s.text).join(' ');
  const punchRegex = /\b(stop|never|first|always|simple|mistake|secret|key|now|fix|growth|views|subscribers|proven|worst|best|zero|instantly|why|how)\b/gi;
  const matches = allText.match(punchRegex) || [];
  const unique = Array.from(new Set(matches.map((m) => toTitleCase(m))));
  return unique.slice(0, 8);
}

// Default voice settings
export function getDefaultVoiceSettings(sections: ScriptSection[]): VoiceSettings {
  return {
    source: 'Your Own Voice',
    tone: 'Friendly',
    pace: 'Normal',
    emphasisWords: extractEmphasisWords(sections),
    customNotes: 'Keep your delivery warm and natural. Smile slightly while recording the hook to sound welcoming.',
  };
}

// Default editing settings
export function getDefaultEditingSettings(): EditingSettings {
  const checklistObj: { [item: string]: boolean } = {};
  DEFAULT_EDITING_ITEMS.forEach((item) => {
    checklistObj[item] = false;
  });

  return {
    checklist: checklistObj,
    captionStyle: 'Bold',
    musicStyle: 'Subtle',
    notes: 'Keep background music at -22dB so your voice cut through clearly on mobile speakers.',
  };
}
