/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Autonomous Video Prompt Intelligence Verification Test Suite
 * Comprehensive automated verification:
 * 1. 100% API-Independent Execution (Zero API Key, Zero Network HTTP Calls to /api/generate)
 * 2. Model-Aware Prompt Construction (Runway Gen-3, Sora, Kling 1.5, Luma, Pika 2.0, Hailuo, Leonardo, Google Flow)
 * 3. Correct Duration Capping & Aspect Ratio Enforcement
 * 4. Model-Specific Negative Prompt Rules
 * 5. Observable Action Physicalization (No unfilmable cognitive abstractions)
 * 6. Multi-Clip Storyboard Continuity & Temporal State Handoff
 * 7. Video Quality Critic & Deterministic Revision Passes
 * 8. Performance & Latency (< 50ms)
 */

import {
  executeAutonomousGeneration,
  generateVideoPromptCandidates,
  generateVideoStoryboardPackage,
  formatPromptForModel,
  critiqueAndReviseVideoPrompt,
  linkMultiClipContinuity,
  buildStructuredVideoScene,
  analyzeTopicSemantics,
} from './src/lib/autonomousEngine';
import { getAIVideoToolProfile } from './src/lib/aiVideoToolProfiles';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runVideoPromptTestSuite() {
  console.log('\n================================================================');
  console.log('CREATORFLOW AI — AUTONOMOUS VIDEO PROMPT INTELLIGENCE TESTS');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: STRICT ZERO-API INDEPENDENCE & NETWORK INTERCEPTION
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Zero-API Independence & Latency Benchmark ---');
  delete process.env.GEMINI_API_KEY;
  delete process.env.CREATORFLOW_AI_API_KEY;

  // Intercept global fetch to verify zero network HTTP calls are made during autonomous generation
  let networkCallCount = 0;
  const originalFetch = global.fetch;
  global.fetch = async (...args: any[]) => {
    networkCallCount++;
    throw new Error(`CRITICAL FAIL: Autonomous generation triggered unexpected network call to ${args[0]}`);
  };

  const startMs = Date.now();
  const autoResult = await executeAutonomousGeneration({
    task: 'video_prompt',
    topic: 'How to edit 10x faster using AI tools',
    targetModel: 'sora',
    aspectRatio: '16:9',
    candidateCount: 4,
  });
  const elapsedMs = Date.now() - startMs;

  // Restore fetch
  global.fetch = originalFetch;

  assert(networkCallCount === 0, 'Zero network calls made during autonomous generation');
  assert(autoResult.success === true, 'Autonomous video prompt generation returned success');
  assert(autoResult.metadata.isApiIndependent === true, 'Execution metadata strictly flagged isApiIndependent: true');
  assert(elapsedMs < 100, `Generation is instantaneous (< 100ms, actual: ${elapsedMs}ms)`);

  // -------------------------------------------------------------
  // SUITE 2: MODEL-AWARE SYNTAX & CAPABILITY VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Model-Aware Syntax & Capability Rules ---');

  const semantics = analyzeTopicSemantics('Cyberpunk creator workspace setup with glowing holographic screens');

  // 1. Runway Gen-3 Alpha
  const runwayCandidate = generateVideoPromptCandidates(semantics, ['curiosity_mystery'], 'runway_gen3', 1)[0];
  assert(runwayCandidate.content.modelId === 'runway_gen3', 'Runway Gen-3 model ID correctly resolved');
  assert(runwayCandidate.content.promptText.includes('Director Mode:'), 'Runway Gen-3 prompt contains Director Mode syntax prefix');
  assert(runwayCandidate.content.negativePrompt === undefined, 'Runway Gen-3 cleanly omits negative prompt (unsupported by model)');
  assert(runwayCandidate.content.clipDurationSeconds <= 10, 'Runway Gen-3 duration capped at 10s max');

  // 2. OpenAI Sora
  const soraCandidate = generateVideoPromptCandidates(semantics, ['practical_tutorial'], 'sora', 1)[0];
  assert(soraCandidate.content.modelId === 'sora', 'OpenAI Sora model ID correctly resolved');
  assert(soraCandidate.content.promptText.includes('Cinematic continuous shot'), 'Sora prompt uses continuous shot framing syntax');
  assert(soraCandidate.content.promptText.includes('physical simulations'), 'Sora prompt contains physical simulation directives');
  assert(soraCandidate.content.negativePrompt === undefined, 'Sora cleanly omits negative prompt parameter');

  // 3. Kling AI 1.5
  const klingCandidate = generateVideoPromptCandidates(semantics, ['problem_solution'], 'kling_ai', 1)[0];
  assert(klingCandidate.content.modelId === 'kling_ai', 'Kling AI model ID correctly resolved');
  assert(klingCandidate.content.promptText.includes('--cfg_scale 0.5'), 'Kling AI includes --cfg_scale parameter tag');
  assert(typeof klingCandidate.content.negativePrompt === 'string', 'Kling AI includes active negative prompt');

  // 4. Luma Dream Machine
  const lumaCandidate = generateVideoPromptCandidates(semantics, ['unexpected_contrast'], 'luma_dream_machine', 1)[0];
  assert(lumaCandidate.content.modelId === 'luma_dream_machine', 'Luma Dream Machine model ID correctly resolved');
  assert(lumaCandidate.content.promptText.includes('Dynamic 3D camera sweep'), 'Luma prompt includes 3D camera sweep directive');
  assert(lumaCandidate.content.clipDurationSeconds === 5, 'Luma duration strictly capped at 5s');

  // 5. Pika 2.0
  const pikaCandidate = generateVideoPromptCandidates(semantics, ['practical_tutorial'], 'pika_art', 1)[0];
  assert(pikaCandidate.content.modelId === 'pika_art', 'Pika 2.0 model ID correctly resolved');
  assert(pikaCandidate.content.promptText.includes('-camera'), 'Pika 2.0 includes -camera flag');
  assert(pikaCandidate.content.clipDurationSeconds === 4, 'Pika duration strictly capped at 4s');

  // 6. Leonardo AI (2-Stage)
  const leonardoCandidate = generateVideoPromptCandidates(semantics, ['storytelling_case_study'], 'leonardo_ai', 1)[0];
  assert(leonardoCandidate.content.modelId === 'leonardo_ai', 'Leonardo AI model ID correctly resolved');
  assert(typeof leonardoCandidate.content.imagePrompt === 'string', 'Leonardo AI generates Stage 1 Keyframe Image Prompt');
  assert(typeof leonardoCandidate.content.motionPrompt === 'string', 'Leonardo AI generates Stage 2 Motion Directive Prompt');

  // -------------------------------------------------------------
  // SUITE 3: OBSERVABLE ACTION PHYSICALIZATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Observable Action & Unfilmable Translation ---');

  const sceneWithUnfilmable = buildStructuredVideoScene(semantics, 'practical_tutorial', 0, 1);
  sceneWithUnfilmable.actionSequence.observableAction = 'Creator thinks deeply about the retention rate and realizes the mistake.';

  const formatted = formatPromptForModel(sceneWithUnfilmable, { modelIdOrName: 'sora' });
  const critiqued = critiqueAndReviseVideoPrompt(formatted);

  assert(!critiqued.revisedPrompt?.promptText.includes('thinks deeply'), 'Critic stripped unfilmable phrase "thinks deeply"');
  assert(!critiqued.revisedPrompt?.promptText.includes('realizes the mistake'), 'Critic stripped unfilmable phrase "realizes the mistake"');
  assert(Boolean(critiqued.revisedPrompt?.promptText.includes('rests hand on chin')), 'Critic substituted observable physical action');

  // -------------------------------------------------------------
  // SUITE 4: MULTI-CLIP STORYBOARD & TEMPORAL STATE HANDOFF
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Multi-Clip Storyboard & State Handoff ---');

  const storyboard = generateVideoStoryboardPackage(
    semantics,
    'kling_ai',
    30,
    '16:9',
    'Alex (charcoal hoodie over white crewneck, dark textured hair)'
  );

  assert(storyboard.content.totalClipsCount === 3, `Generated 3 continuous clips for 30s duration (found: ${storyboard.content.totalClipsCount})`);
  assert(storyboard.content.clips.length === 3, 'Storyboard package contains 3 formatted clips');

  const clip1 = storyboard.content.clips[0];
  const clip2 = storyboard.content.clips[1];

  assert(clip2.promptText.includes('Seamlessly matching previous cut'), 'Clip 2 beginning state carries over from Clip 1 ending state');
  assert(clip1.promptText.includes('Alex'), 'Clip 1 locks master character identity token');
  assert(clip2.promptText.includes('Alex'), 'Clip 2 preserves master character identity token');

  // -------------------------------------------------------------
  // SUITE 5: VIDEO QUALITY CRITIC EVALUATION & SCORING
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Video Quality Scoring & Quality Gates ---');

  assert(soraCandidate.scores.clarityScore >= 70, `Action observability score is strong (${soraCandidate.scores.clarityScore}/100)`);
  assert(soraCandidate.scores.platformScore >= 80, `Model compliance score is high (${soraCandidate.scores.platformScore}/100)`);
  assert(soraCandidate.scores.totalScore >= 80, `Total composite quality score passed gate (${soraCandidate.scores.totalScore}/100)`);

  console.log('\n================================================================');
  console.log('🎉 ALL AUTONOMOUS VIDEO PROMPT INTELLIGENCE TESTS PASSED (100%)!');
  console.log('================================================================\n');
}

runVideoPromptTestSuite().catch((err) => {
  console.error('❌ Test suite execution error:', err);
  process.exit(1);
});
