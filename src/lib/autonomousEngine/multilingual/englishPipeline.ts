/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — English Language Pipeline
 * Generates natural, idiomatically sound English content across all 10 creative strategies.
 */

import { CreativeStrategyType } from '../types';
import { StructuredTopicUnderstanding } from '../topicUnderstanding';

export function formatEnglishTitle(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  seed: number = 0
): string {
  const { subjectNoun, actionVerb, comparisons } = understanding;
  const cleanSubject = capitalizeWords(subjectNoun);
  const cleanVerb = actionVerb.toLowerCase();

  switch (strategy) {
    case 'curiosity_mystery': {
      const patterns = [
        `The Hidden Truth About ${cleanSubject} (Why Most Fail)`,
        `What Nobody Tells You About ${cleanSubject}`,
        `The Real Reason Your ${cleanSubject} Isn't Working`,
        `I Discovered the Secret to ${cleanSubject} by Accident`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'problem_solution': {
      const patterns = [
        `How to Fix Your ${cleanSubject} in 3 Simple Steps`,
        `Struggling With ${cleanSubject}? Watch This First`,
        `The Exact System to Master ${cleanSubject} Faster`,
        `Stop Wasting Time on ${cleanSubject} — Do This Instead`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'unexpected_contrast': {
      if (comparisons) {
        return `${comparisons.itemA} vs ${comparisons.itemB}: The Brutal Truth`;
      }
      const patterns = [
        `${cleanSubject}: What You're Told vs What Actually Works`,
        `I Tested Popular Advice on ${cleanSubject} (Shocking Results)`,
        `The Big Lie About ${cleanSubject} Everyone Believes`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'storytelling_case_study': {
      const patterns = [
        `How I Transformed My ${cleanSubject} in 30 Days`,
        `From Zero to Breakthrough: My ${cleanSubject} Blueprint`,
        `I Tried ${cleanSubject} for 100 Days — Here's What Happened`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'myth_vs_fact': {
      const patterns = [
        `5 Massive Myths About ${cleanSubject} Debunked`,
        `The Truth About ${cleanSubject} You Need to Know`,
        `Don't Fall for These Common ${cleanSubject} Lies`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'practical_tutorial': {
      const patterns = [
        `Complete ${cleanSubject} Tutorial for 2026 (Step-by-Step)`,
        `How to ${capitalizeWords(cleanVerb)} ${cleanSubject} Like a Pro`,
        `The Ultimate Guide to ${cleanSubject} (Zero to Mastery)`,
        `Master ${cleanSubject} in Just 10 Minutes`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'question_led': {
      const patterns = [
        `Is ${cleanSubject} Actually Worth It in 2026?`,
        `Can You Still Succeed With ${cleanSubject} Today?`,
        `Why Is Everyone Suddenly Talking About ${cleanSubject}?`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'beginner_friendly': {
      const patterns = [
        `${cleanSubject} Explained for Total Beginners`,
        `Learn ${cleanSubject} With Zero Prior Experience`,
        `The Absolute Beginner's Blueprint to ${cleanSubject}`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'contrarian_perspective': {
      const patterns = [
        `Why You Should Stop Over-Complicating ${cleanSubject}`,
        `The Unpopular Truth About ${cleanSubject}`,
        `Why Common ${cleanSubject} Advice Is Actually Costing You`,
      ];
      return patterns[seed % patterns.length];
    }

    case 'emotional_narrative': {
      const patterns = [
        `What 3 Years of ${cleanSubject} Taught Me About Growth`,
        `The Hardest Lesson I Learned While Building ${cleanSubject}`,
        `I Almost Gave Up on ${cleanSubject} (Until This Changed)`,
      ];
      return patterns[seed % patterns.length];
    }

    default:
      return `How to Master ${cleanSubject} Efficiently`;
  }
}

export function formatEnglishHook(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType,
  seed: number = 0
): { spokenHook: string; visualDirection: string; retentionTrigger: string; deliveryTip: string } {
  const { subjectNoun } = understanding;

  switch (strategy) {
    case 'curiosity_mystery':
      return {
        spokenHook: `If you think ${subjectNoun} is just about grinding more hours, this next 60 seconds is going to completely change your mind.`,
        visualDirection: `Direct eye contact with camera, sharp snap zoom at 2.5 seconds, blurred background mystery b-roll.`,
        retentionTrigger: 'Information deficit & cognitive curiosity loop.',
        deliveryTip: 'Speak with quiet confidence, lean slightly towards the lens, avoid rushing.',
      };

    case 'problem_solution':
      return {
        spokenHook: `Stop making this one costly mistake with ${subjectNoun} that resets your progress every single week.`,
        visualDirection: `Red strike-through graphic over a common error screen, switching immediately to green checkmark solution.`,
        retentionTrigger: 'Pain avoidance & fast efficiency trigger.',
        deliveryTip: 'Punch the word "Stop", pause for half a second, then deliver the solution hook.',
      };

    case 'unexpected_contrast':
      return {
        spokenHook: `90% of creators do ${subjectNoun} completely backwards — here is the actual difference between failing and winning.`,
        visualDirection: `Split screen: left side muted grey (struggling), right side vibrant high-contrast (thriving).`,
        retentionTrigger: 'Pattern interrupt & status contrast.',
        deliveryTip: 'Contrast your voice tone between the common mistake and the actual reality.',
      };

    case 'storytelling_case_study':
      return {
        spokenHook: `Three months ago, my ${subjectNoun} was completely stuck at zero. Here is the single adjustment that changed everything.`,
        visualDirection: `Over-the-shoulder shot looking at a screen with raw milestone metrics, cut to creator speaking.`,
        retentionTrigger: 'Social proof & transformation curiosity.',
        deliveryTip: 'Honest, grounded conversational delivery without artificial hype.',
      };

    case 'practical_tutorial':
    default:
      return {
        spokenHook: `Here is the exact, step-by-step workflow to master ${subjectNoun} without spending unnecessary hours or money.`,
        visualDirection: `Dynamic screen recording showing the immediate completed end-result in 2 seconds, rewind to step 1.`,
        retentionTrigger: 'Tangible end-result preview.',
        deliveryTip: 'Energetic, direct, immediately show the payoff on screen.',
      };
  }
}

function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}
