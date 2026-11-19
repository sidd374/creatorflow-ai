/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Scripting Task Pipeline
 * Produces structured Short-form (0-60s beat sheet) and Long-form video scripts.
 * Calibrated pacing, explicit visual directions, and purposeful retention loops.
 */

import {
  CandidateOutput,
  CreativeStrategyType,
  LongFormScriptPackage,
  LongFormSection,
  ScriptBeat,
  ShortFormScriptPackage,
} from '../types';
import { StructuredTopicUnderstanding } from '../topicUnderstanding';
import { PLATFORM_SPECS, retrieveDomainKnowledge } from '../knowledgeRetrieval';
import { scoreCandidate } from '../candidateRanking';
import { evaluateOriginality } from '../duplicateDetector';
import { formatEnglishHook } from '../multilingual/englishPipeline';
import { formatTamilHook } from '../multilingual/tamilPipeline';
import { formatTanglishHook } from '../multilingual/tanglishPipeline';
import { formatHindiHook } from '../multilingual/hindiPipeline';

export function generateShortFormScript(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType = 'problem_solution',
  seed: number = 0
): CandidateOutput<ShortFormScriptPackage> {
  const { subjectNoun, detectedLanguage } = understanding;
  const platformSpec = PLATFORM_SPECS['Shorts']!;

  let hookAudio = '';
  let hookVisual = '';

  if (detectedLanguage === 'Tamil') {
    const tHook = formatTamilHook(understanding, strategy, seed);
    hookAudio = tHook.spokenHook;
    hookVisual = tHook.visualDirection;
  } else if (detectedLanguage === 'Tanglish') {
    const tgHook = formatTanglishHook(understanding, strategy, seed);
    hookAudio = tgHook.spokenHook;
    hookVisual = tgHook.visualDirection;
  } else if (detectedLanguage === 'Hindi') {
    const hHook = formatHindiHook(understanding, strategy, seed);
    hookAudio = hHook.spokenHook;
    hookVisual = hHook.visualDirection;
  } else {
    const enHook = formatEnglishHook(understanding, strategy, seed);
    hookAudio = enHook.spokenHook;
    hookVisual = enHook.visualDirection;
  }

  const beats: ScriptBeat[] = [
    {
      timecode: '0:00 - 0:03',
      spokenAudio: hookAudio,
      visualDirection: hookVisual,
      purpose: 'Hook',
    },
    {
      timecode: '0:03 - 0:12',
      spokenAudio: `Most creators spend days struggling with ${subjectNoun} because they skip this fundamental baseline.`,
      visualDirection: `Rapid cuts of timeline frustration / screen recording showing error state.`,
      purpose: 'Context',
    },
    {
      timecode: '0:12 - 0:35',
      spokenAudio: `Here is the fix: Break it into three quick passes. Step one, isolate your core asset. Step two, apply the proven preset. Step three, verify the playback audio.`,
      visualDirection: `On-screen numbered badges (1, 2, 3) popping dynamically with sound effects.`,
      purpose: 'Pillar',
    },
    {
      timecode: '0:35 - 0:48',
      spokenAudio: `Notice how clean the result looks immediately? No complex plugins, no expensive gear required.`,
      visualDirection: `Side-by-side Before & After comparison with interactive sliding bar graphic.`,
      purpose: 'Twist',
    },
    {
      timecode: '0:48 - 0:55',
      spokenAudio: `Save this video right now so you don't lose it for your next edit, and tap follow for daily creator workflows!`,
      visualDirection: `Pointing gesture towards the bookmark and subscribe button on the platform UI.`,
      purpose: 'CallToAction',
    },
  ];

  const fullScriptText = beats
    .map(
      (b) =>
        `[${b.timecode}] (${b.purpose.toUpperCase()})\nAUDIO: "${b.spokenAudio}"\nVISUAL: ${b.visualDirection}`
    )
    .join('\n\n');

  const pkg: ShortFormScriptPackage = {
    title: `How to Master ${subjectNoun} in 60 Seconds`,
    estimatedDurationSeconds: 55,
    openingHook: hookAudio,
    beats,
    loopingCta: beats[beats.length - 1]!.spokenAudio,
    fullScriptText,
  };

  const originality = evaluateOriginality(fullScriptText, []);
  const scores = scoreCandidate(fullScriptText, strategy, understanding, platformSpec, originality.originalityScorePct);

  return {
    id: `short-script-${Date.now()}`,
    strategy,
    content: pkg,
    displayText: fullScriptText,
    scores,
    originalityScore: originality.originalityScorePct,
    passedQualityGate: scores.totalScore >= 60,
    critiqueNotes: [
      'Timing calibrated for high-retention 55-second vertical pacing.',
      'Explicit audio-visual synchronization markers included.',
      'Seamless looping CTA design.',
    ],
    revisionAttempts: 1,
  };
}

export function generateLongFormScript(
  understanding: StructuredTopicUnderstanding,
  strategy: CreativeStrategyType = 'practical_tutorial',
  targetLengthMinutes: number = 8
): CandidateOutput<LongFormScriptPackage> {
  const { subjectNoun, actionVerb, domain, targetAudience } = understanding;
  const domainKnowledge = retrieveDomainKnowledge(domain);
  const platformSpec = PLATFORM_SPECS['YouTube']!;

  const coldOpenHook = `If you have ever felt completely stuck trying to ${actionVerb} ${subjectNoun}, you are not alone. In this video, we are giving you the exact blueprint.`;
  const introContext = `Welcome back creators. Today's breakdown is designed for ${targetAudience} who want to cut through the noise and achieve predictable results.`;

  const sections: LongFormSection[] = [
    {
      sectionTitle: `Pillar 1: The Foundation of ${subjectNoun}`,
      estimatedMinutes: '01:30 - 03:45',
      talkingPoints: [
        `Why traditional approaches to ${subjectNoun} fail in 2026.`,
        `The essential prerequisites: ${domainKnowledge.prerequisites.slice(0, 2).join(' and ')}.`,
        `Setting up your workspace for zero friction.`,
      ],
      visualBroll: `Wide shot of creator at desk, transitioning to full-screen screencast with cursor highlighting.`,
      transitionPhrase: `Now that our foundation is set, let's address the biggest roadblock most creators hit next...`,
    },
    {
      sectionTitle: `Pillar 2: Step-by-Step Implementation`,
      estimatedMinutes: '03:45 - 06:15',
      talkingPoints: [
        `The exact step-by-step framework to execute ${actionVerb}ing.`,
        `Real-world workflow using ${domainKnowledge.recommendedTooling.slice(0, 2).join(' or ')}.`,
        `Key benchmark numbers to monitor as you progress.`,
      ],
      visualBroll: `Close-up workflow screencast, split-screen live demonstration, text overlays highlighting keyboard shortcuts.`,
      transitionPhrase: `That brings us to the critical distinction that separates novices from seasoned pros...`,
    },
    {
      sectionTitle: `Pillar 3: The Pitfalls & How to Avoid Them`,
      estimatedMinutes: '06:15 - 08:30',
      talkingPoints: [
        `Avoid these common mistakes: ${domainKnowledge.commonPitfalls.slice(0, 2).join('; ')}.`,
        `How to troubleshoot unexpected bottlenecks.`,
        `Pro-level optimization tips for long-term consistency.`,
      ],
      visualBroll: `Warning graphic overlays, before-and-after resolution comparisons.`,
      transitionPhrase: `Let's wrap up with your practical action checklist for today...`,
    },
  ];

  const practicalTakeaways = [
    `Audit your current setup against the 3 core pillars.`,
    `Implement the workflow on one single project before scaling up.`,
    `Track your retention and output cadence weekly.`,
  ];

  const conclusionCta = `Drop a comment below with your biggest question on ${subjectNoun}. If this video helped you, tap like and check out our next recommended tutorial linked on screen!`;

  const fullScriptOutlineText = `LONG-FORM VIDEO SCRIPT BLUEPRINT: "${subjectNoun}" (${targetLengthMinutes} Mins)\n\n[00:00 - 00:45] COLD OPEN HOOK:\n${coldOpenHook}\n\n[00:45 - 01:30] INTRO & CONTEXT:\n${introContext}\n\n${sections
    .map(
      (s) =>
        `### ${s.sectionTitle} (${s.estimatedMinutes})\nPOINTS:\n${s.talkingPoints.map((p) => `• ${p}`).join('\n')}\nVISUAL B-ROLL: ${s.visualBroll}\nTRANSITION: "${s.transitionPhrase}"`
    )
    .join('\n\n')}\n\n[08:30 - END] CONCLUSION & NEXT VIDEO CTA:\n${conclusionCta}\n\nPRACTICAL TAKEAWAYS:\n${practicalTakeaways.map((t) => `✓ ${t}`).join('\n')}`;

  const pkg: LongFormScriptPackage = {
    title: `The Ultimate Guide to ${subjectNoun}`,
    format: 'Comprehensive Tutorial / Masterclass',
    targetLengthMinutes,
    coldOpenHook,
    introContext,
    sections,
    practicalTakeaways,
    conclusionCta,
    fullScriptOutlineText,
  };

  const originality = evaluateOriginality(fullScriptOutlineText, []);
  const scores = scoreCandidate(fullScriptOutlineText, strategy, understanding, platformSpec, originality.originalityScorePct);

  return {
    id: `long-script-${Date.now()}`,
    strategy,
    content: pkg,
    displayText: fullScriptOutlineText,
    scores,
    originalityScore: originality.originalityScorePct,
    passedQualityGate: scores.totalScore >= 60,
    critiqueNotes: [
      'Multi-pillar narrative progression with dedicated transitions.',
      'Includes practical takeaways and clear next-video end-card CTA.',
    ],
    revisionAttempts: 1,
  };
}
