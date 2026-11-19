/**
 * CreatorFlow AI — Admin Analytics & Telemetry Engine
 * 
 * Centralized service for tracking real platform events, computing conversion funnels,
 * inspecting feature performance, and auditing system readiness.
 * 
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO fake statistics or synthetic vanity numbers.
 * - If backend or payment data is not connected, explicitly report null / "No data yet".
 * - Never compute recurring revenue from frontend localStorage.
 */

import {
  AdminEventType,
  AdminTelemetryEvent,
  CreatorFeatureId,
  FeatureMetric,
  FunnelStage,
  RetentionCohort,
  SystemServiceStatus,
  UpgradeTriggerMetric,
} from '../types/adminAnalytics';
import { getStoredUser, getDeviceKnownAccounts } from './auth';
import { getVideoProjects, getSavedIdeas, getCreatorProfile } from './creatorStorage';
import { getGuidedWorkflowState } from './guidedWorkflowStorage';
import { trackEvent } from './analyticsService';

const TELEMETRY_STORAGE_KEY = 'cf_admin_telemetry_events_v1';
const MAX_STORED_EVENTS = 600;

// In-memory events queue (for server/SSR/testing and memory fallback)
let inMemoryEvents: AdminTelemetryEvent[] = [];

// Session identifier for current browser run
let currentSessionId = '';
function getSessionId(): string {
  if (!currentSessionId) {
    if (typeof window !== 'undefined') {
      let existing = sessionStorage.getItem('cf_session_id');
      if (!existing) {
        existing = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        sessionStorage.setItem('cf_session_id', existing);
      }
      currentSessionId = existing;
    } else {
      currentSessionId = 'sess_srv_' + Date.now();
    }
  }
  return currentSessionId;
}

/**
 * Log a real telemetry event in client storage and notify event listeners.
 */
export function trackAdminEvent(
  type: AdminEventType,
  properties?: Record<string, any>,
  accountId?: string
): AdminTelemetryEvent {
  const user = getStoredUser();
  const resolvedAccountId = accountId || user?.id || 'anonymous_user';

  const event: AdminTelemetryEvent = {
    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type,
    timestamp: new Date().toISOString(),
    accountId: resolvedAccountId,
    sessionId: getSessionId(),
    properties: properties || {},
  };

  // Always append to memory queue
  inMemoryEvents.push(event);
  if (inMemoryEvents.length > MAX_STORED_EVENTS) {
    inMemoryEvents = inMemoryEvents.slice(-MAX_STORED_EVENTS);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      const list: AdminTelemetryEvent[] = raw ? JSON.parse(raw) : [];
      list.push(event);

      // Keep within bound
      const trimmed = list.slice(-MAX_STORED_EVENTS);
      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(trimmed));

      // Dispatch window event for live admin updates
      window.dispatchEvent(new CustomEvent('creatorflow_admin_event_logged', { detail: { event } }));
    } catch (e) {
      console.warn('[AdminAnalytics] Failed to persist telemetry event:', e);
    }
  }

  // Cross-log to unified analyticsService
  try {
    const eventMapping: Record<string, any> = {
      signup: 'signup_completed',
      login: 'login_completed',
      onboarding_complete: 'onboarding_completed',
      project_create: 'project_created',
      creation_kit_opened: 'creation_kit_created',
      upgrade_page_viewed: 'upgrade_viewed',
      subscription_created: 'subscription_created',
      subscription_cancelled: 'subscription_cancelled',
      feature_used: 'feature_used',
    };
    const mappedName = eventMapping[type];
    if (mappedName) {
      trackEvent(mappedName, {
        feature: properties?.featureId,
        projectId: properties?.projectId,
        properties,
        accountId: resolvedAccountId,
      });
    }
  } catch {
    // ignore
  }

  return event;
}

/**
 * Retrieve all raw tracked events from client telemetry storage.
 */
export function getTrackedEvents(): AdminTelemetryEvent[] {
  if (typeof window === 'undefined') return inMemoryEvents;
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : inMemoryEvents;
  } catch {
    return inMemoryEvents;
  }
}

/**
 * Clear stored telemetry events (for admin testing/reset).
 */
export function clearTrackedEvents(): void {
  inMemoryEvents = [];
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('creatorflow_admin_event_logged'));
  } catch (e) {
    console.warn('[AdminAnalytics] Failed to clear telemetry events:', e);
  }
}

/**
 * Real user account registry stats on current device/cache.
 */
export function getRegisteredUsersOverview(): {
  totalRegistered: number;
  newUsersToday: number | null;
  newUsersThisMonth: number | null;
  isBackendConnected: boolean;
  knownAccounts: Array<{ id: string; email: string; displayName: string; plan: string; lastUsedAt: string }>;
} {
  const knownAccounts = getDeviceKnownAccounts();
  const currentUser = getStoredUser();

  // Combine unique accounts by id
  const accountMap = new Map<string, any>();
  knownAccounts.forEach((acc) => accountMap.set(acc.id, acc));
  if (currentUser) {
    accountMap.set(currentUser.id, {
      id: currentUser.id,
      email: currentUser.email,
      displayName: currentUser.displayName,
      plan: currentUser.plan || 'free',
      lastUsedAt: currentUser.lastLoginAt,
    });
  }

  const accounts = Array.from(accountMap.values());
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  let newUsersToday = 0;
  let newUsersThisMonth = 0;
  let hasCreationDates = false;

  accounts.forEach((acc) => {
    if (acc.lastUsedAt) {
      hasCreationDates = true;
      if (acc.lastUsedAt.startsWith(todayStr)) newUsersToday++;
      if (acc.lastUsedAt.startsWith(currentMonthStr)) newUsersThisMonth++;
    }
  });

  return {
    totalRegistered: accounts.length,
    newUsersToday: hasCreationDates ? newUsersToday : null,
    newUsersThisMonth: hasCreationDates ? newUsersThisMonth : null,
    isBackendConnected: false, // Production server database not connected yet
    knownAccounts: accounts,
  };
}

/**
 * Real active users (DAU, WAU, MAU) computed strictly from tracked events.
 */
export function getActiveUsersMetrics(): {
  dau: number | null;
  wau: number | null;
  mau: number | null;
  hasTrackedActivity: boolean;
} {
  const events = getTrackedEvents();
  if (events.length === 0) {
    return { dau: null, wau: null, mau: null, hasTrackedActivity: false };
  }

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();

  events.forEach((evt) => {
    const time = new Date(evt.timestamp).getTime();
    if (time >= oneDayAgo) dauSet.add(evt.accountId);
    if (time >= oneWeekAgo) wauSet.add(evt.accountId);
    if (time >= thirtyDaysAgo) mauSet.add(evt.accountId);
  });

  return {
    dau: dauSet.size,
    wau: wauSet.size,
    mau: mauSet.size,
    hasTrackedActivity: true,
  };
}

/**
 * Plan distribution among locally registered accounts.
 */
export function getPlanDistribution(): {
  plans: Array<{
    name: 'FREE' | 'PRO' | 'CREATOR' | 'MAX';
    count: number | null;
    percentage: number | null;
    changePercentage: number | null;
  }>;
  totalUsers: number;
  isBackendConnected: boolean;
} {
  const userRegistry = getRegisteredUsersOverview();
  const accounts = userRegistry.knownAccounts;

  if (accounts.length === 0) {
    return {
      plans: [
        { name: 'FREE', count: null, percentage: null, changePercentage: null },
        { name: 'PRO', count: null, percentage: null, changePercentage: null },
        { name: 'CREATOR', count: null, percentage: null, changePercentage: null },
        { name: 'MAX', count: null, percentage: null, changePercentage: null },
      ],
      totalUsers: 0,
      isBackendConnected: false,
    };
  }

  let freeCount = 0;
  let proCount = 0;
  let creatorCount = 0;
  let maxCount = 0;

  accounts.forEach((acc) => {
    const plan = (acc.plan || 'free').toLowerCase();
    if (plan === 'pro') proCount++;
    else if (plan === 'creator') creatorCount++;
    else if (plan === 'max') maxCount++;
    else freeCount++;
  });

  const total = accounts.length;

  return {
    plans: [
      {
        name: 'FREE',
        count: freeCount,
        percentage: total > 0 ? Math.round((freeCount / total) * 100) : 0,
        changePercentage: null, // No historical backend delta
      },
      {
        name: 'PRO',
        count: proCount,
        percentage: total > 0 ? Math.round((proCount / total) * 100) : 0,
        changePercentage: null,
      },
      {
        name: 'CREATOR',
        count: creatorCount,
        percentage: total > 0 ? Math.round((creatorCount / total) * 100) : 0,
        changePercentage: null,
      },
      {
        name: 'MAX',
        count: maxCount,
        percentage: total > 0 ? Math.round((maxCount / total) * 100) : 0,
        changePercentage: null,
      },
    ],
    totalUsers: total,
    isBackendConnected: false,
  };
}

/**
 * Paid subscriber metrics.
 */
export function getPaidSubscribersMetrics(): {
  totalPaidSubscribers: number | null;
  paidPercentage: number | null;
  isBackendConnected: boolean;
} {
  const distribution = getPlanDistribution();
  if (distribution.totalUsers === 0) {
    return {
      totalPaidSubscribers: null,
      paidPercentage: null,
      isBackendConnected: false,
    };
  }

  const paidPlans = distribution.plans.filter((p) => p.name !== 'FREE');
  const totalPaid = paidPlans.reduce((sum, p) => sum + (p.count || 0), 0);
  const percentage = Math.round((totalPaid / distribution.totalUsers) * 100);

  return {
    totalPaidSubscribers: totalPaid,
    paidPercentage: percentage,
    isBackendConnected: false,
  };
}

/**
 * Revenue Analytics
 * STRICT CONFLICT PREVENTION:
 * Never calculate revenue from frontend localStorage.
 * Always returns null/disconnected indicator until server webhook is configured.
 */
export function getRevenueMetrics(): {
  mrr: number | null;
  arr: number | null;
  monthlyRevenue: number | null;
  annualPlanRevenue: number | null;
  arpu: number | null;
  momChange: number | null;
  revenueByPlan: Record<string, number | null>;
  successfulPayments: number | null;
  failedPayments: number | null;
  refunds: number | null;
  cancelledSubscriptions: number | null;
  paymentProviderConnected: boolean;
  providerName: string;
} {
  return {
    mrr: null,
    arr: null,
    monthlyRevenue: null,
    annualPlanRevenue: null,
    arpu: null,
    momChange: null,
    revenueByPlan: {
      free: null,
      pro: null,
      creator: null,
      max: null,
    },
    successfulPayments: null,
    failedPayments: null,
    refunds: null,
    cancelledSubscriptions: null,
    paymentProviderConnected: false,
    providerName: 'Stripe / Paddle (Not connected)',
  };
}

/**
 * Churn Metrics
 * Stored server-side only in real production.
 */
export function getChurnMetrics(): {
  churnRate: number | null;
  cancelledThisMonth: number | null;
  isBackendConnected: boolean;
} {
  return {
    churnRate: null,
    cancelledThisMonth: null,
    isBackendConnected: false,
  };
}

/**
 * User Growth over Time
 */
export function getUserGrowthData(timeframe: '7d' | '30d' | '90d' | '12m'): {
  points: Array<{ label: string; totalUsers: number; newUsers: number; activeUsers: number }>;
  hasTimeSeriesData: boolean;
} {
  const events = getTrackedEvents();
  if (events.length === 0) {
    return {
      points: [],
      hasTimeSeriesData: false,
    };
  }

  const daysCount = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  const now = new Date();
  const dayBuckets = new Map<string, { newUsers: Set<string>; activeUsers: Set<string> }>();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dayBuckets.set(key, { newUsers: new Set(), activeUsers: new Set() });
  }

  events.forEach((evt) => {
    const dayKey = evt.timestamp.split('T')[0];
    const bucket = dayBuckets.get(dayKey);
    if (bucket) {
      bucket.activeUsers.add(evt.accountId);
      if (evt.type === 'signup') {
        bucket.newUsers.add(evt.accountId);
      }
    }
  });

  const points: Array<{ label: string; totalUsers: number; newUsers: number; activeUsers: number }> = [];
  let cumulative = 0;

  dayBuckets.forEach((bucket, key) => {
    cumulative += bucket.newUsers.size;
    // Format label
    const parts = key.split('-');
    const label = `${parts[1]}/${parts[2]}`;
    points.push({
      label,
      totalUsers: cumulative,
      newUsers: bucket.newUsers.size,
      activeUsers: bucket.activeUsers.size,
    });
  });

  const hasActivity = points.some((p) => p.activeUsers > 0 || p.newUsers > 0);

  return {
    points,
    hasTimeSeriesData: hasActivity,
  };
}

/**
 * 9-Stage Conversion Funnel
 * Landing Page -> Signup -> Onboarding Complete -> First Project -> First Gen -> Second Gen -> Creation Kit -> Upgrade Page -> Paid Sub
 */
export function getConversionFunnel(): {
  stages: FunnelStage[];
  overallConversionRate: number | null;
  highestDropOffStage: string | null;
  isBackendConnected: boolean;
} {
  const events = getTrackedEvents();

  const STAGE_DEFS = [
    { id: 'landing', label: 'Landing Page', desc: 'Visited landing page or hero view' },
    { id: 'signup', label: 'Signup', desc: 'Registered user account' },
    { id: 'onboarding', label: 'Onboarding Complete', desc: 'Completed setup and initial profile' },
    { id: 'first_project', label: 'First Project', desc: 'Created their first video workspace' },
    { id: 'first_gen', label: 'First Generation', desc: 'Generated first script, idea, or kit' },
    { id: 'second_gen', label: 'Second Generation', desc: 'Generated second creative asset' },
    { id: 'creation_kit', label: 'Creation Kit', desc: 'Explored tool-specific production kit' },
    { id: 'upgrade_page', label: 'Upgrade Page', desc: 'Viewed pricing / plan upgrade options' },
    { id: 'paid_sub', label: 'Paid Subscription', desc: 'Subscribed to Pro, Creator, or MAX' },
  ];

  if (events.length === 0) {
    return {
      stages: STAGE_DEFS.map((s) => ({
        id: s.id,
        label: s.label,
        description: s.desc,
        enteredCount: null,
        completedCount: null,
        dropOffRate: null,
        isBackendConnected: false,
      })),
      overallConversionRate: null,
      highestDropOffStage: null,
      isBackendConnected: false,
    };
  }

  // Group events by account
  const accountsMap = new Map<string, Set<string>>();
  const generationCounts = new Map<string, number>();

  events.forEach((evt) => {
    if (!accountsMap.has(evt.accountId)) {
      accountsMap.set(evt.accountId, new Set());
    }
    const userStages = accountsMap.get(evt.accountId)!;

    if (evt.type === 'page_view' && (!evt.properties?.view || evt.properties.view === 'landing')) {
      userStages.add('landing');
    }
    if (evt.type === 'signup' || evt.type === 'login') {
      userStages.add('signup');
    }
    if (evt.type === 'onboarding_complete') {
      userStages.add('onboarding');
    }
    if (evt.type === 'project_create') {
      userStages.add('first_project');
    }
    if (evt.type === 'generation_complete' || evt.type === 'generation_start') {
      const c = (generationCounts.get(evt.accountId) || 0) + 1;
      generationCounts.set(evt.accountId, c);
      userStages.add('first_gen');
      if (c >= 2) userStages.add('second_gen');
    }
    if (evt.type === 'creation_kit_opened') {
      userStages.add('creation_kit');
    }
    if (evt.type === 'upgrade_page_viewed') {
      userStages.add('upgrade_page');
    }
    if (evt.type === 'subscription_created') {
      userStages.add('paid_sub');
    }
  });

  const totalUsersInPipeline = accountsMap.size;
  let prevCompleted = totalUsersInPipeline;
  let highestDrop = 0;
  let highestDropLabel: string | null = null;

  const stages: FunnelStage[] = STAGE_DEFS.map((s, idx) => {
    let completedCount = 0;
    accountsMap.forEach((stageSet) => {
      if (stageSet.has(s.id)) completedCount++;
    });

    const enteredCount = idx === 0 ? totalUsersInPipeline : prevCompleted;
    const dropOff = enteredCount > 0 ? Math.max(0, enteredCount - completedCount) : 0;
    const dropOffRate = enteredCount > 0 ? Math.round((dropOff / enteredCount) * 100) : 0;

    if (dropOffRate > highestDrop) {
      highestDrop = dropOffRate;
      highestDropLabel = s.label;
    }

    prevCompleted = completedCount;

    return {
      id: s.id,
      label: s.label,
      description: s.desc,
      enteredCount,
      completedCount,
      dropOffRate,
      isBackendConnected: false,
    };
  });

  const firstCount = stages[0]?.enteredCount || 0;
  const lastCount = stages[stages.length - 1]?.completedCount || 0;
  const overallConversion = firstCount > 0 ? Math.round((lastCount / firstCount) * 100) : 0;

  return {
    stages,
    overallConversionRate: overallConversion,
    highestDropOffStage: highestDropLabel,
    isBackendConnected: false,
  };
}

/**
 * Feature Performance Tracking for the 14 core CreatorFlow capabilities
 */
export const CORE_FEATURES: Array<{ id: CreatorFeatureId; name: string; category: string }> = [
  { id: 'topic_analyzer', name: 'Topic Analyzer', category: 'Strategy' },
  { id: 'idea_generator', name: 'Idea Generator', category: 'Strategy' },
  { id: 'strategy_engine', name: 'Strategy Engine', category: 'Strategy' },
  { id: 'creation_kit', name: 'Creation Kit', category: 'Production' },
  { id: 'ai_video_prompt_generator', name: 'AI Video Prompt Generator', category: 'AI Video' },
  { id: 'character_consistency', name: 'Character Consistency', category: 'AI Video' },
  { id: 'script_builder', name: 'Script Builder', category: 'Production' },
  { id: 'visual_planner', name: 'Visual Planner', category: 'Production' },
  { id: 'publishing_studio', name: 'Publishing Studio', category: 'Publishing' },
  { id: 'analytics', name: 'Analytics', category: 'Audience' },
  { id: 'trend_radar', name: 'Trend Radar', category: 'Strategy' },
  { id: 'content_gap_finder', name: 'Content Gap Finder', category: 'Strategy' },
  { id: 'series_planner', name: 'Series Planner', category: 'Strategy' },
  { id: 'next_video_intelligence', name: 'Next Video Intelligence', category: 'Intelligence' },
];

export function getFeaturePerformance(): FeatureMetric[] {
  const events = getTrackedEvents();
  const featureMap = new Map<
    CreatorFeatureId,
    { users: Set<string>; totalUses: number; upgradedUsers: Set<string>; lastUsed?: string }
  >();

  CORE_FEATURES.forEach((f) => {
    featureMap.set(f.id, {
      users: new Set(),
      totalUses: 0,
      upgradedUsers: new Set(),
    });
  });

  // Track upgraded accounts
  const upgradedAccounts = new Set<string>();
  events.forEach((evt) => {
    if (evt.type === 'subscription_created') {
      upgradedAccounts.add(evt.accountId);
    }
  });

  events.forEach((evt) => {
    if (evt.type === 'feature_used' && evt.properties?.featureId) {
      const featId = evt.properties.featureId as CreatorFeatureId;
      const data = featureMap.get(featId);
      if (data) {
        data.totalUses++;
        data.users.add(evt.accountId);
        data.lastUsed = evt.timestamp;
        if (upgradedAccounts.has(evt.accountId)) {
          data.upgradedUsers.add(evt.accountId);
        }
      }
    }
  });

  return CORE_FEATURES.map((f) => {
    const data = featureMap.get(f.id)!;
    const usersCount = data.users.size;
    const repeatUsersCount = data.totalUses > usersCount ? Math.max(0, usersCount) : 0;
    const conversion = usersCount > 0 ? Math.round((data.upgradedUsers.size / usersCount) * 100) : null;

    return {
      id: f.id,
      name: f.name,
      category: f.category,
      usersCount: usersCount > 0 ? usersCount : null,
      totalUses: data.totalUses > 0 ? data.totalUses : null,
      repeatUsersCount: repeatUsersCount > 0 ? repeatUsersCount : null,
      conversionAfterUseRate: conversion,
      lastUsedTimestamp: data.lastUsed,
    };
  });
}

/**
 * Upgrade Trigger Analytics
 * Tracks the last major action prior to an upgrade event.
 */
export function getUpgradeTriggerAnalytics(): UpgradeTriggerMetric[] {
  const events = getTrackedEvents();
  const upgradeEvents = events.filter((e) => e.type === 'subscription_created');

  if (upgradeEvents.length === 0) {
    return [
      { featureId: 'creation_kit', featureName: 'Creation Kit', upgradeCount: null, upgradeRate: null },
      { featureId: 'ai_video_prompt_generator', featureName: 'AI Video Prompts', upgradeCount: null, upgradeRate: null },
      { featureId: 'second_generation', featureName: 'Second Generation', upgradeCount: null, upgradeRate: null },
      { featureId: 'topic_analyzer', featureName: 'Advanced Topic Analysis', upgradeCount: null, upgradeRate: null },
      { featureId: 'character_consistency', featureName: 'Character Consistency', upgradeCount: null, upgradeRate: null },
      { featureId: 'analytics', featureName: 'Analytics', upgradeCount: null, upgradeRate: null },
      { featureId: 'content_gap_finder', featureName: 'Content Gap Finder', upgradeCount: null, upgradeRate: null },
      { featureId: 'series_planner', featureName: 'Series Planning', upgradeCount: null, upgradeRate: null },
    ];
  }

  // Analyze events preceding each upgrade
  const triggerCounts = new Map<string, number>();

  upgradeEvents.forEach((upEvt) => {
    const priorEvents = events.filter(
      (e) => e.accountId === upEvt.accountId && new Date(e.timestamp).getTime() < new Date(upEvt.timestamp).getTime()
    );
    const lastAction = priorEvents[priorEvents.length - 1];
    const triggerKey = lastAction?.properties?.featureId || lastAction?.type || 'unknown_trigger';
    triggerCounts.set(triggerKey, (triggerCounts.get(triggerKey) || 0) + 1);
  });

  const totalUpgrades = upgradeEvents.length;

  return [
    {
      featureId: 'creation_kit',
      featureName: 'Creation Kit',
      upgradeCount: triggerCounts.get('creation_kit') || 0,
      upgradeRate: triggerCounts.has('creation_kit') ? Math.round(((triggerCounts.get('creation_kit') || 0) / totalUpgrades) * 100) : 0,
    },
    {
      featureId: 'ai_video_prompt_generator',
      featureName: 'AI Video Prompts',
      upgradeCount: triggerCounts.get('ai_video_prompt_generator') || 0,
      upgradeRate: triggerCounts.has('ai_video_prompt_generator') ? Math.round(((triggerCounts.get('ai_video_prompt_generator') || 0) / totalUpgrades) * 100) : 0,
    },
    {
      featureId: 'second_generation',
      featureName: 'Second Generation',
      upgradeCount: triggerCounts.get('generation_complete') || 0,
      upgradeRate: triggerCounts.has('generation_complete') ? Math.round(((triggerCounts.get('generation_complete') || 0) / totalUpgrades) * 100) : 0,
    },
  ];
}

/**
 * Subscription Lifecycle Analytics
 */
export function getSubscriptionAnalytics(): {
  newSubscriptions: number | null;
  upgrades: number | null;
  downgrades: number | null;
  cancellations: number | null;
  renewals: number | null;
  activeSubscriptions: number | null;
  expiredSubscriptions: number | null;
  conversionPaths: Array<{ path: string; count: number | null; percentage: number | null }>;
  isBackendConnected: boolean;
} {
  const events = getTrackedEvents();
  const subEvents = events.filter((e) => e.type === 'subscription_created' || e.type === 'subscription_cancelled');

  const PATHS = [
    { path: 'Free → Pro', count: null, percentage: null },
    { path: 'Free → Creator', count: null, percentage: null },
    { path: 'Free → MAX', count: null, percentage: null },
    { path: 'Pro → Creator', count: null, percentage: null },
    { path: 'Creator → MAX', count: null, percentage: null },
  ];

  if (subEvents.length === 0) {
    return {
      newSubscriptions: null,
      upgrades: null,
      downgrades: null,
      cancellations: null,
      renewals: null,
      activeSubscriptions: null,
      expiredSubscriptions: null,
      conversionPaths: PATHS,
      isBackendConnected: false,
    };
  }

  const newSubs = subEvents.filter((e) => e.type === 'subscription_created').length;
  const cancels = subEvents.filter((e) => e.type === 'subscription_cancelled').length;

  return {
    newSubscriptions: newSubs,
    upgrades: 0,
    downgrades: 0,
    cancellations: cancels,
    renewals: null,
    activeSubscriptions: newSubs - cancels,
    expiredSubscriptions: null,
    conversionPaths: PATHS,
    isBackendConnected: false,
  };
}

/**
 * Product Usage Statistics
 */
export function getProductUsageStats(): {
  ideasGenerated: { daily: number; weekly: number; monthly: number; total: number };
  projectsCreated: { daily: number; weekly: number; monthly: number; total: number };
  videoPromptsGenerated: { daily: number; weekly: number; monthly: number; total: number };
  charactersCreated: { daily: number; weekly: number; monthly: number; total: number };
  scriptsGenerated: { daily: number; weekly: number; monthly: number; total: number };
  contentPacksExported: { daily: number; weekly: number; monthly: number; total: number };
  fullWorkflowsCompleted: { daily: number; weekly: number; monthly: number; total: number };
} {
  const projects = getVideoProjects() || [];
  const ideas = getSavedIdeas() || [];
  const events = getTrackedEvents();
  const workflow = getGuidedWorkflowState();

  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Filter events helper
  const countEvents = (filterFn: (e: AdminTelemetryEvent) => boolean) => {
    let d = 0, w = 0, m = 0, tot = 0;
    events.forEach((e) => {
      if (filterFn(e)) {
        tot++;
        const t = new Date(e.timestamp).getTime();
        if (t >= dayAgo) d++;
        if (t >= weekAgo) w++;
        if (t >= monthAgo) m++;
      }
    });
    return { daily: d, weekly: w, monthly: m, total: tot };
  };

  const projectStats = countEvents((e) => e.type === 'project_create');
  // Combine real store counts
  projectStats.total = Math.max(projectStats.total, projects.length);

  const scriptStats = countEvents((e) => e.type === 'feature_used' && e.properties?.featureId === 'script_builder');
  const promptStats = countEvents((e) => e.type === 'feature_used' && e.properties?.featureId === 'ai_video_prompt_generator');
  const charStats = countEvents((e) => e.type === 'feature_used' && e.properties?.featureId === 'character_consistency');
  const workflowStats = countEvents((e) => e.type === 'generation_complete' && e.properties?.step === 4);
  if (workflow?.isFinished) workflowStats.total = Math.max(workflowStats.total, 1);

  return {
    ideasGenerated: {
      daily: 0,
      weekly: 0,
      monthly: ideas.length,
      total: ideas.length,
    },
    projectsCreated: projectStats,
    videoPromptsGenerated: promptStats,
    charactersCreated: charStats,
    scriptsGenerated: scriptStats,
    contentPacksExported: countEvents((e) => e.type === 'custom_event' && e.properties?.action === 'export_pack'),
    fullWorkflowsCompleted: workflowStats,
  };
}

/**
 * User Retention Cohorts
 */
export function getUserRetentionStats(): {
  day1Retention: number | null;
  day7Retention: number | null;
  day30Retention: number | null;
  oneTimeUsers: number | null;
  returningUsers: number | null;
  weeklyActiveCreators: number | null;
  monthlyActiveCreators: number | null;
  cohorts: RetentionCohort[];
  hasEnoughData: boolean;
} {
  const events = getTrackedEvents();
  const activeMetrics = getActiveUsersMetrics();

  // If we don't have events over multiple weeks, accurately declare lack of data
  if (events.length < 5) {
    return {
      day1Retention: null,
      day7Retention: null,
      day30Retention: null,
      oneTimeUsers: null,
      returningUsers: null,
      weeklyActiveCreators: activeMetrics.wau,
      monthlyActiveCreators: activeMetrics.mau,
      cohorts: [],
      hasEnoughData: false,
    };
  }

  // Count one-time vs returning users based on unique session counts per account
  const sessionsPerUser = new Map<string, Set<string>>();
  events.forEach((e) => {
    if (!sessionsPerUser.has(e.accountId)) {
      sessionsPerUser.set(e.accountId, new Set());
    }
    sessionsPerUser.get(e.accountId)!.add(e.sessionId);
  });

  let oneTime = 0;
  let returning = 0;
  sessionsPerUser.forEach((sessSet) => {
    if (sessSet.size <= 1) oneTime++;
    else returning++;
  });

  return {
    day1Retention: null,
    day7Retention: null,
    day30Retention: null,
    oneTimeUsers: oneTime,
    returningUsers: returning,
    weeklyActiveCreators: activeMetrics.wau,
    monthlyActiveCreators: activeMetrics.mau,
    cohorts: [],
    hasEnoughData: false,
  };
}

/**
 * System and Service Health Status
 */
export function getSystemServicesStatus(): SystemServiceStatus[] {
  const now = new Date().toISOString();
  const events = getTrackedEvents();

  return [
    {
      service: 'PostgreSQL / Cloud SQL Database',
      status: 'disconnected',
      details: 'No backend SQL instance configured. Operating with local device accounts & isolated workspace cache.',
      lastChecked: now,
    },
    {
      service: 'Stripe / Payment Gateway Webhook',
      status: 'disconnected',
      details: 'Payment webhook endpoint not registered. Revenue, MRR, ARR & churn calculations strictly disabled.',
      lastChecked: now,
    },
    {
      service: 'Admin Telemetry Pipeline',
      status: 'ready_local',
      details: `Active in-memory & local queue (${events.length} tracked events stored in cf_admin_telemetry_events_v1).`,
      lastChecked: now,
    },
    {
      service: 'Analytics Retention Pipeline',
      status: 'disconnected',
      details: 'Long-term warehouse retention (BigQuery / ClickHouse) not connected. Real events are stored locally on client.',
      lastChecked: now,
    },
    {
      service: 'Admin Authentication & RBAC',
      status: 'disconnected',
      details: 'Production OAuth RBAC not enforced. Operating in architectural development review mode.',
      lastChecked: now,
    },
  ];
}
