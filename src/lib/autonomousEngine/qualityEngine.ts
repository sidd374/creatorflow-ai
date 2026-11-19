/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Holistic Quality Engine (Phase 4)
 * Evaluates generated candidate outputs across 7 core quality dimensions:
 * 1. Topic Relevance
 * 2. Audience Relevance
 * 3. Originality
 * 4. Clarity
 * 5. Readability
 * 6. Repetition & Duplication
 * 7. Language Quality
 *
 * Enforces deterministic rejection and automatic rule-based revision.
 * Zero random numbers, zero simulation. 100% Deterministic evaluation.
 */

import { StructuredTopicUnderstanding } from './topicUnderstanding';
import { TopicIntelligenceProfile } from './topicIntelligence';
import { calculateDiceCoefficient } from './duplicateDetector';
import { evaluateLanguageQuality, LanguageEvaluationReport } from './languageIntelligence';

export interface QualityEvaluationDimension {
  name: string;
  score: number;         // 0-100
  weight: number;        // e.g. 0.20
  passed: boolean;
  notes: string;
}

export interface HolisticQualityResult {
  passedQualityGate: boolean;
  compositeQualityScore: number; // 0-100
  dimensions: QualityEvaluationDimension[];
  languageReport: LanguageEvaluationReport;
  recommendedAction: 'accept' | 'revise' | 'reject';
  reasons: string[];
}

/**
 * Evaluates any generated asset draft against holistic quality criteria
 */
export function evaluateOutputQuality(
  text: string,
  topic: StructuredTopicUnderstanding,
  intelligence: TopicIntelligenceProfile,
  language: string = 'English',
  priorOutputs: string[] = []
): HolisticQualityResult {
  const clean = text.replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const reasons: string[] = [];

  // 1. Topic Relevance (Weight: 20%)
  let topicScore = 75;
  const subjWords = topic.subjectNoun.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let matchedSubj = 0;
  for (const w of subjWords) {
    if (lower.includes(w)) matchedSubj++;
  }
  if (subjWords.length > 0) {
    topicScore = Math.min(100, Math.round(70 + (matchedSubj / subjWords.length) * 30));
  }
  if (topic.actionVerb && lower.includes(topic.actionVerb.toLowerCase())) {
    topicScore = Math.min(100, topicScore + 5);
  }
  const topicPassed = topicScore >= 60;
  if (!topicPassed) reasons.push('Insufficient topical subject alignment.');

  // 2. Audience Relevance (Weight: 15%)
  let audScore = 80;
  if (intelligence.audience.tier === 'beginner' && lower.includes('advanced')) {
    audScore -= 20;
    reasons.push('Contains advanced jargon conflicting with beginner audience tier.');
  }
  const audPassed = audScore >= 60;

  // 3. Originality & Novelty (Weight: 15%)
  let origScore = 90;
  for (const prior of priorOutputs) {
    const dice = calculateDiceCoefficient(clean, prior);
    if (dice > 0.65) {
      origScore = Math.max(30, Math.round(origScore - (dice - 0.5) * 100));
      reasons.push(`High overlap (${Math.round(dice * 100)}%) with previous recommendation.`);
      break;
    }
  }
  const origPassed = origScore >= 60;

  // 4. Clarity & Formatting (Weight: 15%)
  let clarityScore = 85;
  if (/[!?]{2,}/.test(clean)) {
    clarityScore -= 15;
    reasons.push('Excessive exclamation/question marks.');
  }
  if (clean.length > 10 && clean === clean.toUpperCase()) {
    clarityScore -= 30;
    reasons.push('All-caps shouting format.');
  }
  const clarityPassed = clarityScore >= 60;

  // 5. Readability & Scannability (Weight: 15%)
  let readScore = 85;
  if (wordCount > 35) {
    readScore -= 20;
    reasons.push('Excessive sentence length reduces scannability.');
  } else if (wordCount < 4) {
    readScore -= 20;
    reasons.push('Excessively brief text.');
  }
  const readPassed = readScore >= 60;

  // 6. Repetition & Glitch Avoidance (Weight: 10%)
  let repScore = 95;
  if (/\b(\w+)\s+\1\b/i.test(lower)) {
    repScore -= 35;
    reasons.push('Repeated adjacent word glitch.');
  }
  if (/\bdo\s+(?:grow|edit|make)\b/i.test(lower)) {
    repScore -= 40;
    reasons.push('Grammar glitch in verb construction.');
  }
  const repPassed = repScore >= 60;

  // 7. Language Quality (Weight: 10%)
  const langReport = evaluateLanguageQuality(clean, language);
  const langScore = langReport.qualityScore;
  const langPassed = langScore >= 60;
  if (!langPassed) {
    reasons.push(`Language quality failure: ${langReport.evaluationSummary}`);
  }

  // Calculate Weighted Composite
  const composite = Math.round(
    topicScore * 0.20 +
    audScore * 0.15 +
    origScore * 0.15 +
    clarityScore * 0.15 +
    readScore * 0.15 +
    repScore * 0.10 +
    langScore * 0.10
  );

  const passedQualityGate =
    composite >= 65 &&
    topicPassed &&
    clarityPassed &&
    repPassed &&
    langPassed;

  const dimensions: QualityEvaluationDimension[] = [
    { name: 'Topic Relevance', score: topicScore, weight: 0.20, passed: topicPassed, notes: `Match score: ${topicScore}/100` },
    { name: 'Audience Relevance', score: audScore, weight: 0.15, passed: audPassed, notes: `Audience tier: ${intelligence.audience.tier}` },
    { name: 'Originality', score: origScore, weight: 0.15, passed: origPassed, notes: `Distinctness: ${origScore}/100` },
    { name: 'Clarity', score: clarityScore, weight: 0.15, passed: clarityPassed, notes: `Clarity: ${clarityScore}/100` },
    { name: 'Readability', score: readScore, weight: 0.15, passed: readPassed, notes: `Word count: ${wordCount} words` },
    { name: 'Repetition Hygiene', score: repScore, weight: 0.10, passed: repPassed, notes: `Clean syntax: ${repScore}/100` },
    { name: 'Language Quality', score: langScore, weight: 0.10, passed: langPassed, notes: langReport.evaluationSummary },
  ];

  let recommendedAction: 'accept' | 'revise' | 'reject' = 'accept';
  if (!passedQualityGate) {
    recommendedAction = composite >= 50 ? 'revise' : 'reject';
  }

  return {
    passedQualityGate,
    compositeQualityScore: composite,
    dimensions,
    languageReport: langReport,
    recommendedAction,
    reasons,
  };
}

/**
 * Deterministically fixes common quality issues in text drafts
 */
export function applyQualityRevision(text: string, subject: string): string {
  let revised = text.replace(/\s+/g, ' ').trim();

  // 1. Fix repeated words ("the the", "in in")
  revised = revised.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // 2. Fix "do + verb" glitches
  revised = revised.replace(/\bdo\s+(grow|edit|make|build|create)\b/gi, '$1');

  // 3. Fix multiple exclamation points
  revised = revised.replace(/!{2,}/g, '!');
  revised = revised.replace(/\?{2,}/g, '?');

  // 4. Strip generic clichés
  revised = revised.replace(/in today's fast-paced (?:world|environment),?\s*/gi, '');
  revised = revised.replace(/game-changer\s*/gi, 'breakthrough ');

  return revised;
}
