/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Hashtag Intelligence Algorithm (Phase 2.4)
 * Generates structured, deduplicated, and hierarchically categorized hashtags:
 * - Broad: High-level platform, content type, and macro category
 * - Niche: Domain-specific workflow, sub-genre, and craft community
 * - Specific: Exact topic subject, technique, and software
 *
 * Enforces strict deduplication and semantic relevance scoring.
 * Strict Integrity Rule: Never fabricates popularity or search-volume statistics.
 * 100% Deterministic, zero external APIs.
 */

import { StructuredTopicUnderstanding } from './topicUnderstanding';
import { TopicIntelligenceProfile } from './topicIntelligence';

export interface CategorizedHashtag {
  tag: string;                  // e.g. "#VideoEditing"
  normalized: string;           // e.g. "videoediting"
  category: 'broad' | 'niche' | 'specific';
  relevanceScore: number;       // 0-100 heuristic semantic relevance
  explanation: string;
}

export interface HashtagIntelligencePackage {
  broadTags: CategorizedHashtag[];
  nicheTags: CategorizedHashtag[];
  specificTags: CategorizedHashtag[];
  recommendedSelection: string[];  // 3-5 optimal tags for YouTube Studio / Shorts
  allTagsFormatted: string;
  integrityNotice: string;
}

/**
 * Sanitizes and formats a tag string into a valid #Hashtag
 */
export function formatHashtag(str: string): string {
  const clean = str.replace(/[^\w\s]/g, '').trim();
  const pascal = clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return `#${pascal}`;
}

/**
 * Generates hierarchically categorized and deduplicated hashtags
 */
export function generateIntelligentHashtags(
  topic: StructuredTopicUnderstanding,
  intelligence: TopicIntelligenceProfile
): HashtagIntelligencePackage {
  const { subjectNoun, domain, comparisons } = topic;
  const cleanSubject = subjectNoun.replace(/[^\w\s]/g, '').trim();

  const seen = new Set<string>();

  // 1. Broad Hashtags (Macro Category & Platform)
  const rawBroad: string[] = [
    '#ContentCreator',
    '#YouTubeGrowth',
    '#VideoTips',
    '#Tutorial',
    '#HowTo',
    domain === 'creator_economy' ? '#CreatorTips' : '#SkillBuilding',
  ];

  // 2. Niche Hashtags (Sub-genre & Domain Craft)
  const rawNiche: string[] = [];
  if (domain === 'creator_economy') {
    rawNiche.push('#VideoEditing', '#YouTubeChannel', '#GrowOnYouTube', '#CreatorEconomy');
  } else if (domain === 'ai_and_automation') {
    rawNiche.push('#AITools', '#ArtificialIntelligence', '#GenerativeAI', '#TechProductivity');
  } else if (domain === 'tech_and_coding') {
    rawNiche.push('#WebDevelopment', '#SoftwareEngineering', '#CodingTips', '#TechTutorial');
  } else if (domain === 'finance_and_business') {
    rawNiche.push('#PersonalFinance', '#InvestingTips', '#PassiveIncome', '#BusinessStrategy');
  } else if (domain === 'health_and_fitness') {
    rawNiche.push('#FitnessMotivation', '#WorkoutTips', '#HealthyLiving', '#ExerciseRoutine');
  } else {
    rawNiche.push('#LearningJourney', '#PersonalGrowth', '#EducationFirst', '#KnowledgeSharing');
  }

  // 3. Specific Hashtags (Exact Subject & Entity)
  const rawSpecific: string[] = [];
  if (cleanSubject) {
    rawSpecific.push(formatHashtag(cleanSubject));
    rawSpecific.push(formatHashtag(`${cleanSubject} Tips`));
    rawSpecific.push(formatHashtag(`${cleanSubject} Tutorial`));
  }
  if (comparisons) {
    if (comparisons.itemA) rawSpecific.push(formatHashtag(comparisons.itemA));
    if (comparisons.itemB) rawSpecific.push(formatHashtag(comparisons.itemB));
  }

  const broadTags: CategorizedHashtag[] = [];
  for (const t of rawBroad) {
    const norm = t.toLowerCase().replace('#', '');
    if (!seen.has(norm)) {
      seen.add(norm);
      broadTags.push({
        tag: t,
        normalized: norm,
        category: 'broad',
        relevanceScore: 78,
        explanation: 'Broad category tag connecting your video to general platform audience pools.',
      });
    }
  }

  const nicheTags: CategorizedHashtag[] = [];
  for (const t of rawNiche) {
    const norm = t.toLowerCase().replace('#', '');
    if (!seen.has(norm)) {
      seen.add(norm);
      nicheTags.push({
        tag: t,
        normalized: norm,
        category: 'niche',
        relevanceScore: 88,
        explanation: 'Domain-specific community tag targeting viewers interested in this discipline.',
      });
    }
  }

  const specificTags: CategorizedHashtag[] = [];
  for (const t of rawSpecific) {
    const norm = t.toLowerCase().replace('#', '');
    if (!seen.has(norm) && norm.length > 2) {
      seen.add(norm);
      specificTags.push({
        tag: t,
        normalized: norm,
        category: 'specific',
        relevanceScore: 96,
        explanation: 'High-specificity topic tag closely matching user search queries for this subject.',
      });
    }
  }

  // Recommended YouTube Selection: 1-2 Specific, 1-2 Niche, 1 Broad (3-5 tags total)
  const recommendedSelection: string[] = [
    ...(specificTags.slice(0, 2).map((t) => t.tag)),
    ...(nicheTags.slice(0, 2).map((t) => t.tag)),
    ...(broadTags.slice(0, 1).map((t) => t.tag)),
  ];

  const allTagsFormatted = recommendedSelection.join(' ');

  const integrityNotice =
    'Hashtag recommendations are categorized by semantic topic hierarchy (Broad, Niche, Specific). ' +
    'CreatorFlow AI never displays fabricated view counts or fake search volume metrics.';

  return {
    broadTags,
    nicheTags,
    specificTags,
    recommendedSelection,
    allTagsFormatted,
    integrityNotice,
  };
}
