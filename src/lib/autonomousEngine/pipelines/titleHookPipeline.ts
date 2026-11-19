/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Title & Hook Task Pipeline
 * Generates distinct candidate titles and hooks across all creative strategies.
 * Routes to English, Tamil, Tanglish, and Hindi linguistic implementations.
 */

import {
  CandidateOutput,
  CreativeStrategyType,
  HookCandidateItem,
  TitleCandidateItem,
  UserGenerationPreferences,
} from '../types';
import { StructuredTopicUnderstanding } from '../topicUnderstanding';
import { PLATFORM_SPECS } from '../knowledgeRetrieval';
import { formatEnglishHook, formatEnglishTitle } from '../multilingual/englishPipeline';
import { formatTamilHook, formatTamilTitle } from '../multilingual/tamilPipeline';
import { formatTanglishHook, formatTanglishTitle } from '../multilingual/tanglishPipeline';
import { formatHindiHook, formatHindiTitle } from '../multilingual/hindiPipeline';
import { critiqueAndRevise } from '../criticRevision';
import { evaluateOriginality } from '../duplicateDetector';
import { rankCandidates, scoreCandidate } from '../candidateRanking';

export function generateTitleCandidates(
  understanding: StructuredTopicUnderstanding,
  strategies: CreativeStrategyType[],
  seed: number = 0,
  preferences?: UserGenerationPreferences
): CandidateOutput<TitleCandidateItem>[] {
  const platformSpec = PLATFORM_SPECS[understanding.detectedLanguage === 'Tamil' ? 'General' : 'YouTube'] || PLATFORM_SPECS['YouTube']!;
  const rawCandidates: Array<{ text: string; strategy: CreativeStrategyType; id: string }> = [];

  for (let i = 0; i < strategies.length; i++) {
    const strat = strategies[i];
    let generatedTitle = '';

    if (understanding.detectedLanguage === 'Tamil' || understanding.isTamilScript) {
      generatedTitle = formatTamilTitle(understanding, strat, seed + i);
    } else if (understanding.detectedLanguage === 'Tanglish' || understanding.isTanglish) {
      generatedTitle = formatTanglishTitle(understanding, strat, seed + i);
    } else if (understanding.detectedLanguage === 'Hindi' || understanding.isHindiScript) {
      generatedTitle = formatHindiTitle(understanding, strat, seed + i);
    } else {
      generatedTitle = formatEnglishTitle(understanding, strat, seed + i);
    }

    rawCandidates.push({
      text: generatedTitle,
      strategy: strat,
      id: `title-cand-${i}-${strat}`,
    });
  }

  // Critique, evaluate originality, score, and rank
  const evaluatedCandidates: CandidateOutput<TitleCandidateItem>[] = [];
  const peerTexts = rawCandidates.map((c) => c.text);

  for (const item of rawCandidates) {
    const critique = critiqueAndRevise(item.text, understanding, platformSpec, 2);
    const revisedText = critique.revisedText || item.text;

    const originality = evaluateOriginality(revisedText, peerTexts.filter((t) => t !== item.text));
    const scores = scoreCandidate(
      revisedText,
      item.strategy,
      understanding,
      platformSpec,
      originality.originalityScorePct,
      preferences
    );

    const titleItem: TitleCandidateItem = {
      title: revisedText,
      style: formatStrategyStyleLabel(item.strategy),
      charCount: revisedText.length,
      predictedCtrTier: scores.totalScore > 88 ? 'Exceptional' : scores.totalScore > 75 ? 'Very Strong' : 'Strong',
      hookAngle: item.strategy,
      score: scores.totalScore,
      explanations: scores.explanations,
      scoreDisclaimer: scores.scoreDisclaimer,
    };

    evaluatedCandidates.push({
      id: item.id,
      strategy: item.strategy,
      content: titleItem,
      displayText: revisedText,
      scores,
      originalityScore: originality.originalityScorePct,
      passedQualityGate: scores.totalScore >= 60,
      critiqueNotes: critique.criticNotes,
      revisionAttempts: critique.revisionAttempts,
    });
  }

  return rankCandidates(evaluatedCandidates);
}

export function generateHookCandidates(
  understanding: StructuredTopicUnderstanding,
  strategies: CreativeStrategyType[],
  seed: number = 0,
  preferences?: UserGenerationPreferences
): CandidateOutput<HookCandidateItem>[] {
  const platformSpec = PLATFORM_SPECS['YouTube']!;
  const candidates: CandidateOutput<HookCandidateItem>[] = [];

  for (let i = 0; i < strategies.length; i++) {
    const strat = strategies[i];
    let hookData: { spokenHook: string; visualDirection: string; retentionTrigger: string; deliveryTip: string };

    if (understanding.detectedLanguage === 'Tamil' || understanding.isTamilScript) {
      hookData = formatTamilHook(understanding, strat, seed + i);
    } else if (understanding.detectedLanguage === 'Tanglish' || understanding.isTanglish) {
      hookData = formatTanglishHook(understanding, strat, seed + i);
    } else if (understanding.detectedLanguage === 'Hindi' || understanding.isHindiScript) {
      hookData = formatHindiHook(understanding, strat, seed + i);
    } else {
      hookData = formatEnglishHook(understanding, strat, seed + i);
    }

    const critique = critiqueAndRevise(hookData.spokenHook, understanding, platformSpec, 2);
    const cleanSpoken = critique.revisedText || hookData.spokenHook;
    const originality = evaluateOriginality(cleanSpoken, []);
    const scores = scoreCandidate(
      cleanSpoken,
      strat,
      understanding,
      platformSpec,
      originality.originalityScorePct,
      preferences
    );

    const hookItem: HookCandidateItem = {
      spokenHook: cleanSpoken,
      visualDirection: hookData.visualDirection,
      retentionTrigger: hookData.retentionTrigger,
      deliveryTip: hookData.deliveryTip,
    };

    candidates.push({
      id: `hook-cand-${i}-${strat}`,
      strategy: strat,
      content: hookItem,
      displayText: `"${cleanSpoken}"\n[Visual: ${hookData.visualDirection}]\n[Trigger: ${hookData.retentionTrigger}]`,
      scores,
      originalityScore: originality.originalityScorePct,
      passedQualityGate: scores.totalScore >= 60,
      critiqueNotes: critique.criticNotes,
      revisionAttempts: critique.revisionAttempts,
    });
  }

  return rankCandidates(candidates);
}

function formatStrategyStyleLabel(strategy: CreativeStrategyType): string {
  switch (strategy) {
    case 'curiosity_mystery':
      return 'Curiosity Gap';
    case 'problem_solution':
      return 'Direct Fix';
    case 'unexpected_contrast':
      return 'Expectation Subversion';
    case 'storytelling_case_study':
      return 'Real Experience';
    case 'myth_vs_fact':
      return 'Myth Buster';
    case 'practical_tutorial':
      return 'Actionable Blueprint';
    case 'question_led':
      return 'Core Question';
    case 'beginner_friendly':
      return 'Beginner Guide';
    case 'contrarian_perspective':
      return 'Contrarian Take';
    case 'emotional_narrative':
      return 'Creator Journey';
  }
}
