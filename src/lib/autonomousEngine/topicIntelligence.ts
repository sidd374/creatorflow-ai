/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Topic Intelligence Algorithm (Phase 2.1)
 * Extracts structured topic semantic metadata:
 * - Subtopics and educational pillars
 * - Target audience persona and skill tier
 * - Search intent and content category
 * - Meaningful keywords and semantic clusters
 * - Related concepts graph
 * 100% Deterministic, API-free, local algorithm.
 */

import { DetectedDomain, DetectedIntent } from './topicUnderstanding';

export type SearchIntentType =
  | 'informational'           // Seeking conceptual understanding ("What is...", "Why...")
  | 'tutorial_how_to'         // Seeking step-by-step guidance ("How to...", "Guide")
  | 'comparative_eval'        // Seeking to choose between options ("A vs B", "Best...")
  | 'diagnostic_mistake'      // Seeking to diagnose/fix failures ("Why X fails", "Mistakes")
  | 'inspiration_challenge'   // Seeking workflow proof or creative ideas ("30 day challenge")
  | 'curiosity_discovery';    // Seeking surprising/hidden facts ("The truth about...")

export interface AudienceProfile {
  tier: 'beginner' | 'intermediate' | 'advanced' | 'general_creator';
  label: string;
  painPoints: string[];
  desiredOutcome: string;
}

export interface TopicIntelligenceProfile {
  rawTopic: string;
  normalizedTopic: string;
  domain: DetectedDomain;
  category: string;
  searchIntent: SearchIntentType;
  intentReason: string;
  subjectNoun: string;
  actionVerb: string;
  audience: AudienceProfile;
  subtopics: string[];
  relatedConcepts: string[];
  keywords: {
    core: string[];
    action: string[];
    intentModifiers: string[];
    longTail: string[];
  };
}

const DOMAIN_CATEGORY_MAP: Record<DetectedDomain, string> = {
  creator_economy: 'Content Creation & YouTube Strategy',
  tech_and_coding: 'Software & Technology',
  ai_and_automation: 'Artificial Intelligence & Productivity',
  finance_and_business: 'Business & Financial Literacy',
  health_and_fitness: 'Health, Wellness & Fitness',
  gaming_and_entertainment: 'Gaming & Interactive Media',
  education_and_career: 'Learning, Career & Study',
  lifestyle_and_vlog: 'Lifestyle & Personal Growth',
  general: 'General Knowledge & Media',
};

const DOMAIN_CONCEPT_GRAPH: Record<DetectedDomain, string[]> = {
  creator_economy: [
    'Thumbnail CTR',
    'Audience Retention',
    'First 30-Second Hook',
    'B-Roll & Jump Cuts',
    'Pacing & Story Structure',
    'Audio Clarity & Ducking',
    'Title SEO & Search Intent',
    'Upload Consistency',
  ],
  tech_and_coding: [
    'System Architecture',
    'Performance Optimization',
    'API Integration',
    'Clean Code Principles',
    'Debugging & Error Handling',
    'Version Control & Git',
    'Responsive Design',
    'Deployment Workflows',
  ],
  ai_and_automation: [
    'Prompt Engineering',
    'Workflow Automation',
    'Model Fine-Tuning',
    'Context Windows & Memory',
    'Generative Media Production',
    'Ethical AI & Fact-Checking',
    'API Tool Calling',
    'Efficiency Benchmarks',
  ],
  finance_and_business: [
    'Cash Flow Management',
    'Compounding Returns',
    'Customer Acquisition Cost',
    'Diversified Revenue Streams',
    'Risk Mitigation',
    'Budgeting & Allocation',
    'Unit Economics',
    'Value Proposition',
  ],
  health_and_fitness: [
    'Progressive Overload',
    'Nutritional Balance',
    'Recovery & Sleep Hygiene',
    'Form & Injury Prevention',
    'Consistency over Intensity',
    'Metabolic Adaptation',
    'Mind-Muscle Connection',
    'Hydration & Fueling',
  ],
  gaming_and_entertainment: [
    'Gameplay Walkthrough',
    'Mechanics Breakdown',
    'Easter Eggs & Lore',
    'Optimal Loadouts & Builds',
    'Highlight Pacing',
    'Viewer Interaction',
    'Game Strategy Analysis',
    'Clutch Moments',
  ],
  education_and_career: [
    'Active Recall & Spaced Repetition',
    'Exam Strategy & Time Allocation',
    'Portfolio & Resume Building',
    'Deep Work & Focus Management',
    'Skill Acquisition Frameworks',
    'Interview Frameworks',
    'Note-Taking Systems',
    'Career Trajectory Planning',
  ],
  lifestyle_and_vlog: [
    'Daily Habit Architecture',
    'Minimalist Organization',
    'Cinematic B-Roll Framing',
    'Visual Storytelling',
    'Energy Management',
    'Workspace Ergonomics',
    'Intentional Living',
    'Authentic Personal Reflection',
  ],
  general: [
    'Foundational Principles',
    'Common Misconceptions',
    'Practical Application',
    'Workflow Efficiency',
    'Resource Optimization',
    'Step-by-Step Breakdown',
  ],
};

/**
 * Classifies search intent deterministically based on topic keywords and phrasing
 */
export function classifySearchIntent(topic: string, baseIntent: DetectedIntent): { intent: SearchIntentType; reason: string } {
  const lower = topic.toLowerCase();

  if (/\b(vs|versus|compared to|difference between|better than|which is best)\b/i.test(lower)) {
    return {
      intent: 'comparative_eval',
      reason: 'User is comparing two or more options to make a clear decision.',
    };
  }

  if (/\b(mistake|avoid|stop|wrong|ruining|hurting|failed|don't)\b/i.test(lower)) {
    return {
      intent: 'diagnostic_mistake',
      reason: 'User wants to identify bottlenecks, fix mistakes, or prevent failure.',
    };
  }

  if (/\b(how to|step by step|tutorial|guide|workflow|setup|build|create|make)\b/i.test(lower)) {
    return {
      intent: 'tutorial_how_to',
      reason: 'User seeks actionable, chronological instructions to achieve an outcome.',
    };
  }

  if (/\b(why|truth|secret|hidden|nobody tells you|explained|what really happens)\b/i.test(lower)) {
    return {
      intent: 'curiosity_discovery',
      reason: 'User is driven by curiosity gap or seeking insider insights.',
    };
  }

  if (/\b(challenge|experiment|tested|30 days|from 0 to|case study)\b/i.test(lower)) {
    return {
      intent: 'inspiration_challenge',
      reason: 'User wants authentic empirical proof, experiment results, or case study.',
    };
  }

  return {
    intent: 'informational',
    reason: 'User is seeking comprehensive subject understanding and key principles.',
  };
}

/**
 * Determines target audience profile based on vocabulary cues
 */
export function determineAudience(topic: string, domain: DetectedDomain): AudienceProfile {
  const lower = topic.toLowerCase();

  if (/\b(beginner|scratch|start|zero|first|basics|101|intro|newbie)\b/i.test(lower)) {
    return {
      tier: 'beginner',
      label: 'Complete Beginners & First-Timers',
      painPoints: ['Overwhelmed by jargon', 'Unsure where to start', 'Zero prior experience'],
      desiredOutcome: 'A clear, frictionless starting point with zero confusion.',
    };
  }

  if (/\b(advanced|pro|mastery|deep dive|expert|scale|algorithm|optimization)\b/i.test(lower)) {
    return {
      tier: 'advanced',
      label: 'Experienced Creators & Practitioners',
      painPoints: ['Plateaued growth', 'Generic surface-level advice', 'Need high-leverage tactics'],
      desiredOutcome: 'Nuanced tactical adjustments that unlock measurable improvements.',
    };
  }

  if (/\b(student|school|college|teen|campus)\b/i.test(lower)) {
    return {
      tier: 'intermediate',
      label: 'Students & Young Learners',
      painPoints: ['Limited budget', 'Time management constraints', 'Need practical utility'],
      desiredOutcome: 'Affordable, efficient workflows that save hours of study or editing time.',
    };
  }

  if (/\b(business|agency|freelanc|client|monetiz|client|revenue|money)\b/i.test(lower)) {
    return {
      tier: 'intermediate',
      label: 'Entrepreneurs, Freelancers & Monetizing Creators',
      painPoints: ['Conversion bottlenecks', 'Client delivery turnaround', 'Need ROI'],
      desiredOutcome: 'Systematized workflows that directly drive client results and revenue.',
    };
  }

  // Default domain-calibrated audience
  return {
    tier: 'general_creator',
    label: domain === 'creator_economy' ? 'Consistent YouTube Creators' : 'Enthusiast Creators & Learners',
    painPoints: ['Inconsistent results', 'Wasting time on trial-and-error', 'Seeking proven workflows'],
    desiredOutcome: 'Practical, reliable methods that produce noticeable quality improvements.',
  };
}

/**
 * Decomposes topic into 4-6 educational subtopics and pillars
 */
export function extractSubtopics(topic: string, subject: string, action: string, domain: DetectedDomain): string[] {
  const subtopics: string[] = [];
  const cleanSubj = subject || topic;

  subtopics.push(`1. Core Foundations of ${cleanSubj}`);
  subtopics.push(`2. Essential Tools & Setup for ${cleanSubj}`);
  subtopics.push(`3. Step-by-Step Execution Workflow`);
  subtopics.push(`4. 3 Costly Mistakes to Avoid in ${cleanSubj}`);
  subtopics.push(`5. Advanced Tips to Accelerate Your Progress`);

  return subtopics;
}

/**
 * Extracts structured topic intelligence
 */
export function analyzeTopicIntelligence(
  rawTopic: string,
  domain: DetectedDomain,
  baseIntent: DetectedIntent,
  subjectNoun: string,
  actionVerb: string
): TopicIntelligenceProfile {
  const normalizedTopic = rawTopic.trim().replace(/\s+/g, ' ');
  const category = DOMAIN_CATEGORY_MAP[domain] || DOMAIN_CATEGORY_MAP.general;
  const { intent: searchIntent, reason: intentReason } = classifySearchIntent(normalizedTopic, baseIntent);
  const audience = determineAudience(normalizedTopic, domain);
  const subtopics = extractSubtopics(normalizedTopic, subjectNoun, actionVerb, domain);
  const relatedConcepts = DOMAIN_CONCEPT_GRAPH[domain] || DOMAIN_CONCEPT_GRAPH.general;

  // Keyword extraction
  const cleanSubject = (subjectNoun || normalizedTopic).replace(/[^\w\s]/g, '').trim();
  const core = [cleanSubject, actionVerb, `${actionVerb} ${cleanSubject}`].filter(Boolean);
  const action = [
    `how to ${actionVerb} ${cleanSubject}`,
    `best way to ${actionVerb} ${cleanSubject}`,
    `${cleanSubject} tutorial`,
  ];
  const intentModifiers = [
    `${cleanSubject} for ${audience.tier}`,
    `${cleanSubject} tips`,
    `${cleanSubject} guide`,
    `${cleanSubject} mistakes`,
  ];
  const longTail = [
    `${cleanSubject} step by step for beginners`,
    `how to improve ${cleanSubject} without expensive tools`,
    `secret ${cleanSubject} workflow used by top creators`,
  ];

  return {
    rawTopic,
    normalizedTopic,
    domain,
    category,
    searchIntent,
    intentReason,
    subjectNoun: cleanSubject,
    actionVerb,
    audience,
    subtopics,
    relatedConcepts,
    keywords: {
      core,
      action,
      intentModifiers,
      longTail,
    },
  };
}
