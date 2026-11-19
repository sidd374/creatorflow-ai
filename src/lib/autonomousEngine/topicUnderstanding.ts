/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Topic Understanding & Linguistic Decomposition Engine
 * Analyzes raw creator topics into structured semantic representations.
 * Zero external APIs, deterministic linguistic parsing.
 */

import { SupportedLanguage } from './types';

export type DetectedIntent =
  | 'tutorial'          // "How to edit video", "Step by step guide"
  | 'comparison'        // "X vs Y", "Which one is better"
  | 'mistake_warning'   // "Avoid these mistakes", "Stop doing this"
  | 'curiosity_inquiry' // "Why X happens", "The real truth about X"
  | 'recommendation'    // "Best tools for creators", "Top 5 gadgets"
  | 'story_case_study'  // "How I reached 100k", "My journey"
  | 'contrarian'        // "Why X is dead", "Don't buy Y"
  | 'deep_dive';        // Comprehensive breakdown

export type DetectedDomain =
  | 'creator_economy'
  | 'tech_and_coding'
  | 'ai_and_automation'
  | 'finance_and_business'
  | 'health_and_fitness'
  | 'gaming_and_entertainment'
  | 'education_and_career'
  | 'lifestyle_and_vlog'
  | 'general';

export interface StructuredTopicUnderstanding {
  rawTopic: string;
  cleanedTopic: string;
  domain: DetectedDomain;
  intent: DetectedIntent;
  subjectNoun: string;
  actionVerb: string;
  targetAudience: string;
  detectedLanguage: SupportedLanguage;
  isTamilScript: boolean;
  isHindiScript: boolean;
  isTanglish: boolean;
  subtopics: string[];
  keyConcepts: string[];
  namedEntities: string[];
  comparisons?: { itemA: string; itemB: string };
  numbersExtracted: number[];
  ambiguityScore: number; // 0 = very clear, 100 = highly ambiguous
  factualRequirements: string[];
}

// Common domain dictionaries for classification
const DOMAIN_KEYWORDS: Record<DetectedDomain, RegExp[]> = {
  ai_and_automation: [
    /\b(ai|artificial intelligence|chatgpt|gemini|claude|llm|midjourney|prompt|automation|bot|deepfake|machine learning)\b/i,
  ],
  creator_economy: [
    /\b(youtube|creator|subscribers|views|ctr|channel|shorts|reels|tiktok|vlog|algorithm|thumbnail|retention|editing|capcut|premiere)\b/i,
  ],
  tech_and_coding: [
    /\b(coding|programming|python|javascript|react|typescript|software|developer|github|api|web development|frontend|backend)\b/i,
  ],
  finance_and_business: [
    /\b(money|invest(?:ing|ment|or|s)?|stocks?|crypto|bitcoin|passive income|business|finance|wealth|budget|side hustle|sales|revenue|rupees?|funds?|mutual funds?|index funds?|shares?|trading|earn(?:ing)?|dividends?)\b/i,
  ],
  health_and_fitness: [
    /\b(workout|gym|fitness|diet|weight loss|muscle|nutrition|exercise|calisthenics|sleep|health|protein)\b/i,
  ],
  gaming_and_entertainment: [
    /\b(gaming|minecraft|gta|playstation|xbox|esports|gameplay|streamer|twitch|walkthrough)\b/i,
  ],
  education_and_career: [
    /\b(study|student|exam|college|career|interview|productivity|resume|learn|degree|scholarship)\b/i,
  ],
  lifestyle_and_vlog: [
    /\b(daily routine|travel|minimalism|cooking|recipe|morning routine|vlog|house tour|organization)\b/i,
  ],
  general: [],
};

const TANGLISH_MARKERS = [
  /\b(pannunga|pannalam|irukku|teriyuma|ungala|paathingala|epdi|solren|seiyunga|romba|vanga|ponga|kuda|idhu|adhu)\b/i,
];

/**
 * Normalizes text and strips excessive punctuation and spaces
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[<>'"`;]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts action verbs and converts to canonical infinitive
 */
function extractActionAndSubject(text: string): { action: string; subject: string } {
  const lower = text.toLowerCase();

  // Pattern: "how to [verb] [subject]"
  const howToMatch = lower.match(/\bhow to\s+([a-z]+)\s+(.+)/i);
  if (howToMatch) {
    return {
      action: howToMatch[1] || 'build',
      subject: sanitizeInput(howToMatch[2] || 'workflow'),
    };
  }

  // Pattern: "[verb] [subject]" at start
  const directVerbMatch = lower.match(/^(grow|build|create|start|make|edit|scale|earn|learn|fix|master)\s+(.+)/i);
  if (directVerbMatch) {
    return {
      action: directVerbMatch[1] || 'create',
      subject: sanitizeInput(directVerbMatch[2] || 'content'),
    };
  }

  return {
    action: 'master',
    subject: text.trim() || 'Content Creation',
  };
}

/**
 * Core analysis engine
 */
export function analyzeTopicSemantics(
  topicInput: string,
  preferredLang: SupportedLanguage = 'English',
  preferredAudience?: string
): StructuredTopicUnderstanding {
  const cleaned = sanitizeInput(topicInput);
  const lower = cleaned.toLowerCase();

  // 1. Script & Language Analysis
  const isTamilScript = /[\u0B80-\u0BFF]/.test(cleaned);
  const isHindiScript = /[\u0900-\u097F]/.test(cleaned);
  const isTanglish =
    !isTamilScript &&
    (preferredLang === 'Tanglish' ||
      TANGLISH_MARKERS.some((rgx) => rgx.test(lower)) ||
      /\b(tamil|tanglish)\b/i.test(lower));

  let detectedLanguage: SupportedLanguage = preferredLang;
  if (isTamilScript) detectedLanguage = 'Tamil';
  else if (isHindiScript) detectedLanguage = 'Hindi';
  else if (isTanglish) detectedLanguage = 'Tanglish';

  // 2. Domain Classification
  let detectedDomain: DetectedDomain = 'general';
  for (const [domain, regexes] of Object.entries(DOMAIN_KEYWORDS)) {
    if (regexes.some((rgx) => rgx.test(lower))) {
      detectedDomain = domain as DetectedDomain;
      break;
    }
  }

  // 3. Intent Classification
  let detectedIntent: DetectedIntent = 'tutorial';
  let comparisons: { itemA: string; itemB: string } | undefined;

  const vsMatch = cleaned.match(/([a-zA-Z0-9\s]+?)\s+(?:vs\.?|versus|compared to)\s+([a-zA-Z0-9\s]+)/i);
  if (vsMatch && vsMatch[1] && vsMatch[2]) {
    detectedIntent = 'comparison';
    let cleanItemA = vsMatch[1].trim().replace(/^(?:which\s+is\s+better|is|the)\s+/i, '').trim();
    let cleanItemB = vsMatch[2].trim().replace(/\s+(?:for\s+.+|in\s+\d{4}|which\s+is\s+better|explained)$/i, '').trim();

    comparisons = {
      itemA: cleanItemA,
      itemB: cleanItemB,
    };
  } else if (/\b(mistake|avoid|never|stop doing|worst|warning|danger)\b/i.test(lower)) {
    detectedIntent = 'mistake_warning';
  } else if (/\b(why|secret|truth|actually|hidden|what happens|real reason)\b/i.test(lower)) {
    detectedIntent = 'curiosity_inquiry';
  } else if (/\b(best|top\s*\d+|review|tools|gadgets|apps|recommend)\b/i.test(lower)) {
    detectedIntent = 'recommendation';
  } else if (/\b(my journey|how i|story|case study|results|from 0 to|tested)\b/i.test(lower)) {
    detectedIntent = 'story_case_study';
  } else if (/\b(is dead|waste of time|overrated|unpopular opinion|don't buy)\b/i.test(lower)) {
    detectedIntent = 'contrarian';
  } else if (/\b(complete guide|masterclass|everything you need|deep dive)\b/i.test(lower)) {
    detectedIntent = 'deep_dive';
  } else {
    detectedIntent = 'tutorial';
  }

  // 4. Extract Numbers & Entities
  const numbersExtracted = (cleaned.match(/\b\d+\b/g) || []).map((n) => parseInt(n, 10));

  // 5. Subject & Action Breakdown
  const { action, subject } = extractActionAndSubject(cleaned);

  // 6. Audience Determination
  let targetAudience = preferredAudience || 'ambitious creators';
  if (/\b(beginner|start|from scratch|newbie|basics|101)\b/i.test(lower)) {
    targetAudience = 'beginners starting with zero experience';
  } else if (/\b(advanced|pro|scale|automation|agency)\b/i.test(lower)) {
    targetAudience = 'experienced creators looking to scale';
  } else if (/\b(students|college|teens)\b/i.test(lower)) {
    targetAudience = 'students and learners';
  }

  // 7. Subtopics and Key Concepts
  const words = cleaned
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !/^(with|from|that|this|what|have|your|about|into)$/i.test(w));

  const keyConcepts = Array.from(new Set([subject, action, ...words])).slice(0, 6);
  const subtopics = [
    `Common stumbling blocks in ${subject}`,
    `Step-by-step workflow for ${action}ing effectively`,
    `Tooling & practical setup`,
    `Real-world benchmarks & verification`,
  ];

  // 8. Factual Requirements (Identify claims that require verification)
  const factualRequirements: string[] = [];
  if (detectedIntent === 'comparison' && comparisons) {
    factualRequirements.push(`Verify direct feature differences between ${comparisons.itemA} and ${comparisons.itemB}`);
  }
  if (numbersExtracted.length > 0) {
    factualRequirements.push(`Verify context of extracted numbers (${numbersExtracted.join(', ')})`);
  }
  if (detectedDomain === 'finance_and_business') {
    factualRequirements.push('Include clear disclaimer: Educational analysis, not financial advice');
  }

  // 9. Ambiguity Score
  let ambiguityScore = 10;
  if (cleaned.length < 10) ambiguityScore += 40;
  if (words.length <= 2) ambiguityScore += 25;
  if (detectedDomain === 'general') ambiguityScore += 15;

  return {
    rawTopic: topicInput,
    cleanedTopic: cleaned,
    domain: detectedDomain,
    intent: detectedIntent,
    subjectNoun: subject,
    actionVerb: action,
    targetAudience,
    detectedLanguage,
    isTamilScript,
    isHindiScript,
    isTanglish,
    subtopics,
    keyConcepts,
    namedEntities: comparisons ? [comparisons.itemA, comparisons.itemB] : [subject],
    comparisons,
    numbersExtracted,
    ambiguityScore: Math.min(100, ambiguityScore),
    factualRequirements,
  };
}
