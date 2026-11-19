/**
 * CreatorFlow AI — Phase 2.1 Natural Language & Topic Intelligence Engine
 * High-performance, zero-API cost browser generation engine with grammar-safety.
 */

import { ContentPack, GeneratorOptions, PlatformType, ToneType, TitleResult, HookResult, CreatorProfile } from '../types';
import { analyzeTopic, TopicProfile, toTitleCase } from './topicAnalyzer';
import { getLanguagePack, LanguagePack } from './languagePatterns';
import { cleanContentPack, cleanHumanLanguage } from './contentCleaner';
import { calculateTransparentSeoScore, SEO_SCORE_DISCLAIMER } from './autonomousEngine/seoIntelligence';

// -------------------------------------------------------------
// TITLE QUALITY FILTER & GRAMMAR SAFETY (Section 8)
// -------------------------------------------------------------
export function validateAndCleanTitle(title: string, profile: TopicProfile, fallbackFormula: string): string {
  let cleaned = title.replace(/\s+/g, ' ').trim();

  // Rule 1: Detect "do + verb" glitches (e.g. "Do Grow", "Do Edit", "Do Make")
  const hasDoVerbGlitch = /\bdo\s+(?:grow|edit|make|build|start|create|scale|learn|use)\b/i.test(cleaned);

  // Rule 2: Detect raw question lead-in stuck in middle (e.g. "Keep Why", "Keep How To")
  const hasEmbeddedQuestion = /\b(?:keep|about|for|to)\s+(?:why|how to|what is|how do)\b/i.test(cleaned);

  // Rule 3: Detect doubled words (e.g. "the the", "in in", "to to")
  const hasDoubledWords = /\b(\w+)\s+\1\b/i.test(cleaned);

  // If any critical grammar glitch is detected, use a clean fallback
  if (hasDoVerbGlitch || hasEmbeddedQuestion || hasDoubledWords) {
    if (fallbackFormula.includes('Curiosity')) {
      cleaned = `Why Most Creators Struggle With ${toTitleCase(profile.nounPhrase)}`;
    } else if (fallbackFormula.includes('Benefit')) {
      cleaned = `How to ${toTitleCase(profile.actionPhrase)} Step-by-Step`;
    } else if (fallbackFormula.includes('Problem')) {
      cleaned = `Stop Making These Common ${toTitleCase(profile.nounPhrase)} Mistakes`;
    } else if (fallbackFormula.includes('Number')) {
      cleaned = `7 Ways to ${toTitleCase(profile.actionPhrase)} Faster`;
    } else {
      cleaned = `I Tested Every Way to ${toTitleCase(profile.actionPhrase)} (Real Results)`;
    }
  }

  // Clean trailing punctuation
  cleaned = cleaned.replace(/[\?\.!]+$/, '');

  // Ensure title case for English
  if (!profile.isTanglishOrTamil && !profile.isHindiOrHinglish) {
    cleaned = toTitleCase(cleaned);
  }

  return cleaned;
}

// -------------------------------------------------------------
// CREATORFLOW SCORE WITH NEGATIVE SCORING (Section 9)
// -------------------------------------------------------------
export function calculateCreatorFlowScore(title: string, tone: ToneType, seed: number): number {
  let score = 80;

  const lower = title.toLowerCase();

  // Positive: curiosity triggers
  if (/why|secret|truth|finally|hidden|mistake|avoid|what happens|nobody/i.test(lower)) {
    score += 6;
  }
  // Positive: numbers
  if (/\b\d+\b/.test(title)) {
    score += 5;
  }
  // Positive: clear action or benefit
  if (/how to|step-by-step|guide|faster|simple|ways|tested|vs/i.test(lower)) {
    score += 4;
  }

  // Length optimization (sweet spot 45-62 characters)
  const len = title.length;
  if (len >= 42 && len <= 65) {
    score += 4;
  } else if (len > 72) {
    score -= 6; // Negative penalty for overly long titles
  } else if (len < 32) {
    score -= 5; // Negative penalty for overly short/vague titles
  }

  // Negative penalty: repeated words or raw artifacts
  if (/\b(\w+)\s+\1\b/i.test(lower)) {
    score -= 15;
  }
  if (/\bdo\s+(?:grow|edit|make)\b/i.test(lower)) {
    score -= 20; // Critical penalty for grammar glitch
  }

  if (tone === 'Viral') score += 2;
  if (tone === 'Funny') score += 1;

  // Add small deterministic jitter
  const jitter = (seed * 2) % 4;
  const finalScore = Math.min(97, Math.max(68, score + jitter));
  return finalScore;
}

export function calculateCreatorFlowScoreDetailed(
  title: string,
  topic: string,
  tone: ToneType,
  seed: number
): { score: number; explanations: string[]; disclaimer: string } {
  const seo = calculateTransparentSeoScore(title, topic, 'YouTube', seed);
  return {
    score: seo.totalScore,
    explanations: seo.transparentExplanations,
    disclaimer: seo.disclaimer,
  };
}

// -------------------------------------------------------------
// MAIN GENERATION PIPELINE (Section 23)
// User Topic -> Topic Analyzer -> Topic Profile -> Generator -> Quality Filter -> Deduplication -> Credibility Filter -> Content Pack
// -------------------------------------------------------------
export function generateContentPack(options: GeneratorOptions): ContentPack {
  const {
    topic,
    platform = 'YouTube',
    language = 'English',
    tone = 'Educational',
    variationSeed = 0,
    creatorProfile,
    personalizationProfile,
  } = options;

  if (!topic || !topic.trim()) {
    throw new Error('Enter a video topic to generate your content pack.');
  }

  const profile = analyzeTopic(topic);
  const langPack = getLanguagePack(language);
  const seed = variationSeed;

  // 1. Generate 5 Titles (context & personalization-aware)
  const titles = generateTitles(profile, langPack, tone, seed, creatorProfile, personalizationProfile);

  // 2. Generate 3 Retention Hooks (device & context-aware)
  const hooks = generateHooks(profile, langPack, tone, seed, creatorProfile);

  // 3. Generate Description & Chapters (audience-tailored)
  const description = generateDescription(profile, langPack, tone, platform, seed, creatorProfile);

  // 4. Generate Semantic Keywords
  const keywords = generateKeywords(profile, langPack, tone, seed);

  // 5. Generate Natural Hashtags
  const hashtags = generateHashtags(profile, langPack, tone, seed);

  // 6. Generate Shorts Script
  const shortsScript = generateShortsScript(profile, langPack, tone, platform, seed);

  // 7. Generate Pinned Comment
  const pinnedComment = generatePinnedComment(profile, langPack, tone, seed);

  // 8. Generate Thumbnail Concept & Text Options
  const thumbnailConcept = generateThumbnail(profile, langPack, tone, seed);

  // 9. Generate 5 Related Video Ideas (experience & goal-tailored)
  const videoIdeas = generateVideoIdeas(profile, langPack, tone, seed, creatorProfile);

  const rawPack: ContentPack = {
    id: `pack-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    topic: profile.rawTopic,
    platform,
    language,
    tone,
    createdAt: new Date().toISOString(),
    isSaved: false,
    variationSeed: seed,
    titles,
    hooks,
    description,
    keywords,
    hashtags,
    shortsScript,
    pinnedComment,
    thumbnailConcept,
    videoIdeas,
  };

  return cleanContentPack(rawPack, profile);
}

// -------------------------------------------------------------
// 1. TITLES GENERATOR (Section 7)
// -------------------------------------------------------------
export function generateTitles(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  seed: number,
  creatorProfile?: CreatorProfile,
  personalizationProfile?: {
    strategyWeights?: Record<string, number>;
    [key: string]: any;
  }
): TitleResult[] {
  const listCounts = [5, 7, 3, 10, 8];
  const listCount = listCounts[seed % listCounts.length];

  type StrategyKey = 'curiosity_mystery' | 'practical_tutorial' | 'problem_solution' | 'beginner_friendly' | 'storytelling_case_study';

  let rawTitles: Array<{ text: string; style: string; strategyKey: StrategyKey }> = [];

  if (lang.code === 'TA') {
    rawTitles = [
      { text: lang.titleTemplates.curiosity(profile, listCount), style: 'Curiosity Loop & Insights', strategyKey: 'curiosity_mystery' },
      { text: lang.titleTemplates.benefit(profile), style: 'Value-First Guide', strategyKey: 'practical_tutorial' },
      { text: lang.titleTemplates.mistake(profile), style: 'Mistake Avoidance', strategyKey: 'problem_solution' },
      { text: lang.titleTemplates.list(profile, listCount), style: 'Numbered Tips', strategyKey: 'beginner_friendly' },
      { text: lang.titleTemplates.emotional(profile, listCount), style: 'Practical Experience', strategyKey: 'storytelling_case_study' },
    ];
  } else if (lang.code === 'TA-ROM') {
    rawTitles = [
      { text: lang.titleTemplates.curiosity(profile, listCount), style: 'Tanglish Curiosity Loop', strategyKey: 'curiosity_mystery' },
      { text: lang.titleTemplates.benefit(profile), style: 'Tanglish Practical Guide', strategyKey: 'practical_tutorial' },
      { text: lang.titleTemplates.mistake(profile), style: 'Tanglish Mistake Avoidance', strategyKey: 'problem_solution' },
      { text: lang.titleTemplates.list(profile, listCount), style: 'Numbered Tanglish Tips', strategyKey: 'beginner_friendly' },
      { text: lang.titleTemplates.emotional(profile, listCount), style: 'Tanglish Real Story', strategyKey: 'storytelling_case_study' },
    ];
  } else if (lang.code === 'HI') {
    rawTitles = [
      { text: lang.titleTemplates.curiosity(profile, listCount), style: 'Curiosity & Mystery (Hindi)', strategyKey: 'curiosity_mystery' },
      { text: lang.titleTemplates.benefit(profile), style: 'Direct Benefit (Hindi)', strategyKey: 'practical_tutorial' },
      { text: lang.titleTemplates.mistake(profile), style: 'Critical Mistake Warning', strategyKey: 'problem_solution' },
      { text: lang.titleTemplates.list(profile, listCount), style: 'Numbered Proven Tips', strategyKey: 'beginner_friendly' },
      { text: lang.titleTemplates.emotional(profile, listCount), style: 'First-Person Experiment', strategyKey: 'storytelling_case_study' },
    ];
  } else {
    // English & Global Language Grammar-Safe Patterns
    const t = lang.titleTemplates;
    rawTitles = [
      { text: t.curiosity(profile, listCount), style: 'Curiosity & Information Gap', strategyKey: 'curiosity_mystery' },
      { text: t.benefit(profile), style: 'Actionable Benefit', strategyKey: 'practical_tutorial' },
      { text: t.mistake(profile), style: 'Problem → Solution', strategyKey: 'problem_solution' },
      { text: t.list(profile, listCount), style: 'Numbered Framework', strategyKey: 'beginner_friendly' },
      { text: t.emotional(profile, listCount), style: 'Narrative & Case Study', strategyKey: 'storytelling_case_study' },
    ];
  }

  // Pass through Title Quality Filter & calculate CreatorFlow Score + Personalization Tuning
  const evaluated = rawTitles.map((item, idx) => {
    const validatedText = validateAndCleanTitle(item.text, profile, item.style);
    let score = calculateCreatorFlowScore(validatedText, tone, seed + idx);
    const detailed = calculateCreatorFlowScoreDetailed(validatedText, profile.rawTopic, tone, seed + idx);
    const explanations = [...(detailed.explanations || [])];

    // Personalization strategy weights influence (only when enabled !== false)
    if (personalizationProfile?.enabled !== false && personalizationProfile?.strategyWeights) {
      const weight = personalizationProfile.strategyWeights[item.strategyKey];
      if (typeof weight === 'number') {
        const weightDelta = Math.round((weight - 1.0) * 15);
        if (weightDelta !== 0) {
          score += weightDelta;
          explanations.push(
            `Personalization: ${weightDelta > 0 ? '+' : ''}${weightDelta} pts based on your preferred "${item.strategyKey.replace(/_/g, ' ')}" strategy rating`
          );
        }
      }
    }

    // Creator profile context influence
    if (creatorProfile) {
      const exp = creatorProfile.experienceLevel;
      const stage = creatorProfile.creatorStage;
      if (exp === 'Beginner' || stage === 'New Creator') {
        if (item.strategyKey === 'beginner_friendly' || item.strategyKey === 'practical_tutorial') {
          score += 3;
          explanations.push('Creator Context: +3 pts for beginner-friendly, accessible framework');
        } else if (item.strategyKey === 'storytelling_case_study') {
          score -= 2;
        }
      } else if (exp === 'Advanced' || stage === 'Established Creator') {
        if (item.strategyKey === 'storytelling_case_study' || item.strategyKey === 'curiosity_mystery') {
          score += 3;
          explanations.push('Creator Context: +3 pts tailored for advanced case studies & higher audience curiosity');
        } else if (item.strategyKey === 'beginner_friendly') {
          score -= 2;
        }
      }

      const goal = (creatorProfile.primaryGoal || '').toLowerCase();
      if (goal.includes('reach') || goal.includes('grow') || goal.includes('sub')) {
        if (item.strategyKey === 'curiosity_mystery') {
          score += 2;
          explanations.push('Creator Context: +2 pts alignment with channel growth & discovery goal');
        }
      } else if (goal.includes('monetiz') || goal.includes('revenue') || goal.includes('income')) {
        if (item.strategyKey === 'problem_solution' || item.strategyKey === 'practical_tutorial') {
          score += 2;
          explanations.push('Creator Context: +2 pts alignment with high-value monetization & problem-solving');
        }
      }
    }

    // Ensure within valid score bounds (68-97)
    score = Math.min(97, Math.max(68, score));

    return {
      text: validatedText,
      style: item.style,
      charCount: validatedText.length,
      score,
      predictedCtr: `${(score / 10).toFixed(1)}%`,
      explanations,
      scoreDisclaimer: detailed.disclaimer,
      originalIndex: idx,
    };
  });

  // Re-rank candidates only when personalization is active or creatorProfile is supplied.
  // Preserves exact original template order for backward compatibility when options are default.
  if ((personalizationProfile?.enabled !== false && personalizationProfile?.strategyWeights) || creatorProfile) {
    evaluated.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.originalIndex - b.originalIndex));
  }

  return evaluated.map(({ originalIndex, ...rest }) => rest);
}

// -------------------------------------------------------------
// 2. RETENTION HOOKS GENERATOR (Section 10)
// -------------------------------------------------------------
export function generateHooks(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  seed: number,
  creatorProfile?: CreatorProfile
): HookResult[] {
  const baseHooks = lang.hooks;

  const hookA = { ...baseHooks.curiosity(profile) };
  const hookB = { ...baseHooks.problem(profile) };
  const hookC = { ...baseHooks.promise(profile) };

  const isEnglishFamily = lang.code === 'EN';

  // Preserve regional/native phrasing for non-English packs; tailor English tone cleanly
  if (isEnglishFamily) {
    if (tone === 'Viral') {
      if (profile.intent === 'tutorial') {
        hookA.spoken =
          seed % 2 === 1
            ? `Hold on — before filming your next clip, look closely at why ${profile.nounPhrase.toLowerCase()} loses viewers early.`
            : `Before you upload another video, you need to hear why ${profile.nounPhrase.toLowerCase()} usually fails.`;
      } else if (seed % 2 === 1) {
        hookA.spoken = `Stop scrolling for 10 seconds — this changes how you approach ${profile.nounPhrase.toLowerCase()}.`;
      }
      hookA.visual = `Immediate fast snap zoom with on-screen graphical breakdown.`;
    } else if (tone === 'Funny') {
      if (profile.intent === 'tutorial') {
        hookB.spoken =
          seed % 2 === 1
            ? `Unpopular opinion: half the complicated advice on ${profile.gerundPhrase.toLowerCase()} just wastes your evening.`
            : `Let's be honest: most advice about ${profile.gerundPhrase.toLowerCase()} is completely overcomplicated.`;
      }
      hookB.visual = `Playful freeze-frame with relatable creator facepalm.`;
    } else if (tone === 'Professional') {
      hookC.spoken =
        seed % 2 === 1
          ? `Let's examine the core framework behind dependable ${profile.nounPhrase.toLowerCase()} execution.`
          : `In this breakdown, we will isolate the exact structural principles behind ${profile.nounPhrase.toLowerCase()}.`;
      hookC.visual = `Clean high-contrast motion graphic displaying workflow overview.`;
    } else if (seed % 3 === 1) {
      hookA.spoken = `Here is the subtle detail about ${profile.nounPhrase.toLowerCase()} most tutorials gloss over.`;
      hookB.spoken = `If ${profile.gerundPhrase.toLowerCase()} feels harder than it should, this bottleneck is usually why.`;
    } else if (seed % 3 === 2) {
      hookA.spoken = `What separates consistent ${profile.nounPhrase.toLowerCase()} from stalled drafts comes down to one habit.`;
      hookC.spoken = `By the end of this walkthrough, you'll have a clear plan for ${profile.actionPhrase.toLowerCase()}.`;
    }
  } else if (seed % 2 === 1) {
    // Deterministic variation on regenerate for multilingual packs (swap presentation emphasis cleanly)
    const localizedLeadByCode: Record<string, { hookALead: string; hookBLead: string }> = {
      TA: {
        hookALead: `${profile.subject} பற்றி பலரும் கவனிக்காத முக்கிய விஷயம் இதோ: ${hookA.spoken}`,
        hookBLead: `நேரத்தை வீணாக்காமல் ${profile.subject} செய்ய வேண்டுமா? ${hookB.spoken}`,
      },
      'TA-ROM': {
        hookALead: `${profile.subject} pathi neraya per kavanikkadha point idhu dhaan: ${hookA.spoken}`,
        hookBLead: `Time waste pannama ${profile.subject} pannanum-na idha paarunga: ${hookB.spoken}`,
      },
      HI: {
        hookALead: `${profile.subject} के बारे में यह अहम बात बहुत कम लोग जानते हैं: ${hookA.spoken}`,
        hookBLead: `समय बचाकर ${profile.subject} बेहतर बनाना चाहते हैं? ${hookB.spoken}`,
      },
    };
    const alt = localizedLeadByCode[lang.code];
    if (alt) {
      hookA.spoken = alt.hookALead;
      hookB.spoken = alt.hookBLead;
    }
  }

  // Device context adaptation
  if (creatorProfile?.availableDevices?.some((d) => /mobile|phone/i.test(d))) {
    hookA.visual = `${hookA.visual} (Hold smartphone steady at eye-level)`;
  }

  return [
    {
      type: 'Hook A — Curiosity Gap',
      hook: hookA.spoken,
      deliveryTip: hookA.visual,
      retentionReason: hookA.reason,
    },
    {
      type: 'Hook B — Painful Problem',
      hook: hookB.spoken,
      deliveryTip: hookB.visual,
      retentionReason: hookB.reason,
    },
    {
      type: 'Hook C — High-Stakes Promise',
      hook: hookC.spoken,
      deliveryTip: hookC.visual,
      retentionReason: hookC.reason,
    },
  ];
}

// -------------------------------------------------------------
// 3. DESCRIPTION GENERATOR (Section 11 & 12)
// Natural, human-readable, credible wording without mechanical repetition
// -------------------------------------------------------------
export function generateDescription(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  platform: PlatformType,
  seed: number,
  creatorProfile?: CreatorProfile
) {
  const isShorts = platform === 'Shorts';
  const audienceClause = creatorProfile?.targetAudience
    ? ` Tailored for ${creatorProfile.targetAudience}.`
    : '';

  let hookLine = `${lang.description.hookPrefix} ${profile.subject}? Here is a clear, practical breakdown.`;
  let summary = `${lang.description.breakdownPrefix} ${profile.nounPhrase.toLowerCase()}.${audienceClause} Whether you are starting from zero or refining your current process, this video explores actionable workflows, common pitfalls, and practical techniques to help improve your results.`;
  let valuePoints = [
    `• The core principles behind effective ${profile.nounPhrase.toLowerCase()}`,
    creatorProfile?.experienceLevel === 'Beginner'
      ? `• Accessible walkthrough with zero complicated jargon`
      : `• How to avoid common missteps and save valuable time`,
    `• Step-by-step techniques designed for consistent execution`,
    `• Practical adjustments you can implement right away`,
  ];
  let linksPlaceholder = `🔗 RESOURCES & LINKS:\n• Helpful Checklist / Notes: [Your Link]\n• Recommended Tools & Setup: [Your Link]\n• Subscribe for Weekly Tutorials: [Your Link]`;

  if (lang.code === 'TA') {
    hookLine = `${lang.description.hookPrefix} ${profile.subject} — முழு விளக்கம் தமிழில்.`;
    summary = `${lang.description.breakdownPrefix} ${profile.subject}.${creatorProfile?.targetAudience ? ` (${creatorProfile.targetAudience} பார்வையாளர்களுக்காக).` : ''} ஆரம்ப நிலை கிரியேட்டர்கள் முதல் அனுபவம் உள்ளவர்கள் வரை அனைவரும் உடனடியாக பயன்படுத்தக்கூடிய எளிய வழிகாட்டி.`;
    valuePoints = [
      `• ${profile.subject} பற்றிய அடிப்படை மற்றும் முக்கிய நுட்பங்கள்`,
      creatorProfile?.experienceLevel === 'Beginner'
        ? `• ஆரம்ப நிலையில் உள்ளவர்களுக்கு எளிய படிப்படியான விளக்கம்`
        : `• நேரத்தை மிச்சப்படுத்தும் மற்றும் தவறுகளை தவிர்க்கும் முறைகள்`,
      `• உடனடியாக செயல்படுத்தக்கூடிய நடைமுறை குறிப்புகள்`,
    ];
    linksPlaceholder = `🔗 பயனுள்ள இணைப்புகள்:\n• வழிகாட்டி & குறிப்புகள்: [Your Link]\n• பரிந்துரைக்கப்பட்ட கருவிகள்: [Your Link]`;
  } else if (lang.code === 'TA-ROM') {
    hookLine = `${lang.description.hookPrefix} ${profile.subject}? Simple Tanglish breakdown idho.`;
    summary = `${lang.description.breakdownPrefix} ${profile.subject}.${creatorProfile?.targetAudience ? ` (${creatorProfile.targetAudience} audience-kaga curated).` : ''} Beginner-ah start panringala illa workflow upgrade panringala, indha video-la practical steps & avoid panna vendiya mistakes ellam clear-ah irukku.`;
    valuePoints = [
      `• ${profile.subject} core setup & smart approach`,
      creatorProfile?.experienceLevel === 'Beginner'
        ? `• Confusion illama beginner-friendly step-by-step steps`
        : `• Time save panni consistency maintain panra practical workflow`,
      `• Next video-la udane apply panna koodiya tips`,
    ];
    linksPlaceholder = `🔗 USEFUL LINKS & RESOURCES:\n• Step-by-Step Checklist: [Your Link]\n• Recommended Tools Setup: [Your Link]`;
  } else if (lang.code === 'HI') {
    hookLine = `${lang.description.hookPrefix} ${profile.subject} — आसान और प्रैक्टिकल गाइड हिंदी में।`;
    summary = `${lang.description.breakdownPrefix} ${profile.subject}.${creatorProfile?.targetAudience ? ` (${creatorProfile.targetAudience} के लिए तैयार).` : ''} चाहे आप बिल्कुल शुरुआत कर रहे हों या अपना कंटेंट बेहतर बनाना चाहते हों, इस वीडियो में आसान स्टेप्स और जरूरी टिप्स शामिल हैं।`;
    valuePoints = [
      `• ${profile.subject} के मुख्य नियम और सही शुरुआत`,
      creatorProfile?.experienceLevel === 'Beginner'
        ? `• शुरुआती क्रिएटर्स के लिए आसान स्टेप-बाय-स्टेप गाइड`
        : `• आम गलतियों से बचकर समय बचाने के तरीके`,
      `• अगले वीडियो में तुरंत लागू करने योग्य प्रैक्टिकल टिप्स`,
    ];
    linksPlaceholder = `🔗 उपयोगी संसाधन और लिंक:\n• चेकलिस्ट और नोट्स: [Your Link]\n• टूल्स और सेटअप गाइड: [Your Link]`;
  } else if (seed % 3 === 1) {
    summary = `${lang.description.breakdownPrefix} ${profile.nounPhrase.toLowerCase()}.${audienceClause} We break the workflow into repeatable steps so you can skip guesswork and apply the right adjustments immediately.`;
    valuePoints = [
      `• What actually matters most for ${profile.nounPhrase.toLowerCase()}`,
      creatorProfile?.experienceLevel === 'Beginner'
        ? `• Clear beginner setup without pricey tools`
        : `• Fast workflow optimizations to avoid creative burnout`,
      `• Real-world mistakes holding most uploads back`,
      `• Your concise action checklist for the next publish`,
    ];
  } else if (seed % 3 === 2) {
    summary = `${lang.description.breakdownPrefix} ${profile.nounPhrase.toLowerCase()}.${audienceClause} Follow this step-by-step walkthrough to tighten pacing, improve clarity, and stay consistent every week.`;
  }

  // Chapters for YouTube longform
  const timestamps = isShorts
    ? []
    : [
        { time: '00:00', label: `${lang.chapters.intro}: ${profile.subject}` },
        { time: '01:15', label: `${lang.chapters.problem}` },
        { time: '02:50', label: `${lang.chapters.breakdown}` },
        { time: '05:30', label: `${lang.chapters.stepByStep}` },
        { time: '08:00', label: `${lang.chapters.mistakes}` },
        { time: '10:20', label: `${lang.chapters.conclusion}` },
      ];

  return {
    hookLine,
    summary,
    valuePoints,
    timestamps,
    linksPlaceholder,
    callToAction: lang.description.cta,
  };
}

// -------------------------------------------------------------
// 4. KEYWORDS GENERATOR (Section 13 & 14)
// Semantic variation groups + deduplication
// -------------------------------------------------------------
export function generateKeywords(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  seed: number
): string[] {
  const g = profile.semanticGroups;

  const rawList = [
    ...g.core,
    ...g.intent,
    ...g.beginner,
    ...g.problem,
    ...g.related,
  ];

  // Localized variants for regional languages
  if (lang.code === 'TA') {
    rawList.push(`${profile.subject.toLowerCase()} tamil`, `${profile.actionPhrase.toLowerCase()} tamil`);
  } else if (lang.code === 'TA-ROM') {
    rawList.push(`${profile.subject.toLowerCase()} tanglish`, `${profile.actionPhrase.toLowerCase()} tips`);
  } else if (lang.code === 'HI') {
    rawList.push(`${profile.subject.toLowerCase()} hindi`, `${profile.actionPhrase.toLowerCase()} kaise kare`);
  }

  // Deduplicate and return 12-14 clean keywords
  const unique = Array.from(new Set(rawList.map(k => k.trim()))).filter(k => k.length > 2);
  return unique.slice(0, 14);
}

// -------------------------------------------------------------
// 5. HASHTAGS GENERATOR (Section 15)
// Natural hashtag families without mechanical suffix clutter
// -------------------------------------------------------------
export function generateHashtags(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  seed: number
): string[] {
  const tags: string[] = [];

  if (profile.intent === 'comparison' && profile.comparisonA && profile.comparisonB) {
    tags.push(
      `#${profile.comparisonA.replace(/\s+/g, '')}`,
      `#${profile.comparisonB.replace(/\s+/g, '')}`,
      `#VideoEditing`,
      `#EditingSoftware`,
      `#CreatorTools`,
      `#ContentCreation`
    );
  } else if (/youtube/i.test(profile.subject) || /grow/i.test(profile.actionPhrase)) {
    tags.push(
      '#YouTubeGrowth',
      '#YouTubeTips',
      '#ContentCreator',
      '#GrowOnYouTube',
      '#YouTubeChannel',
      '#CreatorTips',
      '#YouTubeStrategy',
      '#VideoTips'
    );
  } else if (/phone|mobile|cinematic/i.test(profile.subject)) {
    tags.push(
      '#MobileFilmmaking',
      '#PhoneVideoEditing',
      '#VideoEditingTips',
      '#MobileVideo',
      '#SmartphoneVideo',
      '#CreatorTips',
      '#CapCutTutorial'
    );
  } else if (/ai/i.test(profile.subject) && /student/i.test(profile.rawTopic)) {
    tags.push(
      '#AITools',
      '#StudentProductivity',
      '#StudyHacks',
      '#ArtificialIntelligence',
      '#EdTech',
      '#ProductivityTools'
    );
  } else if (/ai.*video/i.test(profile.subject)) {
    tags.push(
      '#AIVideo',
      '#ArtificialIntelligence',
      '#GenerativeAI',
      '#AIFilmmaking',
      '#VideoProduction',
      '#FutureTech'
    );
  } else {
    const cleanSubj = profile.subject.replace(/[^a-zA-Z0-9]/g, '');
    tags.push(
      `#${cleanSubj}`,
      `#${cleanSubj}Tips`,
      '#ContentCreator',
      '#CreatorTips',
      '#HowTo',
      '#Tutorial'
    );
  }

  if (lang.code === 'TA') {
    tags.push('#TamilCreators', '#TamilYouTube');
  } else if (lang.code === 'TA-ROM') {
    tags.push('#TanglishTips', '#TamilYouTuber');
  } else if (lang.code === 'HI') {
    tags.push('#HindiCreators', '#YouTubeHindi');
  }

  return Array.from(new Set(tags)).slice(0, 10);
}

// -------------------------------------------------------------
// 6. SHORTS SCRIPT GENERATOR (Section 16)
// Natural spoken audio and specific visual direction
// -------------------------------------------------------------
export function generateShortsScript(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  platform: PlatformType,
  seed: number
) {
  const spoken = lang.shortsSpoken;
  const hook = spoken.hook(profile);
  const setup = spoken.setup(profile);
  const value = spoken.value(profile);
  const payoff = spoken.payoff(profile);
  const cta = spoken.cta;

  // Domain-specific visual cues
  let setupVisual = 'Show creator addressing camera directly with split-screen illustration.';
  let valueVisual = 'Close-up over the shoulder demonstrating the key step on screen.';

  if (/youtube/i.test(profile.subject)) {
    setupVisual = 'Show creator looking at an analytics retention graph with drop-off point highlighted.';
    valueVisual = 'Highlighting YouTube Studio dashboard settings and upload optimization checklist.';
  } else if (/phone|edit/i.test(profile.subject)) {
    setupVisual = 'Show handheld smartphone with editing timeline and color correction sliders.';
    valueVisual = 'Side-by-side transition: unedited raw footage transforming into clean grade.';
  } else if (/ai/i.test(profile.subject)) {
    setupVisual = 'Laptop screen showing modern AI tool interface with prompt inputs.';
    valueVisual = 'Fast screen recording demonstrating instant output generation.';
  }

  const scriptTitle =
    lang.code === 'TA'
      ? `${profile.subject} — 35 வினாடி Shorts ஸ்கிரிப்ட்`
      : lang.code === 'TA-ROM'
        ? `${profile.subject} — 35 Sec Tanglish Shorts Script`
        : lang.code === 'HI'
          ? `${profile.subject} — 35 सेकंड Shorts स्क्रिप्ट`
          : `How to ${toTitleCase(profile.actionPhrase)} in 35 Seconds`;

  return {
    title: scriptTitle,
    duration: '35 seconds',
    hook,
    body: [
      {
        second: '00:00 - 00:03',
        visual: seed % 2 === 1 ? 'Dynamic push-in on creator with crisp 3-word text pop.' : 'Fast snap-zoom onto creator with bold animated caption.',
        audio: hook,
      },
      {
        second: '00:03 - 00:10',
        visual: setupVisual,
        audio: setup,
      },
      {
        second: '00:10 - 00:25',
        visual: valueVisual,
        audio: value,
      },
      {
        second: '00:25 - 00:32',
        visual: 'Clear before-and-after visual confirmation with clean audio sound effect.',
        audio: payoff,
      },
    ],
    cta,
  };
}

// -------------------------------------------------------------
// 7. PINNED COMMENT GENERATOR (Section 17)
// Natural community conversation question
// -------------------------------------------------------------
export function generatePinnedComment(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  seed: number
) {
  const p = lang.pinnedComment;
  const starter = p.starter;
  const question = p.question(profile);
  const cta = p.cta;

  const fullComment = `${starter}\n\n${question}\n\n(${cta}) 👇`;

  return {
    comment: fullComment,
    engagementQuestion: question,
    boostTip: 'Replying to early comments can help start conversations and build connection with your viewers.',
  };
}

// -------------------------------------------------------------
// 8. THUMBNAIL CONCEPT & TEXT OPTIONS (Section 18)
// Topic-specific composition, background, focal point, and text
// -------------------------------------------------------------
export function generateThumbnail(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  seed: number
) {
  let texts =
    lang.thumbnailTexts && lang.thumbnailTexts.length >= 4 && lang.code !== 'EN'
      ? [...lang.thumbnailTexts]
      : ['STOP THIS', 'IT WORKED?', 'TRY THIS', 'THE REAL TRUTH'];

  if (lang.code === 'EN') {
    if (profile.intent === 'comparison') {
      texts = ['WHICH WINS?', 'THE TRUTH', "DON'T BUY", 'HONEST REVIEW'];
    } else if (/youtube/i.test(profile.subject)) {
      texts = ['10K SUBS?', "DON'T DO THIS", 'WHY IT FAILED', 'GROW FASTER'];
    } else if (/phone|edit/i.test(profile.subject)) {
      texts = ['PHONE ONLY?', 'PRO RESULTS', 'STOP THIS', '10X FASTER'];
    } else if (/ai.*tool/i.test(profile.subject)) {
      texts = ['MUST TRY', 'GAME CHANGER', 'BEST FOR SCHOOL', "DON'T MISS"];
    } else if (/ai.*video/i.test(profile.subject)) {
      texts = ['LOOKS FAKE?', 'THE FIX', 'UNREALISTIC?', 'THE SECRET'];
    }
  }

  const overlayOptions = texts.slice(0, 4);
  const overlayText = overlayOptions[seed % overlayOptions.length];

  let composition = `Split composition: Creator reacting on left; High-contrast demonstration of ${profile.subject} on right.`;
  let focalPoint = `Sharp focus on creator reaction and key visual evidence.`;
  let background = `Dark studio background (#0F172A) with subtle colored accent rim lighting.`;

  if (/youtube/i.test(profile.subject)) {
    composition = `Creator reacting to rising YouTube analytics graph with subscriber milestone badge.`;
    focalPoint = `Analytics graph trending upward with clear numerical indicator.`;
    background = `Clean modern creator studio workspace.`;
  } else if (/phone|edit/i.test(profile.subject)) {
    composition = `Creator holding smartphone horizontally with glowing video timeline displayed on screen.`;
    focalPoint = `Vibrant phone screen showcasing clean cinematic color grade.`;
  } else if (profile.intent === 'comparison') {
    composition = `Side-by-side comparison boxes: ${profile.comparisonA} vs ${profile.comparisonB} with bold 'VS' badge.`;
    focalPoint = `Direct contrast between both logos/software interfaces.`;
  } else if (seed % 2 === 1) {
    composition = `Clean rule-of-thirds frame: Bold 2-word headline top-left, visual proof on right showcasing ${profile.subject}.`;
  }

  return {
    composition,
    focalPoint,
    facialExpression: tone === 'Funny'
      ? 'Playful skeptical expression with raised eyebrow'
      : 'Intense interest / focused reaction looking towards the key visual',
    overlayText,
    overlayOptions,
    background,
    visualContrast: 'High luminance contrast: bold white lettering with subtle dark backing and vibrant accent outline.',
    textPlacement: 'Top-left or top-center quadrant, strictly avoiding bottom-right timestamp zone.',
    colorPalette: ['#0F172A (Deep Navy)', '#F43F5E (Vibrant Rose)', '#F59E0B (Amber Gold)', '#FFFFFF (Crisp White)'],
    psychologicalTrigger: 'Curiosity Gap: Prompts the viewer to find out which method or outcome was discovered.',
  };
}

// -------------------------------------------------------------
// 9. RELATED VIDEO IDEAS (Section 19)
// 5 angles with natural grammar + multilingual TA/TA-ROM/HI support
// -------------------------------------------------------------
export function generateVideoIdeas(
  profile: TopicProfile,
  lang: LanguagePack,
  tone: ToneType,
  seed: number,
  creatorProfile?: CreatorProfile
): Array<{
  title: string;
  angle: string;
  description: string;
  difficulty?: string;
  formatRecommendation?: string;
  targetAudience?: string;
}> {
  const act = profile.actionPhrase;
  const noun = profile.nounPhrase;
  const subj = profile.subject;
  const audience = creatorProfile?.targetAudience || 'General Audience';

  let formatRecommendation = 'Clear Structured Screen Walkthrough & Webcam';
  if (creatorProfile?.availableDevices?.some((d) => /mobile|phone/i.test(d))) {
    formatRecommendation = 'Smartphone Talking-Head + Screen Record';
  } else if (creatorProfile?.availableDevices?.some((d) => /dslr|mirrorless|camera/i.test(d))) {
    formatRecommendation = 'Cinematic 4K Studio A-Roll with B-Roll overlays';
  }

  const isAdvanced = creatorProfile?.experienceLevel === 'Advanced' || creatorProfile?.creatorStage === 'Established Creator';
  const isBeginner = creatorProfile?.experienceLevel === 'Beginner' || creatorProfile?.creatorStage === 'New Creator';

  // Localized video ideas for Tamil, Tanglish, Hindi
  if (lang.code === 'TA') {
    return [
      {
        title: `${subj} — ஆரம்ப நிலை முழு வழிகாட்டி (Step-by-Step)`,
        angle: isAdvanced ? '1. மேம்பட்ட கட்டமைப்பு (Advanced)' : '1. ஆரம்ப நிலை வழிகாட்டி',
        description: `${audience} பார்வையாளர்களுக்கான தெளிவான படிப்படியான விளக்கம்.`,
        difficulty: isAdvanced ? 'Advanced / Scaling' : 'Beginner-Friendly',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `${subj}-ல் பலரும் செய்யும் 5 பெரிய தவறுகள்`,
        angle: '2. தவிர்க்க வேண்டிய தவறுகள்',
        description: `நேரத்தையும் வளர்ச்சியையும் குறைக்கும் பொதுவான தவறுகளை எப்படி சரி செய்வது.`,
        difficulty: 'Intermediate',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `30 நாட்கள் ${subj} சவால்: உண்மையான அனுபவம்`,
        angle: '3. 30-நாள் சோதனை',
        description: `தொடர்ச்சியான முயற்சியால் கிடைத்த உண்மையான பாடங்கள் மற்றும் முடிவுகள்.`,
        difficulty: 'All Levels',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `பழைய முறை vs புதிய ${subj} Workflow`,
        angle: '4. நேரடி ஒப்பீடு',
        description: `நேரத்தை மிச்சப்படுத்தும் நவீன வழிமுறைகளின் நேரடி ஒப்பீடு.`,
        difficulty: 'Intermediate',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `கூடுதல் கருவிகள் இல்லாமல் ${subj} மேம்படுத்தும் 3 வழிகள்`,
        angle: '5. எளிய நடைமுறை நுட்பங்கள்',
        description: `குறைந்த பட்ஜெட்டில் தரமான அவுட்புட் பெற உதவும் குறிப்புகள்.`,
        difficulty: isBeginner ? 'Beginner-Friendly' : 'Advanced',
        formatRecommendation,
        targetAudience: audience,
      },
    ];
  }

  if (lang.code === 'TA-ROM') {
    return [
      {
        title: `${subj} Complete Starter Guide (Zero-la irundhu Epdi Start Panradhu)`,
        angle: isAdvanced ? '1. Advanced Retention Blueprint' : '1. Beginner Foundation Guide',
        description: `${audience} kaga simple Tanglish step-by-step walkthrough.`,
        difficulty: isAdvanced ? 'Advanced / Scaling' : 'Beginner-Friendly',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `${subj}-la 90% Creators Panra 5 Periya Mistakes`,
        angle: '2. Mistakes & Quick Fixes',
        description: `Views & watch time drop aagaama prevent panna avoid panna vendiya common mistakes.`,
        difficulty: 'Intermediate',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `Naan 30 Naal ${subj} Test Pannen — Enna Nadandhuchu?`,
        angle: '3. 30-Day Real Experiment',
        description: `Practical experience, real struggles & takeaway lessons honest breakdown.`,
        difficulty: 'All Levels',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `Old Method vs Smart ${subj} Workflow (Time Saving Tips)`,
        angle: '4. Direct Workflow Comparison',
        description: `Pazhaya slow habits-ah vittutu fast-ah results kudukra method comparison.`,
        difficulty: 'Intermediate',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `Budget Setup Illama ${subj} Pro Level-ah Panradhu Epdi?`,
        angle: '5. Zero-Budget Optimization',
        description: `Simple tools & tight editing vechu consistency build panra guide.`,
        difficulty: isBeginner ? 'Beginner-Friendly' : 'Pro Tactical',
        formatRecommendation,
        targetAudience: audience,
      },
    ];
  }

  if (lang.code === 'HI') {
    return [
      {
        title: `${subj} की पूरी शुरुआत: स्टेप-बाय-स्टेप गाइड`,
        angle: isAdvanced ? '1. एडवांस ग्रोथ सिस्टम' : '1. शुरुआती गाइड',
        description: `${audience} के लिए सरल और स्पष्ट हिंदी ट्यूटोरियल।`,
        difficulty: isAdvanced ? 'Advanced / Scaling' : 'Beginner-Friendly',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `${subj} में ये 5 आम गलतियाँ जो ग्रोथ रोकती हैं`,
        angle: '2. गलतियाँ और समाधान',
        description: `नए और अनुभवी क्रिएटर्स द्वारा की जाने वाली सामान्य गलतियों का समाधान।`,
        difficulty: 'Intermediate',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `मैंने 30 दिन ${subj} आज़माया: असली नतीजे और सीख`,
        angle: '3. 30-दिन का अनुभव',
        description: `असली चैलेंज, मुश्किलें और व्यावहारिक सीख पर आधारित केस स्टडी।`,
        difficulty: 'All Levels',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `पुराना तरीका बनाम स्मार्ट ${subj} वर्कफ़्लो`,
        angle: '4. सीधी तुलना',
        description: `बेहतर क्वालिटी और कम समय के लिए आधुनिक तरीके की तुलना।`,
        difficulty: 'Intermediate',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `कम बजट में ${subj} को प्रोफेशनल बनाने के 4 तरीके`,
        angle: '5. स्मार्ट ऑप्टिमाइजेशन',
        description: `बिना महंगे गियर के लगातार बेहतर वीडियो बनाने की आसान रणनीति।`,
        difficulty: isBeginner ? 'Beginner-Friendly' : 'Advanced',
        formatRecommendation,
        targetAudience: audience,
      },
    ];
  }

  // Advanced / Established Creator Tailored Ideas (English)
  if (isAdvanced) {
    return [
      {
        title: `Scaling ${toTitleCase(subj)}: Advanced Systems & Retention Blueprint`,
        angle: '1. Advanced Systems & Retention',
        description: `Architectural breakdown analyzing advanced retention metrics, drop-off fixes, and audience scaling for established channels.`,
        difficulty: 'Advanced / Scaling',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `The 3 Hidden Bottlenecks Capping Your ${toTitleCase(noun)} Growth`,
        angle: '2. Bottleneck Diagnostics',
        description: `Identifies non-obvious operational friction and workflow ceilings limiting performance at scale.`,
        difficulty: 'Pro Tactical',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `Case Study: Dissecting High-Performing ${toTitleCase(noun)} Systems`,
        angle: '3. Data & Case Study Breakdown',
        description: `Deconstructs proven real-world campaigns and content assets with exact structural tear-downs.`,
        difficulty: 'Advanced Analytics',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `System Automation: How to Streamline ${toTitleCase(profile.gerundPhrase)} by 40%`,
        angle: '4. Workflow Automation & Delegation',
        description: `Optimizing production pipelines, asset templating, and tooling to double output without burnout.`,
        difficulty: 'Advanced Workflow',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `High-Leverage ${toTitleCase(subj)} Strategies Most Creators Overlook`,
        angle: '5. Competitive Differentiation',
        description: `Deep strategic positioning tactics that build high audience moats and authority.`,
        difficulty: 'Mastery',
        formatRecommendation,
        targetAudience: audience,
      },
    ];
  }

  // Beginner / New Creator Tailored Ideas (English)
  if (isBeginner) {
    return [
      {
        title: `${toTitleCase(subj)} for Absolute Beginners: Step-by-Step Starter Guide`,
        angle: '1. Beginner Foundation & Onboarding',
        description: `Step-by-step introduction focused on first principles, basic setup, and quick early wins.`,
        difficulty: 'Beginner-Friendly',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `5 Simple Setup Steps to Master ${toTitleCase(noun)} (Zero Budget)`,
        angle: '2. Low-Barrier Quick Start',
        description: `No expensive gear or prior experience required — start immediately with accessible tools.`,
        difficulty: 'Foundational',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `7 Rookie Mistakes in ${toTitleCase(profile.gerundPhrase)} (And How to Avoid Them)`,
        angle: '3. Rookie Mistake Prevention',
        description: `Saves hours of frustration by steering clear of the top traps new creators fall into.`,
        difficulty: 'Beginner-Friendly',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `The Simple 2026 Checklist to ${toTitleCase(act)} From Scratch`,
        angle: '4. Practical Step-by-Step Checklist',
        description: `Clear, repeatable execution list designed to eliminate hesitation and build confidence.`,
        difficulty: 'Foundational',
        formatRecommendation,
        targetAudience: audience,
      },
      {
        title: `First 30 Days: How to Build Your Routine for ${toTitleCase(subj)}`,
        angle: '5. Habit & Milestone Blueprint',
        description: `A realistic 30-day pacing guide to stay consistent without burning out.`,
        difficulty: 'Beginner-Friendly',
        formatRecommendation,
        targetAudience: audience,
      },
    ];
  }

  // Default fallback progression (preserved for complete backward compatibility)
  return [
    {
      title: `${toTitleCase(subj)} for Absolute Beginners: Step-by-Step`,
      angle: '1. Beginner Tutorial & Onboarding',
      description: `Foundational breakdown designed for new creators starting from scratch.`,
      difficulty: 'Beginner',
      formatRecommendation,
      targetAudience: audience,
    },
    {
      title: `7 Mistakes That Stop You From ${toTitleCase(profile.gerundPhrase)}`,
      angle: '2. Common Mistakes & Pitfalls',
      description: `Identifies preventable bottlenecks that waste time and lower final video quality.`,
      difficulty: 'Intermediate',
      formatRecommendation,
      targetAudience: audience,
    },
    {
      title: `I Tested ${toTitleCase(noun)} for 30 Days (Real Lessons)`,
      angle: '3. Challenge & Real-World Experiment',
      description: `Practical personal case study documenting progress, unexpected hurdles, and findings.`,
      difficulty: 'All Levels',
      formatRecommendation,
      targetAudience: audience,
    },
    {
      title: `Old Way vs New Way of ${toTitleCase(profile.gerundPhrase)}`,
      angle: '4. Direct Comparison & Evolution',
      description: `Contrasts outdated habits against modern, streamlined workflows.`,
      difficulty: 'Intermediate',
      formatRecommendation,
      targetAudience: audience,
    },
    {
      title: `Advanced ${toTitleCase(subj)} Tips to Refine Your Workflow`,
      angle: '5. Advanced Optimization',
      description: `Deeper tactical adjustments for creators looking to improve efficiency and consistency.`,
      difficulty: 'Advanced',
      formatRecommendation,
      targetAudience: audience,
    },
  ];
}
