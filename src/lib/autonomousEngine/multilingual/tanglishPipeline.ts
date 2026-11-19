/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Authentic Tanglish Pipeline (Tamil in Latin Script)
 * Captures conversational Tamil YouTube creator colloquial conventions.
 * Natural phrasing used by top Tamil creators, avoiding awkward literal translations.
 */

import { CreativeStrategyType } from '../types';
import { StructuredTopicUnderstanding } from '../topicUnderstanding';

export function formatTanglishTitle(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  seed: number = 0
): string {
  const { subjectNoun, comparisons } = understanding;

  switch (strategy) {
    case 'curiosity_mystery': {
      const patterns = [
        `${subjectNoun} Pathi Yarume Sollaadha Secret! (Idhu Theriyuma?)`,
        `The Real Truth About ${subjectNoun} - Must Watch for Creators`,
        `${subjectNoun}-la Romba Per Panra Secret Mistake Enna?`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'problem_solution': {
      const patterns = [
        `Indha Mistake-ah Kandippa Avoid Pannunga in ${subjectNoun}!`,
        `${subjectNoun} Problem-ah Solve Panna 3 Simple Steps`,
        `Stop Doing This in ${subjectNoun} — Idhu Mattum Panna Podhum!`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'unexpected_contrast': {
      if (comparisons) {
        return `${comparisons.itemA} vs ${comparisons.itemB}: Edhu Best? Real Comparison!`;
      }
      const patterns = [
        `${subjectNoun}: Namma Ninaikiradhu vs Reality!`,
        `${subjectNoun} Pathi Irukura Big Lies & Real Truth`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'storytelling_case_study': {
      const patterns = [
        `Naan Eppadi ${subjectNoun}-la Success Aanen? Full Experience!`,
        `Zero-la Irundhu ${subjectNoun} Master Panna En Journey`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'myth_vs_fact': {
      const patterns = [
        `5 Big Myths About ${subjectNoun} Busted!`,
        `${subjectNoun} Pathi Neenga Nambara Thappana Veshayam`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'practical_tutorial':
    default: {
      const patterns = [
        `${subjectNoun} Epdi Panradhu? Step-by-Step Full Guide in Tamil`,
        `${subjectNoun} Tutorial: 10 Mins-la Easy-ah Kathukalam!`,
        `Ultimate Guide to ${subjectNoun} - Beginners-kaaga Simple Explanation`,
      ];
      return patterns[seed % patterns.length];
    }
  }
}

export function formatTanglishHook(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  seed: number = 0
): { spokenHook: string; visualDirection: string; retentionTrigger: string; deliveryTip: string } {
  const { subjectNoun } = understanding;

  switch (strategy) {
    case 'curiosity_mystery':
      return {
        spokenHook: `Neenga ${subjectNoun} pathi ipo varaikum kettadhu 90% thappu! Idhoda real secret ennanu indha video-la paaka porom.`,
        visualDirection: `Direct camera eye-contact, 2.5s snap zoom, interesting blurred screen graphics in the background.`,
        retentionTrigger: 'Curiosity loop & expectation subversion.',
        deliveryTip: 'Speak with lively colloquial confidence, smile, and emphasize "real secret".',
      };

    case 'problem_solution':
      return {
        spokenHook: `${subjectNoun} panrappo neenga indha oru mistake-ah panna, unga time mothama waste aagidum!`,
        visualDirection: `Big red "X" graphic over the mistake, transitioning quickly to green tick solution.`,
        retentionTrigger: 'Mistake avoidance & immediate attention trigger.',
        deliveryTip: 'Strong vocal opening, pause briefly right before naming the solution.',
      };

    case 'practical_tutorial':
    default:
      return {
        spokenHook: `Innaiki video-la ${subjectNoun}-ah romba simple-ah, zero confusion-oda epdi panradhu nu step-by-step-ah paakalam!`,
        visualDirection: `Quick 2-second montage of the finished result, cutting immediately to step 1 screen record.`,
        retentionTrigger: 'Direct value payoff guarantee.',
        deliveryTip: 'High energy, warm creator vibe, dive straight into the practical steps.',
      };
  }
}
