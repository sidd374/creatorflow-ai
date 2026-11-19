/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Title Intelligence Algorithm (Phase 2.2)
 * Generates high-impact, non-repetitive titles across multiple creative strategies:
 * - Curiosity & Information Gap
 * - Educational & Step-by-Step Tutorial
 * - Emotional & Narrative Case Study
 * - Direct Comparison & Contrast
 * - Problem-Solving & Mistake Avoidance
 *
 * Evaluates clarity, relevance, readability, and originality.
 * Enforces strict anti-repetition deduplication and transparent multi-factor scoring.
 * 100% Deterministic, zero external APIs.
 */

import { CreativeStrategyType } from './types';
import { StructuredTopicUnderstanding } from './topicUnderstanding';
import { TopicIntelligenceProfile } from './topicIntelligence';
import { calculateDiceCoefficient, calculateJaccardSimilarity } from './duplicateDetector';

export type TitleStrategyCategory =
  | 'curiosity'
  | 'educational'
  | 'emotional'
  | 'comparison'
  | 'problem_solving';

export interface EvaluatedTitle {
  title: string;
  category: TitleStrategyCategory;
  strategyLabel: string;
  charCount: number;
  wordCount: number;
  readabilityScore: number;     // 0-100: syllable complexity & length
  relevanceScore: number;       // 0-100: subject coverage
  clarityScore: number;         // 0-100: absence of punctuation clutter, direct syntax
  originalityScore: number;     // 0-100: distinctness from peer set
  compositeScore: number;       // 0-100: weighted composite
  explanations: string[];       // Transparent breakdown of why points were awarded/deducted
  predictedCtrTier: 'Exceptional' | 'Very Strong' | 'Strong';
}

/**
 * Capitalizes string into clean AP-style Title Case
 */
export function formatTitleCase(str: string): string {
  const minor = new Set(['for', 'on', 'in', 'at', 'to', 'a', 'an', 'the', 'and', 'with', 'of', 'vs', 'as', 'into', 'by']);
  return str
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      // Handle parentheses like "(Real Results)"
      if (word.startsWith('(') && word.length > 1) {
        return '(' + word.charAt(1).toUpperCase() + word.slice(2);
      }
      if (idx > 0 && minor.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Generates raw title candidates across 5 primary strategies
 */
export function generateRawTitlesByStrategy(
  topic: StructuredTopicUnderstanding,
  intelligence: TopicIntelligenceProfile,
  seed: number = 0
): Array<{ title: string; category: TitleStrategyCategory; label: string }> {
  const { subjectNoun, actionVerb, comparisons } = topic;
  const subj = subjectNoun || 'Content Creation';
  const act = actionVerb || 'master';
  const audience = intelligence.audience.label.toLowerCase();

  const results: Array<{ title: string; category: TitleStrategyCategory; label: string }> = [];

  // 1. Curiosity & Information Gap Strategy
  const curiosityTemplates = [
    `The Real Reason Most Creators Struggle With ${subj}`,
    `Why Nobody Is Talking About This ${subj} Secret`,
    `The Hidden Truth About ${subj} (What Actually Works)`,
    `What Really Happens When You Change Your ${subj}?`,
    `The Secret Behind High-Retention ${subj}`,
  ];
  results.push({
    title: curiosityTemplates[seed % curiosityTemplates.length],
    category: 'curiosity',
    label: 'Curiosity & Information Gap',
  });

  // 2. Educational & Step-by-Step Tutorial Strategy
  const educationalTemplates = [
    `How to ${act} ${subj}: Complete Step-by-Step Guide`,
    `${subj} Masterclass: From Beginner to Pro in 15 Minutes`,
    `7 Simple Steps to Master ${subj} Faster`,
    `The Ultimate ${subj} Blueprint for Consistent Results`,
    `How to ${act} ${subj} (Without Expensive Tools)`,
  ];
  results.push({
    title: educationalTemplates[(seed + 1) % educationalTemplates.length],
    category: 'educational',
    label: 'Educational & Step-by-Step',
  });

  // 3. Emotional & Narrative Case Study Strategy
  const emotionalTemplates = [
    `I Tested ${subj} for 30 Days (Here's What Happened)`,
    `The Brutal Truth About ${subj} After 100 Uploads`,
    `How I Finally Fixed My ${subj} (Real Lessons Learned)`,
    `I Wish I Knew This About ${subj} Before Starting`,
    `My Honest Experience With ${subj} (Zero Fluff)`,
  ];
  results.push({
    title: emotionalTemplates[(seed + 2) % emotionalTemplates.length],
    category: 'emotional',
    label: 'Emotional Narrative & Case Study',
  });

  // 4. Comparison & Contrast Strategy
  if (comparisons && comparisons.itemA && comparisons.itemB) {
    results.push({
      title: `${comparisons.itemA} vs ${comparisons.itemB}: The Brutally Honest Truth`,
      category: 'comparison',
      label: 'Direct Comparison & Head-to-Head',
    });
  } else {
    const comparisonTemplates = [
      `The Old Way vs The New Way to ${act} ${subj}`,
      `Cheap vs Professional ${subj}: Is It Worth Upgrading?`,
      `Doing ${subj} Manually vs The Smart Way (Real Comparison)`,
      `${subj}: What Beginners Do vs What Pros Do`,
    ];
    results.push({
      title: comparisonTemplates[(seed + 3) % comparisonTemplates.length],
      category: 'comparison',
      label: 'Comparison & Workflow Contrast',
    });
  }

  // 5. Problem-Solving & Mistake Avoidance Strategy
  const problemTemplates = [
    `Stop Making These 5 Costly ${subj} Mistakes`,
    `Why Your ${subj} Isn't Working (And How to Fix It)`,
    `The #1 Mistake That Is Ruining Your ${subj}`,
    `3 Simple Fixes for Your Biggest ${subj} Bottlenecks`,
    `Never Do This When You ${act} ${subj}`,
  ];
  results.push({
    title: problemTemplates[(seed + 4) % problemTemplates.length],
    category: 'problem_solving',
    label: 'Problem-Solving & Mistake Avoidance',
  });

  return results;
}

/**
 * Evaluates individual title candidate across clarity, relevance, readability, and originality
 */
export function evaluateTitleCandidate(
  title: string,
  category: TitleStrategyCategory,
  label: string,
  topic: StructuredTopicUnderstanding,
  peerTitles: string[]
): EvaluatedTitle {
  const clean = title.replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = clean.length;
  const explanations: string[] = [];

  // 1. Relevance Score (0-100)
  let relevanceScore = 75;
  const subjectWords = topic.subjectNoun.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let matchedWords = 0;
  for (const w of subjectWords) {
    if (lower.includes(w)) matchedWords++;
  }
  if (subjectWords.length > 0 && matchedWords > 0) {
    const matchPct = matchedWords / subjectWords.length;
    relevanceScore += Math.round(matchPct * 20);
    explanations.push(`+${Math.round(matchPct * 20)} pts: Directly includes target subject terms ("${topic.subjectNoun}").`);
  } else {
    explanations.push(`+0 pts: Indirect or generic subject alignment.`);
  }
  if (topic.actionVerb && lower.includes(topic.actionVerb.toLowerCase())) {
    relevanceScore += 5;
    explanations.push(`+5 pts: Reinforces core creator intent action ("${topic.actionVerb}").`);
  }
  relevanceScore = Math.min(100, Math.max(40, relevanceScore));

  // 2. Readability Score (0-100)
  let readabilityScore = 80;
  if (wordCount >= 6 && wordCount <= 14) {
    readabilityScore += 12;
    explanations.push(`+12 pts: Optimal scannable word count (${wordCount} words).`);
  } else if (wordCount > 18) {
    readabilityScore -= 15;
    explanations.push(`-15 pts: Word count is heavy (${wordCount} words), causing visual fatigue.`);
  } else if (wordCount < 5) {
    readabilityScore -= 10;
    explanations.push(`-10 pts: Too abrupt or underspecified (${wordCount} words).`);
  }
  readabilityScore = Math.min(100, Math.max(30, readabilityScore));

  // 3. Clarity & Structure Score (0-100)
  let clarityScore = 85;
  if (charCount >= 42 && charCount <= 68) {
    clarityScore += 10;
    explanations.push(`+10 pts: Optimal character density (${charCount} chars) avoids mobile truncation.`);
  } else if (charCount > 72) {
    clarityScore -= 15;
    explanations.push(`-15 pts: Exceeds 72 characters (${charCount} chars); risk of truncation on mobile YouTube feeds.`);
  } else if (charCount < 30) {
    clarityScore -= 10;
    explanations.push(`-10 pts: Under 30 characters (${charCount} chars); lacking descriptive context.`);
  }

  // Check for punctuation hygiene
  if (/[!?]{2,}/.test(clean)) {
    clarityScore -= 10;
    explanations.push(`-10 pts: Overly aggressive multiple punctuation detected.`);
  }
  clarityScore = Math.min(100, Math.max(30, clarityScore));

  // 4. Originality & Cliché Score (0-100)
  let originalityScore = 85;
  // Calculate max similarity against other generated titles
  let maxSimilarity = 0;
  for (const peer of peerTitles) {
    if (peer === clean) continue;
    const dice = calculateDiceCoefficient(clean, peer);
    if (dice > maxSimilarity) maxSimilarity = dice;
  }
  if (maxSimilarity > 0.65) {
    originalityScore -= 20;
    explanations.push(`-20 pts: Significant vocabulary overlap with alternative recommendations (${Math.round(maxSimilarity * 100)}% match).`);
  } else if (maxSimilarity < 0.40) {
    originalityScore += 10;
    explanations.push(`+10 pts: Distinct angle and phrasing compared to other title options.`);
  }
  originalityScore = Math.min(100, Math.max(30, originalityScore));

  // Composite Calculation
  // Weights: Relevance 30%, Readability 25%, Clarity 25%, Originality 20%
  const composite = Math.round(
    relevanceScore * 0.30 +
    readabilityScore * 0.25 +
    clarityScore * 0.25 +
    originalityScore * 0.20
  );
  const compositeScore = Math.min(98, Math.max(50, composite));

  const predictedCtrTier: 'Exceptional' | 'Very Strong' | 'Strong' =
    compositeScore >= 90 ? 'Exceptional' : compositeScore >= 80 ? 'Very Strong' : 'Strong';

  return {
    title: formatTitleCase(clean),
    category,
    strategyLabel: label,
    charCount,
    wordCount,
    readabilityScore,
    relevanceScore,
    clarityScore,
    originalityScore,
    compositeScore,
    explanations,
    predictedCtrTier,
  };
}

/**
 * Generates, ranks, and deduplicates title candidates
 */
export function generateIntelligentTitles(
  topic: StructuredTopicUnderstanding,
  intelligence: TopicIntelligenceProfile,
  seed: number = 0,
  count: number = 5
): EvaluatedTitle[] {
  const rawList = generateRawTitlesByStrategy(topic, intelligence, seed);
  const allTexts = rawList.map((r) => r.title);

  const evaluated = rawList.map((item) =>
    evaluateTitleCandidate(item.title, item.category, item.label, topic, allTexts)
  );

  // Strict deduplication pass: filter out titles that share > 0.70 Dice coefficient
  const nonRepetitive: EvaluatedTitle[] = [];
  for (const candidate of evaluated) {
    const isDuplicate = nonRepetitive.some(
      (existing) => calculateDiceCoefficient(existing.title, candidate.title) > 0.70
    );
    if (!isDuplicate) {
      nonRepetitive.push(candidate);
    }
  }

  // Sort by composite score descending
  nonRepetitive.sort((a, b) => b.compositeScore - a.compositeScore);

  return nonRepetitive.slice(0, count);
}
