/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Production Infrastructure & Security Verification Suite
 * Covers all 10 infrastructure remediation items:
 *  1. Strict CREATORFLOW_REQUIRE_FIRESTORE=true fail-closed on BOTH reads and writes
 *  2. Graceful degradation with explicit diagnostics & /api/health readiness reporting
 *  3. Multi-instance state consistency (no stale RAM Map short-circuiting across instances)
 *  4. Transactional / mutex concurrency for consumeUsageAtomic, recordGenerationAtomic, releaseVideoSlotAtomic
 *  5. Transactional Cashfree webhook deduplication across instances
 *  6. Owner provisioning (OWNER_EMAIL, /admins/{uid} active flag revocation) & isAuthorizedOwner guard
 *  7. Complete DELETE /api/account server + local persistence cleanup & cross-account isolation
 *  8. ProductionKit account-scoped isolation (zero global creatorflow_production_kit_v1 leak)
 *  9. Deployable web assets & zero personal owner email exposure
 */

process.env.CREATORFLOW_SKIP_SERVER_LISTEN = 'true';
process.env.CREATORFLOW_ALLOW_ISOLATED_TEST_HARNESS = 'true';
process.env.DISABLE_HMR = 'true';

import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { ServerStateStore } from './src/lib/serverStateStore.ts';
import { processCashfreeWebhookEvent, processedWebhookEventIds } from './src/lib/cashfreeSubscriptionService.ts';
import { isAuthorizedOwner, saveStoredUser, CreatorFlowUser } from './src/lib/auth.ts';
import { getStoredProductionKit, saveStoredProductionKit } from './src/lib/productionRequirementEngine.ts';
import { clearAllAccountWorkspaceData, getIsolatedProductionKit, saveIsolatedProductionKit } from './src/lib/accountStorage.ts';

const TEST_SECRET = `cf_infra_${crypto.randomBytes(16).toString('hex')}`;
const TEMP_STATE_FILE = path.join(os.tmpdir(), `creatorflow-infra-state-${Date.now()}.json`);
process.env.CREATORFLOW_TEST_SECRET = TEST_SECRET;
process.env.CREATORFLOW_STATE_FILE = TEMP_STATE_FILE;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function assertThrows(fn: () => Promise<any>, msg: string) {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  assert(threw, msg);
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

async function runInfrastructureSuite() {
  console.log('================================================================');
  console.log('CREATORFLOW AI — PRODUCTION INFRASTRUCTURE VERIFICATION SUITE');
  console.log('================================================================\n');

  const { app, serverStore } = await import('./server.ts');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------
    // 1. CREATORFLOW_REQUIRE_FIRESTORE=true fails closed on READS & WRITES
    // -------------------------------------------------------------
    console.log('--- TEST 1: Fail-Closed Persistence Enforcement (Reads & Writes) ---');
    const prevRequire = process.env.CREATORFLOW_REQUIRE_FIRESTORE;
    process.env.CREATORFLOW_REQUIRE_FIRESTORE = 'true';

    const failingMockDb: any = {
      collection: () => ({
        doc: () => ({
          get: async () => {
            const err: any = new Error('7 PERMISSION_DENIED: simulated IAM missing');
            err.code = 7;
            throw err;
          },
          set: async () => {
            const err: any = new Error('7 PERMISSION_DENIED: simulated IAM missing');
            err.code = 7;
            throw err;
          },
        }),
        get: async () => {
          const err: any = new Error('7 PERMISSION_DENIED: simulated IAM missing');
          err.code = 7;
          throw err;
        },
        orderBy: () => ({
          limit: () => ({
            get: async () => {
              const err: any = new Error('7 PERMISSION_DENIED: simulated IAM missing');
              err.code = 7;
              throw err;
            },
          }),
        }),
      }),
      runTransaction: async () => {
        const err: any = new Error('7 PERMISSION_DENIED: simulated IAM missing');
        err.code = 7;
        throw err;
      },
    };

    const strictStore = new ServerStateStore(failingMockDb);
    await assertThrows(() => strictStore.getAccount('uid_strict_1'), 'CREATORFLOW_REQUIRE_FIRESTORE=true fails closed on getAccount read');
    await assertThrows(() => strictStore.getOrCreateUsage('uid_strict_1'), 'CREATORFLOW_REQUIRE_FIRESTORE=true fails closed on getOrCreateUsage read');
    await assertThrows(() => strictStore.getQuotaDoc('uid_strict_1'), 'CREATORFLOW_REQUIRE_FIRESTORE=true fails closed on getQuotaDoc read');
    await assertThrows(() => strictStore.isUidStoredAsAdmin('uid_strict_1'), 'CREATORFLOW_REQUIRE_FIRESTORE=true fails closed on isUidStoredAsAdmin read');
    await assertThrows(() => strictStore.getTourProgress('uid_strict_1'), 'CREATORFLOW_REQUIRE_FIRESTORE=true fails closed on getTourProgress read');
    await assertThrows(
      () =>
        strictStore.consumeUsageAtomic({
          accountId: 'uid_strict_1',
          counter: 'creationKitsUsed',
          limit: 3,
        }),
      'CREATORFLOW_REQUIRE_FIRESTORE=true fails closed on transactional usage mutation'
    );

    const healthUnhealthyRes = await fetch(`${baseUrl}/api/health`);
    const healthUnhealthyJson = await healthUnhealthyRes.json();
    assert(
      healthUnhealthyRes.status === 503 && healthUnhealthyJson.status === 'unhealthy',
      `/api/health reports 503 unhealthy when CREATORFLOW_REQUIRE_FIRESTORE=true & Firestore fails (${healthUnhealthyRes.status})`
    );

    if (prevRequire === undefined) delete process.env.CREATORFLOW_REQUIRE_FIRESTORE;
    else process.env.CREATORFLOW_REQUIRE_FIRESTORE = prevRequire;

    // -------------------------------------------------------------
    // 2. Graceful Fallback & /api/health Degraded Readiness Probe
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Health Diagnostics & Fallback Visibility ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, `/api/health returns 200 when fallback allowed (${healthRes.status})`);
    assert(
      Boolean(healthJson.projectId && healthJson.persistence && typeof healthJson.persistence.mode === 'string'),
      '/api/health exposes projectId and persistence diagnostics without secrets'
    );
    assert(!JSON.stringify(healthJson).includes('GEMINI_API_KEY') && !JSON.stringify(healthJson).includes('arunachalam'), '/api/health exposes zero secrets or personal emails');

    // -------------------------------------------------------------
    // 3. Multi-Instance Cache Consistency & Atomic Transactions
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Multi-Instance Cache Consistency & Transactional Concurrency ---');
    const storeA = new ServerStateStore(null);
    const storeB = new ServerStateStore(null);
    const multiUid = `test_multi_${Date.now()}`;

    await storeA.getOrCreateAccount(multiUid, { email: 'multi@test.local', displayName: 'Creator A' });
    const fetchedByB1 = await storeB.getAccount(multiUid);
    assert(fetchedByB1?.plan === 'free', 'Instance B reads initial free plan from shared state');

    // Now Instance A upgrades plan
    fetchedByB1!.plan = 'creator';
    fetchedByB1!.subscription = {
      status: 'active',
      planId: 'creator',
      cadence: 'monthly',
      startedAt: new Date().toISOString(),
    };
    await storeA.saveAccount(fetchedByB1!);

    // Instance B previously cached multiUid as 'free' in RAM Map; must still see 'creator'
    const fetchedByB2 = await storeB.getAccount(multiUid);
    assert(fetchedByB2?.plan === 'creator', 'Instance B immediately observes Instance A upgrade (zero stale RAM cache)');

    // Transactional usage storm: 6 concurrent calls against limit=3
    const usageStormUid = `test_usage_storm_${Date.now()}`;
    const stormResults = await Promise.all(
      [1, 2, 3, 4, 5, 6].map((i) =>
        storeA.consumeUsageAtomic({
          accountId: usageStormUid,
          counter: 'creationKitsUsed',
          limit: 3,
          record: {
            id: `rec_storm_${i}`,
            accountId: usageStormUid,
            deviceInstallId: 'dev_storm',
            feature: 'creation_kit',
            period: '2026-11',
            timestamp: new Date().toISOString(),
            success: true,
          },
        })
      )
    );
    const usageAllowed = stormResults.filter((r) => r.allowed).length;
    const usageBlocked = stormResults.filter((r) => !r.allowed).length;
    assert(usageAllowed === 3 && usageBlocked === 3, `consumeUsageAtomic enforced limit=3 under 6 concurrent writes (${usageAllowed} allowed, ${usageBlocked} blocked)`);

    // Transactional generation storm: 5 concurrent calls against weeklyLimit=2
    const genStormUid = `test_gen_storm_${Date.now()}`;
    const genResults = await Promise.all(
      [1, 2, 3, 4, 5].map(() =>
        storeA.recordGenerationAtomic({
          accountId: genStormUid,
          weeklyLimit: 2,
          nowMs: Date.now(),
        })
      )
    );
    const genAllowed = genResults.filter((r) => r.allowed).length;
    const genBlocked = genResults.filter((r) => !r.allowed).length;
    assert(genAllowed === 2 && genBlocked === 3, `recordGenerationAtomic enforced weeklyLimit=2 under 5 concurrent writes (${genAllowed} allowed, ${genBlocked} blocked)`);

    // Cashfree webhook transactional deduplication with simulated Firestore runTransaction
    const mockPaymentEvents = new Map<string, any>();
    const mockWebhookDb: any = {
      collection: (col: string) => ({
        doc: (id: string) => ({ _col: col, _id: id }),
      }),
      runTransaction: async (fn: (tx: any) => Promise<any>) => {
        const tx = {
          get: async (ref: any) => ({
            exists: ref._col === 'payment_events' ? mockPaymentEvents.has(ref._id) : false,
            data: () => mockPaymentEvents.get(ref._id),
          }),
          set: (ref: any, data: any) => {
            if (ref._col === 'payment_events') {
              mockPaymentEvents.set(ref._id, data);
            }
          },
        };
        return fn(tx);
      },
    };
    const txEventId = `evt_tx_dedup_${Date.now()}`;
    processedWebhookEventIds.delete(txEventId);
    let callbackRuns = 0;
    const w1 = await processCashfreeWebhookEvent({
      eventId: txEventId,
      eventType: 'SUBSCRIPTION_ACTIVATED',
      eventTime: new Date().toISOString(),
      data: { subscription: { subscription_id: 'sub_tx_1', customer_details: { customer_id: 'uid_tx_1' } } },
      adminDb: mockWebhookDb,
      onPlanActivated: async () => {
        callbackRuns++;
      },
    });
    // Clear fast RAM set to simulate second Cloud Run instance hitting same Firestore payment_events/{eventId}
    processedWebhookEventIds.delete(txEventId);
    const w2 = await processCashfreeWebhookEvent({
      eventId: txEventId,
      eventType: 'SUBSCRIPTION_ACTIVATED',
      eventTime: new Date().toISOString(),
      data: { subscription: { subscription_id: 'sub_tx_1', customer_details: { customer_id: 'uid_tx_1' } } },
      adminDb: mockWebhookDb,
      onPlanActivated: async () => {
        callbackRuns++;
      },
    });
    assert(w1.duplicate === false && w2.duplicate === true && callbackRuns === 1, 'Cashfree webhook transaction prevents double-activation across multiple server instances');

    // -------------------------------------------------------------
    // 4. Owner Provisioning, Revocation & Forged Role Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Owner Provisioning & Revocation ---');
    const adminUid = `uid_admin_${Date.now()}`;
    await storeA.upsertAdminRecord(adminUid, 'owner', true);
    assert((await storeB.isUidStoredAsAdmin(adminUid)) === true, '/admins/{uid} with active=true grants admin/owner access');

    await storeA.upsertAdminRecord(adminUid, 'owner', false);
    assert((await storeB.isUidStoredAsAdmin(adminUid)) === false, 'Setting /admins/{uid} active=false immediately revokes access');

    const forgedUser: CreatorFlowUser = {
      id: 'uid_forged_local',
      accountId: 'uid_forged_local',
      providerId: 'google.com',
      email: 'attacker@example.com',
      displayName: 'Attacker',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      provider: 'google',
      plan: 'max',
      role: 'owner',
      linkedProviders: ['google'],
      emailVerified: true,
    };
    assert(isAuthorizedOwner(forgedUser) === false, 'isAuthorizedOwner rejects client-forged owner role not verified by server');

    // -------------------------------------------------------------
    // 5. Account Deletion Endpoint & Scoped ProductionKit Isolation
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Permanent Account Deletion & Cross-Account Isolation ---');
    const unauthDel = await fetch(`${baseUrl}/api/account`, { method: 'DELETE' });
    assert(unauthDel.status === 401, `DELETE /api/account rejects unauthenticated request (${unauthDel.status})`);

    const victimUid = `test_delete_victim_${Date.now()}`;
    const survivorUid = `test_delete_survivor_${Date.now()}`;

    await serverStore.getOrCreateAccount(victimUid, { email: 'victim@test.local' });
    await serverStore.getOrCreateAccount(survivorUid, { email: 'survivor@test.local' });
    await serverStore.upsertAdminRecord(victimUid, 'admin', true);
    await serverStore.saveTourProgress(victimUid, { completed: true, lastCompletedStep: 3 });
    await serverStore.addTelemetryEvent({
      id: `evt_victim_${Date.now()}`,
      eventName: 'test_event',
      accountId: victimUid,
      timestamp: new Date().toISOString(),
      plan: 'free',
    });

    const delRes = await fetch(`${baseUrl}/api/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-creatorflow-test-secret': TEST_SECRET,
        'x-creatorflow-account-id': victimUid,
      },
      body: JSON.stringify({ accountId: victimUid }),
    });
    const delJson = await delRes.json();
    assert(delRes.status === 200 && delJson.success === true, 'DELETE /api/account succeeds for authenticated owner of account');

    assert((await serverStore.getAccount(victimUid)) === null, 'Deleted account record removed from persistence');
    assert((await serverStore.isUidStoredAsAdmin(victimUid)) === false, 'Deleted account admin record purged');
    const remainingEvents = await serverStore.listTelemetryEvents();
    assert(!remainingEvents.some((e) => e.accountId === victimUid), 'Deleted account telemetry purged');
    assert((await serverStore.getAccount(survivorUid)) !== null, 'Other user account remains completely intact after account deletion');

    // Client-side ProductionKit isolation & cleanup check
    const mockStorage = createMemoryLocalStorage();
    (globalThis as any).window = { localStorage: mockStorage, dispatchEvent: () => true };
    (globalThis as any).localStorage = mockStorage;
    (globalThis as any).sessionStorage = createMemoryLocalStorage();

    saveStoredUser({
      id: 'uid_kit_alpha',
      accountId: 'uid_kit_alpha',
      providerId: 'google.com',
      email: 'alpha@test.local',
      displayName: 'Alpha',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      provider: 'google',
      plan: 'free',
      role: 'user',
      linkedProviders: ['google'],
    });
    saveStoredProductionKit({
      id: 'kit_alpha',
      creationMethod: 'Screen Recording & Tutorial',
    } as any);
    assert(!mockStorage.getItem('creatorflow_production_kit_v1'), 'ProductionKit never writes to legacy unscoped global key');

    assert(getIsolatedProductionKit('uid_kit_beta') === null, 'Account Beta cannot read Account Alpha ProductionKit');
    saveIsolatedProductionKit({ id: 'kit_beta' }, 'uid_kit_beta');

    assert(getStoredProductionKit()?.id === 'kit_alpha', 'Account Alpha reads its own ProductionKit cleanly');
    clearAllAccountWorkspaceData('uid_kit_alpha', { includeProfileAndTour: true });
    assert(getStoredProductionKit() === null, 'clearAllAccountWorkspaceData purges account ProductionKit');
    assert(getIsolatedProductionKit('uid_kit_beta')?.id === 'kit_beta', 'Account Beta ProductionKit remains isolated and intact');
    saveStoredUser(null);

    // -------------------------------------------------------------
    // 6. Deployable Website Assets & Metadata Hygiene
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Deployable Website Asset & Config Hygiene ---');
    const requiredPublicFiles = [
      'public/favicon.ico',
      'public/robots.txt',
      'public/sitemap.xml',
      'public/images/hero_creator_workspace_1791540574498.jpg',
      'public/images/feature_creation_kit_1791540588196.jpg',
      'public/images/feature_style_bible_1791540601183.jpg',
      'public/images/feature_content_radar_1791540615466.jpg',
      'public/images/avatar_creator_1791099679133.jpg',
      'public/images/creator_milestone_workspace_1793104341202.jpg',
    ];
    for (const relPath of requiredPublicFiles) {
      assert(fs.existsSync(path.resolve(process.cwd(), relPath)), `Public deploy asset exists: ${relPath}`);
    }
    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
    assert(indexHtml.includes('href="/favicon.ico"'), 'index.html declares /favicon.ico link');

    console.log('\n================================================================');
    console.log('🎉 ALL INFRASTRUCTURE & SECURITY VERIFICATION TESTS PASSED!');
    console.log('================================================================\n');
  } finally {
    server.close();
    if (fs.existsSync(TEMP_STATE_FILE)) {
      fs.unlinkSync(TEMP_STATE_FILE);
    }
  }
}

runInfrastructureSuite().catch((err) => {
  console.error('Fatal infrastructure suite error:', err);
  process.exit(1);
});
