/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — P0 Security & Data Integrity Remediation Test Suite
 * Verifies all 5 P0 phases:
 *  Phase 1: Backend Security (auth enforcement, forged header rejection, prod /api/dev/* lockdown)
 *  Phase 2: Owner Identity Protection (zero hardcoded personal email, claim/admin rules)
 *  Phase 3: Persistent Server State & Atomic Concurrency Safety (restart survival + mutex race test)
 *  Phase 4: Quota Enforcement (/api/video/release-slot limits, fail-closed videoQuota, client sanitization)
 *  Phase 5: Account Data Isolation (scoped activityStats, cross-account isolation, Danger Zone cleanup)
 */

process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
process.env.CREATORFLOW_ALLOW_ISOLATED_TEST_HARNESS = 'true';
process.env.DISABLE_HMR = 'true';

import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { ServerStateStore } from './src/lib/serverStateStore.ts';
import { reserveVideoSlotServer } from './src/lib/videoQuota.ts';
import {
  clearAllAccountWorkspaceData,
  getIsolatedContentPacks,
  saveIsolatedContentPacks,
  getIsolatedActivityStats,
  saveIsolatedActivityStats,
  getIsolatedProjects,
  saveIsolatedProjects,
  getIsolatedIdeas,
  saveIsolatedIdeas,
} from './src/lib/accountStorage.ts';
import {
  DEFAULT_ACTIVITY_STATS,
  getActivityStats,
  saveActivityStats,
} from './src/lib/creatorStorage.ts';

const TEST_SECRET = `cf_p0_${crypto.randomBytes(16).toString('hex')}`;
const TEMP_STATE_FILE = path.join(os.tmpdir(), `creatorflow-p0-state-${Date.now()}.json`);
process.env.CREATORFLOW_TEST_SECRET = TEST_SECRET;
process.env.CREATORFLOW_STATE_FILE = TEMP_STATE_FILE;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

async function runP0Suite() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — P0 SECURITY & DATA INTEGRITY VERIFICATION SUITE');
  console.log('================================================================\n');

  const { app, serverStore } = await import('./server.ts');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // =========================================================================
    // PHASE 1: Backend Security — Auth Enforcement & Production Isolation
    // =========================================================================
    console.log('--- PHASE 1: Backend Security & Unauthenticated / Forged Header Rejection ---');

    const unauthChecks: Array<{ method: string; path: string; body?: Record<string, unknown>; expectedStatuses?: number[] }> = [
      { method: 'POST', path: '/api/account/plan', body: { accountId: 'victim_uid', plan: 'max' } },
      { method: 'POST', path: '/api/auth/reauthenticate', body: { accountId: 'victim_uid' } },
      { method: 'POST', path: '/api/entitlements/check', body: { accountId: 'victim_uid', feature: 'multi_character_planning' } },
      { method: 'POST', path: '/api/auth/logout', body: { accountId: 'victim_uid' } },
      { method: 'GET', path: '/api/plan-requests/stats' },
      { method: 'POST', path: '/api/dev/set-subscription', body: { accountId: 'victim_uid', planId: 'max' } },
      { method: 'POST', path: '/api/dev/simulate', body: { accountId: 'victim_uid', action: 'reset_all' } },
      { method: 'POST', path: '/api/video/reserve-slot', body: { workflowId: 'wf_attack', topic: 'Bypass' } },
      { method: 'POST', path: '/api/video/release-slot', body: { workflowId: 'wf_attack' } },
      { method: 'GET', path: '/api/video/quota?accountId=victim_uid' },
      { method: 'POST', path: '/api/usage/check', body: { accountId: 'victim_uid', feature: 'creation_kit' } },
      { method: 'POST', path: '/api/usage/record', body: { accountId: 'victim_uid', feature: 'creation_kit' } },
      { method: 'GET', path: '/api/admin/owner-analytics' },
    ];

    for (const check of unauthChecks) {
      const res = await fetch(`${baseUrl}${check.path}`, {
        method: check.method,
        headers: { 'Content-Type': 'application/json' },
        body: check.body ? JSON.stringify(check.body) : undefined,
      });
      const expected = check.expectedStatuses || [401];
      assert(expected.includes(res.status), `${check.method} ${check.path} rejects unauthenticated request (${res.status})`);
    }

    // Forged x-creatorflow-test-runner / x-creatorflow-test-plan without secret MUST fail with 401
    for (const ep of [
      { method: 'POST', path: '/api/account/plan', body: { accountId: 'test_victim', plan: 'max' } },
      { method: 'POST', path: '/api/entitlements/check', body: { accountId: 'test_victim', feature: 'multi_character_planning' } },
      { method: 'POST', path: '/api/video/reserve-slot', body: { workflowId: 'wf_forge', topic: 'Forge' } },
      { method: 'POST', path: '/api/dev/set-subscription', body: { accountId: 'test_victim', planId: 'max' } },
      { method: 'POST', path: '/api/auth/logout', body: { accountId: 'test_victim' } },
    ]) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          'x-creatorflow-test-runner': 'true',
          'x-creatorflow-test-plan': 'max',
          'x-creatorflow-account-id': 'test_victim',
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert(res.status === 401, `Forged test-runner headers rejected on ${ep.method} ${ep.path} (${res.status})`);
    }

    // Production mode test in child process: /api/dev/* returns 403 disabled_in_production and harness is disabled
    const prodProbeScript = `
      process.env.NODE_ENV = 'production';
      process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
      process.env.CREATORFLOW_ALLOW_ISOLATED_TEST_HARNESS = 'true';
      process.env.CREATORFLOW_TEST_SECRET = 'prod_secret_at_least_16_chars';
      process.env.DISABLE_HMR = 'true';
      import http from 'http';
      const { app } = await import('./server.ts');
      const s = http.createServer(app);
      await new Promise((r) => s.listen(0, '127.0.0.1', r));
      const p = s.address().port;
      const rDevSub = await fetch('http://127.0.0.1:' + p + '/api/dev/set-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-creatorflow-test-secret': 'prod_secret_at_least_16_chars', 'x-creatorflow-account-id': 'test_prod' },
        body: JSON.stringify({ accountId: 'test_prod', planId: 'max' }),
      });
      const jDevSub = await rDevSub.json();
      const rDevSim = await fetch('http://127.0.0.1:' + p + '/api/dev/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-creatorflow-test-secret': 'prod_secret_at_least_16_chars', 'x-creatorflow-account-id': 'test_prod' },
        body: JSON.stringify({ accountId: 'test_prod', action: 'reset_all' }),
      });
      const rQuotaHarness = await fetch('http://127.0.0.1:' + p + '/api/video/reserve-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-creatorflow-test-secret': 'prod_secret_at_least_16_chars', 'x-creatorflow-account-id': 'test_prod' },
        body: JSON.stringify({ workflowId: 'wf_prod', topic: 'Prod' }),
      });
      s.close();
      console.log(JSON.stringify({ subStatus: rDevSub.status, subError: jDevSub.error, simStatus: rDevSim.status, quotaStatus: rQuotaHarness.status }));
    `;
    const prodProbe = spawnSync(
      'npx',
      ['tsx', '--input-type=module', '-e', prodProbeScript],
      { cwd: process.cwd(), encoding: 'utf8' }
    );
    assert(prodProbe.status === 0, `Production child probe ran cleanly (status=${prodProbe.status})`);
    const lines = prodProbe.stdout.trim().split('\n');
    const lastLine = JSON.parse(lines[lines.length - 1]);
    assert(lastLine.subStatus === 403 && lastLine.subError === 'disabled_in_production', 'Production /api/dev/set-subscription returns 403 disabled_in_production');
    assert(lastLine.simStatus === 403, 'Production /api/dev/simulate returns 403 disabled_in_production');
    assert(lastLine.quotaStatus === 401, 'Production mode disables isolated test harness even if secret env vars exist');

    // =========================================================================
    // PHASE 2: Owner Identity Protection
    // =========================================================================
    console.log('\n--- PHASE 2: Owner Identity Protection & Hardcoded Email Removal ---');
    const sensitiveFiles = ['firestore.rules', 'server.ts', '.env.example', 'firebase-blueprint.json'];
    for (const file of sensitiveFiles) {
      const content = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      assert(!content.includes('arunachalamjothi11'), `${file} contains zero hardcoded personal owner email`);
    }
    const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    assert(
      rulesContent.includes('request.auth.token.owner == true') && rulesContent.includes('/admins/$(request.auth.uid)'),
      'firestore.rules uses Firebase custom claims and /admins/{uid} doc verification'
    );

    // =========================================================================
    // PHASE 3: Persistent Server State & Atomic Concurrency Control
    // =========================================================================
    console.log('\n--- PHASE 3: Persistent Server State & Atomic Concurrency ---');
    const persistUid = `test_persist_pro_${Date.now()}`;
    const harnessPersistHeaders = {
      'Content-Type': 'application/json',
      'x-creatorflow-test-secret': TEST_SECRET,
      'x-creatorflow-account-id': persistUid,
    };

    // Grant paid Pro subscription via /api/dev/set-subscription under harness
    const setSubRes = await fetch(`${baseUrl}/api/dev/set-subscription`, {
      method: 'POST',
      headers: harnessPersistHeaders,
      body: JSON.stringify({ accountId: persistUid, planId: 'pro', status: 'active', cadence: 'yearly' }),
    });
    assert(setSubRes.status === 200, 'Dev subscription override persisted Pro plan under harness');

    // Reserve a video slot for persistUid
    const persistResSlot = await fetch(`${baseUrl}/api/video/reserve-slot`, {
      method: 'POST',
      headers: harnessPersistHeaders,
      body: JSON.stringify({ workflowId: 'wf_persist_1', topic: 'Persistent Video' }),
    });
    assert(persistResSlot.status === 200, 'Video slot reserved on Pro account before restart simulation');

    // Clear in-memory caches in ServerStateStore to simulate cold restart
    serverStore.clearMemoryCacheForRestartSimulation();

    // Fresh ServerStateStore reading same backing file
    const restartedStore = new ServerStateStore(null);
    const { account: restoredAccount } = await restartedStore.getOrCreateAccount(persistUid, {
      email: 'returning@creator.test',
    });
    assert(restoredAccount.plan === 'pro' && restoredAccount.subscription.planId === 'pro', 'Returning paid Pro account preserves plan across server restart');
    assert(restoredAccount.subscription.cadence === 'yearly', 'Returning Pro account preserves billing cadence across restart');

    // Verify quota reservations also survived restart
    const quotaAfterRestart = await fetch(`${baseUrl}/api/video/quota?accountId=${persistUid}`, {
      headers: harnessPersistHeaders,
    });
    const quotaAfterJson = await quotaAfterRestart.json();
    assert(quotaAfterJson.weeklyLimit === 25 && quotaAfterJson.weeklyUsed === 1, 'Pro quota and reservations survive server restart');

    // Concurrent race condition storm: 5 parallel reserve-slot calls on Free account
    const raceUid = `test_race_free_${Date.now()}`;
    const raceResponses = await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        fetch(`${baseUrl}/api/video/reserve-slot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-creatorflow-test-secret': TEST_SECRET,
            'x-creatorflow-account-id': raceUid,
          },
          body: JSON.stringify({ workflowId: `wf_race_${i}`, topic: `Race Video ${i}` }),
        })
      )
    );
    const successes = raceResponses.filter((r) => r.status === 200).length;
    const rejections = raceResponses.filter((r) => r.status === 403).length;
    assert(successes === 2 && rejections === 3, `Concurrency storm strictly allowed ${successes}/2 and rejected ${rejections}/3 on Free tier`);

    // =========================================================================
    // PHASE 4: Quota Enforcement (/api/video/release-slot & Fail-Closed Client)
    // =========================================================================
    console.log('\n--- PHASE 4: Quota Enforcement & Fail-Closed Video Quota Client ---');

    // Check /api/video/release-slot returns exact plan limits (Free=2, Pro=25, Creator=75)
    for (const tier of [
      { plan: 'free', limit: 2 },
      { plan: 'pro', limit: 25 },
      { plan: 'creator', limit: 75 },
    ] as const) {
      const uid = `test_rel_${tier.plan}_${Date.now()}`;
      const tierHeaders = {
        'Content-Type': 'application/json',
        'x-creatorflow-test-secret': TEST_SECRET,
        'x-creatorflow-account-id': uid,
        ...(tier.plan !== 'free' ? { 'x-creatorflow-test-plan': tier.plan } : {}),
      };
      await fetch(`${baseUrl}/api/video/reserve-slot`, {
        method: 'POST',
        headers: tierHeaders,
        body: JSON.stringify({ workflowId: `wf_${tier.plan}_1`, topic: 'Rollback Check' }),
      });
      const rel = await fetch(`${baseUrl}/api/video/release-slot`, {
        method: 'POST',
        headers: tierHeaders,
        body: JSON.stringify({ workflowId: `wf_${tier.plan}_1` }),
      });
      const relJson = await rel.json();
      assert(
        relJson.weeklyLimit === tier.limit && relJson.weeklyRemaining === tier.limit,
        `/api/video/release-slot computes exact weeklyLimit (${relJson.weeklyLimit}) & remaining (${relJson.weeklyRemaining}) for ${tier.plan}`
      );
    }

    // Fail-closed behavior in client videoQuota.ts
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => {
        throw new Error('Simulated offline network failure');
      }) as typeof fetch;
      const failClosedRes = await reserveVideoSlotServer({
        workflowId: 'wf_offline_test',
        topic: 'Offline Test',
        accountId: 'uid_offline',
      });
      assert(
        failClosedRes.success === false && failClosedRes.error === 'NETWORK_ERROR',
        'reserveVideoSlotServer fails closed when server is unreachable (never auto-grants slot)'
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    const videoQuotaSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/videoQuota.ts'), 'utf8');
    assert(!videoQuotaSrc.includes('x-creatorflow-test-runner'), 'src/lib/videoQuota.ts contains no x-creatorflow-test-runner header');

    // =========================================================================
    // PHASE 5: Account Data Isolation & Danger Zone Workspace Cleanup
    // =========================================================================
    console.log('\n--- PHASE 5: Account Data Isolation & Scoped Workspace Purge ---');
    const mockStorage = createMemoryLocalStorage();
    (globalThis as any).window = { localStorage: mockStorage };
    (globalThis as any).localStorage = mockStorage;

    const accAlpha = 'uid_alpha_isolation';
    const accBeta = 'uid_beta_isolation';

    saveIsolatedActivityStats(
      {
        ...DEFAULT_ACTIVITY_STATS,
        recommendedVideosCount: 7,
        videosPlannedCount: 4,
        videosPublishedTotal: 3,
      },
      accAlpha
    );
    saveIsolatedContentPacks(
      [
        {
          id: 'pack_alpha_1',
          topic: 'Alpha Only Topic',
          platform: 'YouTube',
          language: 'Tamil',
          tone: 'Educational',
          titles: [],
          hooks: [],
          description: {
            hookLine: 'Alpha hook line',
            summary: 'Alpha summary',
            timestamps: [{ time: '0:00', label: 'Intro' }],
            linksPlaceholder: '',
            callToAction: 'Subscribe',
          },
          keywords: ['alpha'],
          hashtags: ['#alpha'],
          shortsScript: {
            title: 'Alpha Short',
            duration: '45s',
            hook: 'Hook',
            body: [],
            cta: 'Subscribe',
          },
          pinnedComment: {
            comment: 'Question?',
            engagementQuestion: 'Thoughts?',
            boostTip: 'Pin it',
          },
          thumbnailConcept: {
            composition: 'Center',
            focalPoint: 'Speaker',
            facialExpression: 'Curiosity',
            overlayText: 'ALPHA',
            colorPalette: ['#1a1a1a', '#f8f7f4'],
            psychologicalTrigger: 'Curiosity',
          },
          createdAt: new Date().toISOString(),
          isSaved: true,
        },
      ],
      accAlpha
    );
    saveIsolatedProjects(
      [
        {
          id: 'proj_alpha_1',
          ideaId: 'idea_alpha_1',
          topic: 'Alpha Video',
          selectedTitle: 'Alpha Title',
          format: 'Long-form',
          targetAudience: 'Creators',
          primaryGoal: 'Grow subscribers',
          difficulty: 'Easy',
          estimatedMinutes: 30,
          creatorFitScore: 90,
          reasonForFit: ['Matches profile'],
          angle: 'Tutorial',
          status: 'Planned',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          durationSeconds: 480,
          durationLabel: '8 min',
          scriptSections: [],
          visualPlan: [],
        },
      ],
      accAlpha
    );
    saveIsolatedIdeas(
      [
        {
          id: 'idea_alpha_1',
          title: 'Alpha Idea',
          format: 'Long-form',
          goal: 'Grow subscribers',
          difficulty: 'Easy',
          estimatedTime: '2 hours',
          creatorFitScore: 90,
          topicRelevance: 88,
          whyThisIdea: ['Matches alpha'],
          budgetFit: 'Free',
          status: 'Idea',
        },
      ],
      accAlpha
    );

    // Account Beta must NOT see Alpha's activityStats, packs, projects, or ideas
    const betaStats = getIsolatedActivityStats(accBeta);
    assert(betaStats === null, 'Account Beta sees null activityStats (no leakage from Alpha)');
    assert(getIsolatedContentPacks(accBeta).length === 0, 'Account Beta has zero packs from Alpha');
    assert(getIsolatedProjects(accBeta).length === 0, 'Account Beta has zero video projects from Alpha');
    assert((getIsolatedIdeas(accBeta) || []).length === 0, 'Account Beta has zero ideas from Alpha');

    // Verify creatorStorage activityStats writes ONLY to scoped storage, never legacy unscoped key
    saveActivityStats({ recommendedVideosCount: 2, videosPlannedCount: 1 });
    assert(getActivityStats().recommendedVideosCount === 2, 'creatorStorage getActivityStats reads isolated active account stats');
    assert(!mockStorage.getItem('creatorflow_activity_stats_v3'), 'Legacy unscoped creatorflow_activity_stats_v3 key is never written');

    // Write data to Beta, then purge Beta and verify Alpha stays intact
    saveIsolatedActivityStats(
      {
        ...DEFAULT_ACTIVITY_STATS,
        recommendedVideosCount: 3,
        videosPlannedCount: 2,
      },
      accBeta
    );
    saveIsolatedContentPacks(
      [
        {
          id: 'pack_beta_1',
          topic: 'Beta Only Topic',
          platform: 'YouTube',
          language: 'English',
          tone: 'Educational',
          titles: [],
          hooks: [],
          description: {
            hookLine: 'Beta hook line',
            summary: 'Beta summary',
            timestamps: [{ time: '0:00', label: 'Intro' }],
            linksPlaceholder: '',
            callToAction: 'Subscribe',
          },
          keywords: ['beta'],
          hashtags: ['#beta'],
          shortsScript: {
            title: 'Beta Short',
            duration: '45s',
            hook: 'Hook',
            body: [],
            cta: 'Subscribe',
          },
          pinnedComment: {
            comment: 'Question?',
            engagementQuestion: 'Thoughts?',
            boostTip: 'Pin it',
          },
          thumbnailConcept: {
            composition: 'Center',
            focalPoint: 'Speaker',
            facialExpression: 'Curiosity',
            overlayText: 'BETA',
            colorPalette: ['#1a1a1a', '#f8f7f4'],
            psychologicalTrigger: 'Curiosity',
          },
          createdAt: new Date().toISOString(),
          isSaved: true,
        },
      ],
      accBeta
    );

    clearAllAccountWorkspaceData(accBeta);
    assert(getIsolatedActivityStats(accBeta) === null, 'clearAllAccountWorkspaceData resets Beta activityStats');
    assert(getIsolatedContentPacks(accBeta).length === 0, 'clearAllAccountWorkspaceData clears Beta packs');

    assert((getIsolatedActivityStats(accAlpha)?.recommendedVideosCount ?? 0) === 7, 'Alpha activityStats remain intact after Beta workspace purge');
    assert(getIsolatedContentPacks(accAlpha).length === 1, 'Alpha packs remain intact after Beta workspace purge');
    assert(getIsolatedProjects(accAlpha).length === 1, 'Alpha projects remain intact after Beta workspace purge');
    assert((getIsolatedIdeas(accAlpha) || []).length === 1, 'Alpha ideas remain intact after Beta workspace purge');

    console.log('\n================================================================');
    console.log('🎉 ALL P0 SECURITY & DATA INTEGRITY TESTS PASSED! (100%)');
    console.log('================================================================\n');
  } finally {
    server.close();
    if (fs.existsSync(TEMP_STATE_FILE)) {
      fs.unlinkSync(TEMP_STATE_FILE);
    }
  }
}

runP0Suite().catch((err) => {
  console.error('Fatal P0 test suite error:', err);
  process.exit(1);
});
