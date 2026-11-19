/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Intelligence Engine Verification Suite (TEST 1 – TEST 13)
 * Validates BYOK AES-256-GCM encryption, non-exposure, missing/invalid/quota error gates,
 * minimal personalization, topic & duration preservation, ₹0 budget enforcement,
 * bounded targeted repair loop (max 2), Google Search grounding, anti-repetition,
 * cross-user isolation, restart persistence, and per-UID response caching.
 */

process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
process.env.CREATORFLOW_ALLOW_ISOLATED_TEST_HARNESS = 'true';
process.env.CREATORFLOW_FORCE_LOCAL_STATE = 'true';
process.env.DISABLE_HMR = 'true';

import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { ServerStateStore } from './src/lib/serverStateStore.ts';
import {
  encryptByokKey,
  decryptByokKey,
  maskGeminiApiKey,
  validateGeminiApiKeyFormat,
} from './src/lib/intelligence/byokCrypto.ts';
import {
  setGeminiTransportForTests,
  GeminiProviderError,
} from './src/lib/intelligence/geminiProvider.ts';
import { clearAllIntelligenceCachesForTests } from './src/lib/intelligence/responseCache.ts';
import { clearResearchCache } from './src/lib/intelligence/webResearchEngine.ts';

const TEST_SECRET = `cf_intel_${crypto.randomBytes(16).toString('hex')}`;
const TEMP_STATE_FILE = path.join(os.tmpdir(), `creatorflow-intel-state-${Date.now()}.json`);
process.env.CREATORFLOW_TEST_SECRET = TEST_SECRET;
process.env.CREATORFLOW_STATE_FILE = TEMP_STATE_FILE;
process.env.BYOK_ENCRYPTION_SECRET = `byok_test_master_${crypto.randomBytes(16).toString('hex')}`;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function httpJson(
  baseUrl: string,
  route: string,
  options: {
    method?: string;
    uid?: string;
    plan?: string;
    body?: unknown;
    includeHarnessAuth?: boolean;
  } = {}
): Promise<{ status: number; json: any; rawText: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.includeHarnessAuth !== false && options.uid) {
    headers['x-creatorflow-test-secret'] = TEST_SECRET;
    headers['x-creatorflow-account-id'] = options.uid;
    if (options.plan) {
      headers['x-creatorflow-test-plan'] = options.plan;
    }
  }

  const res = await fetch(`${baseUrl}${route}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const rawText = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(rawText);
  } catch {
    json = { rawText };
  }
  return { status: res.status, json, rawText };
}

async function runIntelligenceSuite() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — INTELLIGENCE ENGINE VERIFICATION (TEST 1 – 13)');
  console.log('================================================================\n');

  const { app, serverStore } = await import('./server.ts');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const USER_A = `test_intel_a_${Date.now()}`;
  const USER_B = `test_intel_b_${Date.now()}`;
  const FAKE_KEY_A = 'AIzaSyDummyTestKeyAlpha1234567890XYZ1';
  const FAKE_KEY_B = 'AIzaSyDummyTestKeyBravo0987654321UVW2';

  try {
    // ------------------------------------------------------------------
    // TEST 1: AES-256-GCM Encryption & Zero Key Exposure in Store / API
    // ------------------------------------------------------------------
    console.log('--- TEST 1: BYOK Encryption at Rest & Non-Exposure ---');
    const encryptedA = encryptByokKey({ uid: USER_A, plainKey: FAKE_KEY_A });
    assert(encryptedA.encryptedKey !== FAKE_KEY_A, 'Encrypted ciphertext differs from plaintext');
    assert(Boolean(encryptedA.iv && encryptedA.authTag), 'AES-256-GCM IV and authTag generated');
    assert(
      decryptByokKey(encryptedA, USER_A) === FAKE_KEY_A,
      'Decrypt succeeds for matching owner UID'
    );
    let wrongUidThrew = false;
    try {
      decryptByokKey(encryptedA, USER_B);
    } catch {
      wrongUidThrew = true;
    }
    assert(wrongUidThrew, 'Decrypt with mismatched UID is cryptographically rejected');
    assert(
      maskGeminiApiKey(FAKE_KEY_A).maskedHint.endsWith('XYZ1') &&
        !maskGeminiApiKey(FAKE_KEY_A).maskedHint.includes('DummyTestKey'),
      'Masking exposes only prefix + last4'
    );

    const RANDOM_PREFIX_KEY = 'rnd_pref_99887766554433221100';
    const randomKeyFormat = validateGeminiApiKeyFormat(RANDOM_PREFIX_KEY);
    const randomKeyMask = maskGeminiApiKey(RANDOM_PREFIX_KEY);
    const encryptedRandom = encryptByokKey({ uid: USER_A, plainKey: RANDOM_PREFIX_KEY });
    assert(
      randomKeyFormat.valid === true &&
        randomKeyFormat.cleaned === RANDOM_PREFIX_KEY &&
        randomKeyMask.keyLast4 === '1100' &&
        !randomKeyMask.maskedHint.includes('AIza') &&
        decryptByokKey(encryptedRandom, USER_A) === RANDOM_PREFIX_KEY,
      'Non-AIza arbitrary-prefix Gemini API keys pass format validation, masking, and AES-256-GCM encryption'
    );

    // ------------------------------------------------------------------
    // TEST 2: Missing Key Flow (Explicit 428 Error, No Fake Fallback)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 2: Missing Key Enforcement ---');
    const missingStatus = await httpJson(baseUrl, '/api/ai/key', { uid: USER_A });
    assert(
      missingStatus.status === 200 && missingStatus.json.metadata?.hasKey === false,
      'GET /api/ai/key reports hasKey: false when unconfigured'
    );

    const missingExec = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: { task: 'topic_analysis', input: { topic: 'History of Silk Road' } },
    });
    assert(
      missingExec.status === 428 &&
        missingExec.json.error === 'MISSING_API_KEY' &&
        missingExec.json.requiresByok === true,
      'POST /api/intelligence/execute returns 428 MISSING_API_KEY without faking output'
    );

    // ------------------------------------------------------------------
    // TEST 3: Invalid Key Flow
    // ------------------------------------------------------------------
    console.log('\n--- TEST 3: Invalid Key Rejection ---');
    setGeminiTransportForTests({
      async generate() {
        throw new GeminiProviderError('INVALID_API_KEY', 'API_KEY_INVALID rejected by Gemini', 401, false);
      },
    });
    const invalidSave = await httpJson(baseUrl, '/api/ai/key', {
      method: 'POST',
      uid: USER_A,
      body: { apiKey: FAKE_KEY_A, verifyConnection: true },
    });
    assert(
      invalidSave.status === 400 && invalidSave.json.error === 'INVALID_API_KEY',
      'POST /api/ai/key rejects invalid Gemini API key cleanly with INVALID_API_KEY'
    );

    setGeminiTransportForTests({
      async generate() {
        const sdkErr: any = new Error(
          JSON.stringify({
            error: { code: 400, message: 'API key expired. Please renew the API key.', status: 'INVALID_ARGUMENT' },
          })
        );
        sdkErr.status = 400;
        throw sdkErr;
      },
    });
    const expiredSave = await httpJson(baseUrl, '/api/ai/key', {
      method: 'POST',
      uid: USER_A,
      body: { apiKey: FAKE_KEY_A, verifyConnection: true },
    });
    assert(
      expiredSave.status === 400 && expiredSave.json.error === 'INVALID_API_KEY',
      'JSON-wrapped API key expired error classifies cleanly as INVALID_API_KEY'
    );

    // ------------------------------------------------------------------
    // TEST 4: Quota Exceeded (429) Error Flow & Transient 503 Retry Recovery
    // ------------------------------------------------------------------
    console.log('\n--- TEST 4: Quota Exceeded (429) & Transient Retry Recovery ---');
    let connectPingAttempts = 0;
    setGeminiTransportForTests({
      async generate() {
        connectPingAttempts++;
        if (connectPingAttempts === 1) {
          const transientErr: any = new Error(
            JSON.stringify({
              error: { code: 503, message: 'The model is overloaded. Please try again later.', status: 'UNAVAILABLE' },
            })
          );
          transientErr.status = 503;
          throw transientErr;
        }
        return { text: 'OK', inputTokens: 5, outputTokens: 2, sources: [] };
      },
    });
    const goodSave = await httpJson(baseUrl, '/api/ai/key', {
      method: 'POST',
      uid: USER_A,
      body: { apiKey: FAKE_KEY_A, selectedModel: 'gemini-4-hydrogen', verifyConnection: true },
    });
    assert(
      goodSave.status === 200 &&
        goodSave.json.metadata?.hasKey === true &&
        goodSave.json.metadata?.status === 'connected' &&
        connectPingAttempts === 2 &&
        !goodSave.rawText.includes(FAKE_KEY_A),
      'Transient 503 overload during BYOK connect recovers on bounded retry and plaintext key never leaks'
    );

    setGeminiTransportForTests({
      async generate() {
        throw new GeminiProviderError('QUOTA_EXCEEDED', 'Exceeded your current quota', 429, false);
      },
    });
    const quotaExec = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: {
        task: 'topic_analysis',
        input: { topic: 'Black Holes' },
        enableWebResearch: false,
      },
    });
    assert(
      quotaExec.status === 429 &&
        quotaExec.json.error === 'QUOTA_EXCEEDED' &&
        typeof quotaExec.json.quotaNotice === 'string',
      'Quota exceeded returns 429 QUOTA_EXCEEDED with project-level sharing notice'
    );

    // ------------------------------------------------------------------
    // TEST 5: Dynamic Creator Context Personalization (Phone ₹0 vs Laptop AI)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 5: Dynamic Personalization Context ---');
    clearAllIntelligenceCachesForTests();
    let capturedPrompts: string[] = [];
    setGeminiTransportForTests({
      async generate({ contents, systemInstruction }) {
        capturedPrompts.push(`${systemInstruction || ''}\n${String(contents)}`);
        return {
          text: JSON.stringify({
            analyzedTopic: 'Ancient Indus Valley Trade',
            bestFormat: 'Long-form',
            whyFormatFits: 'Great fit for faceless CapCut Mobile visual storytelling',
            recommendedAudience: 'Curious learners in India',
            suggestedAngle: 'How Indus seals reveal forgotten trade networks',
            productionDifficulty: 'Easy',
            estimatedProductionTime: '2 hours',
            budgetFit: '100% free using CapCut Mobile and Canva Free',
            topicSummary: 'Explores ancient Indus Valley trade routes.',
            recommendedIdeas: [
              { id: 'i1', title: 'Hidden Ports of Indus Valley', format: 'Long-form', goal: 'Growth', difficulty: 'Easy', estimatedTime: '2h', topicRelevance: 95, whyThisIdea: ['Strong curiosity'], budgetFit: '₹0', status: 'Idea', suggestedAngle: 'Trade evidence', targetAudience: 'History fans', presentationFormat: 'Faceless narration' },
              { id: 'i2', title: 'Why Indus Script Remains Undeciphered', format: 'Long-form', goal: 'Growth', difficulty: 'Easy', estimatedTime: '2h', topicRelevance: 92, whyThisIdea: ['Mystery hook'], budgetFit: '₹0', status: 'Idea', suggestedAngle: 'Archaeology', targetAudience: 'History fans', presentationFormat: 'Faceless narration' },
            ],
          }),
          inputTokens: 120,
          outputTokens: 210,
          sources: [],
        };
      },
    });

    const phoneRes = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: {
        task: 'topic_analysis',
        enableWebResearch: false,
        creatorProfile: {
          channelTopic: 'Ancient History Mysteries',
          monthlyBudget: '₹0 / Free tools only',
          availableDevices: ['Phone'],
          preferredLanguage: 'English',
          onCamera: false,
          primaryProductionMethod: 'Faceless narration and voiceover',
        },
        input: { topic: 'Ancient Indus Valley Trade' },
      },
    });
    assert(
      phoneRes.status === 200 &&
        phoneRes.json.personalizationSummary?.budgetTier === 'zero' &&
        phoneRes.json.personalizationSummary?.onCamera === false &&
        capturedPrompts[0].includes('FACELESS') &&
        capturedPrompts[0].includes('PHONE-ONLY'),
      'Phone-only ₹0 faceless constraints injected cleanly into prompt and summary'
    );

    // ------------------------------------------------------------------
    // TEST 6: Topic & Duration Preservation (MH370 10-min Documentary)
    // TEST 7: ₹0 Budget Paid Tool Rejection
    // TEST 8: Bounded Repair Loop (max 2 repair calls + validationRepairs metric)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 6, 7 & 8: Topic Fidelity, ₹0 Enforcement & Bounded Repair Loop ---');
    clearAllIntelligenceCachesForTests();
    let scriptCallCount = 0;
    setGeminiTransportForTests({
      async generate() {
        scriptCallCount++;
        if (scriptCallCount === 1) {
          // Intentionally BAD output: meta-tutorial drift + paid Adobe Premiere Pro + short length
          return {
            text: JSON.stringify({
              durationMinutes: 1,
              format: 'Short',
              recommendedTools: ['Adobe Premiere Pro', 'After Effects'],
              scriptSections: [
                { id: 's1', label: 'HOOK', timeRange: '0:00-0:30', text: 'Here is how to make a youtube video about MH370 using Adobe Premiere Pro and look directly into the camera.', visualCue: 'Camera face', deliveryTip: 'Fast' },
              ],
              productionNotes: ['Use After Effects'],
            }),
            inputTokens: 100,
            outputTokens: 90,
            sources: [],
          };
        }
        // Repaired valid output on attempt 2: real 10-min faceless documentary script on MH370
        const longText = 'On March 8, 2014, Malaysia Airlines Flight MH370 departed Kuala Lumpur bound for Beijing carrying 239 people and vanished from civilian radar over the South China Sea. Military primary radar later tracked the aircraft turning back west across the Malay Peninsula before disappearing beyond range near the Andaman Sea. Satellite handshake logs collected by Inmarsat revealed pings along the seventh arc in the southern Indian Ocean hours later, establishing the official search corridor without requiring expensive production tools. Free mobile editing and open satellite maps let faceless documentary creators walk viewers step by step through each verified clue, evidence gap, and marine search zone.';
        return {
          text: JSON.stringify({
            durationMinutes: 10,
            format: 'Long-form Documentary',
            recommendedTools: ['CapCut Free', 'Canva Free'],
            scriptSections: [
              { id: 's1', label: 'HOOK', timeRange: '0:00-0:45', text: longText, visualCue: 'Archival radar map overlay', deliveryTip: 'Calm documentary narration' },
              { id: 's2', label: 'RADAR_TURNBACK', timeRange: '0:45-3:30', text: longText, visualCue: 'Flight path timeline graphic', deliveryTip: 'Clear measured pacing' },
              { id: 's3', label: 'INMARSAT_PING_ARCS', timeRange: '3:30-7:00', text: longText, visualCue: 'Satellite arc animation', deliveryTip: 'Pause between data points' },
              { id: 's4', label: 'INDIAN_OCEAN_SEARCH', timeRange: '7:00-9:15', text: longText, visualCue: 'Ocean depth chart', deliveryTip: 'Reflective tone' },
              { id: 's5', label: 'CONCLUSION', timeRange: '9:15-10:00', text: longText, visualCue: 'Summary card', deliveryTip: 'Thoughtful sign-off' },
            ],
            productionNotes: ['Use CapCut Free mobile timeline and public aviation maps'],
          }),
          inputTokens: 160,
          outputTokens: 320,
          sources: [],
        };
      },
    });

    const mh370Res = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: {
        task: 'script_generation',
        enableWebResearch: false,
        creatorProfile: {
          monthlyBudget: '₹0 / Free tools only',
          availableDevices: ['Phone'],
          onCamera: false,
          primaryProductionMethod: 'Faceless narration and voiceover',
        },
        input: {
          topic: 'Unexplained disappearance of Malaysia Airlines Flight MH370',
          format: 'Long-form',
          durationMinutes: 10,
          durationLabel: '10 minutes',
        },
      },
    });

    assert(
      mh370Res.status === 200 &&
        scriptCallCount === 2 &&
        mh370Res.json.qualityReport?.repaired === true &&
        mh370Res.json.qualityReport?.passed === true &&
        mh370Res.json.qualityReport?.attempts === 2,
      'Bad meta-tutorial + paid Premiere output repaired automatically in 1 retry (attempts === 2)'
    );

    // Check max 2 repair attempts cap even when output remains broken
    clearAllIntelligenceCachesForTests();
    let brokenCallCount = 0;
    setGeminiTransportForTests({
      async generate() {
        brokenCallCount++;
        return {
          text: JSON.stringify({
            durationMinutes: 1,
            format: 'Short',
            scriptSections: [
              { id: 's1', label: 'HOOK', timeRange: '0:00-0:20', text: 'Use Adobe Premiere Pro.', visualCue: 'Face', deliveryTip: 'Fast' },
            ],
          }),
          inputTokens: 50,
          outputTokens: 40,
          sources: [],
        };
      },
    });
    const cappedRes = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: {
        task: 'script_generation',
        bypassCache: true,
        enableWebResearch: false,
        creatorProfile: { monthlyBudget: '₹0' },
        input: { topic: 'Quantum Entanglement Explained', durationMinutes: 10 },
      },
    });
    assert(
      cappedRes.status === 200 &&
        brokenCallCount === 3 &&
        cappedRes.json.qualityReport?.passed === false &&
        cappedRes.json.qualityReport?.attempts === 3,
      'Repair loop is strictly bounded at 1 initial + 2 repair calls (total 3)'
    );

    // ------------------------------------------------------------------
    // TEST 9: Web Research & Google Search Grounding
    // ------------------------------------------------------------------
    console.log('\n--- TEST 9: Google Search Grounding & Research Sources ---');
    clearResearchCache();
    clearAllIntelligenceCachesForTests();
    let searchUsedCount = 0;
    setGeminiTransportForTests({
      async generate({ useGoogleSearch }) {
        if (useGoogleSearch) {
          searchUsedCount++;
          return {
            text: `Summary: Creators using mobile-first workflows are seeing rapid adoption of short-to-long bridge series.\nVerified Facts:\n- YouTube highlighted vertical and long-form viewer discovery convergence.\nStrategic Hypotheses:\n- Pairing 45s mystery Shorts with 10-minute deep dives increases catalog depth.`,
            inputTokens: 80,
            outputTokens: 90,
            sources: [
              {
                title: 'YouTube Official Creator Blog',
                url: 'https://blog.youtube/news-and-events/creator-updates/',
                retrievedAt: '2026-11-18T10:00:00.000Z',
                sourceType: 'google_search_grounding',
              },
            ],
          };
        }
        return {
          text: JSON.stringify({
            opportunities: [
              {
                id: 'opp_1',
                title: 'Lost Bronze Age Cities Found Under Forest Canopy',
                topic: 'Archaeology',
                angle: 'LIDAR discoveries revealing hidden civilizations',
                format: 'Long-form',
                suggestedDuration: 600,
                suggestedDurationDisplay: '10 min',
                opportunityScore: 91,
                difficulty: 'Easy',
                whyNow: 'Recent LIDAR survey publications sparked curiosity.',
                whyThisFitsYou: 'Ideal for Phone-only CapCut Mobile faceless narration.',
                hook: 'Beneath thick jungle canopy, laser scans revealed an entire lost city.',
                suggestedProductionMethod: 'Faceless narration',
                language: 'English',
                tags: ['#history', '#archaeology'],
                sourceType: 'creator_profile',
              },
              {
                id: 'opp_2',
                title: 'Why Ancient Roman Concrete Outlasts Modern Steel',
                topic: 'Engineering History',
                angle: 'Self-healing lime clasts',
                format: 'Short',
                suggestedDuration: 50,
                suggestedDurationDisplay: '50s',
                opportunityScore: 88,
                difficulty: 'Easy',
                whyNow: 'Strong evergreen science curiosity.',
                whyThisFitsYou: 'Zero cost visuals.',
                hook: 'A 2,000-year-old harbor still stands while modern piers crumble.',
                suggestedProductionMethod: 'Faceless narration',
                language: 'English',
                tags: ['#science'],
                sourceType: 'creator_profile',
              },
            ],
          }),
          inputTokens: 130,
          outputTokens: 240,
          sources: [],
        };
      },
    });

    const radarRes = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: {
        task: 'content_radar',
        enableWebResearch: true,
        creatorProfile: {
          channelTopic: 'Lost Civilizations & Ancient History',
          monthlyBudget: '₹0',
          availableDevices: ['Phone'],
          onCamera: false,
        },
        input: { topic: 'Lost Civilizations' },
      },
    });
    assert(
      radarRes.status === 200 &&
        searchUsedCount === 1 &&
        radarRes.json.researchBrief?.sources?.length === 1 &&
        radarRes.json.researchBrief?.sources[0]?.url ===
          'https://blog.youtube/news-and-events/creator-updates/',
      'Content Radar invoked googleSearch grounding and returned verified source URLs & timestamps'
    );

    // ------------------------------------------------------------------
    // TEST 10: Anti-Repetition Against Creator History
    // ------------------------------------------------------------------
    console.log('\n--- TEST 10: Anti-Repetition Against History ---');
    clearAllIntelligenceCachesForTests();
    setGeminiTransportForTests({
      async generate() {
        return {
          text: JSON.stringify({
            finalTitle: 'The Untold Truth About Angkor Wat Water Canals',
            alternativeTitles: ['How Angkor Wat Fed a Million People'],
            titles: [
              { text: 'The Untold Truth About Angkor Wat Water Canals', style: 'Mystery', predictedCtr: 'High', explanations: ['Fresh'] },
              { text: 'How Angkor Wat Engineered Monsoon Survival', style: 'How-To', predictedCtr: 'Medium', explanations: ['Visual'] },
            ],
            description: { hookLine: 'Hook', summary: 'Summary', valuePoints: ['P1'], timestamps: [], callToAction: 'Sub' },
            primaryKeywords: ['angkor wat', 'ancient engineering'],
            relatedKeywords: ['cambodia history'],
            hashtags: ['#history'],
          }),
          inputTokens: 90,
          outputTokens: 140,
          sources: [],
        };
      },
    });
    const repeatedRes = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: {
        task: 'title_seo',
        enableWebResearch: false,
        recentProjects: [
          {
            id: 'p_old',
            topic: 'Angkor Wat',
            selectedTitle: 'The Untold Truth About Angkor Wat Water Canals',
            format: 'Long-form',
            status: 'Published',
            createdAt: new Date().toISOString(),
          },
        ],
        input: { topic: 'Angkor Wat engineering' },
      },
    });
    const antiRepCheck = repeatedRes.json.qualityReport?.checks?.find(
      (c: any) => c.id === 'anti_repetition'
    );
    assert(
      repeatedRes.status === 200 && antiRepCheck && antiRepCheck.passed === false,
      'Validator detects near-duplicate title from creator recentProjects history'
    );

    // ------------------------------------------------------------------
    // TEST 11: Cross-User Isolation & Unauthenticated 401 Protection
    // ------------------------------------------------------------------
    console.log('\n--- TEST 11: Auth Enforcement & Cross-User Isolation ---');
    const unauthKeyGet = await httpJson(baseUrl, '/api/ai/key', { includeHarnessAuth: false });
    const unauthExec = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      includeHarnessAuth: false,
      body: { task: 'topic_analysis', input: { topic: 'Test' } },
    });
    assert(
      unauthKeyGet.status === 401 && unauthExec.status === 401,
      'Unauthenticated requests to /api/ai/key and /api/intelligence/execute blocked with 401'
    );

    // User B saves their own different key
    setGeminiTransportForTests({
      async generate() {
        return { text: 'OK', inputTokens: 4, outputTokens: 2, sources: [] };
      },
    });
    await httpJson(baseUrl, '/api/ai/key', {
      method: 'POST',
      uid: USER_B,
      body: { apiKey: FAKE_KEY_B, selectedModel: 'gemini-3.1-flash-lite', verifyConnection: true },
    });

    const userAStatus = await httpJson(baseUrl, '/api/ai/key', { uid: USER_A });
    const userBStatus = await httpJson(baseUrl, '/api/ai/key', { uid: USER_B });
    assert(
      userAStatus.json.metadata?.keyLast4 === 'XYZ1' &&
        userBStatus.json.metadata?.keyLast4 === 'UVW2' &&
        userAStatus.json.metadata?.selectedModel === 'gemini-4-hydrogen' &&
        userBStatus.json.metadata?.selectedModel === 'gemini-3.1-flash-lite',
      'User A and User B have completely isolated BYOK credentials, masks, and model preferences'
    );

    // ------------------------------------------------------------------
    // TEST 12: Server Restart Persistence Simulation
    // ------------------------------------------------------------------
    console.log('\n--- TEST 12: Restart Persistence Simulation ---');
    const restartedStore = new ServerStateStore(null);
    const reloadedCredA = await restartedStore.getByokCredential(USER_A);
    const reloadedUsageA = await restartedStore.getAiUsageMetrics(USER_A);
    assert(
      reloadedCredA !== null &&
        decryptByokKey(reloadedCredA, USER_A) === FAKE_KEY_A &&
        reloadedUsageA.validationRepairs >= 1 &&
        reloadedUsageA.totalCalls >= 3,
      'Restarted ServerStateStore loads & decrypts User A BYOK key and preserves AI usage metrics'
    );

    // ------------------------------------------------------------------
    // TEST 13: Per-UID Response Cache Hit (Skips Duplicate Gemini Call)
    // ------------------------------------------------------------------
    console.log('\n--- TEST 13: Per-UID Cache Hit & Cross-User Cache Isolation ---');
    clearAllIntelligenceCachesForTests();
    let cacheTestTransportCalls = 0;
    setGeminiTransportForTests({
      async generate() {
        cacheTestTransportCalls++;
        return {
          text: JSON.stringify({
            recommendedThumbnailText: 'LOST GOLD',
            thumbnailTextOptions: [{ id: 'o1', text: 'LOST GOLD', reason: 'Contrast', isRecommended: true }],
            thumbnailBrief: { mainVisual: 'Mansa Musa leading golden desert caravan across Sahara' },
            thumbnailPrompt: 'Dramatic historical Mansa Musa gold caravan photography, high contrast',
          }),
          inputTokens: 60,
          outputTokens: 80,
          sources: [],
        };
      },
    });

    const cachePayload = {
      task: 'thumbnail_intelligence',
      enableWebResearch: false,
      input: { topic: 'Mansa Musa Gold Caravan' },
    };
    const firstCall = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: cachePayload,
    });
    const secondCallSameUser = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: cachePayload,
    });
    const thirdCallDifferentUser = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_B,
      body: cachePayload,
    });

    assert(
      firstCall.status === 200 &&
        firstCall.json.cacheHit === false &&
        secondCallSameUser.status === 200 &&
        secondCallSameUser.json.cacheHit === true &&
        thirdCallDifferentUser.status === 200 &&
        thirdCallDifferentUser.json.cacheHit === false &&
        cacheTestTransportCalls === 2,
      'Per-UID cache serves repeat call without calling Gemini again while isolating User B from User A cache'
    );

    // Verify non-AIza arbitrary-prefix key saves cleanly via POST /api/ai/key
    setGeminiTransportForTests({
      async generate() {
        return { text: 'OK', inputTokens: 4, outputTokens: 2, sources: [] };
      },
    });
    const randomPrefixSave = await httpJson(baseUrl, '/api/ai/key', {
      method: 'POST',
      uid: USER_A,
      body: { apiKey: RANDOM_PREFIX_KEY, selectedModel: 'gemini-4-hydrogen', verifyConnection: true },
    });
    assert(
      randomPrefixSave.status === 200 &&
        randomPrefixSave.json.metadata?.hasKey === true &&
        randomPrefixSave.json.metadata?.keyLast4 === '1100' &&
        !String(randomPrefixSave.json.metadata?.maskedHint || '').includes('AIza') &&
        !randomPrefixSave.rawText.includes(RANDOM_PREFIX_KEY),
      'POST /api/ai/key accepts non-AIza random-prefix Gemini API keys without leaking plaintext'
    );

    // Clean up deleted user key
    await httpJson(baseUrl, '/api/ai/key', { method: 'DELETE', uid: USER_A });
    const afterDelete = await httpJson(baseUrl, '/api/ai/key', { uid: USER_A });
    assert(afterDelete.json.metadata?.hasKey === false, 'DELETE /api/ai/key removes BYOK key cleanly');

    console.log('\n================================================================');
    console.log('ALL 13 INTELLIGENCE ENGINE VERIFICATION TESTS PASSED ✅');
    console.log('================================================================');
  } finally {
    setGeminiTransportForTests(null);
    server.close();
    try {
      if (fs.existsSync(TEMP_STATE_FILE)) fs.unlinkSync(TEMP_STATE_FILE);
    } catch {
      // ignore temp cleanup failure
    }
  }
}

runIntelligenceSuite().catch((err) => {
  console.error('❌ FATAL TEST ERROR:', err);
  process.exit(1);
});
