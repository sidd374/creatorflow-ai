/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Candidate Generation and Multi-Factor Ranking Engine
 * Evaluates candidate outputs using normalized, transparent scoring criteria (0–100).
 *
 * Explicit Notice: CreatorFlow Scores reflect heuristic structural alignment,
 * readability, clarity, and platform constraint adherence. They do NOT guarantee
 * views, clicks, algorithm promotion, or revenue.
 */

import {
  CandidateOutput,
  CandidateQualityBreakdown,
  CreativeStrategyType,
  UserGenerationPreferences,
} from './types';
import { StructuredTopicUnderstanding } from './topicUnderstanding';
import { PlatformFormatSpecification } from './knowledgeRetrieval';

export const SCORE_DISCLAIMER =
  'Scores reflect heuristic alignment with formatting guidelines, clarity, and vocabulary density. They do not predict or guarantee views, click-through rate, or revenue.';

/**
 * Computes individual component scores for a candidate draft
 */
export function scoreCandidate(
  text: string,
  strategy: CreativeStrategyType,
  understanding: StructuredTopicUnderstanding,
  platformSpec: PlatformFormatSpecification,
  originalityScore: number,
  preferences?: UserGenerationPreferences
): CandidateQualityBreakdown {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const charLen = clean.length;
  const wordCount = clean.split(/\s+/).filter(Boolean).length;

  // 1. Topic Relevance Score (0-100)
  // Evaluates coverage of subject keywords and action verb
  let relevanceScore = 70;
  const subjectWords = understanding.subjectNoun.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let matchedSubjectWords = 0;
  for (const w of subjectWords) {
    if (lower.includes(w)) matchedSubjectWords++;
  }
  if (subjectWords.length > 0) {
    relevanceScore += Math.min(25, Math.round((matchedSubjectWords / subjectWords.length) * 25));
  }
  if (understanding.actionVerb && lower.includes(understanding.actionVerb.toLowerCase())) {
    relevanceScore += 5;
  }
  relevanceScore = Math.min(100, Math.max(40, relevanceScore));

  // 2. Clarity & Readability Score (0-100)
  // Penalizes run-on sentences, awkward punctuation, or excessively long words
  let clarityScore = 80;
  if (wordCount >= 5 && wordCount <= 22) {
    clarityScore += 10;
  } else if (wordCount > 30) {
    clarityScore -= 15;
  } else if (wordCount < 4) {
    clarityScore -= 10;
  }
  // Penalize excessive exclamation marks or all-caps shouting
  const exclamationCount = (clean.match(/!/g) || []).length;
  if (exclamationCount > 2) clarityScore -= 10;
  if (clean === clean.toUpperCase() && clean.length > 10) clarityScore -= 20;
  clarityScore = Math.min(100, Math.max(40, clarityScore));

  // 3. Specificity Score (0-100)
  // Rewards numbers, concrete nouns, actionable steps; penalizes vague hand-waving
  let specificityScore = 75;
  if (/\b\d+\b/.test(clean)) specificityScore += 10; // Contains concrete number
  if (/\b(step|guide|secret|mistake|reason|framework|vs|tested|proof)\b/i.test(lower)) {
    specificityScore += 10;
  }
  if (/\b(things|stuff|good|nice|awesome|very|really)\b/i.test(lower)) {
    specificityScore -= 8;
  }
  specificityScore = Math.min(100, Math.max(30, specificityScore));

  // 4. Platform Suitability Score (0-100)
  // Checks optimal character length according to platform specs
  let platformScore = 80;
  const { minChars, maxChars, recommendedChars } = platformSpec.titleOptimalLength;
  if (charLen >= minChars && charLen <= maxChars) {
    platformScore += 15;
    // Extra bonus if near sweet spot (+- 8 chars)
    if (Math.abs(charLen - recommendedChars) <= 8) {
      platformScore += 5;
    }
  } else if (charLen > maxChars + 15) {
    platformScore -= 20; // Mobile truncation penalty
  } else if (charLen < minChars - 10) {
    platformScore -= 15; // Too brief / vague
  }
  platformScore = Math.min(100, Math.max(35, platformScore));

  // 5. Grammar & Syntax Score (0-100)
  let grammarScore = 90;
  if (/\b(\w+)\s+\1\b/i.test(lower)) grammarScore -= 25; // Repeated word
  if (/\bdo\s+(?:grow|make|edit|create)\b/i.test(lower)) grammarScore -= 30; // Grammar glitch
  if (/[\?\.!]{3,}/.test(clean)) grammarScore -= 10;
  grammarScore = Math.min(100, Math.max(30, grammarScore));

  // 6. User Preference Bonus (-10 to +10)
  let preferenceBonus = 0;
  if (preferences?.favoriteStrategies?.includes(strategy)) {
    preferenceBonus += 8;
  }
  if (preferences?.dislikedStrategies?.includes(strategy)) {
    preferenceBonus -= 15;
  }

  // 7. Composite Weighted Score
  // Weights: Relevance 25%, Clarity 20%, Specificity 15%, Platform 15%, Grammar 15%, Originality 10%
  const composite = Math.round(
    relevanceScore * 0.25 +
      clarityScore * 0.20 +
      specificityScore * 0.15 +
      platformScore * 0.15 +
      grammarScore * 0.15 +
      originalityScore * 0.10 +
      preferenceBonus
  );

  const totalScore = Math.min(99, Math.max(45, composite));

  const explanations: string[] = [
    `Relevance (${relevanceScore}/100): ${relevanceScore >= 80 ? 'Directly addresses target subject keywords.' : 'Partial topic keyword overlap.'}`,
    `Clarity (${clarityScore}/100): ${clarityScore >= 80 ? 'Clean scannable word density and direct syntax.' : 'Minor word count or punctuation imbalance.'}`,
    `Specificity (${specificityScore}/100): ${specificityScore >= 80 ? 'Features concrete numbers, triggers, or actionable framing.' : 'Contains general framing.'}`,
    `Platform Fit (${platformScore}/100): ${platformScore >= 80 ? 'Character count fits within optimal YouTube mobile viewing boundaries.' : 'Exceeds or falls below optimal character boundaries.'}`,
    `Originality (${originalityScore}/100): ${originalityScore >= 80 ? 'Distinct formulation distinct from peer alternatives.' : 'Moderate semantic overlap.'}`,
    `Grammar (${grammarScore}/100): ${grammarScore >= 85 ? 'Pristine punctuation and syntax.' : 'Minor structural repetition.'}`,
  ];
  if (preferenceBonus !== 0) {
    explanations.push(`Personalization Adjustment: ${preferenceBonus > 0 ? `+${preferenceBonus}` : preferenceBonus} pts based on user feedback.`);
  }

  return {
    relevanceScore,
    clarityScore,
    specificityScore,
    platformScore,
    originalityScore,
    grammarScore,
    preferenceBonus,
    totalScore,
    explanations,
    scoreDisclaimer: SCORE_DISCLAIMER,
  };
}

/**
 * Sorts and ranks candidates by composite quality score
 */
export function rankCandidates<T>(candidates: CandidateOutput<T>[]): CandidateOutput<T>[] {
  return [...candidates].sort((a, b) => b.scores.totalScore - a.scores.totalScore);
}
