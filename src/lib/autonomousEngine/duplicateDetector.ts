/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Originality and Duplicate Detection Engine
 * Multi-layer similarity checking using:
 * - Normalized exact matching
 * - Tokenization and phrase overlap
 * - Character/token n-gram Dice & Jaccard coefficients
 * - Structural fingerprints and generation history similarity
 *
 * Explicitly notes: Internal similarity calculations evaluate local originality
 * and repetition within CreatorFlow AI; they do not guarantee worldwide uniqueness or copyright clearance.
 */

export interface OriginalityReport {
  originalityScorePct: number; // 0 (identical) to 100 (wholly unique)
  isDuplicate: boolean;
  highestSimilarityScorePct: number;
  matchedReason?: string;
  nGramOverlapRatio: number;
  localHistoryCheckedCount: number;
  disclaimer: string;
}

const ORIGINALITY_DISCLAIMER =
  'Originality score reflects uniqueness within CreatorFlow AI candidate pools and your local project history. It does not certify global trademark or copyright uniqueness.';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'it', 'this', 'that', 'you', 'your', 'my', 'we', 'how', 'why', 'what'
]);

/**
 * Tokenize string into normalized content words
 */
export function extractContentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF\u0900-\u097F]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Generate character or word n-grams
 */
export function generateWordNGrams(tokens: string[], n: number = 2): string[] {
  if (tokens.length < n) return tokens;
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Compute Jaccard Similarity between two sets of strings (0.0 to 1.0)
 */
export function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Compute Sørensen–Dice Coefficient on Bigrams (sensitive to phrase order)
 */
export function calculateDiceCoefficient(textA: string, textB: string): number {
  const normA = textA.toLowerCase().replace(/\s+/g, ' ').trim();
  const normB = textB.toLowerCase().replace(/\s+/g, ' ').trim();

  if (normA === normB) return 1.0;
  if (normA.length < 2 || normB.length < 2) return 0.0;

  const getBigrams = (str: string): Map<string, number> => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const pair = str.slice(i, i + 2);
      bigrams.set(pair, (bigrams.get(pair) || 0) + 1);
    }
    return bigrams;
  };

  const bigramsA = getBigrams(normA);
  const bigramsB = getBigrams(normB);

  let intersection = 0;
  for (const [pair, countA] of bigramsA.entries()) {
    if (bigramsB.has(pair)) {
      intersection += Math.min(countA, bigramsB.get(pair)!);
    }
  }

  const total = (normA.length - 1) + (normB.length - 1);
  return (2 * intersection) / total;
}

/**
 * In-memory or localStorage based history for duplicate prevention
 */
const RECENT_GENERATION_HISTORY_KEY = 'cf_recent_generations_cache_v1';
const MAX_HISTORY_ITEMS = 50;

export function getLocalGenerationHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_GENERATION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordGenerationInHistory(text: string): void {
  if (typeof window === 'undefined' || !text.trim()) return;
  try {
    const history = getLocalGenerationHistory();
    const updated = [text.trim(), ...history.filter((h) => h !== text.trim())].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(RECENT_GENERATION_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage storage quota failures gracefully
  }
}

/**
 * Evaluates candidate text for originality against candidate peer pool and local history
 */
export function evaluateOriginality(
  candidateText: string,
  peerCandidateTexts: string[] = [],
  includeLocalHistory: boolean = true
): OriginalityReport {
  const normalizedCandidate = candidateText.toLowerCase().replace(/\s+/g, ' ').trim();
  const candidateTokens = extractContentTokens(candidateText);
  const candidateBigrams = generateWordNGrams(candidateTokens, 2);

  const comparisonPool: string[] = [...peerCandidateTexts];
  if (includeLocalHistory) {
    comparisonPool.push(...getLocalGenerationHistory());
  }

  let maxSimilarity = 0;
  let matchedReason: string | undefined;

  for (const item of comparisonPool) {
    const normalizedItem = item.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalizedItem || normalizedItem === normalizedCandidate) {
      if (normalizedItem === normalizedCandidate) {
        maxSimilarity = 1.0;
        matchedReason = 'Identical wording found in comparison pool or recent history.';
        break;
      }
      continue;
    }

    // Check token Jaccard & Bigram Dice
    const itemTokens = extractContentTokens(item);
    const jaccard = calculateJaccardSimilarity(candidateTokens, itemTokens);
    const dice = calculateDiceCoefficient(candidateText, item);

    const combinedSim = 0.6 * dice + 0.4 * jaccard;
    if (combinedSim > maxSimilarity) {
      maxSimilarity = combinedSim;
      if (combinedSim > 0.75) {
        matchedReason = `High phrase and structural overlap (${Math.round(combinedSim * 100)}%) with prior output.`;
      }
    }
  }

  const highestSimilarityPct = Math.round(maxSimilarity * 100);
  const originalityScorePct = Math.max(0, 100 - highestSimilarityPct);
  const isDuplicate = highestSimilarityPct >= 80;

  return {
    originalityScorePct,
    isDuplicate,
    highestSimilarityScorePct: highestSimilarityPct,
    matchedReason,
    nGramOverlapRatio: maxSimilarity,
    localHistoryCheckedCount: comparisonPool.length,
    disclaimer: ORIGINALITY_DISCLAIMER,
  };
}
