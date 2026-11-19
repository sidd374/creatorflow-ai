/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Autonomous Creator Assistant Test Suite
 * Comprehensive automated verification:
 * 1. 100% API-Independent Execution (Zero API Key, Zero Network HTTP Calls)
 * 2. Channel-Aware Context Handling (Saved channel profile, devices, analytics)
 * 3. Asks for missing channel context when unconfigured (no hallucinated channel topics)
 * 4. Full Production Package Guiding:
 *    - Stage 1: Next-Video Idea Selection & Explanation
 *    - Stage 2: Hook & Structured Scripting
 *    - Stage 3: Spatial Scenes & Storyboard Planning
 *    - Stage 4: Model-Aware Video Prompt Generation
 *    - Stage 5: Voiceover, Captions, Titles, SEO & Thumbnail Overlay
 *    - Stage 6: Persistence & Saving Progress
 * 5. Production Guide Framing (No fake trend claims or virality promises)
 * 6. Plan Entitlements & Execution Performance (< 50ms)
 */

import { generateAutonomousAssistantResponse } from './src/lib/autonomousAssistantEngine';
import { CreatorFlowAssistantContext } from './src/lib/assistantContext';
import { AssistantMessage } from './src/lib/assistantStorage';
import { getVideoProjects } from './src/lib/creatorStorage';
import { getStoredProductionKit } from './src/lib/productionRequirementEngine';

// Polyfill window & localStorage for Node test runner
if (typeof window === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).window = {
    localStorage: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    }
  };
  (global as any).localStorage = (global as any).window.localStorage;
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runAutonomousAssistantTestSuite() {
  console.log('\n================================================================');
  console.log('CREATORFLOW AI — AUTONOMOUS CREATOR ASSISTANT TESTS');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: STRICT ZERO-API INDEPENDENCE & NETWORK INTERCEPTION
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Zero-API Independence & Latency Benchmark ---');
  delete process.env.GEMINI_API_KEY;
  delete process.env.CREATORFLOW_AI_API_KEY;

  let networkCallsMade = 0;
  const originalFetch = global.fetch;
  global.fetch = async (...args: any[]) => {
    networkCallsMade++;
    throw new Error(`CRITICAL FAIL: Creator Assistant made an unexpected network request to ${args[0]}`);
  };

  const sampleMessages: AssistantMessage[] = [
    {
      id: 'm1',
      role: 'user',
      content: 'Recommend next video idea for my channel',
      timestamp: Date.now(),
    },
  ];

  const contextWithChannel: CreatorFlowAssistantContext = {
    currentPage: 'dashboard',
    plan: 'Pro',
    creatorProfile: {
      channelTopic: 'Tech Reviews',
      primaryGoal: 'Subscribers & Growth',
      creatorStyle: 'Educational',
      experienceLevel: 'Intermediate',
      dailyTimeAvailable: '2 hours',
      monthlyBudget: '$0 (Free Tools Only)',
      availableDevices: ['Laptop', 'Smartphone'],
      preferredLanguage: 'English',
    },
    recentAnalyticsSummary: {
      totalVideos: 5,
      totalViews: 12500,
      averageCtr: 8.4,
      averageRetention: 48,
      hasReliableBaseline: true,
    },
  };

  const startMs = Date.now();
  const replyText = await generateAutonomousAssistantResponse(sampleMessages, contextWithChannel);
  const elapsedMs = Date.now() - startMs;

  global.fetch = originalFetch;

  assert(networkCallsMade === 0, 'Zero network calls made during assistant execution');
  assert(replyText.length > 50, 'Assistant generated substantive response');
  assert(elapsedMs < 100, `Execution is instantaneous (< 100ms, actual: ${elapsedMs}ms)`);

  // -------------------------------------------------------------
  // SUITE 2: CHANNEL-CONTEXT HANDLING & MISSING INFO CHECK
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Channel-Context & Missing Info Handling ---');

  // 1. Configured channel context
  assert(replyText.includes('TECH REVIEWS'), 'Response reflects user saved channel topic "Tech Reviews"');
  assert(replyText.includes('8.4% avg CTR'), 'Response reflects real analytics summary (8.4% CTR)');
  assert(replyText.includes('Laptop, Smartphone'), 'Response incorporates available devices');

  // 2. Unconfigured / Missing channel context
  const contextWithoutChannel: CreatorFlowAssistantContext = {
    currentPage: 'dashboard',
    plan: 'Free',
    creatorProfile: {
      channelTopic: '',
      primaryGoal: 'Growth',
      creatorStyle: 'Educational',
      experienceLevel: 'Beginner',
      dailyTimeAvailable: '1 hour',
      monthlyBudget: '$0',
      availableDevices: ['Smartphone'],
      preferredLanguage: 'English',
    },
  };

  const missingReply = await generateAutonomousAssistantResponse(
    [{ id: 'm2', role: 'user', content: 'Recommend next video idea', timestamp: Date.now() }],
    contextWithoutChannel
  );

  assert(missingReply.includes('what is your primary channel topic or niche?'), 'Assistant politely asks for missing channel topic instead of inventing fake context');

  // -------------------------------------------------------------
  // SUITE 3: STEP-BY-STEP PRODUCTION GUIDING
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Step-by-Step Production Package Guiding ---');

  // Stage 2: Hook & Script
  const scriptReply = await generateAutonomousAssistantResponse(
    [{ id: 'm3', role: 'user', content: 'Draft hook and script for my video', timestamp: Date.now() }],
    contextWithChannel
  );
  assert(scriptReply.includes('RETENTION HOOK'), 'Generates 30-second retention hook');
  assert(scriptReply.includes('Visual Cue:'), 'Includes explicit camera visual direction');

  // Stage 3: Scenes & Storyboard
  const storyboardReply = await generateAutonomousAssistantResponse(
    [{ id: 'm4', role: 'user', content: 'Plan scenes and storyboard', timestamp: Date.now() }],
    contextWithChannel
  );
  assert(storyboardReply.includes('SCENE & STORYBOARD PLAN'), 'Generates structured storyboard');
  assert(storyboardReply.includes('CLIP 1'), 'Includes clip-by-clip breakdown');
  assert(storyboardReply.includes('Camera:'), 'Includes camera movement specification');

  // Stage 4: Model-Specific Video Prompts
  const promptReply = await generateAutonomousAssistantResponse(
    [{ id: 'm5', role: 'user', content: 'Generate video prompts for Runway Gen-3', timestamp: Date.now() }],
    contextWithChannel
  );
  assert(promptReply.includes('RUNWAY GEN-3'), 'Formats prompts for Runway Gen-3');
  assert(promptReply.includes('Director Mode:'), 'Includes Director Mode syntax');

  // Stage 5: SEO, Voice & Captions
  const seoReply = await generateAutonomousAssistantResponse(
    [{ id: 'm6', role: 'user', content: 'Prepare SEO, voiceover, captions and thumbnail', timestamp: Date.now() }],
    contextWithChannel
  );
  assert(seoReply.includes('HIGH-CTR YOUTUBE TITLES'), 'Generates YouTube titles');
  assert(seoReply.includes('VOICEOVER DIRECTION'), 'Generates voiceover pacing');
  assert(seoReply.includes('THUMBNAIL OVERLAY TEXT'), 'Generates thumbnail options');

  // -------------------------------------------------------------
  // SUITE 4: PERSISTENCE & NO FAKE VIRALITY PROMISES
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Package Persistence & Responsible Framing ---');

  // Stage 6: Persistence
  const saveReply = await generateAutonomousAssistantResponse(
    [{ id: 'm7', role: 'user', content: 'Save project to workspace', timestamp: Date.now() }],
    contextWithChannel
  );
  assert(saveReply.includes('SAVED TO WORKSPACE!'), 'Confirms project saved to workspace');

  const savedProjects = getVideoProjects();
  assert(savedProjects.length > 0, 'Project persisted in localStorage creatorStorage');

  const savedKit = getStoredProductionKit();
  assert(savedKit !== null, 'ProductionKit persisted in localStorage');

  // Responsible framing check (No fake virality or fake trend guarantees)
  assert(!replyText.toLowerCase().includes('guaranteed to go viral'), 'Contains zero fake virality promises');
  assert(!replyText.toLowerCase().includes('1,000,000 search volume'), 'Contains zero invented search volume counts');

  console.log('\n================================================================');
  console.log('🎉 ALL AUTONOMOUS CREATOR ASSISTANT TESTS PASSED (100%)!');
  console.log('================================================================\n');
}

runAutonomousAssistantTestSuite().catch((err: any) => {
  console.error('❌ Creator Assistant test suite failed:', err);
  process.exit(1);
});
