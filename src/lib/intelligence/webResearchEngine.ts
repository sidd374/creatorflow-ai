/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real Web Research Engine grounded via Gemini googleSearch tool.
 * Extracts verifiable source URLs, titles, retrieval timestamps, and separates
 * grounded facts from creative hypotheses. Never leaks user-private keys or data across accounts.
 */

import crypto from 'crypto';
import type { GeminiModelId, WebResearchBrief } from './types.ts';
import { researchWithGoogleSearchByok } from './geminiProvider.ts';

interface CachedResearchEntry {
  brief: WebResearchBrief;
  expiresAt: number;
}

const RESEARCH_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const researchCache = new Map<string, CachedResearchEntry>();

export function clearResearchCache(): void {
  researchCache.clear();
}

function buildResearchCacheKey(query: string, niche: string, language: string): string {
  const norm = `${query.trim().toLowerCase()}|${niche.trim().toLowerCase()}|${language.trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(norm).digest('hex');
}

function parseResearchSections(rawText: string): {
  summary: string;
  verifiedFacts: string[];
  strategicHypotheses: string[];
} {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const verifiedFacts: string[] = [];
  const strategicHypotheses: string[] = [];
  const summaryLines: string[] = [];

  let mode: 'summary' | 'facts' | 'hypotheses' = 'summary';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('verified facts') || lower.includes('key facts') || lower.includes('what is happening')) {
      mode = 'facts';
      continue;
    }
    if (lower.includes('strategic hypotheses') || lower.includes('content angles') || lower.includes('opportunities')) {
      mode = 'hypotheses';
      continue;
    }

    const cleanBullet = line.replace(/^[-*•\d.)]+\s*/, '').trim();
    if (!cleanBullet) continue;

    if (mode === 'facts') {
      verifiedFacts.push(cleanBullet);
    } else if (mode === 'hypotheses') {
      strategicHypotheses.push(cleanBullet);
    } else {
      summaryLines.push(cleanBullet);
    }
  }

  return {
    summary: summaryLines.join(' ').slice(0, 600) || rawText.slice(0, 400),
    verifiedFacts: verifiedFacts.slice(0, 6),
    strategicHypotheses: strategicHypotheses.slice(0, 5),
  };
}

export async function runWebResearch(params: {
  apiKey: string;
  model: GeminiModelId;
  query: string;
  niche: string;
  language: string;
  bypassCache?: boolean;
}): Promise<WebResearchBrief> {
  const normalizedQuery = params.query.trim();
  const cacheKey = buildResearchCacheKey(normalizedQuery, params.niche, params.language);

  if (!params.bypassCache) {
    const hit = researchCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      return {
        ...hit.brief,
        cached: true,
      };
    }
  }

  const researchPrompt = `Research the current topic/niche signal thoroughly using Google Search:
Query: "${normalizedQuery}"
Channel Niche: "${params.niche}"
Target Language/Region Context: "${params.language}"

Respond cleanly with 3 short labeled sections:
Summary: 2 concise sentences summarizing verified current context, real interest drivers, or factual background.
Verified Facts:
- 3 to 5 bullet points containing ONLY concrete, verifiable facts found in search results (do NOT invent view counts, subscriber numbers, percentages, or unverified dates).
Strategic Hypotheses:
- 2 to 3 clearly framed creative content angle hypotheses tailored to this niche.`;

  const res = await researchWithGoogleSearchByok({
    apiKey: params.apiKey,
    model: params.model,
    query: researchPrompt,
    systemInstruction:
      'You are a factual research assistant using Google Search grounding. Never invent statistics, view counts, competition scores, or URLs. Distinguish verifiable facts from creative content hypotheses.',
    connectTimeoutMs: 6000,
    timeoutMs: 14000,
  });

  const parsed = parseResearchSections(res.text);
  const retrievedAt = res.sources[0]?.retrievedAt || new Date().toISOString();

  const brief: WebResearchBrief = {
    query: normalizedQuery,
    normalizedQuery: normalizedQuery.toLowerCase(),
    niche: params.niche,
    language: params.language,
    retrievedAt,
    cached: false,
    summary: parsed.summary,
    verifiedFacts: parsed.verifiedFacts,
    strategicHypotheses: parsed.strategicHypotheses,
    sources: res.sources,
  };

  researchCache.set(cacheKey, {
    brief,
    expiresAt: Date.now() + RESEARCH_TTL_MS,
  });

  return brief;
}
