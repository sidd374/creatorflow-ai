/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Creative Planning Engine
 * Generates distinct, topic-conditioned content strategies before composition.
 * Ensures candidates differ in structural logic, psychological premise, and narrative trajectory.
 */

import { CreativeStrategyType, StrategyDefinition } from './types';
import { StructuredTopicUnderstanding } from './topicUnderstanding';

export const CREATIVE_STRATEGIES: Record<CreativeStrategyType, StrategyDefinition> = {
  curiosity_mystery: {
    type: 'curiosity_mystery',
    label: 'Curiosity & Information Gap',
    description: 'Withholds the core secret while establishing high stakes to trigger immediate viewer curiosity.',
    bestFor: ['curiosity_inquiry', 'deep_dive', 'recommendation'],
    psychologicalHook: 'Knowledge deficit trigger: Viewer must watch to close the cognitive loop.',
  },
  problem_solution: {
    type: 'problem_solution',
    label: 'Direct Problem & Fast Solution',
    description: 'Directly addresses a painful creator roadblock and delivers an efficient, proven solution.',
    bestFor: ['tutorial', 'mistake_warning', 'creator_economy'],
    psychologicalHook: 'Relief & efficiency trigger: Viewer experiences quick, tangible relief from friction.',
  },
  unexpected_contrast: {
    type: 'unexpected_contrast',
    label: 'Unexpected Contrast & Expectation Subversion',
    description: 'Compares what 99% of people assume versus what actually happens in reality.',
    bestFor: ['comparison', 'contrarian', 'mistake_warning'],
    psychologicalHook: 'Pattern interrupt: Breaks habitual assumptions and demands attention.',
  },
  storytelling_case_study: {
    type: 'storytelling_case_study',
    label: 'First-Person Story & Case Study',
    description: 'Frames the insight as a relatable personal journey, milestone test, or empirical case study.',
    bestFor: ['story_case_study', 'creator_economy', 'lifestyle_and_vlog'],
    psychologicalHook: 'Empathy & proof trigger: Real evidence and emotional connection through narrative.',
  },
  myth_vs_fact: {
    type: 'myth_vs_fact',
    label: 'Myth vs. Verified Reality',
    description: 'Debunks an entrenched industry myth with verifiable facts and practical testing.',
    bestFor: ['mistake_warning', 'deep_dive', 'ai_and_automation'],
    psychologicalHook: 'Authority & clarity trigger: Saves the viewer from wasting time on false advice.',
  },
  practical_tutorial: {
    type: 'practical_tutorial',
    label: 'Actionable Step-by-Step Blueprint',
    description: 'Clear numbered breakdown with zero fluff, focusing purely on rapid execution.',
    bestFor: ['tutorial', 'tech_and_coding', 'creator_economy'],
    psychologicalHook: 'Mastery & competence trigger: Empowers the viewer to take immediate action.',
  },
  question_led: {
    type: 'question_led',
    label: 'High-Stakes Question Exploration',
    description: 'Opens with the single most pressing question viewers are asking themselves right now.',
    bestFor: ['curiosity_inquiry', 'comparison', 'education_and_career'],
    psychologicalHook: 'Relevance trigger: Validates the viewer’s existing internal contemplation.',
  },
  beginner_friendly: {
    type: 'beginner_friendly',
    label: 'Zero-Jargon Beginner Primer',
    description: 'Breaks complex concepts down into intuitive metaphors and simple building blocks.',
    bestFor: ['tutorial', 'education_and_career', 'finance_and_business'],
    psychologicalHook: 'Accessibility trigger: Removes fear of complexity and welcomes newcomers.',
  },
  contrarian_perspective: {
    type: 'contrarian_perspective',
    label: 'Fact-Defensible Contrarian Angle',
    description: 'Challenges popular consensus with reasoned arguments and practical alternative paths.',
    bestFor: ['contrarian', 'deep_dive', 'creator_economy'],
    psychologicalHook: 'Novelty & skepticism trigger: Appeals to critical thinkers seeking fresh insight.',
  },
  emotional_narrative: {
    type: 'emotional_narrative',
    label: 'Vulnerability & Milestone Realization',
    description: 'Focuses on the creator’s mindset shift, overcoming burnout, or pivotal realization moment.',
    bestFor: ['story_case_study', 'lifestyle_and_vlog', 'creator_economy'],
    psychologicalHook: 'Inspiration & validation trigger: Connects emotionally with the creator journey.',
  },
};

/**
 * Selects an optimal, diverse portfolio of creative strategies based on topic analysis
 */
export function planCreativeStrategies(
  understanding: StructuredTopicUnderstanding,
  requestedCount: number = 4,
  variationSeed: number = 0
): StrategyDefinition[] {
  const intent = understanding.intent;
  const domain = understanding.domain;

  // Primary strategies tailored to intent
  const prioritizedTypes: CreativeStrategyType[] = [];

  switch (intent) {
    case 'comparison':
      prioritizedTypes.push('unexpected_contrast', 'practical_tutorial', 'contrarian_perspective', 'question_led');
      break;
    case 'mistake_warning':
      prioritizedTypes.push('problem_solution', 'myth_vs_fact', 'curiosity_mystery', 'unexpected_contrast');
      break;
    case 'curiosity_inquiry':
      prioritizedTypes.push('curiosity_mystery', 'question_led', 'myth_vs_fact', 'contrarian_perspective');
      break;
    case 'story_case_study':
      prioritizedTypes.push('storytelling_case_study', 'emotional_narrative', 'problem_solution', 'curiosity_mystery');
      break;
    case 'contrarian':
      prioritizedTypes.push('contrarian_perspective', 'myth_vs_fact', 'unexpected_contrast', 'question_led');
      break;
    case 'recommendation':
      prioritizedTypes.push('practical_tutorial', 'curiosity_mystery', 'problem_solution', 'unexpected_contrast');
      break;
    case 'deep_dive':
      prioritizedTypes.push('beginner_friendly', 'practical_tutorial', 'curiosity_mystery', 'myth_vs_fact');
      break;
    case 'tutorial':
    default:
      prioritizedTypes.push('practical_tutorial', 'problem_solution', 'beginner_friendly', 'curiosity_mystery');
      break;
  }

  // Adjust for domain
  if (domain === 'finance_and_business' && !prioritizedTypes.includes('myth_vs_fact')) {
    prioritizedTypes.push('myth_vs_fact');
  }
  if (domain === 'tech_and_coding' && !prioritizedTypes.includes('practical_tutorial')) {
    prioritizedTypes.unshift('practical_tutorial');
  }

  // Fill up with remaining diverse strategies
  const allKeys = Object.keys(CREATIVE_STRATEGIES) as CreativeStrategyType[];
  for (const k of allKeys) {
    if (!prioritizedTypes.includes(k)) {
      prioritizedTypes.push(k);
    }
  }

  // Shift starting index deterministically by variationSeed
  const offset = Math.abs(variationSeed) % prioritizedTypes.length;
  const rotated = [...prioritizedTypes.slice(offset), ...prioritizedTypes.slice(0, offset)];

  const selectedKeys = rotated.slice(0, Math.max(2, Math.min(requestedCount, allKeys.length)));
  return selectedKeys.map((k) => CREATIVE_STRATEGIES[k]);
}
