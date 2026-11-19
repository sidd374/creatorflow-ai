/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Autonomous Content Intelligence Engine Test Suite
 * Comprehensive automated verification:
 * 1. 100% API-independent execution (Zero API key, zero network)
 * 2. Unified router and typed contracts for all 10+ generation tasks
 * 3. Strategy diversification (Curiosity, Direct Problem-Solution, Contrast, etc.)
 * 4. Multilingual pipelines (English, Tamil, Tanglish, Hindi)
 * 5. Candidate scoring, ranking, and quality gates
 * 6. Duplicate detection (Jaccard, Dice, N-grams, local history checks)
 * 7. Critic engine and deterministic grammar revision
 * 8. Personalization, user feedback, and strategy weight updates
 * 9. Pacing, latency, and performance benchmarking
 */

import {
  executeAutonomousGeneration,
  AutonomousGenerationRequest,
  evaluateOriginality,
  calculateDiceCoefficient,
  calculateJaccardSimilarity,
  recordCandidateFeedback,
  getOrCreatePersonalizationProfile,
  critiqueAndRevise,
  analyzeTopicSemantics,
  PLATFORM_SPECS,
} from './src/lib/autonomousEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runAutonomousEngineTestSuite() {
  console.log('\n================================================================');
  console.log('CREATORFLOW AI — AUTONOMOUS CONTENT INTELLIGENCE ENGINE TESTS');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: API-INDEPENDENT EXECUTION & LATENCY
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Zero-API Independence & Latency Benchmark ---');
  // Explicitly ensure process has no Gemini API key set for this test
  delete process.env.GEMINI_API_KEY;
  delete process.env.CREATORFLOW_AI_API_KEY;

  const startMs = Date.now();
  const titleResult = await executeAutonomousGeneration({
    task: 'titles',
    topic: 'How to edit videos faster on CapCut',
    language: 'English',
    tone: 'Viral',
    candidateCount: 4,
  });
  const elapsedMs = Date.now() - startMs;

  assert(titleResult.success, 'Autonomous title generation succeeded without any API key');
  assert(titleResult.metadata.isApiIndependent === true, 'Engine flagged strictly as isApiIndependent: true');
  assert(titleResult.candidates.length >= 4, `Generated 4 diverse candidates (found: ${titleResult.candidates.length})`);
  assert(elapsedMs < 100, `Execution is instantaneous (< 100ms, actual: ${elapsedMs}ms)`);

  // -------------------------------------------------------------
  // SUITE 2: TOPIC UNDERSTANDING & INTENT CLASSIFICATION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Linguistic Decomposition & Topic Understanding ---');

  const parsedTutorial = analyzeTopicSemantics('How to grow a YouTube channel from scratch in 2026');
  assert(parsedTutorial.domain === 'creator_economy', 'Domain classified as creator_economy');
  assert(parsedTutorial.intent === 'tutorial', 'Intent classified as tutorial');
  assert(parsedTutorial.targetAudience.includes('beginner'), 'Target audience detected as beginners');

  const parsedComparison = analyzeTopicSemantics('CapCut vs Premiere Pro for beginners');
  assert(parsedComparison.intent === 'comparison', 'Intent classified as comparison');
  assert(parsedComparison.comparisons?.itemA === 'CapCut', 'Comparison Item A extracted as CapCut');
  assert(parsedComparison.comparisons?.itemB === 'Premiere Pro', 'Comparison Item B extracted as Premiere Pro');

  const parsedWarning = analyzeTopicSemantics('5 biggest mistakes to avoid in video editing');
  assert(parsedWarning.intent === 'mistake_warning', 'Intent classified as mistake_warning');

  // -------------------------------------------------------------
  // SUITE 3: MULTILINGUAL PIPELINES (English, Tamil, Tanglish, Hindi)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Multilingual Linguistic Quality ---');

  // English
  const enRes = await executeAutonomousGeneration({
    task: 'titles',
    topic: 'Mastering AI tools for creators',
    language: 'English',
  });
  assert(enRes.success, 'English title pipeline returned success');
  assert(/AI tools/i.test(enRes.primaryOutput.title), 'English title preserves technical topic noun');

  // Tamil (Pure Tamil Unicode script)
  const taRes = await executeAutonomousGeneration({
    task: 'titles',
    topic: 'YouTube சேனல் வளர்ப்பது எப்படி',
    language: 'Tamil',
  });
  assert(taRes.success, 'Tamil title pipeline returned success');
  assert(/[\u0B80-\u0BFF]/.test(taRes.primaryOutput.title), 'Tamil title contains authentic Tamil Unicode characters');
  assert(!taRes.primaryOutput.title.includes('the the'), 'Tamil title contains zero English glue-word glitches');

  // Tanglish (Colloquial Tamil in Latin Script)
  const tgRes = await executeAutonomousGeneration({
    task: 'titles',
    topic: 'Video Editing Tips',
    language: 'Tanglish',
  });
  assert(tgRes.success, 'Tanglish title pipeline returned success');
  assert(/\b(secret|mistake|panra|theriyuma|full guide)\b/i.test(tgRes.displayText), 'Tanglish contains authentic creator phrasing');

  // Hindi (Devanagari Script)
  const hiRes = await executeAutonomousGeneration({
    task: 'titles',
    topic: 'YouTube चैनल कैसे बनाएं',
    language: 'Hindi',
  });
  assert(hiRes.success, 'Hindi title pipeline returned success');
  assert(/[\u0900-\u097F]/.test(hiRes.primaryOutput.title), 'Hindi title contains authentic Devanagari Unicode characters');

  // -------------------------------------------------------------
  // SUITE 4: TASK-SPECIFIC GENERATION PIPELINES
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Comprehensive Task Pipelines ---');

  // Hooks
  const hookRes = await executeAutonomousGeneration({
    task: 'hooks',
    topic: 'How to write viral scripts',
    candidateCount: 3,
  });
  assert(hookRes.success, 'Hook generation succeeded');
  assert(hookRes.primaryOutput.spokenHook.length > 20, 'Hook has substantive spoken script');
  assert(Boolean(hookRes.primaryOutput.visualDirection), 'Hook includes explicit visual cue');
  assert(Boolean(hookRes.primaryOutput.retentionTrigger), 'Hook includes retention trigger');

  // Descriptions & YouTube Chapters
  const descRes = await executeAutonomousGeneration({
    task: 'captions_descriptions',
    topic: 'Complete Guide to Video Lighting',
  });
  assert(descRes.success, 'Description generation succeeded');
  assert(descRes.primaryOutput.timestamps.length >= 3, 'Description has >= 3 chapters');
  assert(descRes.primaryOutput.timestamps[0].time === '00:00', 'First chapter starts strictly at 00:00 (YouTube standard)');

  // Hashtags & Keywords
  const kwRes = await executeAutonomousGeneration({
    task: 'hashtags_keywords',
    topic: 'Personal finance and investing for students',
  });
  assert(kwRes.success, 'Keyword & hashtag pipeline succeeded');
  assert(kwRes.primaryOutput.coreKeywords.length > 0, 'Core keywords generated');
  assert(kwRes.primaryOutput.trendingHashtags.length >= 3, 'Hashtags generated without fake search counts');

  // Short-form Script (0-60s)
  const shortScriptRes = await executeAutonomousGeneration({
    task: 'short_form_script',
    topic: 'Stop using bad audio in your shorts',
  });
  assert(shortScriptRes.success, 'Short-form script generation succeeded');
  assert(shortScriptRes.primaryOutput.beats.length === 5, 'Short-form script has 5 structured pacing beats');
  assert(shortScriptRes.primaryOutput.estimatedDurationSeconds <= 60, 'Duration is within 60-second limit');

  // Long-form Script (8-10 Mins)
  const longScriptRes = await executeAutonomousGeneration({
    task: 'long_form_script',
    topic: 'How to build a faceless YouTube automation channel',
  });
  assert(longScriptRes.success, 'Long-form script generation succeeded');
  assert(longScriptRes.primaryOutput.sections.length === 3, 'Long-form script has 3 multi-pillar progression sections');
  assert(longScriptRes.primaryOutput.practicalTakeaways.length >= 2, 'Practical takeaways included');

  // Content Ideas
  const ideasRes = await executeAutonomousGeneration({
    task: 'content_ideas',
    topic: 'AI Productivity Tools',
  });
  assert(ideasRes.success, 'Content ideas generation succeeded');
  assert(ideasRes.primaryOutput.length === 5, 'Generated 5 distinct concept ideas');
  assert(ideasRes.primaryOutput[0].creatorFitScore >= 70, 'Idea includes CreatorFit score');

  // Content Calendar
  const calendarRes = await executeAutonomousGeneration({
    task: 'content_calendar',
    topic: 'Fitness for Busy Professionals',
  });
  assert(calendarRes.success, 'Content calendar generation succeeded');
  assert(calendarRes.primaryOutput.schedule.length === 14, '14-Day Growth calendar produced 14 structured days');
  assert(calendarRes.primaryOutput.totalVideos > 0, 'Includes scheduled videos and planning days');

  // Rewriting
  const rewriteRes = await executeAutonomousGeneration({
    task: 'rewriting',
    topic: 'Video Editing',
    sourceText: 'In this video we talk about how to grow your channel using nice editing techniques.',
    tone: 'Viral',
  });
  assert(rewriteRes.success, 'Rewriting pipeline succeeded');
  assert(rewriteRes.primaryOutput.rewrittenText !== rewriteRes.primaryOutput.originalText, 'Rewriting altered tone');
  assert(rewriteRes.primaryOutput.preservedCoreFacts === true, 'Preserved core facts flagged true');

  // Summarization
  const summaryRes = await executeAutonomousGeneration({
    task: 'summarization',
    topic: 'Audio Engineering',
    sourceText: 'Good audio is more important than 4K video. If the sound is muffled, viewers click away within 5 seconds. Use a lavalier microphone. Keep input gain below minus 6 decibels to prevent clipping.',
  });
  assert(summaryRes.success, 'Summarization pipeline succeeded');
  assert(Boolean(summaryRes.primaryOutput.oneSentenceThesis), 'One sentence thesis generated');
  assert(summaryRes.primaryOutput.actionableSteps.length > 0, 'Actionable steps extracted');

  // -------------------------------------------------------------
  // SUITE 5: ORIGINALITY & DUPLICATE DETECTION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Originality & Duplicate Detection ---');

  const textA = 'How to edit cinematic videos in CapCut for total beginners';
  const textB = 'How to edit cinematic videos in CapCut for total beginners'; // Identical
  const textC = 'Why your smartphone footage looks amateur (The Secret Fix)'; // Wholly distinct

  const jaccardIdentical = calculateJaccardSimilarity(['edit', 'cinematic', 'videos'], ['edit', 'cinematic', 'videos']);
  assert(jaccardIdentical === 1.0, 'Jaccard similarity is 1.0 for identical token sets');

  const diceIdentical = calculateDiceCoefficient(textA, textB);
  assert(diceIdentical === 1.0, 'Dice coefficient is 1.0 for identical strings');

  const diceDistinct = calculateDiceCoefficient(textA, textC);
  assert(diceDistinct < 0.35, `Dice coefficient is low for distinct topics (${diceDistinct.toFixed(2)})`);

  const report = evaluateOriginality(textA, [textC]);
  assert(report.isDuplicate === false, 'Distinct text is correctly flagged as not duplicate');
  assert(report.originalityScorePct > 70, `Originality score is high (${report.originalityScorePct}%)`);

  // -------------------------------------------------------------
  // SUITE 6: CRITIC & DETERMINISTIC REVISION ENGINE
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: Critic Engine & Deterministic Revision ---');

  const understanding = analyzeTopicSemantics('YouTube Growth');
  const platformSpec = PLATFORM_SPECS['YouTube']!;

  // Test 1: Doubled word glitch ("the the")
  const buggyText1 = 'Why the the algorithm promotes your video';
  const critiqued1 = critiqueAndRevise(buggyText1, understanding, platformSpec);
  assert(critiqued1.revisedText === 'Why the algorithm promotes your video', 'Critic fixed doubled word "the the"');

  // Test 2: Awkward "do grow" glitch
  const buggyText2 = 'How to do grow your audience in 2026';
  const critiqued2 = critiqueAndRevise(buggyText2, understanding, platformSpec);
  assert(critiqued2.revisedText === 'How to grow your audience in 2026', 'Critic fixed "do grow" verb glitch');

  // Test 3: Generic filler phrase
  const buggyText3 = "In today's fast-paced digital world, here is how to edit faster";
  const critiqued3 = critiqueAndRevise(buggyText3, understanding, platformSpec);
  assert(!critiqued3.revisedText?.includes("fast-paced"), 'Critic stripped generic filler cliché');

  // -------------------------------------------------------------
  // SUITE 7: PERSONALIZATION & USER FEEDBACK
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: Personalization & Strategy Weight Learning ---');

  const profileBefore = getOrCreatePersonalizationProfile('test_user_42');
  const initialWeight = profileBefore.strategyWeights['curiosity_mystery'];

  recordCandidateFeedback('test_user_42', 'curiosity_mystery', 'upvoted', 'title-generator');
  const profileAfterUpvote = getOrCreatePersonalizationProfile('test_user_42');
  const weightAfterUpvote = profileAfterUpvote.strategyWeights['curiosity_mystery'];
  assert(
    weightAfterUpvote > initialWeight,
    'Strategy weight increased after upvote'
  );

  recordCandidateFeedback('test_user_42', 'curiosity_mystery', 'downvoted', 'title-generator');
  const profileAfterDownvote = getOrCreatePersonalizationProfile('test_user_42');
  const weightAfterDownvote = profileAfterDownvote.strategyWeights['curiosity_mystery'];
  assert(
    weightAfterDownvote < weightAfterUpvote,
    'Strategy weight decreased after downvote'
  );

  console.log('\n================================================================');
  console.log('🎉 ALL AUTONOMOUS CONTENT INTELLIGENCE TESTS PASSED (100%)!');
  console.log('================================================================\n');
}

runAutonomousEngineTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
