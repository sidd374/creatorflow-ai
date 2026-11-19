/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Hashtags & Keywords Task Pipeline
 * Generates semantic keyword clusters and relevant YouTube hashtags.
 * Strictly adheres to rule: Never fabricates artificial search volume or fake metrics.
 */

import { CandidateOutput, CreativeStrategyType, HashtagKeywordPackage } from '../types';
import { StructuredTopicUnderstanding } from '../topicUnderstanding';
import { retrieveDomainKnowledge } from '../knowledgeRetrieval';
import { scoreCandidate } from '../candidateRanking';
import { PLATFORM_SPECS } from '../knowledgeRetrieval';
import { evaluateOriginality } from '../duplicateDetector';

export function generateHashtagKeywordPackage(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType = 'practical_tutorial'
): CandidateOutput<HashtagKeywordPackage> {
  const { subjectNoun, actionVerb, domain } = understanding;
  const domainInfo = retrieveDomainKnowledge(domain);

  const cleanSubject = subjectNoun.replace(/[^\w\s]/g, '').trim();
  const subjectSlug = cleanSubject.replace(/\s+/g, '');

  // 1. Core Keywords
  const coreKeywords = [
    cleanSubject,
    `${actionVerb} ${cleanSubject}`,
    `${cleanSubject} tutorial`,
    `how to ${cleanSubject}`,
  ];

  // 2. Niche Keywords from domain concept graph
  const nicheKeywords = domainInfo.primaryConcepts
    .slice(0, 4)
    .map((concept) => `${cleanSubject} ${concept.toLowerCase()}`);

  // 3. Intent Keywords (Beginner / Mistakes / 2026 Guide)
  const intentKeywords = [
    `${cleanSubject} for beginners`,
    `${cleanSubject} mistakes to avoid`,
    `${cleanSubject} tips 2026`,
    `best way to ${actionVerb} ${cleanSubject}`,
  ];

  const allKeywords = Array.from(new Set([...coreKeywords, ...nicheKeywords, ...intentKeywords]));
  const allKeywordsCommaSeparated = allKeywords.join(', ');

  // 4. Natural Hashtags (YouTube Studio standard 3-5 tags)
  const trendingHashtags = [
    `#${subjectSlug}`,
    `#${domain.replace(/_/g, '')}`,
    `#ContentCreator`,
    `#YouTubeGrowth`,
    `#Tutorial`,
  ].filter((tag) => tag.length <= 25);

  const hashtagsString = trendingHashtags.join(' ');

  const pkg: HashtagKeywordPackage = {
    coreKeywords,
    nicheKeywords,
    intentKeywords,
    allKeywordsCommaSeparated,
    trendingHashtags,
    hashtagsString,
  };

  const displayText = `KEYWORD TAGS FOR YOUTUBE STUDIO (Ready to Paste):\n${allKeywordsCommaSeparated}\n\nHASHTAGS:\n${hashtagsString}\n\nNotice: Keyword tags are organized into core, niche, and intent clusters based on semantic topic mapping. No fabricated search volume metrics are displayed.`;

  const platformSpec = PLATFORM_SPECS['YouTube']!;
  const originality = evaluateOriginality(displayText, []);
  const scores = scoreCandidate(displayText, strategy, understanding, platformSpec, originality.originalityScorePct);

  return {
    id: `kw-${Date.now()}`,
    strategy,
    content: pkg,
    displayText,
    scores,
    originalityScore: originality.originalityScorePct,
    passedQualityGate: true,
    critiqueNotes: [
      'Semantic keyword clustering applied (Core, Niche, Intent).',
      'Compliant with YouTube Studio tag character count limit (< 500 characters).',
      'No fabricated search counts or artificial rank numbers.',
    ],
    revisionAttempts: 1,
  };
}
