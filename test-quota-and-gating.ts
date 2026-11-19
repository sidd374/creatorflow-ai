/**
 * CreatorFlow AI — Authentication Gating & Rolling Weekly Quota Regression Suite
 * Tests Issue 1 & Issue 2 requirements with deterministic clock progression.
 */

process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
process.env.CREATORFLOW_ALLOW_ISOLATED_TEST_HARNESS = 'true';
process.env.DISABLE_HMR = 'true';

import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import {
  checkWeeklyVideoQuota,
  recordWeeklyVideoGeneration,
  resetWeeklyQuotaForTesting,
  WEEKLY_VIDEO_LIMITS,
  ROLLING_WINDOW_MS,
} from './src/lib/videoQuota';
import { isProtectedView } from './src/App';
import { isCopyAllowedForPlan } from './src/lib/planEntitlements';

const TEST_SECRET = `cf_test_${crypto.randomBytes(16).toString('hex')}`;
const TEMP_STATE_FILE = path.join(os.tmpdir(), `creatorflow-quota-test-${Date.now()}.json`);
process.env.CREATORFLOW_TEST_SECRET = TEST_SECRET;
process.env.CREATORFLOW_STATE_FILE = TEMP_STATE_FILE;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — AUTH GATING & ROLLING WEEKLY QUOTA SUITE');
  console.log('================================================================\n');

  const { app } = await import('./server.ts');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------
    // SUITE 1: Route Gating & Public vs Protected Classification
    // -------------------------------------------------------------
    console.log('--- SUITE 1: Route Gating & Protected Views ---');
    assert(!isProtectedView('landing'), 'Landing page is classified as public');
    assert(!isProtectedView('pricing'), 'Pricing page is classified as public');
    assert(!isProtectedView('demo'), 'Public demo workflow is classified as public');

    assert(isProtectedView('dashboard'), 'Dashboard is protected (requires auth)');
    assert(isProtectedView('guided-workflow'), 'Guided workflow is protected (requires auth)');
    assert(isProtectedView('builder'), 'Video Builder is protected (requires auth)');
    assert(isProtectedView('analytics'), 'Creator Analytics is protected (requires auth)');
    assert(isProtectedView('ideas'), 'Planner / Ideas is protected (requires auth)');
    assert(isProtectedView('radar'), 'Radar is protected (requires auth)');
    assert(isProtectedView('content-pack'), 'Content Pack generation is protected (requires auth)');
    assert(isProtectedView('settings'), 'Account Settings is protected (requires auth)');
    assert(isProtectedView('admin'), 'Admin console is protected (requires auth)');

    // -------------------------------------------------------------
    // SUITE 2: Client-side Rolling 7-Day Quota Engine with Controlled Clock
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Rolling 7-Day Weekly Quota Engine (Test Clock) ---');
    const testAccount = 'test_quota_acc_' + Date.now();
    resetWeeklyQuotaForTesting(testAccount);

    const T0 = 1700000000000;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

    let status = checkWeeklyVideoQuota('free', testAccount, T0);
    assert(status.allowed === true, 'Initial state: allowed to create video');
    assert(status.used === 0, 'Initial state: 0 videos used');
    assert(status.remaining === 2, 'Initial state: 2 videos remaining');
    assert(status.limit === 2, 'Free plan limit is exactly 2 videos');

    status = recordWeeklyVideoGeneration('AI Tools Overview', testAccount, T0);
    assert(status.allowed === true, 'Video #1: creation allowed');
    assert(status.used === 1, 'Video #1: usage becomes 1 of 2');
    assert(status.remaining === 1, 'Video #1: 1 video remaining');

    const T2 = T0 + 2 * ONE_DAY_MS;
    status = recordWeeklyVideoGeneration('Deep Dive into Scripts', testAccount, T2);
    assert(status.allowed === false, 'Video #2: quota now full (allowed is false for next)');
    assert(status.used === 2, 'Video #2: usage becomes 2 of 2');
    assert(status.remaining === 0, 'Video #2: 0 remaining');
    assert(status.oldestExpiringTimestamp === T0 + SEVEN_DAYS_MS, 'Oldest expiring timestamp correctly targets Video #1 + 7 days');
    assert(typeof status.resetsInFormatted === 'string', 'Human-readable reset countdown generated');

    const T4 = T0 + 4 * ONE_DAY_MS;
    const checkDay4 = checkWeeklyVideoQuota('free', testAccount, T4);
    assert(checkDay4.allowed === false, 'Video #3 on Day 4: blocked (within 7-day window)');
    assert(checkDay4.used === 2, 'Video #3 on Day 4: still 2 used');
    assert(checkDay4.remaining === 0, 'Video #3 on Day 4: 0 remaining');

    const T7_plus = T0 + SEVEN_DAYS_MS + 1000;
    const checkDay7 = checkWeeklyVideoQuota('free', testAccount, T7_plus);
    assert(checkDay7.allowed === true, 'Day 7+: allowed again because Video #1 left the rolling 7-day window');
    assert(checkDay7.used === 1, 'Day 7+: usage drops from 2 to 1');
    assert(checkDay7.remaining === 1, 'Day 7+: remaining becomes 1');

    status = recordWeeklyVideoGeneration('Third Video Upload', testAccount, T7_plus);
    assert(status.used === 2, 'Video #3 created: usage returns to 2 of 2');
    assert(status.allowed === false, 'Next video is blocked');

    const T9_plus = T2 + SEVEN_DAYS_MS + 1000;
    const checkDay9 = checkWeeklyVideoQuota('free', testAccount, T9_plus);
    assert(checkDay9.allowed === true, 'Day 9+: allowed because Video #2 left the window');
    assert(checkDay9.used === 1, 'Day 9+: only Video #3 remains active');

    const T15_plus = T7_plus + SEVEN_DAYS_MS + 1000;
    const checkDay15 = checkWeeklyVideoQuota('free', testAccount, T15_plus);
    assert(checkDay15.allowed === true, 'Day 15+: full quota available');
    assert(checkDay15.used === 0, 'Day 15+: 0 videos used');
    assert(checkDay15.remaining === 2, 'Day 15+: 2 videos remaining');

    // -------------------------------------------------------------
    // SUITE 3: Plan Limits Separation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Plan Limits Separation ---');
    assert(WEEKLY_VIDEO_LIMITS.free === 2, 'Free plan limit is 2 videos / week');
    assert(WEEKLY_VIDEO_LIMITS.pro === 25, 'Pro plan limit is 25 videos / week');
    assert(WEEKLY_VIDEO_LIMITS.creator === 75, 'Creator plan limit is 75 videos');
    assert(WEEKLY_VIDEO_LIMITS.max === 200, 'MAX plan limit is 200 videos');

    // -------------------------------------------------------------
    // SUITE 4: Copy Policy Distinction (Separate from weekly video count)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Copy Policy Separation ---');
    assert(isCopyAllowedForPlan('free', 1).allowed === true, 'Free plan allows full copy on generation #1');
    assert(isCopyAllowedForPlan('free', 2).allowed === false, 'Free plan locks copy on generation #2 (conversion prompt)');
    assert(isCopyAllowedForPlan('free', 2).isGenerationTwoLock === true, 'Flagged as generation two lock');
    assert(isCopyAllowedForPlan('pro', 2).allowed === true, 'Pro plan allows copy on generation #2');

    // -------------------------------------------------------------
    // SUITE 5: Server-side API Protection & Quota Enforcement
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: Server-side API Protection & Endpoints ---');

    const resUnauthRecord = await fetch(`${baseUrl}/api/generation/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'unauthenticated_random_user' }),
    });
    assert(resUnauthRecord.status === 401, 'POST /api/generation/record rejects unauthenticated requests with 401');

    const resForgedHeader = await fetch(`${baseUrl}/api/generation/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-creatorflow-test-runner': 'true',
        'x-creatorflow-test-plan': 'max',
        'x-creatorflow-account-id': 'test_forged_user',
      },
      body: JSON.stringify({ accountId: 'test_forged_user' }),
    });
    assert(resForgedHeader.status === 401, 'Forged x-creatorflow-test-runner header without valid secret fails with 401');

    const resUnauthStatus = await fetch(`${baseUrl}/api/generation/status?accountId=unauth_user`);
    assert(resUnauthStatus.status === 401, 'GET /api/generation/status rejects unauthenticated requests with 401');

    const resUnauthUsage = await fetch(`${baseUrl}/api/usage/summary?accountId=unauth_user`);
    assert(resUnauthUsage.status === 401, 'GET /api/usage/summary rejects unauthenticated requests with 401');

    const resUnauthCheck = await fetch(`${baseUrl}/api/usage/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'unauth_user', feature: 'creation_kit' }),
    });
    assert(resUnauthCheck.status === 401, 'POST /api/usage/check rejects unauthenticated requests with 401');

    const serverTestAcc = `test_server_quota_${Date.now()}`;
    const harnessHeaders = {
      'Content-Type': 'application/json',
      'x-creatorflow-test-secret': TEST_SECRET,
      'x-creatorflow-account-id': serverTestAcc,
    };

    const serverGen1 = await fetch(`${baseUrl}/api/generation/record`, {
      method: 'POST',
      headers: harnessHeaders,
      body: JSON.stringify({ accountId: serverTestAcc, customTimestampMs: T0 }),
    });
    const dataGen1 = await serverGen1.json();
    assert(dataGen1.success === true, 'Server video #1 allowed');
    assert(dataGen1.weeklyUsed === 1, 'Server video #1 weeklyUsed is 1');
    assert(dataGen1.weeklyRemaining === 1, 'Server video #1 weeklyRemaining is 1');
    assert(dataGen1.isCopyAllowed === true, 'Server video #1 allows copy');

    const serverFailed = await fetch(`${baseUrl}/api/generation/record`, {
      method: 'POST',
      headers: harnessHeaders,
      body: JSON.stringify({ accountId: serverTestAcc, failed: true }),
    });
    const dataFailed = await serverFailed.json();
    assert(dataFailed.consumed === false, 'Server failed generation does NOT consume quota slot');

    const idempotencyKey = 'retry_op_123';
    const serverGen2 = await fetch(`${baseUrl}/api/generation/record`, {
      method: 'POST',
      headers: harnessHeaders,
      body: JSON.stringify({ accountId: serverTestAcc, customTimestampMs: T2, idempotencyKey }),
    });
    const dataGen2 = await serverGen2.json();
    assert(dataGen2.success === true, 'Server video #2 allowed');
    assert(dataGen2.weeklyUsed === 2, 'Server video #2 weeklyUsed is 2');
    assert(dataGen2.weeklyRemaining === 0, 'Server video #2 weeklyRemaining is 0');
    assert(dataGen2.isCopyAllowed === false, 'Server video #2 locks copy for Free user');

    const serverGenRetry = await fetch(`${baseUrl}/api/generation/record`, {
      method: 'POST',
      headers: harnessHeaders,
      body: JSON.stringify({ accountId: serverTestAcc, customTimestampMs: T2, idempotencyKey }),
    });
    const dataRetry = await serverGenRetry.json();
    assert(dataRetry.isRetry === true, 'Server detects idempotent retry');
    assert(dataRetry.weeklyUsed === 2, 'Idempotent retry does NOT consume additional slot');

    const serverGen3 = await fetch(`${baseUrl}/api/generation/record`, {
      method: 'POST',
      headers: harnessHeaders,
      body: JSON.stringify({ accountId: serverTestAcc, customTimestampMs: T0 + 3 * ONE_DAY_MS }),
    });
    assert(serverGen3.status === 403, 'Server video #3 blocked with 403 WEEKLY_LIMIT_REACHED');
    const dataGen3 = await serverGen3.json();
    assert(dataGen3.error === 'WEEKLY_LIMIT_REACHED', 'Clear error code returned');
    assert(typeof dataGen3.resetsAtMs === 'number', 'Server provides resetsAtMs timestamp');

    const serverGenDay7 = await fetch(`${baseUrl}/api/generation/record`, {
      method: 'POST',
      headers: harnessHeaders,
      body: JSON.stringify({ accountId: serverTestAcc, customTimestampMs: T7_plus }),
    });
    assert(serverGenDay7.status === 200, 'Server video creation allowed on Day 7 after Video #1 expires');
    const dataDay7 = await serverGenDay7.json();
    assert(dataDay7.success === true, 'Server creation succeeds after rolling window release');

    console.log('\n================================================================');
    console.log('🎉 ALL AUTH GATING & ROLLING WEEKLY QUOTA TESTS PASSED!');
    console.log('================================================================\n');
  } finally {
    server.close();
    if (fs.existsSync(TEMP_STATE_FILE)) {
      fs.unlinkSync(TEMP_STATE_FILE);
    }
  }
}

runTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
