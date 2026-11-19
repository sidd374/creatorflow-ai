/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Video Quality Evaluation & Critic Revision Engine
 * Evaluates video prompts across observable action clarity, camera feasibility,
 * model compliance, visual depth, and temporal continuity.
 * Performs deterministic revision passes (up to 2 passes).
 */

import { FormattedModelPrompt } from './modelAdapters';
import { physicalizeAction } from './visualPlanning';
import { getAIVideoToolProfile } from '../../aiVideoToolProfiles';

export interface VideoPromptQualityScore {
  actionObservabilityScore: number;  // 0-100: concrete physical verbs vs mental abstractions
  cameraFeasibilityScore: number;    // 0-100: realistic, un-conflicted camera directives
  modelComplianceScore: number;      // 0-100: adheres to duration, syntax, and negative prompt rules
  visualDepthScore: number;          // 0-100: foreground, middle ground, background spatial presence
  temporalContinuityScore: number;   // 0-100: coherent beginning -> action -> ending trajectory
  totalScore: number;                // Weighted composite 0-100
}

export interface VideoCriticResult {
  passed: boolean;
  scores: VideoPromptQualityScore;
  issuesIdentified: string[];
  criticNotes: string[];
  revisedPrompt?: FormattedModelPrompt;
  revisionAttempts: number;
}

const OBSERVABLE_VERBS = [
  'taps', 'presses', 'glides', 'gestures', 'turns', 'steps', 'draws',
  'opens', 'points', 'types', 'holds', 'lifts', 'rotates', 'slides',
  'walks', 'smiles', 'nods', 'reaches', 'leans', 'swipes'
];

const CONFLICTING_CAMERA_PAIRS = [
  { termA: /push[- ]in|zoom in/i, termB: /pull[- ]back|zoom out/i, fix: 'slow deliberate push-in' },
  { termA: /pan left/i, termB: /pan right/i, fix: 'smooth lateral pan' },
  { termA: /crane up/i, termB: /crane down/i, fix: 'crane down reveal' },
];

/**
 * Computes transparent, normalized quality scores for a video prompt candidate
 */
export function scoreVideoPromptCandidate(prompt: FormattedModelPrompt): VideoPromptQualityScore {
  const text = prompt.promptText.toLowerCase();
  const profile = getAIVideoToolProfile(prompt.modelId);

  // 1. Action Observability Score
  let actionScore = 65;
  let verbMatches = 0;
  for (const verb of OBSERVABLE_VERBS) {
    if (text.includes(verb)) verbMatches++;
  }
  actionScore += Math.min(30, verbMatches * 8);

  // Penalize unfilmable words if any slipped in
  if (/\b(?:thinks|feels|understands|ponders|realizes)\b/i.test(text)) {
    actionScore -= 20;
  }
  const actionObservabilityScore = Math.min(100, Math.max(30, actionScore));

  // 2. Camera Feasibility Score
  let cameraScore = 90;
  for (const pair of CONFLICTING_CAMERA_PAIRS) {
    if (pair.termA.test(text) && pair.termB.test(text)) {
      cameraScore -= 30; // Conflicting camera move penalty
    }
  }
  const cameraFeasibilityScore = Math.min(100, Math.max(40, cameraScore));

  // 3. Model Compliance Score
  let modelScore = 85;
  const maxAllowedDuration = profile.maxClipDurationSeconds || 10;
  if (prompt.clipDurationSeconds <= maxAllowedDuration) {
    modelScore += 10;
  } else {
    modelScore -= 25; // Exceeded model capability
  }

  // Check negative prompt handling
  if (!profile.supportsNegativePrompt && prompt.negativePrompt) {
    modelScore -= 15; // Model does not accept negative prompts
  } else if (profile.supportsNegativePrompt && prompt.negativePrompt) {
    modelScore += 5;
  }
  const modelComplianceScore = Math.min(100, Math.max(30, modelScore));

  // 4. Visual Depth Score
  let depthScore = 70;
  if (text.includes('foreground') || text.includes('desk') || text.includes('table')) depthScore += 10;
  if (text.includes('background') || text.includes('setting') || text.includes('studio') || text.includes('environment')) depthScore += 10;
  if (text.includes('lighting') || text.includes('key') || text.includes('shadow')) depthScore += 10;
  const visualDepthScore = Math.min(100, Math.max(40, depthScore));

  // 5. Temporal Continuity Score
  let temporalScore = 75;
  if (text.includes('transitioning into') || text.includes('moving smoothly') || text.includes('cut') || text.includes('seamlessly')) {
    temporalScore += 15;
  }
  if (prompt.observableAction && prompt.observableAction.length > 20) {
    temporalScore += 10;
  }
  const temporalContinuityScore = Math.min(100, Math.max(40, temporalScore));

  // Weighted total score
  const totalScore = Math.round(
    actionObservabilityScore * 0.25 +
    cameraFeasibilityScore * 0.20 +
    modelComplianceScore * 0.25 +
    visualDepthScore * 0.15 +
    temporalContinuityScore * 0.15
  );

  return {
    actionObservabilityScore,
    cameraFeasibilityScore,
    modelComplianceScore,
    visualDepthScore,
    temporalContinuityScore,
    totalScore,
  };
}

/**
 * Runs critique and deterministic revision passes
 */
export function critiqueAndReviseVideoPrompt(
  prompt: FormattedModelPrompt,
  maxPasses: number = 2
): VideoCriticResult {
  let revised = { ...prompt };
  const issuesIdentified: string[] = [];
  const criticNotes: string[] = [];
  let passes = 0;

  for (let pass = 0; pass < maxPasses; pass++) {
    passes++;
    let madeChanges = false;

    // 1. Check for unfilmable cognitive words
    const physicalization = physicalizeAction(revised.promptText);
    if (physicalization.modifications.length > 0) {
      revised.promptText = physicalization.physicalized;
      physicalization.modifications.forEach((m) => criticNotes.push(m));
      issuesIdentified.push('Detected abstract cognitive description in prompt text.');
      madeChanges = true;
    }

    // 2. Check for conflicting camera directives
    for (const pair of CONFLICTING_CAMERA_PAIRS) {
      if (pair.termA.test(revised.promptText) && pair.termB.test(revised.promptText)) {
        issuesIdentified.push(`Conflicting camera movement detected (${pair.termA.source} vs ${pair.termB.source}).`);
        revised.promptText = revised.promptText
          .replace(pair.termA, pair.fix)
          .replace(pair.termB, '');
        criticNotes.push(`Resolved opposing camera directives into unified "${pair.fix}".`);
        madeChanges = true;
      }
    }

    // 3. Enforce model negative prompt compatibility
    const profile = getAIVideoToolProfile(revised.modelId);
    if (!profile.supportsNegativePrompt && revised.negativePrompt) {
      issuesIdentified.push(`${profile.name} does not accept negative prompts.`);
      revised.negativePrompt = undefined;
      criticNotes.push(`Stripped negative prompt because ${profile.name} does not accept negative constraints.`);
      madeChanges = true;
    }

    // 4. Enforce duration ceiling
    const maxDur = profile.maxClipDurationSeconds || 10;
    if (revised.clipDurationSeconds > maxDur) {
      issuesIdentified.push(`Requested duration (${revised.clipDurationSeconds}s) exceeded ${profile.name} limit (${maxDur}s).`);
      revised.clipDurationSeconds = maxDur;
      criticNotes.push(`Capped clip duration to verified maximum of ${maxDur}s.`);
      madeChanges = true;
    }

    if (!madeChanges) break;
  }

  const scores = scoreVideoPromptCandidate(revised);
  const passed = scores.totalScore >= 80;

  return {
    passed,
    scores,
    issuesIdentified,
    criticNotes,
    revisedPrompt: revised,
    revisionAttempts: passes,
  };
}
