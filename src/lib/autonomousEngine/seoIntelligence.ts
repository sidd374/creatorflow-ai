/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — SEO Intelligence & Transparent Scoring Engine (Phase 2.6)
 * Multi-factor evaluation algorithm evaluating content assets:
 * - Relevance Factor (25%)
 * - Readability & Scannability Factor (20%)
 * - Hook Strength & Curiosity Factor (20%)
 * - Platform Constraint Factor (15%)
 * - Originality & Cliché Avoidance (10%)
 * - Linguistic & Syntax Hygiene (10%)
 *
 * Explicit Transparency Guarantee:
 * Every recommendation provides human-readable explanations detailing why points were added or deducted.
 * Crucial Rule: Never presents scores as guaranteed YouTube rankings, search volume, or view forecasts.
 * 100% Deterministic, zero external APIs.
 */

export interface ScoreFactorBreakdown {
  factor: string;
  weightPct: number;
  score: number;         // 0-100
  weightedContribution: number;
  explanation: string;
}

export interface SeoIntelligenceScore {
  totalScore: number;    // 0-100 composite
  gradeTier: 'Excellent' | 'Strong' | 'Average' | 'Needs Improvement';
  factors: ScoreFactorBreakdown[];
  transparentExplanations: string[];
  disclaimer: string;
}

export const SEO_SCORE_DISCLAIMER =
  'CreatorFlow Score is a deterministic heuristic evaluation of structural clarity, platform constraint compliance, ' +
  'and keyword alignment. It does NOT guarantee YouTube search ranking, algorithm promotion, views, or revenue.';

/**
 * Computes transparent multi-factor SEO score with detailed explanations
 */
export function calculateTransparentSeoScore(
  title: string,
  targetTopic: string,
  platform: 'YouTube' | 'Shorts' = 'YouTube',
  seed: number = 0
): SeoIntelligenceScore {
  const clean = title.replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  const lowerTopic = targetTopic.toLowerCase();
  const charLen = clean.length;
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const factors: ScoreFactorBreakdown[] = [];
  const transparentExplanations: string[] = [];

  // 1. Relevance Factor (25%)
  let relScore = 75;
  let relExp = 'Topic keywords are moderately covered.';
  const topicWords = lowerTopic.split(/\s+/).filter((w) => w.length > 2);
  let matchedTopicWords = 0;
  for (const w of topicWords) {
    if (lower.includes(w)) matchedTopicWords++;
  }
  if (topicWords.length > 0 && matchedTopicWords > 0) {
    const ratio = matchedTopicWords / topicWords.length;
    relScore = Math.min(100, Math.round(75 + ratio * 25));
    relExp = `Directly features ${matchedTopicWords} of ${topicWords.length} core subject search terms.`;
  }
  const relContribution = Math.round(relScore * 0.25);
  factors.push({
    factor: 'Topical Relevance',
    weightPct: 25,
    score: relScore,
    weightedContribution: relContribution,
    explanation: relExp,
  });
  transparentExplanations.push(`Topical Relevance (${relScore}/100): ${relExp}`);

  // 2. Readability & Scannability (20%)
  let readScore = 80;
  let readExp = 'Clean word count, quick to scan on desktop and mobile.';
  if (wordCount >= 6 && wordCount <= 12) {
    readScore = 95;
    readExp = `Optimal scannability (${wordCount} words) allowing viewers to grasp premise in under 1 second.`;
  } else if (wordCount > 16) {
    readScore = 65;
    readExp = `Higher word density (${wordCount} words); consider tightening to prevent cognitive friction.`;
  } else if (wordCount < 4) {
    readScore = 60;
    readExp = `Very brief title (${wordCount} words); lacks sufficient detail to signal value.`;
  }
  const readContribution = Math.round(readScore * 0.20);
  factors.push({
    factor: 'Readability & Scannability',
    weightPct: 20,
    score: readScore,
    weightedContribution: readContribution,
    explanation: readExp,
  });
  transparentExplanations.push(`Readability & Scannability (${readScore}/100): ${readExp}`);

  // 3. Hook Strength & Curiosity (20%)
  let hookScore = 75;
  let hookExp = 'Clear value premise.';
  const hasCuriosity = /why|secret|truth|actually|revealed|hidden|what happens/i.test(lower);
  const hasSpecificNumber = /\b\d+\b/.test(clean);
  const hasBenefitAction = /how to|step by step|guide|fast|simple|fix|stop/i.test(lower);

  if (hasCuriosity && hasSpecificNumber) {
    hookScore = 98;
    hookExp = 'Strong combination of curiosity trigger and concrete number indicator.';
  } else if (hasCuriosity || hasBenefitAction) {
    hookScore = 90;
    hookExp = 'Effective retention trigger indicating clear curiosity gap or immediate utility.';
  } else if (hasSpecificNumber) {
    hookScore = 85;
    hookExp = 'Features a quantifiable number indicator which enhances visual specificity.';
  }
  const hookContribution = Math.round(hookScore * 0.20);
  factors.push({
    factor: 'Hook Strength & Curiosity',
    weightPct: 20,
    score: hookScore,
    weightedContribution: hookContribution,
    explanation: hookExp,
  });
  transparentExplanations.push(`Hook Strength & Curiosity (${hookScore}/100): ${hookExp}`);

  // 4. Platform Constraint (15%)
  let platScore = 80;
  let platExp = 'Well-suited to YouTube character boundaries.';
  if (charLen >= 45 && charLen <= 65) {
    platScore = 96;
    platExp = `Ideal character length (${charLen} chars) fits perfectly within mobile YouTube truncation bounds without ellipsis.`;
  } else if (charLen > 70) {
    platScore = 65;
    platExp = `Long title (${charLen} chars); mobile viewers may see text truncated before the main payoff.`;
  } else if (charLen < 32) {
    platScore = 60;
    platExp = `Short title (${charLen} chars); under-utilizes available title real estate.`;
  }
  const platContribution = Math.round(platScore * 0.15);
  factors.push({
    factor: 'Platform Constraints',
    weightPct: 15,
    score: platScore,
    weightedContribution: platContribution,
    explanation: platExp,
  });
  transparentExplanations.push(`Platform Constraints (${platScore}/100): ${platExp}`);

  // 5. Originality & Cliché Avoidance (10%)
  let origScore = 90;
  let origExp = 'Fresh phrasing that avoids overused AI clichés.';
  if (/\b(in today's fast[- ]paced|delve|game[- ]changer|tapestry|unleash)\b/i.test(lower)) {
    origScore = 50;
    origExp = 'Contains generic filler clichés that reduce creator credibility.';
  }
  const origContribution = Math.round(origScore * 0.10);
  factors.push({
    factor: 'Originality & Cliché Avoidance',
    weightPct: 10,
    score: origScore,
    weightedContribution: origContribution,
    explanation: origExp,
  });
  transparentExplanations.push(`Originality (${origScore}/100): ${origExp}`);

  // 6. Linguistic & Syntax Hygiene (10%)
  let lingScore = 95;
  let lingExp = 'Pristine punctuation and natural sentence syntax.';
  if (/\b(\w+)\s+\1\b/i.test(lower)) {
    lingScore -= 30;
    lingExp = 'Repeated adjacent word detected.';
  }
  if (/\bdo\s+(?:grow|edit|make)\b/i.test(lower)) {
    lingScore -= 35;
    lingExp = 'Grammar glitch detected in verb construction.';
  }
  if (/[!?]{2,}/.test(clean)) {
    lingScore -= 15;
    lingExp = 'Excessive punctuation marks.';
  }
  const lingContribution = Math.round(lingScore * 0.10);
  factors.push({
    factor: 'Linguistic Hygiene',
    weightPct: 10,
    score: lingScore,
    weightedContribution: lingContribution,
    explanation: lingExp,
  });
  transparentExplanations.push(`Linguistic Hygiene (${lingScore}/100): ${lingExp}`);

  // Total Composite
  const totalScore = Math.min(
    99,
    Math.max(
      45,
      relContribution +
        readContribution +
        hookContribution +
        platContribution +
        origContribution +
        lingContribution
    )
  );

  const gradeTier: 'Excellent' | 'Strong' | 'Average' | 'Needs Improvement' =
    totalScore >= 90
      ? 'Excellent'
      : totalScore >= 80
      ? 'Strong'
      : totalScore >= 70
      ? 'Average'
      : 'Needs Improvement';

  return {
    totalScore,
    gradeTier,
    factors,
    transparentExplanations,
    disclaimer: SEO_SCORE_DISCLAIMER,
  };
}
