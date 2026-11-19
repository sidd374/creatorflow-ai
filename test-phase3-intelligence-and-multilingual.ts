/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Phase 3 Verification Suite (Provider Clarity, Personalization Privacy, Variation Seed, Multilingual)
 */

import { generateContentPack } from './src/lib/contentEngine';
import { analyzeTopic } from './src/lib/topicAnalyzer';
import { generateStructuredScript, regenerateSingleSection } from './src/lib/scriptEngine';
import { getLanguagePack } from './src/lib/languagePatterns';
import { LANGUAGES } from './src/data/languages';
import {
  getOrCreatePersonalizationProfile,
  recordCandidateFeedback,
  recordImplicitSignal,
  setPersonalizationEnabled,
  resetPersonalizationProfile,
  getPreferencesFromProfile,
} from './src/lib/autonomousEngine/personalizationEngine';
import {
  callSecureGenerateApi,
  generateContentWithEngine,
  GENERATION_PROVIDER_LABELS,
} from './src/lib/aiGenerateService';
import { ServerApiAssistantProvider, ASSISTANT_PROVIDER_LABELS } from './src/lib/assistantProvider';
import { CreatorProfile, VideoProject } from './src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runPhase3Tests() {
  console.log('\n================================================================');
  console.log('CREATORFLOW AI — PHASE 3 VERIFICATION SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Provider Clarity & No Silent Fallback + Timeout Handling
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Explicit Provider Labels & No Silent Cloud Fallback ---');
  assert(
    GENERATION_PROVIDER_LABELS.autonomous === 'CreatorFlow Local Engine',
    'Generation local provider label is CreatorFlow Local Engine'
  );
  assert(
    GENERATION_PROVIDER_LABELS.gemini_flash === 'Gemini Cloud',
    'Generation cloud provider label is Gemini Cloud'
  );
  assert(
    ASSISTANT_PROVIDER_LABELS.local === 'CreatorFlow Local Engine',
    'Assistant local provider label is CreatorFlow Local Engine'
  );
  assert(
    ASSISTANT_PROVIDER_LABELS.cloud === 'Gemini Cloud',
    'Assistant cloud provider label is Gemini Cloud'
  );

  // Mock fetch to simulate network/timeout error on Cloud and verify NO silent fallback
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      const err: any = new Error('The operation was aborted due to timeout');
      err.name = 'AbortError';
      throw err;
    }) as any;

    const timeoutRes = await callSecureGenerateApi('Write 5 YouTube titles for CapCut editing', undefined, {
      timeoutMs: 50,
    });
    assert(timeoutRes.success === false, 'Cloud timeout returns success: false cleanly');
    assert(timeoutRes.errorCategory === 'timeout', 'AbortError classifies as errorCategory: timeout');
    assert(timeoutRes.engineUsed === 'gemini_flash', 'Failure reports engineUsed as gemini_flash');

    const explicitNoFallback = await generateContentWithEngine(
      { task: 'titles', topic: 'CapCut transitions' },
      'gemini_flash',
      'CapCut transitions tutorial'
    );
    assert(
      explicitNoFallback.success === false && !explicitNoFallback.autonomousResult,
      'generateContentWithEngine does NOT silently fall back to Local Engine on Gemini Cloud failure'
    );

    const assistantMgr = new ServerApiAssistantProvider();
    let assistantThrewExplicitly = false;
    try {
      await assistantMgr.generateResponse(
        [{ id: '1', role: 'user', content: 'Give me title ideas', timestamp: Date.now() }],
        { currentPage: 'dashboard', plan: 'free', creatorProfile: undefined },
        'cloud'
      );
    } catch (e: any) {
      assistantThrewExplicitly = e?.name === 'AssistantProviderError' && e?.errorCategory === 'timeout';
    }
    assert(assistantThrewExplicitly, 'Assistant Cloud failure throws explicit AssistantProviderError (no silent local fallback)');
  } finally {
    globalThis.fetch = origFetch;
  }

  // Verify Local Engine still works deterministically offline
  const localRes = await generateContentWithEngine(
    { task: 'titles', topic: 'CapCut transitions' },
    'autonomous'
  );
  assert(
    localRes.success === true && Boolean(localRes.autonomousResult) && localRes.engineUsed === 'autonomous',
    'CreatorFlow Local Engine executes offline deterministically'
  );

  // -------------------------------------------------------------------------
  // 2. Personalization Privacy Boundary, Implicit Signals, Opt-out & Reset
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Personalization Privacy, Implicit Signals, Opt-out & Reset ---');
  const testAcc = `phase3_test_acc_${Date.now()}`;
  const baseProf = getOrCreatePersonalizationProfile(testAcc);
  const startCuriosity = baseProf.strategyWeights.curiosity_mystery;
  const startTut = baseProf.strategyWeights.practical_tutorial;

  recordImplicitSignal(testAcc, 'curiosity_mystery', 'copied_title', 'titles');
  const afterCopy = recordImplicitSignal(testAcc, 'curiosity_mystery', 'copied_hook', 'hooks');
  assert(
    afterCopy.strategyWeights.curiosity_mystery > startCuriosity,
    'Implicit copy_title & copied_hook increase favored strategy weight'
  );
  assert((afterCopy.implicitSignalsCount || 0) === 2, 'Implicit signal counter tracks lightweight aggregate interactions');

  const afterRegenNoCopy = recordImplicitSignal(testAcc, 'practical_tutorial', 'regenerated_without_copy', 'titles');
  assert(
    afterRegenNoCopy.strategyWeights.practical_tutorial < startTut,
    'Implicit regenerated_without_copy conservatively reduces unchosen strategy weight'
  );

  // Privacy check: ensure no raw user scripts or feedbackText stored in events
  const serializedProfile = JSON.stringify(afterRegenNoCopy);
  assert(!serializedProfile.includes('feedbackText'), 'Personalization profile excludes raw feedbackText field');

  // Opt-out disables weight adjustments AND disables preference bias
  const pausedProf = setPersonalizationEnabled(testAcc, false);
  assert(pausedProf.enabled === false, 'Personalization can be paused');
  const weightWhenPausedBefore = pausedProf.strategyWeights.curiosity_mystery;
  const afterBlockedEvent = recordCandidateFeedback(testAcc, 'curiosity_mystery', 'upvoted', 'titles');
  assert(
    afterBlockedEvent.strategyWeights.curiosity_mystery === weightWhenPausedBefore,
    'When paused, feedback signals do not mutate strategy weights'
  );
  const disabledPrefs = getPreferencesFromProfile(afterBlockedEvent);
  assert(
    (disabledPrefs.favoriteStrategies?.length || 0) === 0 && (disabledPrefs.dislikedStrategies?.length || 0) === 0,
    'Paused personalization returns empty bias lists'
  );

  // When paused, generateContentPack ignores strategyWeights even if passed
  const biasedPausedPack = generateContentPack({
    topic: 'YouTube Growth Secrets',
    platform: 'YouTube',
    language: 'English',
    tone: 'Educational',
    personalizationProfile: {
      enabled: false,
      strategyWeights: { storytelling_case_study: 1.5, curiosity_mystery: 0.5 },
    },
  });
  const unpausedBaselinePack = generateContentPack({
    topic: 'YouTube Growth Secrets',
    platform: 'YouTube',
    language: 'English',
    tone: 'Educational',
  });
  assert(
    biasedPausedPack.titles[0].text === unpausedBaselinePack.titles[0].text,
    'generateContentPack ignores learned weights when personalization.enabled === false'
  );

  // Reset restores baseline weights and zero counts
  const resetProf = resetPersonalizationProfile(testAcc);
  assert(resetProf.enabled === true && resetProf.totalGenerationsEvaluated === 0, 'Reset restores baseline profile');
  assert(resetProf.strategyWeights.curiosity_mystery === 1.0, 'Reset clears learned strategy weights to default 1.0');

  // -------------------------------------------------------------------------
  // 3. Variation Seed Diversity Across Repeated Regenerate Calls
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Variation Seed Produces Distinct Results ---');
  const v0 = generateContentPack({
    topic: 'How to color grade phone videos',
    platform: 'YouTube',
    language: 'English',
    tone: 'Educational',
    variationSeed: 0,
  });
  const v1 = generateContentPack({
    topic: 'How to color grade phone videos',
    platform: 'YouTube',
    language: 'English',
    tone: 'Educational',
    variationSeed: 1,
  });
  assert(v0.hooks[0].hook !== v1.hooks[0].hook, 'variationSeed changes generated hooks');
  assert(v0.description.summary !== v1.description.summary, 'variationSeed changes description framing');
  assert(v0.thumbnailConcept.overlayText !== v1.thumbnailConcept.overlayText, 'variationSeed rotates primary thumbnail overlay text');

  // -------------------------------------------------------------------------
  // 4. Multilingual Completeness & Honest Support Tiers
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Multilingual Authenticity & Script Engine Language Wiring ---');
  const fullSupport = LANGUAGES.filter((l) => l.supportTier === 'full');
  const partialSupport = LANGUAGES.filter((l) => l.supportTier === 'partial_prefix');
  assert(fullSupport.length === 6, 'Exactly 6 core languages marked as full support');
  assert(partialSupport.length === 15, 'Remaining 15 languages marked honestly as partial_prefix');

  // Kannada Unicode fix check (no Telugu ము character inside Kannada secret)
  const knPack = getLanguagePack('Kannada');
  const knTitle = knPack.titleTemplates.curiosity(analyzeTopic('CapCut Editing'), 5);
  assert(!knTitle.includes('ముఖ్య'), 'Kannada curiosity title uses authentic Kannada script instead of Telugu');
  assert(knTitle.includes('ಮುಖ್ಯ'), 'Kannada curiosity title contains Kannada Unicode ರಹಸ್ಯಗಳು');

  // Content Pack in Tamil, Tanglish, Hindi checks (including localized ideas, thumbnails, descriptions)
  const taPack = generateContentPack({ topic: 'YouTube Channel Growth', platform: 'YouTube', language: 'Tamil', tone: 'Viral' });
  const taRomPack = generateContentPack({ topic: 'YouTube Channel Growth', platform: 'YouTube', language: 'Tanglish', tone: 'Viral' });
  const hiPack = generateContentPack({ topic: 'YouTube Channel Growth', platform: 'YouTube', language: 'Hindi', tone: 'Viral' });

  assert(/[\u0B80-\u0BFF]/.test(taPack.description.summary), 'Tamil pack description contains authentic Tamil Unicode');
  assert(/[\u0B80-\u0BFF]/.test(taPack.hooks[0].hook), 'Tamil pack keeps Tamil hooks even under Viral tone');
  assert(/[\u0B80-\u0BFF]/.test(taPack.videoIdeas![0].title), 'Tamil pack video ideas are localized in Tamil');
  assert(/[\u0B80-\u0BFF]/.test(taPack.thumbnailConcept.overlayOptions![0]), 'Tamil thumbnail overlay options use Tamil script');

  assert(
    /panra|epdi|irukku|tanglish/i.test(taRomPack.description.summary) &&
      /panra|epdi/i.test(taRomPack.videoIdeas![0].title),
    'Tanglish pack delivers natural Chennai Tanglish phrasing in summary & video ideas'
  );
  assert(!/How to.*Step-by-Step/i.test(taRomPack.hooks[0].hook), 'Tanglish hooks are not overwritten by English templates');

  assert(/[\u0900-\u097F]/.test(hiPack.description.summary), 'Hindi pack description contains authentic Devanagari script');
  assert(/[\u0900-\u097F]/.test(hiPack.hooks[0].hook), 'Hindi pack retains Devanagari hook phrasing under Viral tone');
  assert(/[\u0900-\u097F]/.test(hiPack.videoIdeas![0].title), 'Hindi pack video ideas are localized in Hindi');

  // Script Engine checks (Shorts + Long-form + Regenerate section in Tamil & Tanglish & Hindi)
  const dummyProfile: CreatorProfile = {
    channelExists: 'yes',
    channelTopic: 'Tech Tutorials',
    subscriberRange: '1,000 - 10,000',
    uploadFrequency: '1 video / week',
    creatorStage: 'Growing Creator',
    primaryGoal: 'Grow views',
    secondaryGoals: [],
    goalTimeline: '6 months',
    contentCategories: ['Tech'],
    experienceLevel: 'Some experience',
    dailyTimeAvailable: '2 hours',
    availableDevices: ['Smartphone'],
    availableTools: ['CapCut'],
    monthlyBudget: '$0',
    aiExperience: 'Some',
    aiNeeds: ['Scripts'],
    creatorStyle: 'Practical',
    targetAudience: 'Tech beginners',
    onboardingCompleted: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  const baseProj: VideoProject = {
    id: 'proj_1',
    ideaId: 'idea_1',
    topic: 'CapCut Video Editing',
    format: 'Long-Form YouTube',
    targetAudience: 'Creators',
    primaryGoal: 'Teach editing faster',
    difficulty: 'Easy',
    estimatedMinutes: 45,
    creatorFitScore: 90,
    reasonForFit: ['Matches smartphone editing workflow'],
    angle: 'Beginner tutorial',
    status: 'Writing',
    updatedAt: '2026-01-01',
    createdAt: '2026-01-01',
    durationSeconds: 300,
  };

  const taLongSections = generateStructuredScript(baseProj, 300, dummyProfile, getLanguagePack('Tamil'), 0);
  assert(
    taLongSections.length >= 5 && /[\u0B80-\u0BFF]/.test(taLongSections[1].text),
    'ScriptEngine generates Tamil script sections for Long-Form YouTube'
  );

  const taShortSections = generateStructuredScript(
    { ...baseProj, format: 'YouTube Shorts', durationSeconds: 30 },
    30,
    dummyProfile,
    getLanguagePack('Tamil'),
    0
  );
  assert(
    /[\u0B80-\u0BFF]/.test(taShortSections[0].text),
    'ScriptEngine generates Tamil Shorts script sections'
  );

  const regenTa = regenerateSingleSection(taLongSections[0].id, taLongSections, baseProj, dummyProfile, getLanguagePack('Tamil'), 2);
  assert(
    /[\u0B80-\u0BFF]/.test(regenTa[0].text),
    'regenerateSingleSection preserves Tamil language when regenerating a single script block'
  );

  const hiLongSections = generateStructuredScript(baseProj, 300, dummyProfile, getLanguagePack('Hindi'), 0);
  assert(/[\u0900-\u097F]/.test(hiLongSections[1].text), 'ScriptEngine generates Hindi script sections cleanly');

  console.log('\n================================================================');
  console.log('✅ ALL PHASE 3 TESTS PASSED!');
  console.log('================================================================\n');
}

runPhase3Tests().catch((err) => {
  console.error('❌ Fatal Phase 3 test error:', err);
  process.exit(1);
});
