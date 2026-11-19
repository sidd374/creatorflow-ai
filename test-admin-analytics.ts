/**
 * CreatorFlow AI — Admin Analytics & Telemetry Test Suite
 */

import { 
  trackAdminEvent, 
  getTrackedEvents, 
  clearTrackedEvents,
  getRegisteredUsersOverview,
  getActiveUsersMetrics,
  getPlanDistribution,
  getPaidSubscribersMetrics,
  getRevenueMetrics,
  getConversionFunnel,
  getFeaturePerformance,
  getUpgradeTriggerAnalytics,
  getProductUsageStats,
  getUserRetentionStats,
  getSystemServicesStatus,
  CORE_FEATURES
} from './src/lib/adminAnalyticsService';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

console.log('--- CREATORFLOW ADMIN ANALYTICS VALIDATION SUITE ---');

// 1. Initial Empty State & Disconnected Revenue
console.log('\nTest 1: Revenue Security Policy & Disconnected Payment Provider...');
const rev = getRevenueMetrics();
assert(rev.mrr === null, 'MRR is null when payment provider is not connected');
assert(rev.arr === null, 'ARR is null when payment provider is not connected');
assert(rev.paymentProviderConnected === false, 'Payment provider flagged as disconnected');
assert(rev.monthlyRevenue === null, 'Monthly revenue is null (never computed from localStorage)');

// 2. Real Registered Accounts
console.log('\nTest 2: Real User Accounts Overview...');
const usersOverview = getRegisteredUsersOverview();
assert(typeof usersOverview.totalRegistered === 'number', 'Total registered users is numeric');
assert(usersOverview.isBackendConnected === false, 'Production database flagged as disconnected');

// 3. Plan Distribution
console.log('\nTest 3: Plan Distribution...');
const plans = getPlanDistribution();
assert(plans.plans.length === 4, '4 plan tiers checked (FREE, PRO, CREATOR, MAX)');
assert(plans.plans.some(p => p.name === 'FREE'), 'FREE plan exists');
assert(plans.plans.some(p => p.name === 'MAX'), 'MAX plan exists');

// 4. Conversion Funnel (9 Stages)
console.log('\nTest 4: 9-Stage Conversion Funnel Structure...');
const funnel = getConversionFunnel();
assert(funnel.stages.length === 9, 'Funnel has exactly 9 stages');
const stageIds = funnel.stages.map(s => s.id);
assert(stageIds.includes('landing'), 'Funnel has Landing Page stage');
assert(stageIds.includes('signup'), 'Funnel has Signup stage');
assert(stageIds.includes('onboarding'), 'Funnel has Onboarding Complete stage');
assert(stageIds.includes('first_project'), 'Funnel has First Project stage');
assert(stageIds.includes('first_gen'), 'Funnel has First Generation stage');
assert(stageIds.includes('second_gen'), 'Funnel has Second Generation stage');
assert(stageIds.includes('creation_kit'), 'Funnel has Creation Kit stage');
assert(stageIds.includes('upgrade_page'), 'Funnel has Upgrade Page stage');
assert(stageIds.includes('paid_sub'), 'Funnel has Paid Subscription stage');

// 5. Feature Performance (14 Features)
console.log('\nTest 5: 14 Feature Performance Metrics...');
const featurePerf = getFeaturePerformance();
assert(featurePerf.length === 14, 'Tracks exactly 14 core CreatorFlow features');
assert(featurePerf.some(f => f.id === 'creation_kit'), 'Creation Kit is tracked');
assert(featurePerf.some(f => f.id === 'ai_video_prompt_generator'), 'AI Video Prompt Generator is tracked');
assert(featurePerf.some(f => f.id === 'character_consistency'), 'Character Consistency is tracked');
assert(featurePerf.some(f => f.id === 'next_video_intelligence'), 'Next Video Intelligence is tracked');

// 6. Telemetry Event Flow
console.log('\nTest 6: Real Telemetry Event Emission & Consumption...');
clearTrackedEvents();
trackAdminEvent('page_view', { view: 'landing' }, 'acc_test_1');
trackAdminEvent('signup', { provider: 'google' }, 'acc_test_1');
trackAdminEvent('feature_used', { featureId: 'creation_kit' }, 'acc_test_1');

const tracked = getTrackedEvents();
assert(tracked.length >= 3, 'Tracked events persisted in event queue');
assert(tracked.some(e => e.type === 'page_view'), 'Page view event logged');
assert(tracked.some(e => e.type === 'signup'), 'Signup event logged');
assert(tracked.some(e => e.properties?.featureId === 'creation_kit'), 'Feature usage logged');

// 7. Retention Policy
console.log('\nTest 7: Retention Safety Policy...');
const retention = getUserRetentionStats();
assert(retention.day1Retention === null, 'Day 1 retention is null with insufficient data');
assert(retention.hasEnoughData === false, 'Declares not enough data yet without fake numbers');

// 8. System Services Status
console.log('\nTest 8: System Services Audit...');
const sysStatus = getSystemServicesStatus();
assert(sysStatus.some(s => s.service.includes('Database') && s.status === 'disconnected'), 'Database flagged disconnected');
assert(sysStatus.some(s => s.service.includes('Stripe') && s.status === 'disconnected'), 'Stripe webhook flagged disconnected');
assert(sysStatus.some(s => s.service.includes('Telemetry') && s.status === 'ready_local'), 'Telemetry pipeline flagged ready/local');

console.log('\n======================================================');
console.log('🎉 ALL ADMIN ANALYTICS TESTS PASSED WITH ZERO ERRORS!');
console.log('======================================================\n');
