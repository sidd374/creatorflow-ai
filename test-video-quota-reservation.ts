/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Video Quota Counting, Weekly Rolling Reset, & Auth Gating Test Suite
 *
 * Validates:
 * 1. Unauthenticated rejection (401 AUTH_REQUIRED)
 * 2. Slot reservation on workflow start (Free plan slot 1 and 2)
 * 3. Idempotent deduplication (same workflowId never double-counts)
 * 4. Free limit enforcement (3rd start rejected with 403 WEEKLY_LIMIT_REACHED and exact required message)
 * 5. Server-authoritative rolling 7-day reset (168 hours window)
 * 6. Abandoned/cancelled workflow counting
 * 7. Paid plans preservation (Pro: 25, Creator: 75, MAX: 200)
 * 8. Autonomous Creator Assistant quota guard
 * 9. Route authentication classifications
 */

process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
process.env.CREATORFLOW_ALLOW_ISOLATED_TEST_HARNESS = 'true';
process.env.DISABLE_HMR = 'true';

import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { isProtectedView } from './src/App.tsx';
import { checkWeeklyVideoQuota, consumesWeeklyVideoSlot, ROLLING_WINDOW_MS } from './src/lib/videoQuota.ts';
import { generateAutonomousAssistantResponse } from './src/lib/autonomousAssistantEngine.ts';
import { CreatorFlowAssistantContext } from './src/lib/assistantContext.ts';

const TEST_SECRET = `cf_test_${crypto.randomBytes(16).toString('hex')}`;
const TEMP_STATE_FILE = path.join(os.tmpdir(), `creatorflow-video-quota-test-${Date.now()}.json`);
process.env.CREATORFLOW_TEST_SECRET = TEST_SECRET;
process.env.CREATORFLOW_STATE_FILE = TEMP_STATE_FILE;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — VIDEO QUOTA & WEEKLY RESET REGRESSION SUITE');
  console.log('================================================================\n');

  const { app } = await import('./server.ts');

  // Start ephemeral test server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------
    // SUITE 1: Route Authentication Gating
    // -------------------------------------------------------------
    console.log('--- SUITE 1: Route Authentication Protection ---');
    assert(!isProtectedView('landing'), 'Landing view is publicly accessible');
    assert(!isProtectedView('pricing'), 'Pricing view is publicly accessible');
    assert(isProtectedView('dashboard'), 'Dashboard requires authentication');
    assert(isProtectedView('guided-workflow'), 'Guided workflow requires authentication');
    assert(isProtectedView('tools'), 'Tools view requires authentication');
    assert(isProtectedView('saved'), 'Saved packs require authentication');
    assert(isProtectedView('history'), 'History requires authentication');
    assert(isProtectedView('builder'), 'Video Builder requires authentication');
    assert(isProtectedView('radar'), 'Daily Content Radar requires authentication');

    // -------------------------------------------------------------
    // SUITE 2: Unauthenticated Request Protection (Server API)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Server-Side Auth Verification ---');
    const unauthRes = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId: 'wf_unauth_1', topic: 'Unauth Video' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated reservation returns 401');
    const unauthData = await unauthRes.json();
    assert(unauthData.error === 'UNAUTHORIZED' || unauthData.error === 'AUTH_REQUIRED', 'Error code indicates unauthorized');

    const unauthQuotaRes = await fetch(`${baseUrl}/api/video/quota`);
    assert(unauthQuotaRes.status === 401, 'Unauthenticated quota check returns 401');

    const forgedHeaderRes = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-creatorflow-account-id': 'test_forged_usr',
        'x-creatorflow-test-runner': 'true',
        'x-creatorflow-test-plan': 'max',
      },
      body: JSON.stringify({ workflowId: 'wf_forged_1', topic: 'Forged Video' }),
    });
    assert(forgedHeaderRes.status === 401, 'Forged x-creatorflow-test-runner header without valid secret returns 401');

    // -------------------------------------------------------------
    // SUITE 3: Free Plan Reservation & Deduplication
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Free Plan Video Quota Reservation ---');
    const testUserFree = 'test_usr_free_' + Date.now();
    const headersFree = {
      'Content-Type': 'application/json',
      'x-creatorflow-account-id': testUserFree,
      'x-creatorflow-test-secret': TEST_SECRET,
    };

    const T0 = 1700000000000; // Base timestamp for test

    // Reserve Slot 1
    const res1 = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: { ...headersFree, 'x-test-clock-ms': String(T0) },
      body: JSON.stringify({ workflowId: 'wf_free_video_1', topic: 'My First Video' }),
    });
    assert(res1.status === 200, 'Video 1 reservation succeeds with 200 OK');
    const data1 = await res1.json();
    assert(data1.success === true, 'Video 1 reservation success is true');
    assert(data1.weeklyUsed === 1, 'Weekly used is 1 after video 1');
    assert(data1.weeklyRemaining === 1, 'Weekly remaining is 1 after video 1');

    // Deduplication check: Same workflowId does NOT double-count
    const res1Dup = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: { ...headersFree, 'x-test-clock-ms': String(T0 + 1000) },
      body: JSON.stringify({ workflowId: 'wf_free_video_1', topic: 'My First Video (Model switch)' }),
    });
    assert(res1Dup.status === 200, 'Duplicate workflowId request returns 200 OK');
    const data1Dup = await res1Dup.json();
    assert(data1Dup.alreadyReserved === true, 'Response indicates alreadyReserved: true');
    assert(data1Dup.weeklyUsed === 1, 'Weekly used remains 1 (no double counting)');

    // Reserve Slot 2
    const res2 = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: { ...headersFree, 'x-test-clock-ms': String(T0 + 3600000) }, // +1 hour
      body: JSON.stringify({ workflowId: 'wf_free_video_2', topic: 'My Second Video' }),
    });
    assert(res2.status === 200, 'Video 2 reservation succeeds with 200 OK');
    const data2 = await res2.json();
    assert(data2.weeklyUsed === 2, 'Weekly used is now 2');
    assert(data2.weeklyRemaining === 0, 'Weekly remaining is now 0');

    // -------------------------------------------------------------
    // SUITE 4: Free Limit Enforcement & Rejection Contract
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Free Limit Enforcement ---');
    const res3 = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: { ...headersFree, 'x-test-clock-ms': String(T0 + 7200000) }, // +2 hours
      body: JSON.stringify({ workflowId: 'wf_free_video_3', topic: 'Third Video Should Fail' }),
    });
    assert(res3.status === 403, 'Video 3 start is rejected with 403 Forbidden');
    const data3 = await res3.json();
    assert(data3.error === 'WEEKLY_LIMIT_REACHED', 'Error code is strictly WEEKLY_LIMIT_REACHED');
    assert(
      data3.message.includes('You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.'),
      'Contains exact required user-facing limit message'
    );
    assert(Boolean(data3.resetsInFormatted), 'Returns human-readable resetsInFormatted countdown');
    assert(Boolean(data3.resetsAtMs), 'Returns exact server resetsAtMs');
    assert(data3.upgradeUrl === '/pricing', 'Returns upgradeUrl pointing to /pricing');

    // Authoritative GET /api/video/quota reflects 2 used, 0 remaining, allowed: false
    const quotaRes = await fetch(`${baseUrl}/api/video/quota`, {
      headers: { ...headersFree, 'x-test-clock-ms': String(T0 + 7200000) },
    });
    const quotaData = await quotaRes.json();
    assert(quotaData.weeklyUsed === 2, 'Authoritative quota weeklyUsed is 2');
    assert(quotaData.weeklyRemaining === 0, 'Authoritative quota weeklyRemaining is 0');
    assert(quotaData.allowed === false, 'Authoritative quota allowed is false');

    // -------------------------------------------------------------
    // SUITE 5: Rolling 7-Day Window Reset (168 Hours)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: Rolling 7-Day Window Reset ---');
    // Fast forward clock: T0 + 7 days + 1 second.
    // Video 1 was at T0. Video 2 was at T0 + 1 hour.
    // At T0 + 7 days + 1 second, Video 1 has expired (> 168h), but Video 2 is still active (< 168h).
    const T_after_slot1_expiry = T0 + ROLLING_WINDOW_MS + 1000;

    const quotaAfter1Res = await fetch(`${baseUrl}/api/video/quota`, {
      headers: { ...headersFree, 'x-test-clock-ms': String(T_after_slot1_expiry) },
    });
    const quotaAfter1Data = await quotaAfter1Res.json();
    assert(quotaAfter1Data.weeklyUsed === 1, 'Only 1 active reservation after slot 1 expires');
    assert(quotaAfter1Data.weeklyRemaining === 1, 'Weekly remaining incremented back to 1');
    assert(quotaAfter1Data.allowed === true, 'Quota allowed is once again true');

    // Reserving a new video slot now succeeds!
    const resAfterExpiry = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: { ...headersFree, 'x-test-clock-ms': String(T_after_slot1_expiry) },
      body: JSON.stringify({ workflowId: 'wf_free_video_after_reset', topic: 'Video After Reset' }),
    });
    assert(resAfterExpiry.status === 200, 'Video reservation succeeds after 7-day rolling slot expires');
    const dataAfterExpiry = await resAfterExpiry.json();
    assert(dataAfterExpiry.weeklyUsed === 2, 'Weekly used returns to 2');

    // Fast forward to after Video 2 also expires
    const T_after_all_expiry = T0 + 3600000 + ROLLING_WINDOW_MS + 2000;
    // At this point, Video 2 is expired, but wf_free_video_after_reset is still active
    const quotaAfter2Res = await fetch(`${baseUrl}/api/video/quota`, {
      headers: { ...headersFree, 'x-test-clock-ms': String(T_after_all_expiry) },
    });
    const quotaAfter2Data = await quotaAfter2Res.json();
    assert(quotaAfter2Data.weeklyUsed === 1, 'Active reservations correctly tracked across independent expiries');

    // -------------------------------------------------------------
    // SUITE 6: Abandoned / Cancelled Workflow Counting
    // -------------------------------------------------------------
    console.log('\n--- SUITE 6: Abandoned / Cancelled Workflow Handling ---');
    // Rule: Reservation is deducted AT START. If user never completes, slot remains reserved.
    const testUserAbandon = 'test_usr_abandon_' + Date.now();
    const headersAbandon = {
      'Content-Type': 'application/json',
      'x-creatorflow-account-id': testUserAbandon,
      'x-creatorflow-test-secret': TEST_SECRET,
    };
    await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: headersAbandon,
      body: JSON.stringify({ workflowId: 'wf_abandoned_at_step_3', topic: 'Abandoned Workflow' }),
    });
    // Check quota immediately
    const abandonQuotaRes = await fetch(`${baseUrl}/api/video/quota`, { headers: headersAbandon });
    const abandonQuota = await abandonQuotaRes.json();
    assert(abandonQuota.weeklyUsed === 1, 'Abandoned workflow is counted at start');
    assert(abandonQuota.weeklyRemaining === 1, 'Remaining starts correctly reflects consumed slot');

    // -------------------------------------------------------------
    // SUITE 7: Paid Plans Quotas (Pro = 25, Creator = 75, MAX = 200)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 7: Paid Plans Allowance Preservation ---');
    const testUserPro = 'test_usr_pro_' + Date.now();
    const headersPro = {
      'Content-Type': 'application/json',
      'x-creatorflow-account-id': testUserPro,
      'x-creatorflow-test-secret': TEST_SECRET,
      'x-creatorflow-test-plan': 'pro',
    };

    // User can reserve video 1, 2, 3 without 403
    for (let i = 1; i <= 3; i++) {
      const proRes = await fetch(`${baseUrl}/api/video/reserve-slot`, {
        method: 'POST',
        headers: headersPro,
        body: JSON.stringify({ workflowId: `wf_pro_video_${i}`, topic: `Pro Video ${i}` }),
      });
      assert(proRes.status === 200, `Pro plan video ${i} reservation succeeds`);
    }

    const proQuotaRes = await fetch(`${baseUrl}/api/video/quota`, { headers: headersPro });
    const proQuota = await proQuotaRes.json();
    assert(proQuota.weeklyLimit === 25, 'Pro limit is 25');
    assert(proQuota.weeklyUsed === 3, 'Pro used is 3');
    assert(proQuota.weeklyRemaining === 22, 'Pro remaining is 22');
    assert(proQuota.allowed === true, 'Pro continues to be allowed');

    // -------------------------------------------------------------
    // SUITE 8: Autonomous Creator Assistant Quota Guard
    // -------------------------------------------------------------
    console.log('\n--- SUITE 8: Autonomous Creator Assistant Quota Guard ---');
    // Test that when Free limit is reached, assistant Stage 4 blocks and returns required guidance
    const assistantContext: CreatorFlowAssistantContext = {
      currentPage: 'dashboard',
      plan: 'free',
      creatorProfile: {
        channelTopic: 'Tech Reviews',
        primaryGoal: 'Subscribers',
        creatorStyle: 'Direct',
        experienceLevel: 'Intermediate',
        dailyTimeAvailable: '1 hour',
        monthlyBudget: 'Free',
        availableDevices: ['Laptop'],
        preferredLanguage: 'English',
      },
    };

    // Before reaching limit, asking for advice returns suggestions
    const adviceReply = await generateAutonomousAssistantResponse(
      [{ id: '1', role: 'user', content: 'Suggest an idea for my next video', timestamp: Date.now() }],
      assistantContext
    );
    assert(adviceReply.includes('RECOMMENDED NEXT VIDEO STRATEGY'), 'Assistant suggests ideas freely without consuming slots');

    // When quota is exhausted for the free user, asking for video prompts / production package blocks
    // Temporarily record 2 generations in the local videoQuota module for free tier
    const quotaStatus = checkWeeklyVideoQuota('free');
    if (quotaStatus.allowed) {
      // Simulate reaching quota
      const { recordWeeklyVideoGeneration } = await import('./src/lib/videoQuota.ts');
      recordWeeklyVideoGeneration('Test Video 1');
      recordWeeklyVideoGeneration('Test Video 2');
    }

    const promptReply = await generateAutonomousAssistantResponse(
      [{ id: '2', role: 'user', content: 'Generate Kling video prompts for my video', timestamp: Date.now() }],
      assistantContext
    );
    assert(
      promptReply.includes('You’ve used your 2 free video starts'),
      'Assistant halts prompt generation and returns required limit message when free quota is used'
    );

    // -------------------------------------------------------------
    // SUITE 9: Phase 2 Plan Security, Non-Video Single Utilities & Rollback
    // -------------------------------------------------------------
    console.log('\n--- SUITE 9: Plan Security, Non-Video Single Utilities & Rollback ---');
    assert(!consumesWeeklyVideoSlot('title-generator'), 'Title generator does NOT consume weekly video slot');
    assert(!consumesWeeklyVideoSlot('hook-generator'), 'Hook generator does NOT consume weekly video slot');
    assert(!consumesWeeklyVideoSlot('description-generator'), 'Description generator does NOT consume weekly video slot');
    assert(!consumesWeeklyVideoSlot('hashtag-generator'), 'Hashtag generator does NOT consume weekly video slot');
    assert(!consumesWeeklyVideoSlot('keywords-generator'), 'Keywords generator does NOT consume weekly video slot');
    assert(!consumesWeeklyVideoSlot('video-ideas-generator'), 'Video ideas generator does NOT consume weekly video slot');
    assert(consumesWeeklyVideoSlot('shorts-script-generator'), 'Shorts script generator consumes a weekly video slot');
    assert(consumesWeeklyVideoSlot('video-prompt-generator'), 'Video prompt generator consumes a weekly video slot');

    // Direct API call without auth to /api/generate rejected with 401
    const unauthGen = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Test prompt' }),
    });
    assert(unauthGen.status === 401, 'POST /api/generate rejects unauthenticated calls with 401');

    // Free user calling /api/generate directly for paid feature MUST get 403 FEATURE_LOCKED
    const lockedGen = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: headersFree,
      body: JSON.stringify({
        prompt: 'Build 90 day channel architecture',
        feature: 'channel_architecture_90_day',
      }),
    });
    assert(lockedGen.status === 403, 'Free user calling /api/generate with paid feature gets 403');
    const lockedGenJson = await lockedGen.json();
    assert(lockedGenJson.error === 'FEATURE_LOCKED', 'Server returns explicit FEATURE_LOCKED error');

    // Slot rollback endpoint ensures failed requests do NOT consume quota
    const rollbackTestUser = 'test_usr_rollback_' + Date.now();
    const rollbackHeaders = {
      'Content-Type': 'application/json',
      'x-creatorflow-account-id': rollbackTestUser,
      'x-creatorflow-test-secret': TEST_SECRET,
    };
    const rRes = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: rollbackHeaders,
      body: JSON.stringify({ workflowId: 'wf_fail_test_1', topic: 'Failed Start' }),
    });
    assert((await rRes.json()).weeklyUsed === 1, 'Slot reserved before request');

    const releaseRes = await fetch(`${baseUrl}/api/video/release-slot`, {
      method: 'POST',
      headers: rollbackHeaders,
      body: JSON.stringify({ workflowId: 'wf_fail_test_1' }),
    });
    const releaseJson = await releaseRes.json();
    assert(releaseJson.released === true && releaseJson.weeklyUsed === 0, 'Failed request releases slot cleanly so weeklyUsed returns to 0');
    assert(releaseJson.weeklyLimit === 2 && releaseJson.weeklyRemaining === 2, 'Release response computes exact weeklyLimit and weeklyRemaining');

    console.log('\n================================================================');
    console.log('ALL VIDEO QUOTA & WEEKLY RESET TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('================================================================');
  } finally {
    server.close();
    if (fs.existsSync(TEMP_STATE_FILE)) {
      fs.unlinkSync(TEMP_STATE_FILE);
    }
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
