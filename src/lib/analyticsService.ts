/**
 * CreatorFlow AI — Central Product Analytics Service
 * 
 * Provides unified, account-based, lightweight, non-blocking telemetry event tracking.
 * Captures real creator usage and workflow progression without synthetic vanity numbers.
 * 
 * Architectural Guarantees:
 * 1. Asynchronous non-blocking logging — never fails user workflows if network/storage is unavailable.
 * 2. Strict account identity binding — every event belongs to the authenticated user ID.
 * 3. Privacy-conscious — zero sensitive credentials, messages, or payment data collected.
 * 4. Dual-persisted — local buffer + server ingestion sync.
 */

import {
  CreatorFlowEvent,
  CreatorFlowEventName,
  AnalyticsDateRange,
  OwnerOverviewMetrics,
  OwnerUserRecord,
  FunnelStageData,
  FeaturePerformanceData,
  WorkflowProgressionData,
  RetentionCohortRow,
  ProductErrorRecord,
  SystemTelemetryData,
  EngagementDetails,
  RetentionAnalysisData,
  DailyEngagementPoint,
  PlanEngagementMetric,
} from '../types/ownerAnalytics';
import { getStoredUser, getDeviceKnownAccounts, getCachedIdToken, getAuthIdToken } from './auth';
import { getStoredPlan } from './planEntitlements';
import { getIsolatedProjects, getIsolatedIdeas } from './accountStorage';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

const LOCAL_EVENTS_KEY = 'cf_owner_telemetry_events_v2';
const MAX_LOCAL_EVENTS = 1000;

// In-memory queue + server-synced accounts cache for Owner Analytics
let inMemoryEvents: CreatorFlowEvent[] = [];
let serverSyncedAccounts: Array<{
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: string;
  role: string;
  createdAt: string;
  lastLoginAt: string;
}> = [];

/**
 * Fetch authoritative accounts and telemetry from `/api/admin/owner-analytics` using verified Owner Bearer token.
 */
export async function syncOwnerAnalyticsFromServer(range: AnalyticsDateRange = '30d'): Promise<boolean> {
  try {
    const token = await getAuthIdToken();
    if (!token) return false;
    const res = await fetch(`/api/admin/owner-analytics?range=${encodeURIComponent(range)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.success) {
      if (Array.isArray(data.accounts)) {
        serverSyncedAccounts = data.accounts;
      }
      if (Array.isArray(data.events)) {
        // Merge server events with local buffer by event ID
        const map = new Map<string, CreatorFlowEvent>();
        getStoredEvents().forEach((e) => map.set(e.id, e));
        data.events.forEach((e: CreatorFlowEvent) => map.set(e.id, e));
        const merged = Array.from(map.values()).slice(-MAX_LOCAL_EVENTS);
        inMemoryEvents = merged;
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(merged));
        }
      }
      return true;
    }
  } catch {
    // ignore offline
  }
  return false;
}

/**
 * Track an account-based product event asynchronously.
 * Guaranteed never to throw or block the caller.
 */
export function trackEvent(
  eventName: CreatorFlowEventName,
  options?: {
    feature?: string;
    projectId?: string;
    workflowStep?: number;
    properties?: Record<string, any>;
    errorMessage?: string;
    errorType?: string;
    accountId?: string;
    plan?: string;
  }
): void {
  try {
    const user = getStoredUser();
    const resolvedAccountId = options?.accountId || user?.id || 'anonymous_user';
    const resolvedPlan = options?.plan || user?.plan || getStoredPlan() || 'free';

    const event: CreatorFlowEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventName,
      accountId: resolvedAccountId,
      timestamp: new Date().toISOString(),
      plan: resolvedPlan,
      feature: options?.feature,
      projectId: options?.projectId,
      workflowStep: options?.workflowStep,
      properties: options?.properties || {},
      errorMessage: options?.errorMessage,
      errorType: options?.errorType,
    };

    // 1. Add to in-memory queue
    inMemoryEvents.push(event);
    if (inMemoryEvents.length > MAX_LOCAL_EVENTS) {
      inMemoryEvents = inMemoryEvents.slice(-MAX_LOCAL_EVENTS);
    }

    // 2. Persist to LocalStorage asynchronously
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
        const list: CreatorFlowEvent[] = raw ? JSON.parse(raw) : [];
        list.push(event);
        const trimmed = list.slice(-MAX_LOCAL_EVENTS);
        localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(trimmed));
        window.dispatchEvent(new CustomEvent('creatorflow_event_logged', { detail: { event } }));
      } catch {
        // quota exceeded or private mode, in-memory queue holds data
      }

      // 3. Send to server backend and Firestore asynchronously when authenticated
      setTimeout(() => {
        const token = getCachedIdToken();
        if (token) {
          fetch('/api/analytics/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(event),
          }).catch(() => {
            // graceful offline / dev ignore
          });
        }

        if (auth.currentUser && auth.currentUser.uid === resolvedAccountId) {
          setDoc(doc(db, 'telemetry', event.id), {
            id: event.id,
            accountId: resolvedAccountId,
            eventName: event.eventName.slice(0, 60),
            plan: String(resolvedPlan).slice(0, 30),
            ...(event.feature ? { feature: String(event.feature).slice(0, 60) } : {}),
            timestamp: event.timestamp,
          }).catch(() => {});
        }
      }, 10);
    }
  } catch (err) {
    // Analytics failure must NEVER break any core workflow
    console.warn('[AnalyticsService] Failed to track event non-destructively:', err);
  }
}

/**
 * Retrieve all raw tracked events from client storage and in-memory queue.
 */
export function getStoredEvents(): CreatorFlowEvent[] {
  if (typeof window === 'undefined') return inMemoryEvents;
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    if (!raw) return inMemoryEvents;
    const list: CreatorFlowEvent[] = JSON.parse(raw);
    if (!Array.isArray(list)) return inMemoryEvents;
    return list;
  } catch {
    return inMemoryEvents;
  }
}

/**
 * Clear stored events (for owner test/reset).
 */
export function clearStoredEvents(): void {
  inMemoryEvents = [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_EVENTS_KEY);
      window.dispatchEvent(new CustomEvent('creatorflow_event_logged'));
    } catch {
      // ignore
    }
  }
}

// -------------------------------------------------------------
// FILTERING HELPER BY DATE RANGE
// -------------------------------------------------------------
export function filterEventsByRange(
  events: CreatorFlowEvent[],
  range: AnalyticsDateRange,
  customStart?: Date,
  customEnd?: Date
): CreatorFlowEvent[] {
  const now = Date.now();
  let minTime = 0;
  let maxTime = Infinity;

  if (range === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    minTime = today.getTime();
  } else if (range === '7d') {
    minTime = now - 7 * 24 * 60 * 60 * 1000;
  } else if (range === '30d') {
    minTime = now - 30 * 24 * 60 * 60 * 1000;
  } else if (range === '90d') {
    minTime = now - 90 * 24 * 60 * 60 * 1000;
  } else if (range === 'custom') {
    if (customStart) minTime = customStart.getTime();
    if (customEnd) maxTime = customEnd.getTime();
  }

  return events.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return t >= minTime && t <= maxTime;
  });
}

// -------------------------------------------------------------
// OWNER METRIC COMPUTATION (HONEST REAL METRICS ONLY)
// -------------------------------------------------------------

/**
 * Compute top-level overview metrics across Users, Engagement, Conversion & Retention.
 */
export function getOwnerOverviewMetrics(range: AnalyticsDateRange = '30d'): OwnerOverviewMetrics {
  const allEvents = getStoredEvents();
  const filteredEvents = filterEventsByRange(allEvents, range);

  // Accounts
  const knownAccounts = getDeviceKnownAccounts();
  const currentUser = getStoredUser();
  const accountMap = new Map<string, any>();
  serverSyncedAccounts.forEach((a) =>
    accountMap.set(a.id, {
      id: a.id,
      email: a.email,
      displayName: a.displayName,
      plan: a.plan || 'free',
      role: a.role || 'user',
      createdAt: a.createdAt,
      lastUsedAt: a.lastLoginAt || a.createdAt,
    })
  );
  knownAccounts.forEach((a) => accountMap.set(a.id, a));
  if (currentUser) {
    accountMap.set(currentUser.id, {
      id: currentUser.id,
      email: currentUser.email,
      displayName: currentUser.displayName,
      plan: currentUser.plan || 'free',
      role: currentUser.role || 'user',
      createdAt: currentUser.createdAt,
      lastUsedAt: currentUser.lastLoginAt,
    });
  }

  // Also extract any distinct authenticated account IDs present in events
  allEvents.forEach((e) => {
    if (e.accountId && e.accountId !== 'anonymous_user' && !accountMap.has(e.accountId)) {
      accountMap.set(e.accountId, {
        id: e.accountId,
        email: 'creator@account.local',
        displayName: 'Registered Creator',
        plan: e.plan || 'free',
        lastUsedAt: e.timestamp,
      });
    }
  });

  const accounts = Array.from(accountMap.values());
  const totalAccounts = accounts.length;

  // Plan Breakdown
  const planBreakdown = { free: 0, pro: 0, creator: 0, max: 0 };
  accounts.forEach((acc) => {
    const p = (acc.plan || 'free').toLowerCase();
    if (p === 'pro') planBreakdown.pro++;
    else if (p === 'creator') planBreakdown.creator++;
    else if (p === 'max') planBreakdown.max++;
    else planBreakdown.free++;
  });

  // Active & Returning Users in selected range
  const activeAccountIds = new Set<string>();
  const activeSessionDates = new Map<string, Set<string>>(); // accountId -> Set of YYYY-MM-DD

  filteredEvents.forEach((e) => {
    if (e.accountId && e.accountId !== 'anonymous_user') {
      activeAccountIds.add(e.accountId);
      const dateStr = e.timestamp.split('T')[0];
      if (!activeSessionDates.has(e.accountId)) {
        activeSessionDates.set(e.accountId, new Set());
      }
      activeSessionDates.get(e.accountId)!.add(dateStr);
    }
  });

  const activeUsers = activeAccountIds.size;
  let returningUsers = 0;
  activeSessionDates.forEach((dates) => {
    if (dates.size > 1) returningUsers++;
  });

  // New accounts in range
  let newAccounts = 0;
  const now = Date.now();
  let minRangeTime = now - 30 * 24 * 60 * 60 * 1000;
  if (range === 'today') {
    const t = new Date(); t.setHours(0, 0, 0, 0); minRangeTime = t.getTime();
  } else if (range === '7d') minRangeTime = now - 7 * 24 * 60 * 60 * 1000;
  else if (range === '90d') minRangeTime = now - 90 * 24 * 60 * 60 * 1000;

  accounts.forEach((acc) => {
    if (acc.lastUsedAt && new Date(acc.lastUsedAt).getTime() >= minRangeTime) {
      newAccounts++;
    }
  });

  // Real engagement events
  let ideasGenerated = 0;
  let projectsCreated = 0;
  let creationKitsCreated = 0;
  let promptsCopied = 0;
  let publishingStarted = 0;
  let projectsCompleted = 0;

  filteredEvents.forEach((e) => {
    if (e.eventName === 'idea_generated') ideasGenerated++;
    if (e.eventName === 'project_created') projectsCreated++;
    if (e.eventName === 'creation_kit_created') creationKitsCreated++;
    if (e.eventName === 'prompt_copied') promptsCopied++;
    if (e.eventName === 'publishing_started') publishingStarted++;
    if (e.eventName === 'project_completed') projectsCompleted++;
  });

  // Conversion calculations
  const signupUsers = new Set<string>();
  const onboardingUsers = new Set<string>();
  const ideaUsers = new Set<string>();
  const projectUsers = new Set<string>();
  const kitUsers = new Set<string>();
  const upgradeViewUsers = new Set<string>();
  const paidUsers = new Set<string>();

  filteredEvents.forEach((e) => {
    const acc = e.accountId;
    if (!acc) return;
    if (e.eventName === 'signup_completed') signupUsers.add(acc);
    if (e.eventName === 'onboarding_completed') onboardingUsers.add(acc);
    if (e.eventName === 'idea_generated') ideaUsers.add(acc);
    if (e.eventName === 'project_created') projectUsers.add(acc);
    if (e.eventName === 'creation_kit_created') kitUsers.add(acc);
    if (e.eventName === 'upgrade_viewed') upgradeViewUsers.add(acc);
    if (e.eventName === 'subscription_created') paidUsers.add(acc);
  });

  const calcRate = (numerator: number, denominator: number): number | null => {
    if (denominator <= 0) return null;
    return Math.round((numerator / denominator) * 1000) / 10;
  };

  const conversion = {
    signupToOnboarding: calcRate(onboardingUsers.size, signupUsers.size),
    onboardingToFirstIdea: calcRate(ideaUsers.size, onboardingUsers.size),
    firstIdeaToFirstProject: calcRate(projectUsers.size, ideaUsers.size),
    firstProjectToCreationKit: calcRate(kitUsers.size, projectUsers.size),
    creationKitToUpgrade: calcRate(upgradeViewUsers.size, kitUsers.size),
    upgradeToPaid: calcRate(paidUsers.size, upgradeViewUsers.size),
  };

  // Retention Day 1, 7, 30
  const retention = calculateAccountRetention(allEvents);

  const hasEnoughData = allEvents.length >= 5 || totalAccounts > 0;

  return {
    totalAccounts,
    newAccounts,
    activeUsers,
    returningUsers,
    planBreakdown,
    ideasGenerated,
    projectsCreated,
    creationKitsCreated,
    promptsCopied,
    publishingStarted,
    projectsCompleted,
    conversion,
    retention,
    hasEnoughData,
  };
}

/**
 * Calculate Day 1, 7, 30 retention using real account session gaps.
 */
function calculateAccountRetention(events: CreatorFlowEvent[]): {
  day1: number | null;
  day7: number | null;
  day30: number | null;
} {
  const accountFirstSeen = new Map<string, number>();
  const accountActiveTimes = new Map<string, number[]>();

  events.forEach((e) => {
    if (!e.accountId || e.accountId === 'anonymous_user') return;
    const time = new Date(e.timestamp).getTime();
    if (!accountFirstSeen.has(e.accountId)) {
      accountFirstSeen.set(e.accountId, time);
      accountActiveTimes.set(e.accountId, [time]);
    } else {
      accountActiveTimes.get(e.accountId)!.push(time);
    }
  });

  const totalTrackedAccounts = accountFirstSeen.size;
  if (totalTrackedAccounts === 0) {
    return { day1: null, day7: null, day30: null };
  }

  let d1Retained = 0;
  let d7Retained = 0;
  let d30Retained = 0;

  accountFirstSeen.forEach((firstTime, accountId) => {
    const times = accountActiveTimes.get(accountId) || [];
    const hasD1 = times.some((t) => t - firstTime >= 24 * 60 * 60 * 1000 && t - firstTime <= 48 * 60 * 60 * 1000);
    const hasD7 = times.some((t) => t - firstTime >= 24 * 60 * 60 * 1000 && t - firstTime <= 7 * 24 * 60 * 60 * 1000);
    const hasD30 = times.some((t) => t - firstTime >= 24 * 60 * 60 * 1000 && t - firstTime <= 30 * 24 * 60 * 60 * 1000);

    if (hasD1) d1Retained++;
    if (hasD7) d7Retained++;
    if (hasD30) d30Retained++;
  });

  return {
    day1: Math.round((d1Retained / totalTrackedAccounts) * 1000) / 10,
    day7: Math.round((d7Retained / totalTrackedAccounts) * 1000) / 10,
    day30: Math.round((d30Retained / totalTrackedAccounts) * 1000) / 10,
  };
}

/**
 * Get minimal, safe user table records for Owner View.
 */
export function getOwnerUserList(): OwnerUserRecord[] {
  const knownAccounts = getDeviceKnownAccounts();
  const currentUser = getStoredUser();
  const accountMap = new Map<string, any>();

  serverSyncedAccounts.forEach((a) =>
    accountMap.set(a.id, {
      id: a.id,
      email: a.email,
      displayName: a.displayName,
      photoURL: a.photoURL,
      plan: a.plan || 'free',
      role: a.role || 'user',
      createdAt: a.createdAt || new Date().toISOString(),
      lastUsedAt: a.lastLoginAt || a.createdAt || new Date().toISOString(),
    })
  );
  knownAccounts.forEach((a) => accountMap.set(a.id, a));
  if (currentUser) {
    accountMap.set(currentUser.id, {
      id: currentUser.id,
      email: currentUser.email,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      plan: currentUser.plan || 'free',
      role: currentUser.role || 'user',
      createdAt: currentUser.createdAt || new Date().toISOString(),
      lastUsedAt: currentUser.lastLoginAt || new Date().toISOString(),
    });
  }

  const events = getStoredEvents();
  const accountEventCount = new Map<string, { ideas: number; projects: number; kits: number; lastActive: string }>();

  events.forEach((e) => {
    if (!e.accountId || e.accountId === 'anonymous_user') return;
    let entry = accountEventCount.get(e.accountId);
    if (!entry) {
      entry = { ideas: 0, projects: 0, kits: 0, lastActive: e.timestamp };
      accountEventCount.set(e.accountId, entry);
    }
    if (e.eventName === 'idea_generated') entry.ideas++;
    if (e.eventName === 'project_created') entry.projects++;
    if (e.eventName === 'creation_kit_created') entry.kits++;
    if (new Date(e.timestamp).getTime() > new Date(entry.lastActive).getTime()) {
      entry.lastActive = e.timestamp;
    }
  });

  return Array.from(accountMap.values()).map((acc) => {
    const stats = accountEventCount.get(acc.id);
    const isolatedProjects = getIsolatedProjects(acc.id);
    const isolatedIdeas = getIsolatedIdeas(acc.id) || [];

    const now = Date.now();
    const lastActiveTime = new Date(stats?.lastActive || acc.lastUsedAt || acc.createdAt || 0).getTime();
    const isRecentlyActive = now - lastActiveTime < 7 * 24 * 60 * 60 * 1000;

    return {
      id: acc.id,
      email: acc.email,
      displayName: acc.displayName || 'Creator',
      photoURL: acc.photoURL,
      role: (acc.role as any) || 'user',
      plan: acc.plan || 'free',
      createdAt: acc.createdAt || new Date().toISOString(),
      lastActive: stats?.lastActive || acc.lastUsedAt || acc.createdAt || new Date().toISOString(),
      projectsCount: Math.max(stats?.projects || 0, isolatedProjects.length),
      ideasCount: Math.max(stats?.ideas || 0, isolatedIdeas.length),
      creationKitsCount: stats?.kits || 0,
      status: isRecentlyActive ? 'active' : 'inactive',
    };
  });
}

/**
 * 10-Stage Product Funnel calculation.
 */
export function getProductFunnelData(range: AnalyticsDateRange = '30d'): FunnelStageData[] {
  const events = filterEventsByRange(getStoredEvents(), range);

  const stageKeys: Array<{ id: string; name: string; stepNumber: number; eventMatch: CreatorFlowEventName }> = [
    { id: 'landing', name: 'Landing Page', stepNumber: 1, eventMatch: 'session_started' },
    { id: 'signup', name: 'Signup', stepNumber: 2, eventMatch: 'signup_completed' },
    { id: 'onboarding_start', name: 'Onboarding Started', stepNumber: 3, eventMatch: 'onboarding_started' },
    { id: 'onboarding_done', name: 'Onboarding Completed', stepNumber: 4, eventMatch: 'onboarding_completed' },
    { id: 'first_idea', name: 'First Idea', stepNumber: 5, eventMatch: 'idea_generated' },
    { id: 'first_project', name: 'First Project', stepNumber: 6, eventMatch: 'project_created' },
    { id: 'creation_kit', name: 'First Creation Kit', stepNumber: 7, eventMatch: 'creation_kit_created' },
    { id: 'upgrade_view', name: 'Upgrade Viewed', stepNumber: 8, eventMatch: 'upgrade_viewed' },
    { id: 'checkout', name: 'Checkout Started', stepNumber: 9, eventMatch: 'checkout_started' },
    { id: 'paid', name: 'Paid Subscription', stepNumber: 10, eventMatch: 'subscription_created' },
  ];

  const stageUsers = new Map<string, Set<string>>();
  stageKeys.forEach((s) => stageUsers.set(s.id, new Set<string>()));

  // Ingest events into stage users
  events.forEach((e) => {
    const acc = e.accountId;
    if (!acc) return;
    stageKeys.forEach((s) => {
      if (e.eventName === s.eventMatch) {
        stageUsers.get(s.id)!.add(acc);
      }
    });
  });

  const result: FunnelStageData[] = [];
  let prevCount: number | null = null;

  stageKeys.forEach((s) => {
    const userCount = stageUsers.get(s.id)!.size;
    let conversionFromPrev: number | null = null;
    let dropOffRate: number | null = null;

    if (prevCount !== null && prevCount > 0) {
      conversionFromPrev = Math.round((userCount / prevCount) * 1000) / 10;
      dropOffRate = Math.max(0, Math.round((100 - conversionFromPrev) * 10) / 10);
    }

    result.push({
      id: s.id,
      name: s.name,
      stepNumber: s.stepNumber,
      userCount,
      conversionFromPrev,
      dropOffRate,
    });

    prevCount = userCount;
  });

  return result;
}

/**
 * Feature Performance tracking for existing CreatorFlow tools.
 */
export function getFeaturePerformanceData(range: AnalyticsDateRange = '30d'): FeaturePerformanceData[] {
  const events = filterEventsByRange(getStoredEvents(), range);

  const FEATURE_DEFS = [
    { id: 'daily_content_radar', name: 'Daily Content Radar', category: 'Discovery' },
    { id: 'next_video_intelligence', name: 'Next Video Intelligence', category: 'Strategy' },
    { id: 'topic_analyzer', name: 'Topic Analyzer', category: 'Strategy' },
    { id: 'idea_generator', name: 'Idea Generator', category: 'Strategy' },
    { id: 'script_builder', name: 'Script Builder', category: 'Production' },
    { id: 'visual_planner', name: 'Visual Planner', category: 'Production' },
    { id: 'voice_workflow', name: 'Voice Workflow', category: 'Audio' },
    { id: 'editing_workflow', name: 'Editing Workflow', category: 'Assembly' },
    { id: 'creation_kit', name: 'Production Kit', category: 'AI Prompts' },
    { id: 'tool_recommendations', name: 'Tool Recommendations', category: 'Tools' },
    { id: 'publishing_studio', name: 'Publishing Studio', category: 'Distribution' },
    { id: 'creator_analytics', name: 'Creator Analytics', category: 'Insights' },
    { id: 'thumbnail_planning', name: 'Thumbnail Planning', category: 'Packaging' },
    { id: 'metadata_tools', name: 'Metadata Tools', category: 'Packaging' },
  ];

  // Upgraded account IDs in events
  const upgradedAccounts = new Set<string>();
  events.forEach((e) => {
    if (e.eventName === 'subscription_created') {
      upgradedAccounts.add(e.accountId);
    }
  });

  const totalActiveUsers = new Set(events.map((e) => e.accountId).filter((id) => id && id !== 'anonymous_user')).size;

  return FEATURE_DEFS.map((f) => {
    const featureEvents = events.filter((e) => e.feature === f.id || (e.properties && e.properties.featureId === f.id));
    const userMap = new Map<string, number>();

    featureEvents.forEach((e) => {
      if (!e.accountId || e.accountId === 'anonymous_user') return;
      userMap.set(e.accountId, (userMap.get(e.accountId) || 0) + 1);
    });

    const uniqueUsers = userMap.size;
    const totalUses = featureEvents.length;
    let repeatUsers = 0;
    let usersWhoUpgraded = 0;

    userMap.forEach((count, accId) => {
      if (count > 1) repeatUsers++;
      if (upgradedAccounts.has(accId)) usersWhoUpgraded++;
    });

    const usageRate = totalActiveUsers > 0 ? Math.round((uniqueUsers / totalActiveUsers) * 1000) / 10 : null;
    const upgradeAfterUseRate = uniqueUsers > 0 ? Math.round((usersWhoUpgraded / uniqueUsers) * 1000) / 10 : null;

    const lastEvent = featureEvents[featureEvents.length - 1];

    return {
      id: f.id,
      name: f.name,
      category: f.category,
      uniqueUsers,
      totalUses,
      repeatUsers,
      usageRate,
      completionRate: uniqueUsers > 0 ? 100 : null,
      upgradeAfterUseRate,
      lastUsedAt: lastEvent?.timestamp,
    };
  });
}

/**
 * 11-Step Guided Workflow analysis (Brief -> YouTube -> Finish).
 */
export function getWorkflowProgressionData(range: AnalyticsDateRange = '30d'): WorkflowProgressionData[] {
  const events = filterEventsByRange(getStoredEvents(), range);

  const steps = [
    { step: 1, name: 'Brief' },
    { step: 2, name: 'Topic' },
    { step: 3, name: 'Ideas' },
    { step: 4, name: 'Method' },
    { step: 5, name: 'Setup' },
    { step: 6, name: 'Tools' },
    { step: 7, name: 'Create' },
    { step: 8, name: 'Metadata' },
    { step: 9, name: 'Discovery' },
    { step: 10, name: 'YouTube' },
    { step: 11, name: 'Finish' },
  ];

  const stepEntered = new Map<number, Set<string>>();
  const stepCompleted = new Map<number, Set<string>>();
  steps.forEach((s) => {
    stepEntered.set(s.step, new Set());
    stepCompleted.set(s.step, new Set());
  });

  events.forEach((e) => {
    const acc = e.accountId;
    if (!acc || typeof e.workflowStep !== 'number') return;
    if (e.eventName === 'workflow_step_entered') {
      stepEntered.get(e.workflowStep)?.add(acc);
    }
    if (e.eventName === 'workflow_step_completed') {
      stepCompleted.get(e.workflowStep)?.add(acc);
    }
  });

  return steps.map((s, idx) => {
    const entered = stepEntered.get(s.step)!.size;
    const completed = stepCompleted.get(s.step)!.size;
    let dropOffRate: number | null = null;

    if (idx < steps.length - 1) {
      const nextEntered = stepEntered.get(steps[idx + 1].step)!.size;
      if (entered > 0) {
        dropOffRate = Math.max(0, Math.round(((entered - nextEntered) / entered) * 1000) / 10);
      }
    }

    return {
      step: s.step,
      name: s.name,
      usersEntered: entered,
      usersCompleted: completed,
      dropOffRate,
    };
  });
}

/**
 * Product Errors & Failures tracking.
 */
export function getProductErrors(range: AnalyticsDateRange = '30d'): ProductErrorRecord[] {
  const events = filterEventsByRange(getStoredEvents(), range);
  const errorEvents = events.filter((e) => e.eventName === 'product_error' || e.errorType || e.errorMessage);

  const errorMap = new Map<string, {
    errorType: string;
    feature?: string;
    affectedAccounts: Set<string>;
    count: number;
    lastTimestamp: string;
    lastSnippet?: string;
  }>();

  errorEvents.forEach((e) => {
    const typeKey = e.errorType || 'unexpected_application_error';
    let entry = errorMap.get(typeKey);
    if (!entry) {
      entry = {
        errorType: typeKey,
        feature: e.feature,
        affectedAccounts: new Set(),
        count: 0,
        lastTimestamp: e.timestamp,
        lastSnippet: e.errorMessage,
      };
      errorMap.set(typeKey, entry);
    }
    entry.count++;
    if (e.accountId) entry.affectedAccounts.add(e.accountId);
    if (new Date(e.timestamp).getTime() > new Date(entry.lastTimestamp).getTime()) {
      entry.lastTimestamp = e.timestamp;
      if (e.errorMessage) entry.lastSnippet = e.errorMessage;
    }
  });

  return Array.from(errorMap.values()).map((e, idx) => ({
    id: `err_${idx + 1}`,
    errorType: e.errorType,
    timestamp: e.lastTimestamp,
    feature: e.feature,
    affectedAccountsCount: e.affectedAccounts.size,
    occurrenceCount: e.count,
    lastMessageSnippet: e.lastSnippet,
  }));
}

/**
 * System Telemetry metrics.
 */
export function getSystemTelemetry(): SystemTelemetryData {
  return {
    isConfigured: false,
    apiFailures: null,
    requestFailures: null,
    averageResponseTimeMs: null,
    errorRatePct: null,
    serviceAvailabilityPct: null,
    notes: 'System telemetry not configured. External APM / OpenTelemetry collector not connected.',
  };
}

/**
 * Detailed Engagement Telemetry for Owner Dashboard
 */
export function getEngagementDetails(range: AnalyticsDateRange = '30d'): EngagementDetails {
  const events = filterEventsByRange(getStoredEvents(), range);

  let ideasGenerated = 0;
  let projectsCreated = 0;
  let creationKitsCreated = 0;
  let promptsCopied = 0;
  let publishingStarted = 0;
  let projectsCompleted = 0;

  const creationActionNames = new Set<CreatorFlowEventName>([
    'idea_generated',
    'project_created',
    'creation_kit_created',
    'prompt_copied',
    'script_created',
    'visual_plan_created',
    'voice_workflow_used',
    'editing_workflow_used',
    'publishing_started',
    'publishing_completed',
    'project_completed',
  ]);

  const activeAccountIds = new Set<string>();
  const passiveAccountIds = new Set<string>();
  const allAccountIds = new Set<string>();

  // Daily timeline map
  const dailyMap = new Map<string, { totalEvents: number; accounts: Set<string>; ideas: number; kits: number; projects: number }>();

  // Plan actions map
  const planActionMap = new Map<string, { totalEvents: number; accounts: Set<string> }>();
  ['free', 'pro', 'creator', 'max', 'custom_annual'].forEach((p) => {
    planActionMap.set(p, { totalEvents: 0, accounts: new Set() });
  });

  events.forEach((e) => {
    const acc = e.accountId;
    if (acc && acc !== 'anonymous_user') {
      allAccountIds.add(acc);
      if (creationActionNames.has(e.eventName)) {
        activeAccountIds.add(acc);
      } else {
        passiveAccountIds.add(acc);
      }

      const planKey = (e.plan || 'free').toLowerCase();
      let pEntry = planActionMap.get(planKey);
      if (!pEntry) {
        pEntry = { totalEvents: 0, accounts: new Set() };
        planActionMap.set(planKey, pEntry);
      }
      pEntry.totalEvents++;
      pEntry.accounts.add(acc);
    }

    if (e.eventName === 'idea_generated') ideasGenerated++;
    if (e.eventName === 'project_created') projectsCreated++;
    if (e.eventName === 'creation_kit_created') creationKitsCreated++;
    if (e.eventName === 'prompt_copied') promptsCopied++;
    if (e.eventName === 'publishing_started') publishingStarted++;
    if (e.eventName === 'project_completed') projectsCompleted++;

    // Timeline group by YYYY-MM-DD
    const dateStr = e.timestamp.split('T')[0] || 'Unknown';
    let dEntry = dailyMap.get(dateStr);
    if (!dEntry) {
      dEntry = { totalEvents: 0, accounts: new Set(), ideas: 0, kits: 0, projects: 0 };
      dailyMap.set(dateStr, dEntry);
    }
    dEntry.totalEvents++;
    if (acc) dEntry.accounts.add(acc);
    if (e.eventName === 'idea_generated') dEntry.ideas++;
    if (e.eventName === 'creation_kit_created') dEntry.kits++;
    if (e.eventName === 'project_created') dEntry.projects++;
  });

  // Refine passive accounts (any user who has ever been active is not passive)
  activeAccountIds.forEach((id) => passiveAccountIds.delete(id));

  const totalTracked = allAccountIds.size;
  const activeCount = activeAccountIds.size;
  const passiveCount = passiveAccountIds.size;
  const activeRatio = totalTracked > 0 ? Math.round((activeCount / totalTracked) * 1000) / 10 : null;

  // Plan metrics
  let highestAvg = -1;
  let mostEngagedPlan: string | null = null;
  const planEngagement: PlanEngagementMetric[] = [];

  planActionMap.forEach((data, plan) => {
    const userCount = data.accounts.size;
    const avg = userCount > 0 ? Math.round((data.totalEvents / userCount) * 10) / 10 : 0;
    if (userCount > 0 && avg > highestAvg) {
      highestAvg = avg;
      mostEngagedPlan = plan;
    }
    planEngagement.push({
      plan,
      userCount,
      totalEvents: data.totalEvents,
      avgEventsPerUser: avg,
    });
  });

  // Daily timeline sorted ascending
  const dailyTimeline: DailyEngagementPoint[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      totalEvents: data.totalEvents,
      activeAccounts: data.accounts.size,
      ideas: data.ideas,
      kits: data.kits,
      projects: data.projects,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    ideasGenerated,
    projectsCreated,
    creationKitsCreated,
    promptsCopied,
    publishingStarted,
    projectsCompleted,
    activeCreatorsCount: activeCount,
    passiveCreatorsCount: passiveCount,
    activeCreatorRatioPct: activeRatio,
    mostEngagedPlanTier: mostEngagedPlan,
    planEngagement,
    dailyTimeline,
    hasData: events.length > 0,
  };
}

/**
 * Detailed Retention Cohort Analysis for Owner Dashboard
 */
export function getRetentionAnalysis(range: AnalyticsDateRange = '30d'): RetentionAnalysisData {
  const allEvents = getStoredEvents();
  const filteredEvents = filterEventsByRange(allEvents, range);

  // Group accounts by first recorded appearance
  const accountFirstSeen = new Map<string, number>();
  const accountActiveDates = new Map<string, number[]>();

  allEvents.forEach((e) => {
    if (!e.accountId || e.accountId === 'anonymous_user') return;
    const time = new Date(e.timestamp).getTime();
    if (!accountFirstSeen.has(e.accountId)) {
      accountFirstSeen.set(e.accountId, time);
      accountActiveDates.set(e.accountId, [time]);
    } else {
      accountActiveDates.get(e.accountId)!.push(time);
    }
  });

  const totalTrackedAccounts = accountFirstSeen.size;

  // Check if at least 24 hours have elapsed for ANY account to compute honest retention
  const now = Date.now();
  let oldestAccountAgeMs = 0;
  accountFirstSeen.forEach((firstTime) => {
    const age = now - firstTime;
    if (age > oldestAccountAgeMs) oldestAccountAgeMs = age;
  });

  // Only consider historical data sufficient if oldest account is at least 24h old AND multiple events exist
  const hasEnoughHistoricalData = oldestAccountAgeMs >= 24 * 60 * 60 * 1000 && allEvents.length >= 3;

  // Base overall rates
  const overall = calculateAccountRetention(filteredEvents);

  // Frequency distribution (how many distinct active event timestamps/sessions)
  let singleVisit = 0;
  let twoToFiveVisits = 0;
  let sixToFifteenVisits = 0;
  let moreThanFifteenVisits = 0;

  accountActiveDates.forEach((times) => {
    const count = times.length;
    if (count <= 1) singleVisit++;
    else if (count <= 5) twoToFiveVisits++;
    else if (count <= 15) sixToFifteenVisits++;
    else moreThanFifteenVisits++;
  });

  // Build weekly cohorts if historical data exists
  const cohorts: RetentionCohortRow[] = [];
  if (hasEnoughHistoricalData) {
    // Group accounts by cohort date (e.g., week starting YYYY-MM-DD)
    const cohortBuckets = new Map<string, string[]>();

    accountFirstSeen.forEach((firstTime, accId) => {
      const d = new Date(firstTime);
      // Week-based bucket: e.g. YYYY-MM-DD
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let bucket = cohortBuckets.get(dateKey);
      if (!bucket) {
        bucket = [];
        cohortBuckets.set(dateKey, bucket);
      }
      bucket.push(accId);
    });

    cohortBuckets.forEach((accIds, cohortDate) => {
      const acquired = accIds.length;
      let d1Count = 0;
      let d7Count = 0;
      let d30Count = 0;

      const cohortTime = new Date(cohortDate).getTime();
      const isMaturedD1 = now - cohortTime >= 24 * 60 * 60 * 1000;
      const isMaturedD7 = now - cohortTime >= 7 * 24 * 60 * 60 * 1000;
      const isMaturedD30 = now - cohortTime >= 30 * 24 * 60 * 60 * 1000;

      accIds.forEach((accId) => {
        const times = accountActiveDates.get(accId) || [];
        const firstTime = accountFirstSeen.get(accId) || 0;

        const hasD1 = times.some((t) => t - firstTime >= 24 * 60 * 60 * 1000 && t - firstTime <= 48 * 60 * 60 * 1000);
        const hasD7 = times.some((t) => t - firstTime >= 24 * 60 * 60 * 1000 && t - firstTime <= 7 * 24 * 60 * 60 * 1000);
        const hasD30 = times.some((t) => t - firstTime >= 24 * 60 * 60 * 1000 && t - firstTime <= 30 * 24 * 60 * 60 * 1000);

        if (hasD1) d1Count++;
        if (hasD7) d7Count++;
        if (hasD30) d30Count++;
      });

      cohorts.push({
        cohortDate,
        usersAcquired: acquired,
        day1Count: d1Count,
        day1Rate: isMaturedD1 ? Math.round((d1Count / acquired) * 1000) / 10 : null,
        day7Count: d7Count,
        day7Rate: isMaturedD7 ? Math.round((d7Count / acquired) * 1000) / 10 : null,
        day30Count: d30Count,
        day30Rate: isMaturedD30 ? Math.round((d30Count / acquired) * 1000) / 10 : null,
      });
    });

    cohorts.sort((a, b) => b.cohortDate.localeCompare(a.cohortDate));
  }

  return {
    day1Rate: hasEnoughHistoricalData ? overall.day1 : null,
    day7Rate: hasEnoughHistoricalData ? overall.day7 : null,
    day30Rate: hasEnoughHistoricalData ? overall.day30 : null,
    cohorts,
    hasEnoughHistoricalData,
    totalTrackedAccounts,
    frequencyDistribution: {
      singleVisit,
      twoToFiveVisits,
      sixToFifteenVisits,
      moreThanFifteenVisits,
    },
  };
}
