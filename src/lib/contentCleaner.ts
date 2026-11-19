/**
 * CreatorFlow AI — Phase 2.2 Content Quality & Credibility Filter Pipeline
 * Strips robotic/corporate jargon, enforces creator-native vocabulary,
 * removes unsupported claims, ensures grammar safety and natural flow.
 */

import { ContentPack, TitleResult, HookResult } from '../types';
import { TopicProfile, toTitleCase } from './topicAnalyzer';

// -------------------------------------------------------------
// 1. JARGON & CORPORATE BUZZWORD REPLACEMENTS
// -------------------------------------------------------------
const JARGON_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bprimary core action\b/gi, 'main step'],
  [/\bcore variable\b/gi, 'key factor'],
  [/\bcore lever\b/gi, 'main focus'],
  [/\beffective workflow\b/gi, 'simple workflow'],
  [/\bcontent optimization workflow\b/gi, 'video creation process'],
  [/\boutput optimization\b/gi, 'making better videos'],
  [/\bexecution framework\b/gi, 'practical plan'],
  [/\brecommended method\b/gi, 'proven approach'],
  [/\brecommended approach\b/gi, 'useful approach'],
  [/\bimplementation process\b/gi, 'putting this into practice'],
  [/\bstep-by-step implementation\b/gi, 'step-by-step walkthrough'],
  [/\boptimization process\b/gi, 'making improvements'],
  [/\bstrategic execution\b/gi, 'smart planning'],
  [/\bcontent performance methodology\b/gi, 'how to get more views'],
  [/\baudience engagement strategy framework\b/gi, 'keeping viewers interested'],
  [/\bfinal results\b/gi, 'final video'],
  [/\bfinal outcome\b/gi, 'end result'],
  [/\boptimal execution\b/gi, 'doing this well'],
  [/\bhigh-stakes promise\b/gi, 'clear promise'],
  [/\bcuriosity loop\b/gi, 'curiosity question'],
  [/\bpattern interrupt\b/gi, 'hook'],
  [/\bmethodology explained\b/gi, 'the method explained'],
  [/\bprimary fundamental\b/gi, 'core basics'],
  [/\btraditional methods struggle\b/gi, 'most people get stuck'],
  [/\bwithout further ado\b/gi, "let's get right into it"],
  [/\bdive deep into\b/gi, 'look closely at'],
  [/\bdeep dive\b/gi, 'breakdown'],
  [/\bgame[- ]changer\b/gi, 'major upgrade'],
  [/\bgame[- ]changing\b/gi, 'practical'],
  [/\brevolutionize\b/gi, 'improve'],
  [/\bin today's fast-paced world\b/gi, 'today'],
  [/\bin this video we will discuss\b/gi, 'in this video we cover'],
  [/\bskyrocket\b/gi, 'increase'],
  [/\bskyrocketing\b/gi, 'growing'],
  [/\bskyrocket(?:ing)? your ctr\b/gi, 'improve your click-through rate'],
  [/\bunlock the secret(?:s)?\b/gi, 'learn the steps'],
];

// -------------------------------------------------------------
// 2. UNSUPPORTED CLAIMS & CLICKBAIT REDUCTIONS
// -------------------------------------------------------------
const CREDIBILITY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b(?:guaranteed|guarantee)\s+(?:viral|views|success|growth)\b/gi, 'can help improve your results'],
  [/\b(?:secret\s+)?hacks\s+used\s+by\s+top\s+creators\s+in\s+2026\b/gi, 'practical tips used by experienced creators'],
  [/\bsecret\s+hacks?\b/gi, 'practical tips'],
  [/\bused\s+by\s+the\s+top\s+1%\b/gi, 'used by consistent creators'],
  [/\bthe\s+algorithm\s+will\s+(?:reward|boost|love)\s+this\b/gi, 'this helps keep viewers watching longer'],
  [/\bsignals?\s+the\s+(?:recommendation\s+)?algorithm\b/gi, 'helps viewers understand your video'],
  [/\byoutube(?:'s)?\s+algorithm\s+secrets?\b/gi, 'how YouTube recommendations work'],
  [/\byoutube\s+officially\s+recommends?\b/gi, 'many creators find effective'],
];

// -------------------------------------------------------------
// 3. HUMAN LANGUAGE & GRAMMAR CLEANUP FUNCTION
// -------------------------------------------------------------
export function cleanHumanLanguage(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Replace robotic corporate jargon
  for (const [pattern, replacement] of JARGON_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // 2. Replace exaggerated/unsupported claims
  for (const [pattern, replacement] of CREDIBILITY_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // 3. Clean up awkward intro colon patterns without breaking structured titles or timestamps
  cleaned = cleaned.replace(/\b(approach to|methods for|guide for|covering|breakdown for|regarding):\s+([a-zA-Z])/gi, '$1 $2');

  // 4. Remove ugly parenthetical verb artifacts: "Sourdough (Bake)" -> "Sourdough"
  cleaned = cleaned.replace(/\s*\((?:bake|edit|grow|make|build|create|start|scale|film)\)/gi, '');

  // 5. Fix doubled words ("the the", "in in", "to to", "of of", "and and")
  cleaned = cleaned.replace(/\b([a-zA-Z]{2,})\s+\1\b/gi, '$1');

  // 6. Fix "Do + Verb" artifacts like "Do Grow", "Do Edit"
  cleaned = cleaned.replace(/\bdo\s+(grow|edit|make|build|create)\b/gi, '$1');

  // 7. Fix spaces and whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();

  return cleaned;
}

// -------------------------------------------------------------
// 4. SCORE CALIBRATION (Strict, realistic range 70-96)
// -------------------------------------------------------------
export function calibrateCreatorScore(
  title: string,
  isGrammatical: boolean,
  hasNumbers: boolean,
  isSpecific: boolean,
  seed: number
): number {
  if (!isGrammatical) {
    return Math.floor(58 + (seed % 10));
  }

  let score = 78;
  const len = title.length;

  // Length calibration: sweet spot is 42-62 chars
  if (len >= 42 && len <= 65) {
    score += 5;
  } else if (len > 72) {
    score -= 6;
  } else if (len < 30) {
    score -= 5;
  }

  // Numbers boost specificity
  if (hasNumbers || /\b\d+\b/.test(title)) {
    score += 4;
  }

  // Curiosity or hook triggers
  if (/why|how to|stop|what|vs|real reason|mistakes|simple|tested/i.test(title)) {
    score += 4;
  }

  if (isSpecific) {
    score += 3;
  }

  const jitter = (seed * 3) % 4;
  const finalScore = Math.min(95, Math.max(72, score + jitter));
  return finalScore;
}

// -------------------------------------------------------------
// 5. SURGICAL CLEANUP PIPELINE FOR THE ENTIRE CONTENT PACK
// -------------------------------------------------------------
export function cleanContentPack(pack: ContentPack, profile: TopicProfile): ContentPack {
  // 1. Clean Titles
  const cleanedTitles: TitleResult[] = pack.titles.map((t, idx) => {
    let text = cleanHumanLanguage(t.text);

    // Remove any trailing period or double question marks
    text = text.replace(/\.+$/, '').replace(/\?{2,}/g, '?').trim();

    // Ensure title case for English
    if (!profile.isTanglishOrTamil && !profile.isHindiOrHinglish) {
      text = toTitleCase(text);
    }

    const charCount = text.length;
    const score: number =
      typeof t.score === 'number' && t.score > 0
        ? t.score
        : calibrateCreatorScore(
            text,
            true,
            /\b\d+\b/.test(text),
            profile.keywords.length > 2,
            (pack.variationSeed || 0) + idx
          );

    return {
      text,
      style: cleanHumanLanguage(t.style),
      charCount,
      score,
      predictedCtr: `${(score / 10).toFixed(1)}%`,
      explanations: t.explanations,
      scoreDisclaimer: t.scoreDisclaimer,
    };
  });

  // Deduplicate titles if any identical exist (Unicode-safe)
  const uniqueTitles: TitleResult[] = [];
  const seenTitles = new Set<string>();
  for (const t of cleanedTitles) {
    const key = t.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (key && !seenTitles.has(key)) {
      seenTitles.add(key);
      uniqueTitles.push(t);
    }
  }

  // 2. Clean Hooks
  const cleanedHooks: HookResult[] = pack.hooks.map(h => ({
    type: cleanHumanLanguage(h.type),
    hook: cleanHumanLanguage(h.hook),
    deliveryTip: cleanHumanLanguage(h.deliveryTip),
    retentionReason: cleanHumanLanguage(h.retentionReason || ''),
  }));

  // 3. Clean Description
  const cleanedDescription = {
    hookLine: cleanHumanLanguage(pack.description.hookLine),
    summary: cleanHumanLanguage(pack.description.summary),
    valuePoints: (pack.description.valuePoints || []).map(p => cleanHumanLanguage(p)),
    timestamps: pack.description.timestamps.map(ts => ({
      time: ts.time,
      label: cleanHumanLanguage(ts.label),
    })),
    linksPlaceholder: pack.description.linksPlaceholder,
    callToAction: cleanHumanLanguage(pack.description.callToAction),
  };

  // 4. Clean Keywords (deduplicate and sanitize)
  const cleanedKeywords = Array.from(
    new Set(
      pack.keywords
        .map(k => cleanHumanLanguage(k).replace(/[#,\.\?]/g, '').trim())
        .filter(k => k.length >= 3)
    )
  ).slice(0, 14);

  // 5. Clean Hashtags (preserve Unicode scripts like Tamil/Hindi while ensuring '#')
  const cleanedHashtags = Array.from(
    new Set(
      pack.hashtags
        .map(tag => {
          let clean = tag.replace(/[^\p{L}\p{N}_#]/gu, '');
          if (!clean || clean === '#') return '';
          if (!clean.startsWith('#')) clean = `#${clean}`;
          return clean;
        })
        .filter(Boolean)
    )
  ).slice(0, 10);

  // 6. Clean Shorts Script
  const cleanedShortsScript = {
    title: cleanHumanLanguage(pack.shortsScript.title),
    duration: pack.shortsScript.duration,
    hook: cleanHumanLanguage(pack.shortsScript.hook),
    body: pack.shortsScript.body.map(item => ({
      second: item.second,
      visual: cleanHumanLanguage(item.visual),
      audio: cleanHumanLanguage(item.audio),
    })),
    cta: cleanHumanLanguage(pack.shortsScript.cta),
  };

  // 7. Clean Pinned Comment
  const cleanedPinnedComment = {
    comment: cleanHumanLanguage(pack.pinnedComment.comment),
    engagementQuestion: cleanHumanLanguage(pack.pinnedComment.engagementQuestion),
    boostTip: cleanHumanLanguage(pack.pinnedComment.boostTip),
  };

  // 8. Clean Thumbnail Concept
  const cleanedThumbnailConcept = {
    ...pack.thumbnailConcept,
    composition: cleanHumanLanguage(pack.thumbnailConcept.composition),
    focalPoint: cleanHumanLanguage(pack.thumbnailConcept.focalPoint),
    background: pack.thumbnailConcept.background ? cleanHumanLanguage(pack.thumbnailConcept.background) : undefined,
    facialExpression: cleanHumanLanguage(pack.thumbnailConcept.facialExpression),
    visualContrast: pack.thumbnailConcept.visualContrast ? cleanHumanLanguage(pack.thumbnailConcept.visualContrast) : undefined,
    psychologicalTrigger: cleanHumanLanguage(pack.thumbnailConcept.psychologicalTrigger),
    overlayOptions: pack.thumbnailConcept.overlayOptions
      ? pack.thumbnailConcept.overlayOptions.map(o => cleanHumanLanguage(o))
      : undefined,
  };

  // 9. Clean Video Ideas
  const cleanedVideoIdeas = (pack.videoIdeas || []).map(item => ({
    title: cleanHumanLanguage(item.title),
    angle: cleanHumanLanguage(item.angle),
    description: cleanHumanLanguage(item.description),
    difficulty: item.difficulty ? cleanHumanLanguage(item.difficulty) : undefined,
    formatRecommendation: item.formatRecommendation ? cleanHumanLanguage(item.formatRecommendation) : undefined,
    targetAudience: item.targetAudience ? cleanHumanLanguage(item.targetAudience) : undefined,
  }));

  return {
    ...pack,
    titles: uniqueTitles.length >= 3 ? uniqueTitles : cleanedTitles,
    hooks: cleanedHooks,
    description: cleanedDescription,
    keywords: cleanedKeywords,
    hashtags: cleanedHashtags,
    shortsScript: cleanedShortsScript,
    pinnedComment: cleanedPinnedComment,
    thumbnailConcept: cleanedThumbnailConcept,
    videoIdeas: cleanedVideoIdeas,
  };
}
