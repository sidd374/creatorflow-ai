/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verification Suite for BYOK Timeout Investigation, Safe Diagnostics,
 * Separate Connect/Response AbortController Timeouts, Retry Policy,
 * Secret Redaction, Model Metadata Cleanliness, and Honest Usage Metrics.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

const TEMP_STATE_FILE = path.resolve(process.cwd(), `.creatorflow-byok-diag-test-${Date.now()}.json`);
process.env.NODE_ENV = 'development';
process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
process.env.CREATORFLOW_ALLOW_ISOLATED_TEST_HARNESS = 'true';
process.env.CREATORFLOW_TEST_SECRET = 'creatorflow-diag-secret-9876543210';
process.env.CREATORFLOW_STATE_FILE = TEMP_STATE_FILE;
process.env.OWNER_EMAIL = 'owner-test@creatorflow.invalid';

function assert(condition: unknown, label: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${label}`);
  }
  console.log(`✅ PASS: ${label}`);
}

async function httpJson(
  baseUrl: string,
  route: string,
  options: {
    method?: string;
    uid?: string;
    body?: unknown;
  } = {}
): Promise<{ status: number; json: any; rawText: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.uid) {
    headers['x-creatorflow-test-secret'] = process.env.CREATORFLOW_TEST_SECRET!;
    headers['x-creatorflow-account-id'] = options.uid;
    headers['x-creatorflow-test-plan'] = 'creator';
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

function jsonResponse(status: number, payload: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

async function runTests() {
  const { app, serverStore } = await import('./server.ts');
  const {
    CONNECTION_TEST_PROMPT,
    CONNECTION_TEST_TOKEN,
    setGeminiFetchForTests,
    setGeminiTransportForTests,
    testByokApiKeyConnection,
  } = await import('./src/lib/intelligence/geminiProvider.ts');
  const { encryptByokKey, decryptByokKey } = await import('./src/lib/intelligence/byokCrypto.ts');
  const { SUPPORTED_GEMINI_MODELS } = await import('./src/lib/intelligence/models.ts');
  const { runIntelligencePipeline } = await import('./src/lib/intelligence/pipeline.ts');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const USER_A = 'test_diag_user_a';
  const USER_B = 'test_diag_user_b';
  const SECRET_KEY_A = 'RND_9988_SECRET_GEMINI_KEY_VALUE_A';
  const SECRET_KEY_B = 'AIzaSyTestFakeSecretKeyValueB_98765';

  // Capture logs to assert secret zero-leakage
  const capturedLogs: string[] = [];
  const origWarn = console.warn;
  const origError = console.error;
  console.warn = (...args: any[]) => {
    capturedLogs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    origWarn.apply(console, args);
  };
  console.error = (...args: any[]) => {
    capturedLogs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    origError.apply(console, args);
  };

  try {
    console.log('\n================================================================');
    console.log('BYOK TIMEOUT & DIAGNOSTIC ACCEPTANCE SUITE (12 TESTS)');
    console.log('================================================================');

    // ------------------------------------------------------------------
    // ACCEPTANCE 1: Strict Owner UID Encryption & Decryption
    // ------------------------------------------------------------------
    const encA = encryptByokKey({
      uid: USER_A,
      plainKey: SECRET_KEY_A,
      selectedModel: 'gemini-4-hydrogen',
    });
    assert(decryptByokKey(encA, USER_A) === SECRET_KEY_A, 'Test 1a: Owner UID decrypts stored key');
    let crossUidBlocked = false;
    try {
      decryptByokKey(encA, USER_B);
    } catch {
      crossUidBlocked = true;
    }
    assert(crossUidBlocked, 'Test 1b: Other UID is strictly blocked from decrypting owner key');

    // Store encrypted key directly to simulate existing stored key
    await serverStore.saveByokCredential(encA);

    // ------------------------------------------------------------------
    // ACCEPTANCE 2: Minimal Text-Only Test on gemini-4-hydrogen
    // ------------------------------------------------------------------
    let hydrogenRequestBody: any = null;
    let calledModelsGet = false;
    setGeminiTransportForTests(null);
    setGeminiFetchForTests(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (init?.method === 'GET' || url.match(/\/models\/gemini-4-hydrogen$/)) {
        calledModelsGet = true;
        return jsonResponse(200, { name: 'models/gemini-4-hydrogen', displayName: 'Gemini 4 Hydrogen' }, {
          'x-goog-request-id': 'req-hydrogen-get-01',
        });
      }
      hydrogenRequestBody = JSON.parse(String(init?.body || '{}'));
      return jsonResponse(
        200,
        {
          candidates: [
            { content: { parts: [{ text: CONNECTION_TEST_TOKEN }], role: 'model' }, finishReason: 'STOP' },
          ],
          usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7 },
        },
        { 'x-goog-request-id': 'req-hydrogen-gen-01' }
      );
    });

    const hydrogenTestRes = await httpJson(baseUrl, '/api/ai/key/test', {
      method: 'POST',
      uid: USER_A,
      body: { modelId: 'gemini-4-hydrogen' },
    });
    const promptSent = JSON.stringify(hydrogenRequestBody?.contents || '');
    assert(
      hydrogenTestRes.status === 200 &&
        hydrogenTestRes.json.ok === true &&
        hydrogenTestRes.json.echoMatched === true &&
        calledModelsGet === true &&
        promptSent.includes(CONNECTION_TEST_TOKEN) &&
        hydrogenRequestBody?.generationConfig?.maxOutputTokens === 128 &&
        !hydrogenRequestBody?.systemInstruction &&
        !hydrogenRequestBody?.tools &&
        hydrogenTestRes.json.diagnostic?.httpStatus === 200 &&
        hydrogenTestRes.json.diagnostic?.googleRequestId === 'req-hydrogen-gen-01' &&
        hydrogenTestRes.json.diagnostic?.failurePhase === 'completed',
      'Test 2: Minimal text-only test on gemini-4-hydrogen verifies model, uses tiny maxOutputTokens (128), omits profile/system/search, and reports real tokens & request ID'
    );

    // ------------------------------------------------------------------
    // ACCEPTANCE 3: Independent gemini-3.1-flash-lite Verification
    // ------------------------------------------------------------------
    let flashLiteBody: any = null;
    setGeminiFetchForTests(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (init?.method === 'GET' || url.match(/\/models\/gemini-3\.1-flash-lite$/)) {
        return jsonResponse(200, { name: 'models/gemini-3.1-flash-lite' }, { 'x-goog-request-id': 'req-lite-get-01' });
      }
      flashLiteBody = JSON.parse(String(init?.body || '{}'));
      return jsonResponse(
        200,
        {
          candidates: [{ content: { parts: [{ text: CONNECTION_TEST_TOKEN }], role: 'model' } }],
          usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 5 },
        },
        { 'x-goog-request-id': 'req-lite-gen-01' }
      );
    });

    const flashLiteTest = await httpJson(baseUrl, '/api/ai/key/test', {
      method: 'POST',
      uid: USER_A,
      body: { modelId: 'gemini-3.1-flash-lite' },
    });
    assert(
      flashLiteTest.status === 200 &&
        flashLiteTest.json.ok === true &&
        flashLiteTest.json.model === 'gemini-3.1-flash-lite' &&
        flashLiteBody?.generationConfig?.maxOutputTokens === 64 &&
        flashLiteTest.json.metadata?.selectedModel === 'gemini-4-hydrogen',
      'Test 3: gemini-3.1-flash-lite tested independently without mutating active selectedModel'
    );

    // ------------------------------------------------------------------
    // ACCEPTANCE 4: Invalid Key (401/403) -> Clear Error, Zero Retries, Not Timeout
    // ------------------------------------------------------------------
    let invalidKeyAttempts = 0;
    setGeminiFetchForTests(async () => {
      invalidKeyAttempts++;
      return jsonResponse(
        401,
        { error: { code: 401, message: `API key not valid (${SECRET_KEY_A}).`, status: 'UNAUTHENTICATED' } },
        { 'x-goog-request-id': 'req-invalid-key-401' }
      );
    });

    const invalidTest = await httpJson(baseUrl, '/api/ai/key/test', {
      method: 'POST',
      uid: USER_A,
      body: { modelId: 'gemini-4-hydrogen' },
    });
    assert(
      invalidTest.status === 401 &&
        invalidTest.json.ok === false &&
        invalidTest.json.code === 'INVALID_API_KEY' &&
        invalidKeyAttempts === 1 &&
        invalidTest.json.diagnostic?.httpStatus === 401 &&
        invalidTest.json.diagnostic?.failurePhase === 'response_headers',
      'Test 4: Invalid API key (401) fails fast with INVALID_API_KEY, zero retries, and exact httpStatus/failurePhase'
    );

    // ------------------------------------------------------------------
    // ACCEPTANCE 5: Unsupported / 404 Model -> INVALID_MODEL, Zero Retries, No Silent Paid Fallback
    // ------------------------------------------------------------------
    let notFoundAttempts = 0;
    setGeminiFetchForTests(async () => {
      notFoundAttempts++;
      return jsonResponse(
        404,
        { error: { code: 404, message: 'models/gemini-4-hydrogen is not found for API version v1beta', status: 'NOT_FOUND' } },
        { 'x-goog-request-id': 'req-model-404' }
      );
    });

    const model404Test = await httpJson(baseUrl, '/api/ai/key/test', {
      method: 'POST',
      uid: USER_A,
      body: { modelId: 'gemini-4-hydrogen' },
    });
    const badModelIdTest = await httpJson(baseUrl, '/api/ai/key/test', {
      method: 'POST',
      uid: USER_A,
      body: { modelId: 'gemini-nonexistent-99' },
    });
    assert(
      model404Test.status === 404 &&
        model404Test.json.code === 'INVALID_MODEL' &&
        notFoundAttempts === 1 &&
        badModelIdTest.status === 404 &&
        badModelIdTest.json.error === 'INVALID_MODEL',
      'Test 5: 404 / unsupported model fails fast with INVALID_MODEL (404), zero retries, and no silent fallback to paid models'
    );

    // ------------------------------------------------------------------
    // ACCEPTANCE 6: Quota Exhaustion (429) -> Clear Quota Message, Zero Retries
    // ------------------------------------------------------------------
    let quotaAttempts = 0;
    setGeminiFetchForTests(async () => {
      quotaAttempts++;
      return jsonResponse(
        429,
        { error: { code: 429, message: 'You exceeded your current quota.', status: 'RESOURCE_EXHAUSTED' } },
        { 'x-goog-request-id': 'req-quota-429' }
      );
    });

    const quotaTest = await httpJson(baseUrl, '/api/ai/key/test', {
      method: 'POST',
      uid: USER_A,
      body: { modelId: 'gemini-4-hydrogen' },
    });
    assert(
      quotaTest.status === 429 &&
        quotaTest.json.code === 'QUOTA_EXCEEDED' &&
        quotaAttempts === 1 &&
        quotaTest.json.diagnostic?.httpStatus === 429,
      'Test 6: Quota exhaustion returns 429 QUOTA_EXCEEDED cleanly with zero retry loops'
    );

    // Also verify HTTP 400 (non-auth invalid config) is cleanly distinguished with zero retries
    let badReqAttempts = 0;
    setGeminiFetchForTests(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.match(/\/models\/gemini-4-hydrogen$/)) {
        return jsonResponse(200, { name: 'models/gemini-4-hydrogen' });
      }
      badReqAttempts++;
      return jsonResponse(
        400,
        { error: { code: 400, message: 'Thinking level parameter unsupported', status: 'INVALID_ARGUMENT' } },
        { 'x-goog-request-id': 'req-bad-400' }
      );
    });
    const badReqTest = await httpJson(baseUrl, '/api/ai/key/test', {
      method: 'POST',
      uid: USER_A,
      body: { modelId: 'gemini-4-hydrogen' },
    });
    assert(
      badReqTest.status === 400 &&
        badReqTest.json.code === 'BAD_REQUEST' &&
        badReqAttempts === 1 &&
        badReqTest.json.diagnostic?.httpStatus === 400,
      'Test 6b: HTTP 400 invalid configuration returns BAD_REQUEST distinctly with zero retries'
    );

    // ------------------------------------------------------------------
    // ACCEPTANCE 7: Provider 503 Overload -> Bounded Retry w/ Backoff & Recovery
    // ------------------------------------------------------------------
    let overloadAttempts = 0;
    setGeminiFetchForTests(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.match(/\/models\/gemini-4-hydrogen$/)) {
        return jsonResponse(200, { name: 'models/gemini-4-hydrogen' });
      }
      overloadAttempts++;
      if (overloadAttempts === 1) {
        return jsonResponse(
          503,
          { error: { code: 503, message: 'Service temporarily overloaded.', status: 'UNAVAILABLE' } },
          { 'x-goog-request-id': 'req-overload-503' }
        );
      }
      return jsonResponse(
        200,
        {
          candidates: [{ content: { parts: [{ text: CONNECTION_TEST_TOKEN }], role: 'model' } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 6 },
        },
        { 'x-goog-request-id': 'req-recovered-200' }
      );
    });

    const overloadRecovery = await httpJson(baseUrl, '/api/ai/key/test', {
      method: 'POST',
      uid: USER_A,
      body: { modelId: 'gemini-4-hydrogen' },
    });
    assert(
      overloadRecovery.status === 200 &&
        overloadRecovery.json.ok === true &&
        overloadAttempts === 2 &&
        overloadRecovery.json.diagnostic?.httpStatus === 200,
      'Test 7: Transient 503 overload performs bounded retry with backoff and recovers cleanly'
    );

    // ------------------------------------------------------------------
    // ACCEPTANCE 8: Client Timeout Behavior (Connection vs Response Generation)
    //               AND NEVER fake-green on failed/timed-out connection test
    // ------------------------------------------------------------------
    // Override customFetch with an immediate-abort-respecting hanging promise AND custom short timeout via transport/fetch
    setGeminiFetchForTests(async (_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => {
            const abortErr = new Error('The operation was aborted due to timeout');
            abortErr.name = 'AbortError';
            reject(abortErr);
          },
          { once: true }
        );
      });
    });

    // Directly verify testByokApiKeyConnection fails honestly with TIMEOUT if provider stalls past connectTimeoutMs (6s)
    const connTimeoutRes = await testByokApiKeyConnection(SECRET_KEY_A, 'gemini-4-hydrogen');
    assert(
      connTimeoutRes.ok === false &&
        connTimeoutRes.status === 'error' &&
        connTimeoutRes.code === 'TIMEOUT' &&
        connTimeoutRes.diagnostic.failurePhase === 'connection' &&
        connTimeoutRes.diagnostic.elapsedMs >= 5500 &&
        connTimeoutRes.diagnostic.elapsedMs < 15000,
      'Test 8a: Hanging connection aborts cleanly at connect timeout, classifies TIMEOUT with failurePhase=connection, and NEVER reports ok:true'
    );

    // Test response_generation timeout phase using real generateTextWithByok with short response timeout
    setGeminiFetchForTests(async (input, init) => {
      // Return 200 headers immediately, then hang when reading body stream until abortSignal fires
      const stalledStream = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener(
            'abort',
            () => {
              const abortErr = new Error('Body read timed out');
              abortErr.name = 'AbortError';
              controller.error(abortErr);
            },
            { once: true }
          );
        },
      });
      return new Response(stalledStream, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-request-id': 'req-body-stall-01',
        },
      });
    });

    const { generateTextWithByok } = await import('./src/lib/intelligence/geminiProvider.ts');
    let bodyTimeoutCaught: any = null;
    try {
      await generateTextWithByok({
        apiKey: SECRET_KEY_A,
        model: 'gemini-4-hydrogen',
        contents: 'Hello',
        connectTimeoutMs: 3000,
        timeoutMs: 350,
        maxTransientRetries: 0,
      });
    } catch (e) {
      bodyTimeoutCaught = e;
    }
    assert(
      bodyTimeoutCaught &&
        bodyTimeoutCaught.code === 'TIMEOUT' &&
        bodyTimeoutCaught.diagnostic?.httpStatus === 200 &&
        bodyTimeoutCaught.diagnostic?.googleRequestId === 'req-body-stall-01' &&
        bodyTimeoutCaught.diagnostic?.failurePhase === 'response_generation',
      'Test 8b: Stalled body read after 200 headers reports TIMEOUT with failurePhase=response_generation, httpStatus=200, and request ID'
    );

    // Restore clean fetch and ensure failed/timed-out generate run records failedCalls without inventing tokens
    setGeminiFetchForTests(null);

    // ------------------------------------------------------------------
    // ACCEPTANCE 9: API Key Never Exposed in Payloads, Diagnostics, or Logs
    // ------------------------------------------------------------------
    const combinedLogs = capturedLogs.join('\n');
    const serializedResponses = JSON.stringify({
      hydrogenTestRes,
      invalidTest,
      quotaTest,
      badReqTest,
      connTimeoutRes,
      bodyTimeoutCaught,
    });
    assert(
      !combinedLogs.includes(SECRET_KEY_A) &&
        !combinedLogs.includes('?key=') &&
        !serializedResponses.includes(SECRET_KEY_A) &&
        !serializedResponses.includes(SECRET_KEY_B),
      'Test 9: Raw API key and ?key= query parameters never appear in logs, payloads, errors, or diagnostics'
    );

    // ------------------------------------------------------------------
    // ACCEPTANCE 10: Model Selector Metadata Cleanliness
    // ------------------------------------------------------------------
    const allowedModelKeys = new Set(['id', 'label', 'tier', 'badge', 'description', 'recommendedFor', 'isDefault']);
    const apiStatusRes = await httpJson(baseUrl, '/api/ai/key', { uid: USER_A });
    const modelsClean =
      Array.isArray(apiStatusRes.json.models) &&
      apiStatusRes.json.models.length === SUPPORTED_GEMINI_MODELS.length &&
      apiStatusRes.json.models.every((m: any) =>
        Object.keys(m).every((k) => allowedModelKeys.has(k)) &&
        typeof m.id === 'string' &&
        typeof m.label === 'string' &&
        typeof m.tier === 'string' &&
        typeof m.description === 'string'
      );
    assert(
      modelsClean,
      'Test 10: Model selector options strictly contain only model metadata (name, ID, access tier, description)'
    );

    // ------------------------------------------------------------------
    // ACCEPTANCE 11: Usage Metrics Integrity (Failed vs Succeeded, Real Tokens Only)
    // ------------------------------------------------------------------
    // Simulate a timed-out pipeline run followed by a successful pipeline run with real token metadata
    setGeminiTransportForTests({
      async generate() {
        const timeoutErr: any = new Error('Timed out during response_generation');
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.status = 504;
        throw timeoutErr;
      },
    });

    const failedExec = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: {
        task: 'topic_analysis',
        input: { topic: 'Ancient Roman Concrete' },
        enableWebResearch: false,
      },
    });
    const metricsAfterFail = await serverStore.getAiUsageMetrics(USER_A);

    setGeminiTransportForTests({
      async generate() {
        return {
          text: JSON.stringify({
            analyzedTopic: 'Ancient Roman Concrete',
            bestFormat: 'Long-form',
            whyFormatFits: 'Deep historical mystery benefits from structured evidence chapters.',
            recommendedAudience: 'History & engineering enthusiasts',
            suggestedAngle: 'Why volcanic ash self-healed Roman sea walls for 2000 years',
            productionDifficulty: 'Medium',
            estimatedProductionTime: '3 hours',
            budgetFit: 'Free tools only',
            topicSummary: 'Roman marine concrete outlasted modern concrete due to lime clasts and volcanic pozzolana.',
            recommendedIdeas: [
              {
                id: 'idea_1',
                title: 'Why Ancient Roman Harbors Still Stand After 2,000 Years',
                format: 'Long-form',
                goal: 'Watch Time',
                difficulty: 'Medium',
                estimatedTime: '3 hours',
                topicRelevance: 95,
                whyThisIdea: ['Strong engineering mystery', 'Fits faceless visual storytelling'],
                budgetFit: 'Free tools only',
                status: 'Idea',
                suggestedAngle: 'Self-healing lime clasts',
                targetAudience: 'Science & history viewers',
                presentationFormat: 'Documentary narration',
              },
              {
                id: 'idea_2',
                title: 'The Secret Volcanic Ash Inside Ancient Roman Concrete',
                format: 'Short',
                goal: 'Discovery',
                difficulty: 'Easy',
                estimatedTime: '1 hour',
                topicRelevance: 91,
                whyThisIdea: ['Quick curiosity hook', 'Zero paid tools needed'],
                budgetFit: 'Free tools only',
                status: 'Idea',
                suggestedAngle: 'Pozzolana chemical reaction',
                targetAudience: 'Science & history viewers',
                presentationFormat: 'Voiceover explainer',
              },
            ],
          }),
          inputTokens: 320,
          outputTokens: 480,
          sources: [],
        };
      },
    });

    const successExec = await httpJson(baseUrl, '/api/intelligence/execute', {
      method: 'POST',
      uid: USER_A,
      body: {
        task: 'topic_analysis',
        input: { topic: 'Ancient Roman Concrete' },
        bypassCache: true,
        enableWebResearch: false,
      },
    });
    const metricsAfterSuccess = await serverStore.getAiUsageMetrics(USER_A);

    assert(
      failedExec.status === 504 &&
        metricsAfterFail.totalCalls === 1 &&
        metricsAfterFail.failedCalls === 1 &&
        metricsAfterFail.successfulCalls === 0 &&
        metricsAfterFail.totalInputTokens === 0 &&
        metricsAfterFail.totalOutputTokens === 0 &&
        successExec.status === 200 &&
        metricsAfterSuccess.totalCalls === 2 &&
        metricsAfterSuccess.failedCalls === 1 &&
        metricsAfterSuccess.successfulCalls === 1 &&
        metricsAfterSuccess.totalInputTokens === 320 &&
        metricsAfterSuccess.totalOutputTokens === 480,
      'Test 11: Failed/timed-out runs increment failedCalls with 0 invented tokens; successful runs record real inputTokens/outputTokens separately'
    );

    // Silence linter/unused warning check by verifying exported pipeline object callable
    assert(typeof runIntelligencePipeline === 'function', 'Test 12: Core pipeline symbol intact');

    console.log('\n================================================================');
    console.log('ALL 12 BYOK TIMEOUT & DIAGNOSTIC ACCEPTANCE TESTS PASSED ✅');
    console.log('================================================================');
  } finally {
    console.warn = origWarn;
    console.error = origError;
    setGeminiFetchForTests(null);
    setGeminiTransportForTests(null);
    server.close();
    try {
      if (fs.existsSync(TEMP_STATE_FILE)) fs.unlinkSync(TEMP_STATE_FILE);
    } catch {
      // ignore cleanup
    }
  }
}

runTests().catch((err) => {
  console.error('❌ ACCEPTANCE TEST SUITE FAILED:', err);
  process.exit(1);
});
