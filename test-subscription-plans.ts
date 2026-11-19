/**
 * CreatorFlow AI — Subscription Plans, Feature Separation & Access Control Test Suite
 * Covers all 12 critical plan scenarios
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
  canAccess,
  isCopyAllowedForPlan,
  getLimit,
  isAtLimit,
  getUpgradePlan,
  getContextualUpgradeMessage,
  getFeatureValueDescription,
  PLAN_DEFINITIONS,
  PlanId,
  FeatureKey,
} from './src/lib/planEntitlements';
import { PRICING_PLANS } from './src/data/mockData';

const TEST_SECRET = `cf_test_${crypto.randomBytes(16).toString('hex')}`;
const TEMP_STATE_FILE = path.join(os.tmpdir(), `creatorflow-subs-test-${Date.now()}.json`);
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
  console.log('CREATORFLOW AI — SUBSCRIPTION & ACCESS CONTROL VALIDATION SUITE');
  console.log('================================================================\n');

  const { app } = await import('./server.ts');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {

  // -------------------------------------------------------------
  // Scenario 1: Free plan — first generation allows copy, second locks copy
  // -------------------------------------------------------------
  console.log('Scenario 1: Free Plan Generation Copy Rules (Free-plan conversion experience)...');
  assert(isCopyAllowedForPlan('free', 1).allowed === true, 'Free plan allows copy on generation #1');
  assert(isCopyAllowedForPlan('free', 2).allowed === false, 'Free plan locks copy on generation #2');
  assert(isCopyAllowedForPlan('free', 2).isGenerationTwoLock === true, 'Free plan generation #2 flagged as generation two lock');
  assert(isCopyAllowedForPlan('free', 5).allowed === false, 'Free plan locks copy on generation #5');
  assert(isCopyAllowedForPlan('free', 0).allowed === true, 'Free plan allows copy on generation #0 (uninitialized)');

  // -------------------------------------------------------------
  // Scenario 2: Pro plan — Pro features accessible, higher limits, copy unlocked
  // -------------------------------------------------------------
  console.log('\nScenario 2: Pro Plan Access & Entitlements...');
  assert(canAccess('character_bible', 'pro') === true, 'Pro plan has access to character bible');
  assert(canAccess('style_bible', 'pro') === true, 'Pro plan has access to style bible');
  assert(canAccess('copy_all_clips', 'pro') === true, 'Pro plan allows 1-click copy of all clip prompts');
  assert(canAccess('ai_animation_workflow', 'pro') === true, 'Pro plan has access to AI Animation workflow');
  assert(canAccess('export_creation_kit', 'pro') === true, 'Pro plan has access to export creation kit');
  assert(isCopyAllowedForPlan('pro', 2).allowed === true, 'Pro plan allows copy on generation #2 (unlocked)');
  assert(isCopyAllowedForPlan('pro', 99).allowed === true, 'Pro plan allows copy on generation #99');
  assert(getLimit('creationKitsPerMonth', 'pro') === 25, 'Pro limit is 25 Creation Kits/month (Free has 3)');
  assert(getLimit('activeProjects', 'pro') === 10, 'Pro limit is 10 active projects');

  // -------------------------------------------------------------
  // Scenario 3: Creator plan — Creator features, higher limits, advanced creator workflows
  // -------------------------------------------------------------
  console.log('\nScenario 3: Creator Plan Capabilities...');
  assert(canAccess('trend_radar_advanced', 'creator') === true, 'Creator plan has access to Advanced Trend Radar');
  assert(canAccess('content_gap_finder', 'creator') === true, 'Creator plan has access to Content Gap Finder');
  assert(canAccess('content_planning_30_day', 'creator') === true, 'Creator plan has access to 30-Day Planning');
  assert(canAccess('series_planner', 'creator') === true, 'Creator plan has access to Series Planner');
  assert(canAccess('multi_scene_planning', 'creator') === true, 'Creator plan has access to Multi-Scene Planning');
  assert(canAccess('export_creation_kit', 'creator') === true, 'Creator plan has access to Export Creation Kit');
  assert(getLimit('creationKitsPerMonth', 'creator') === 75, 'Creator limit is 75 Creation Kits/month');
  assert(getLimit('ideasPerGeneration', 'creator') === 10, 'Creator limit is 10 ideas per generation');

  // -------------------------------------------------------------
  // Scenario 4: MAX plan — full access, highest limits, multi-character planning
  // -------------------------------------------------------------
  console.log('\nScenario 4: MAX Plan Capabilities & Multi-Character Continuity...');
  assert(canAccess('multi_character_planning', 'max') === true, 'MAX plan has multi-character planning');
  assert(canAccess('multi_character_planning', 'creator') === false, 'Creator plan lacks multi-character planning');
  assert(canAccess('multi_character_planning', 'free') === false, 'Free plan lacks multi-character planning');
  assert(canAccess('channel_architecture_90_day', 'max') === true, 'MAX plan has 90-Day Channel Architecture');
  assert(canAccess('maximum_creation_kit_depth', 'max') === true, 'MAX plan has maximum creation kit depth');
  assert(canAccess('scene_dependencies', 'max') === true, 'MAX plan has scene dependencies tracking');
  assert(getLimit('creationKitsPerMonth', 'max') === 200, 'MAX limit is 200 Creation Kits/month');

  // -------------------------------------------------------------
  // Scenario 5: Custom Annual plan — respects assigned custom capabilities, no automatic unlimited
  // -------------------------------------------------------------
  console.log('\nScenario 5: Custom Annual Plan Custom Capabilities...');
  const customConfigWithLimitedAccess: { allowedFeatures: FeatureKey[]; customKitsPerMonth: number } = {
    allowedFeatures: ['trend_radar_advanced', 'character_bible', 'multi_scene_planning'],
    customKitsPerMonth: 50,
  };
  assert(
    canAccess('trend_radar_advanced', 'custom_annual', customConfigWithLimitedAccess) === true,
    'Custom Annual allows explicitly granted trend_radar_advanced'
  );
  assert(
    canAccess('multi_character_planning', 'custom_annual', customConfigWithLimitedAccess) === false,
    'Custom Annual does NOT grant multi_character_planning without explicit permission'
  );
  assert(
    canAccess('channel_architecture_90_day', 'custom_annual', customConfigWithLimitedAccess) === false,
    'Custom Annual does NOT grant channel_architecture_90_day without explicit permission'
  );

  // -------------------------------------------------------------
  // Scenario 6: Server-side validation rejecting unauthorized access
  // -------------------------------------------------------------
  console.log('\nScenario 6: Server-Side Entitlement & Generation Endpoints Check...');
  const unauthEntitlement = await fetch(`${baseUrl}/api/entitlements/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature: 'multi_character_planning', accountId: 'test_server_free' }),
  });
  assert(unauthEntitlement.status === 401, 'Unauthenticated /api/entitlements/check returns 401');

  const resEntitlementFree = await fetch(`${baseUrl}/api/entitlements/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-creatorflow-test-secret': TEST_SECRET,
      'x-creatorflow-account-id': 'test_server_free',
    },
    body: JSON.stringify({ feature: 'multi_character_planning', accountId: 'test_server_free' }),
  });
  const dataEntitlementFree = await resEntitlementFree.json();
  assert(dataEntitlementFree.allowed === false, 'Server gate rejects multi_character_planning for Free user');
  assert(dataEntitlementFree.targetPlan === 'max', 'Server specifies MAX as required tier');

  const resGenStatus = await fetch(`${baseUrl}/api/generation/status?accountId=test_server_free`, {
    headers: {
      'x-creatorflow-test-secret': TEST_SECRET,
      'x-creatorflow-account-id': 'test_server_free',
    },
  });
  const dataGenStatus = await resGenStatus.json();
  assert(typeof dataGenStatus.count === 'number', 'Server provides numeric lifetime generation count');

  // Record generation #1 on server
  const testConversionId = `test_gen_conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const convHeaders = {
    'Content-Type': 'application/json',
    'x-creatorflow-test-secret': TEST_SECRET,
    'x-creatorflow-account-id': testConversionId,
  };
  const resGen1 = await fetch(`${baseUrl}/api/generation/record`, {
    method: 'POST',
    headers: convHeaders,
    body: JSON.stringify({ accountId: testConversionId }),
  });
  const dataGen1 = await resGen1.json();
  assert(dataGen1.count === 1, 'Server tracks generation #1');
  assert(dataGen1.isCopyAllowed === true, 'Server allows copy on generation #1');

  // Record generation #2 on server
  const resGen2 = await fetch(`${baseUrl}/api/generation/record`, {
    method: 'POST',
    headers: convHeaders,
    body: JSON.stringify({ accountId: testConversionId }),
  });
  const dataGen2 = await resGen2.json();
  assert(dataGen2.count === 2, 'Server tracks generation #2');
  assert(dataGen2.isCopyAllowed === false, 'Server enforces copy lock on generation #2 for Free plan');
  assert(dataGen2.isGenerationTwoLock === true, 'Server flags generation two lock');

  // -------------------------------------------------------------
  // Scenario 7: Client components properly locking restricted features with upgrade CTA
  // -------------------------------------------------------------
  console.log('\nScenario 7: Client Feature Locking & Upgrade CTA Mapping...');
  assert(getUpgradePlan('multi_character_planning') === 'max', 'Target plan for multi_character_planning is MAX');
  assert(getUpgradePlan('trend_radar_advanced') === 'creator', 'Target plan for trend_radar_advanced is Creator');
  assert(getUpgradePlan('character_bible') === 'pro', 'Target plan for character_bible is Pro');
  
  const featureDesc = getFeatureValueDescription('trend_radar_advanced');
  assert(
    featureDesc.badge === 'CREATOR' && featureDesc.targetPlan === 'creator',
    'Feature description clearly identifies required plan tier'
  );
  const copyUpgradeMsg = getContextualUpgradeMessage('copy_locked');
  assert(
    copyUpgradeMsg.targetPlan === 'pro' && copyUpgradeMsg.ctaText === 'Upgrade to Pro',
    'Copy locked contextual message guides to Pro tier'
  );

  // -------------------------------------------------------------
  // Scenario 8: Upgrade request moves to pending state rather than instant free upgrade
  // -------------------------------------------------------------
  console.log('\nScenario 8: Upgrade Request Workflow (Pending State Verification)...');
  const testUpgradeId = `test_upgrade_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const upgradeHeaders = {
    'Content-Type': 'application/json',
    'x-creatorflow-test-secret': TEST_SECRET,
    'x-creatorflow-account-id': testUpgradeId,
  };
  const resUpgrade = await fetch(`${baseUrl}/api/subscription/upgrade-request`, {
    method: 'POST',
    headers: upgradeHeaders,
    body: JSON.stringify({
      accountId: testUpgradeId,
      targetPlan: 'creator',
      isAnnual: true,
      notes: 'Testing upgrade request flow',
    }),
  });
  const dataUpgrade = await resUpgrade.json();
  assert(dataUpgrade.success === true, 'Upgrade request submitted successfully');
  assert(dataUpgrade.status === 'pending', 'Upgrade status is PENDING (No instant free paid activation)');
  assert(dataUpgrade.effectivePlan === 'free', 'Effective plan remains FREE until payment confirmation');

  // -------------------------------------------------------------
  // Scenario 9: Safe handling of expired/canceled subscriptions falling back to Free
  // -------------------------------------------------------------
  console.log('\nScenario 9: Subscription Cancellation & Graceful Fallback...');
  const resCancel = await fetch(`${baseUrl}/api/subscription/cancel`, {
    method: 'POST',
    headers: upgradeHeaders,
    body: JSON.stringify({ accountId: testUpgradeId }),
  });
  const dataCancel = await resCancel.json();
  assert(dataCancel.status === 'canceled', 'Status updated to canceled');
  assert(dataCancel.effectivePlan === 'free', 'Effective plan falls back to free');

  // -------------------------------------------------------------
  // Scenario 10: Usage tracking persistence and quota checks
  // -------------------------------------------------------------
  console.log('\nScenario 10: Usage Tracking & Quota Checks...');
  assert(isAtLimit('creationKitsPerMonth', 2, 'free') === false, 'Free user with 2 kits is under limit of 3');
  assert(isAtLimit('creationKitsPerMonth', 3, 'free') === true, 'Free user with 3 kits reaches limit');
  assert(isAtLimit('creationKitsPerMonth', 3, 'pro') === false, 'Pro user with 3 kits is well under limit of 25');

  // -------------------------------------------------------------
  // Scenario 11: Feature matrix consistency across tiers
  // -------------------------------------------------------------
  console.log('\nScenario 11: Feature Matrix Tier Progression Consistency...');
  const plans: PlanId[] = ['free', 'pro', 'creator', 'max'];
  for (let i = 0; i < plans.length - 1; i++) {
    const current = plans[i];
    const next = plans[i + 1];
    const currentKits = getLimit('creationKitsPerMonth', current);
    const nextKits = getLimit('creationKitsPerMonth', next);
    assert(nextKits > currentKits, `${next.toUpperCase()} has higher creation kit quota (${nextKits}) than ${current.toUpperCase()} (${currentKits})`);
  }

  // -------------------------------------------------------------
  // Scenario 12: Pricing consistency across Mock Data, Entitlements & Server
  // -------------------------------------------------------------
  console.log('\nScenario 12: Pricing Model Consistency Across Entire System...');
  // Pricing Source of Truth:
  // Free: ₹0
  // Pro: ₹249/mo, ₹199/mo (annual)
  // Creator: ₹499/mo, ₹399/mo (annual)
  // MAX: ₹999/mo, ₹799/mo (annual)
  // Custom Annual: from ₹1,800/yr
  assert(PLAN_DEFINITIONS.free.priceMonthly === 0, 'Free plan price is ₹0');
  assert(PLAN_DEFINITIONS.pro.priceMonthly === 249, 'Pro monthly price is ₹249');
  assert(Math.round(PLAN_DEFINITIONS.pro.priceYearly / 12) === 199, 'Pro annual monthly equivalent is ₹199');
  assert(PLAN_DEFINITIONS.creator.priceMonthly === 499, 'Creator monthly price is ₹499');
  assert(Math.round(PLAN_DEFINITIONS.creator.priceYearly / 12) === 399, 'Creator annual monthly equivalent is ₹399');
  assert(PLAN_DEFINITIONS.max.priceMonthly === 999, 'MAX monthly price is ₹999');
  assert(Math.round(PLAN_DEFINITIONS.max.priceYearly / 12) === 799, 'MAX annual monthly equivalent is ₹799');

  // Verify UI pricing cards match
  const freeMock = PRICING_PLANS.find(p => p.id === 'free');
  const proMock = PRICING_PLANS.find(p => p.id === 'pro');
  const creatorMock = PRICING_PLANS.find(p => p.id === 'creator');
  const maxMock = PRICING_PLANS.find(p => p.id === 'max');

  assert(freeMock?.priceMonthly === 0, 'UI Free plan matches ₹0');
  assert(proMock?.priceMonthly === 249, 'UI Pro monthly price matches ₹249');
  assert(Math.round((proMock?.priceYearly || 0) / 12) === 199, 'UI Pro annual monthly price matches ₹199');
  assert(creatorMock?.priceMonthly === 499, 'UI Creator monthly price matches ₹499');
  assert(Math.round((creatorMock?.priceYearly || 0) / 12) === 399, 'UI Creator annual monthly price matches ₹399');
  assert(maxMock?.priceMonthly === 999, 'UI MAX monthly price matches ₹999');
  assert(Math.round((maxMock?.priceYearly || 0) / 12) === 799, 'UI MAX annual monthly price matches ₹799');

    console.log('\n================================================================');
    console.log('🎉 ALL 12 CRITICAL SUBSCRIPTION & ACCESS CONTROL TESTS PASSED!');
    console.log('================================================================\n');
  } finally {
    server.close();
    if (fs.existsSync(TEMP_STATE_FILE)) {
      fs.unlinkSync(TEMP_STATE_FILE);
    }
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
