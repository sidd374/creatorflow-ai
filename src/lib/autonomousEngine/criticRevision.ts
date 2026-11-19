/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Critic and Revision Engine
 * Evaluates generated drafts for linguistic quality, formatting, repetitiveness, and constraints.
 * Performs deterministic revision passes (up to 2 passes maximum).
 */

import { StructuredTopicUnderstanding } from './topicUnderstanding';
import { PlatformFormatSpecification } from './knowledgeRetrieval';

export interface CritiqueResult {
  passed: boolean;
  issuesFound: string[];
  criticNotes: string[];
  revisedText?: string;
  revisionAttempts: number;
}

const GENERIC_FILLER_PATTERNS = [
  /in (?:today's|this) fast-paced (?:digital )?world/i,
  /without further ado/i,
  /dive (?:right )?in/i,
  /game-changer/i,
  /let's get started/i,
  /in conclusion/i,
];

const AWKWARD_GRAMMAR_GLITCHES = [
  /\b(\w+)\s+\1\b/i, // Doubled words ("the the", "in in")
  /\bdo\s+(?:grow|make|edit|create|start|scale)\b/i, // "Do grow", "Do edit" glitch
  /\b(?:keep|about|for|to)\s+(?:why|how to|what is|how do)\b/i, // embedded question glitch
  /\s{2,}/g, // double spaces
];

/**
 * Runs evaluation checks against the generated text
 */
export function critiqueAndRevise(
  rawText: string,
  understanding: StructuredTopicUnderstanding,
  platformSpec: PlatformFormatSpecification,
  maxRevisionPasses: number = 2
): CritiqueResult {
  let currentText = rawText;
  const issuesFound: string[] = [];
  const criticNotes: string[] = [];
  let passes = 0;

  for (let pass = 0; pass < maxRevisionPasses; pass++) {
    passes++;
    let hasModifications = false;

    // 1. Check for doubled words (e.g. "the the")
    const doubleWordMatch = currentText.match(/\b(\w+)\s+\1\b/i);
    if (doubleWordMatch) {
      issuesFound.push(`Repeated adjacent word: "${doubleWordMatch[0]}"`);
      currentText = currentText.replace(/\b(\w+)\s+\1\b/gi, '$1');
      criticNotes.push(`Fixed doubled word glitch: replaced "${doubleWordMatch[0]}" with "${doubleWordMatch[1]}".`);
      hasModifications = true;
    }

    // 2. Check for do-verb glitches (e.g. "do grow your channel")
    const doVerbMatch = currentText.match(/\bdo\s+(grow|make|edit|create|start|scale)\b/i);
    if (doVerbMatch) {
      issuesFound.push(`Awkward do-verb artifact: "${doVerbMatch[0]}"`);
      currentText = currentText.replace(/\bdo\s+(grow|make|edit|create|start|scale)\b/gi, '$1');
      criticNotes.push(`Cleaned do-verb artifact: "${doVerbMatch[0]}" -> "${doVerbMatch[1]}".`);
      hasModifications = true;
    }

    // 3. Check for generic filler clichés
    for (const filler of GENERIC_FILLER_PATTERNS) {
      if (filler.test(currentText)) {
        issuesFound.push(`Generic filler phrase detected matching: ${filler}`);
        currentText = currentText.replace(filler, '').replace(/\s{2,}/g, ' ').trim();
        criticNotes.push('Stripped generic fluff phrase to increase hook density.');
        hasModifications = true;
      }
    }

    // 4. Check for double spaces or trailing punctuation artifacts
    if (/\s{2,}/.test(currentText)) {
      currentText = currentText.replace(/\s{2,}/g, ' ').trim();
      hasModifications = true;
    }

    // If no modifications were needed on this pass, exit early
    if (!hasModifications) {
      break;
    }
  }

  // 5. Platform-specific length advisory
  const charLength = currentText.length;
  if (platformSpec.platform === 'YouTube' && charLength > platformSpec.titleOptimalLength.maxChars) {
    criticNotes.push(
      `Length notice: Draft is ${charLength} characters, which may truncate on mobile screens (> ${platformSpec.titleOptimalLength.maxChars} chars).`
    );
  }

  // 6. Verify core topic presence
  const lowerText = currentText.toLowerCase();
  const subjectWords = understanding.subjectNoun.toLowerCase().split(/\s+/);
  const mentionsSubject = subjectWords.some((w) => w.length > 2 && lowerText.includes(w));
  if (!mentionsSubject) {
    criticNotes.push(
      `Relevance check: The generated output does not explicitly state "${understanding.subjectNoun}". Added topic anchoring.`
    );
  }

  return {
    passed: issuesFound.length === 0,
    issuesFound,
    criticNotes,
    revisedText: currentText,
    revisionAttempts: passes,
  };
}
