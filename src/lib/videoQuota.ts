/**
 * CreatorFlow AI — Authoritative Video Creation Quota Engine
 *
 * Requirements:
 * - Free Plan: 2 videos per rolling 7-day period (168 hours).
 * - Pro Plan: 25 videos per rolling 7-day period (or monthly).
 * - Creator Plan: 75 videos.
 * - MAX Plan: 200 videos.
 * - Rolling 7-day calculation: count of video generations where
 *   timestamp > (now - 7 * 24 * 60 * 60 * 1000).
 * - Scoped per authenticated account.
 * - Deterministic reset countdown calculation.
 */

import { PlanId, getStoredPlan } from './planEntitlements';
import { getCurrentAccount, getAuthIdToken } from './auth';

export const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const VIDEO_CONSUMING_SINGLE_TOOL_IDS = new Set([
  'shorts-script-generator',
  'video-prompt-generator',
]);

export function consumesWeeklyVideoSlot(toolId: string): boolean {
  return VIDEO_CONSUMING_SINGLE_TOOL_IDS.has(toolId);
}

export interface ServerReservationResult {
  success: boolean;
  alreadyReserved?: boolean;
  reservationId?: string;
  workflowId?: string;
  weeklyUsed: number;
  weeklyLimit: number;
  weeklyRemaining: number;
  resetsAtMs: number | null;
  resetsInFormatted: string | null;
  effectivePlan: PlanId;
  error?: string;
  message?: string;
  upgradeUrl?: string;
}

export const WEEKLY_VIDEO_LIMITS: Record<PlanId, number | 'unlimited'> = {
  free: 2, // 2 videos per rolling 7-day period
  pro: 25,
  creator: 75,
  max: 200,
  custom_annual: 100,
};

export interface VideoGenerationTimestamp {
  id: string;
  timestamp: number; // Unix ms
  topic: string;
}

export interface WeeklyQuotaStatus {
  allowed: boolean;
  limit: number | 'unlimited';
  used: number;
  remaining: number;
  windowDays: number;
  oldestExpiringTimestamp: number | null;
  resetsInFormatted: string | null;
  plan: PlanId;
}

const STORAGE_PREFIX = 'cf_weekly_video_quota_v1_';
const inMemoryNodeStore = new Map<string, VideoGenerationTimestamp[]>();

function getStorageKey(accountId?: string): string {
  const current = accountId || getCurrentAccount()?.id || 'anonymous_workspace';
  const clean = current.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${STORAGE_PREFIX}${clean}`;
}

/**
 * Retrieve raw generation timestamps for account
 */
export function getStoredGenerationTimestamps(accountId?: string): VideoGenerationTimestamp[] {
  const key = getStorageKey(accountId);
  if (typeof window === 'undefined') {
    return inMemoryNodeStore.get(key) || [];
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Filter timestamps to only those within the rolling 7-day window
 */
export function getActiveWindowTimestamps(
  accountId?: string,
  nowMs: number = Date.now()
): VideoGenerationTimestamp[] {
  const all = getStoredGenerationTimestamps(accountId);
  const cutoff = nowMs - ROLLING_WINDOW_MS;
  return all.filter((entry) => typeof entry.timestamp === 'number' && entry.timestamp > cutoff);
}

/**
 * Calculate human-readable countdown to next quota release
 */
export function formatTimeUntilReset(msRemaining: number): string {
  if (msRemaining <= 0) return 'Available now';
  const totalHours = Math.floor(msRemaining / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(1, minutes)}m`;
}

/**
 * Check authoritative weekly video quota status
 */
export function checkWeeklyVideoQuota(
  planId?: PlanId,
  accountId?: string,
  nowMs: number = Date.now()
): WeeklyQuotaStatus {
  const plan = planId || getStoredPlan();
  const limit = WEEKLY_VIDEO_LIMITS[plan] ?? 2;

  if (limit === 'unlimited') {
    return {
      allowed: true,
      limit: 'unlimited',
      used: 0,
      remaining: 9999,
      windowDays: 7,
      oldestExpiringTimestamp: null,
      resetsInFormatted: null,
      plan,
    };
  }

  const active = getActiveWindowTimestamps(accountId, nowMs);
  const used = active.length;
  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;

  let oldestExpiring: number | null = null;
  let resetsInFormatted: string | null = null;

  if (active.length > 0) {
    // Sort oldest first
    const sorted = [...active].sort((a, b) => a.timestamp - b.timestamp);
    const oldest = sorted[0];
    const expiryTime = oldest.timestamp + ROLLING_WINDOW_MS;
    const msUntilExpiry = Math.max(0, expiryTime - nowMs);
    oldestExpiring = expiryTime;
    resetsInFormatted = formatTimeUntilReset(msUntilExpiry);
  }

  return {
    allowed,
    limit,
    used,
    remaining,
    windowDays: 7,
    oldestExpiringTimestamp: oldestExpiring,
    resetsInFormatted,
    plan,
  };
}

/**
 * Record a video generation in the rolling 7-day log
 */
export function recordWeeklyVideoGeneration(
  topic: string,
  accountId?: string,
  nowMs: number = Date.now()
): WeeklyQuotaStatus {
  const active = getActiveWindowTimestamps(accountId, nowMs);
  const newEntry: VideoGenerationTimestamp = {
    id: `vgen_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: nowMs,
    topic: topic || 'Untitled Video',
  };

  const updated = [...active, newEntry];

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(accountId), JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('creatorflow_weekly_quota_changed', {
          detail: { accountId, count: updated.length },
        })
      );
    } catch {
      // ignore
    }
  } else {
    inMemoryNodeStore.set(getStorageKey(accountId), updated);
  }

  return checkWeeklyVideoQuota(undefined, accountId, nowMs);
}

/**
 * Reset quota for testing purposes
 */
export function resetWeeklyQuotaForTesting(accountId?: string): void {
  const key = getStorageKey(accountId);
  inMemoryNodeStore.delete(key);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
}

/**
 * Authoritatively reserve a video slot on the server before video generation/production begins
 */
export async function reserveVideoSlotServer(params: {
  workflowId: string;
  topic?: string;
  idempotencyKey?: string;
  accountId?: string;
  nowMs?: number;
  extraHeaders?: Record<string, string>;
}): Promise<ServerReservationResult> {
  const account = getCurrentAccount();
  const accountId = params.accountId || account?.id;
  let token: string | null = null;
  try {
    token = await getAuthIdToken();
  } catch {
    token = null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(params.extraHeaders || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (params.nowMs) {
    headers['x-test-clock-ms'] = String(params.nowMs);
  }

  try {
    const res = await fetch('/api/video/reserve-slot', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        accountId,
        workflowId: params.workflowId,
        topic: params.topic,
        idempotencyKey: params.idempotencyKey,
        customTimestampMs: params.nowMs,
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      if (!data.alreadyReserved) {
        recordWeeklyVideoGeneration(params.topic || 'Video', accountId, params.nowMs || Date.now());
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('creatorflow_weekly_quota_changed', {
            detail: { accountId, count: data.weeklyUsed },
          })
        );
      }
      return data;
    }

    return {
      success: false,
      error: data.error || 'RESERVATION_FAILED',
      message:
        data.message ||
        'You’ve used your 2 free video starts. Upgrade your plan to continue now, or come back when your next slot resets.',
      weeklyUsed: data.weeklyUsed ?? 2,
      weeklyLimit: data.weeklyLimit ?? 2,
      weeklyRemaining: data.weeklyRemaining ?? 0,
      resetsAtMs: data.resetsAtMs ?? null,
      resetsInFormatted: data.resetsInFormatted ?? null,
      effectivePlan: data.effectivePlan || 'free',
      upgradeUrl: data.upgradeUrl || '/pricing',
    };
  } catch {
    // Fail closed when server is unreachable so quota cannot be bypassed offline
    const local = checkWeeklyVideoQuota(undefined, accountId, params.nowMs);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message:
        'Unable to verify your video quota with the server right now. Please check your connection and try again.',
      weeklyUsed: local.used,
      weeklyLimit: local.limit === 'unlimited' ? 9999 : local.limit,
      weeklyRemaining: 0,
      resetsAtMs: local.oldestExpiringTimestamp,
      resetsInFormatted: local.resetsInFormatted,
      effectivePlan: local.plan,
      upgradeUrl: '/pricing',
    };
  }
}

/**
 * Roll back the most recent local reservation matching a topic when a generation request fails
 */
export function rollbackLocalVideoReservation(topic: string, accountId?: string): void {
  const key = getStorageKey(accountId);
  const cleanTopic = topic || 'Video';
  if (typeof window === 'undefined') {
    const existing = inMemoryNodeStore.get(key) || [];
    const idx = existing.map((e) => e.topic).lastIndexOf(cleanTopic);
    if (idx >= 0) {
      existing.splice(idx, 1);
      inMemoryNodeStore.set(key, existing);
    }
    return;
  }

  try {
    const existing = getStoredGenerationTimestamps(accountId);
    const idx = existing.map((e) => e.topic).lastIndexOf(cleanTopic);
    if (idx >= 0) {
      existing.splice(idx, 1);
      localStorage.setItem(key, JSON.stringify(existing));
      window.dispatchEvent(
        new CustomEvent('creatorflow_weekly_quota_changed', {
          detail: { accountId, count: existing.length },
        })
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Release a newly reserved server slot if the generation request failed before producing output
 */
export async function releaseVideoSlotServer(params: {
  workflowId: string;
  topic?: string;
  accountId?: string;
  extraHeaders?: Record<string, string>;
}): Promise<void> {
  const account = getCurrentAccount();
  const accountId = params.accountId || account?.id;
  rollbackLocalVideoReservation(params.topic || 'Video', accountId);

  let token: string | null = null;
  try {
    token = await getAuthIdToken();
  } catch {
    token = null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(params.extraHeaders || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    await fetch('/api/video/release-slot', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        accountId,
        workflowId: params.workflowId,
      }),
    });
  } catch {
    // non-fatal
  }
}

/**
 * Fetch authoritative video quota status directly from server
 */
export async function fetchServerVideoQuota(
  accountId?: string,
  nowMs?: number,
  extraHeaders?: Record<string, string>
): Promise<WeeklyQuotaStatus> {
  const account = getCurrentAccount();
  const targetAcc = accountId || account?.id;
  let token: string | null = null;
  try {
    token = await getAuthIdToken();
  } catch {
    token = null;
  }

  const headers: Record<string, string> = {
    ...(extraHeaders || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (nowMs) headers['x-test-clock-ms'] = String(nowMs);

  try {
    const url = targetAcc ? `/api/video/quota?accountId=${encodeURIComponent(targetAcc)}` : '/api/video/quota';
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      return {
        allowed: Boolean(data.allowed),
        limit: data.weeklyLimit,
        used: data.weeklyUsed,
        remaining: data.weeklyRemaining,
        windowDays: 7,
        oldestExpiringTimestamp: data.resetsAtMs,
        resetsInFormatted: data.resetsInFormatted,
        plan: data.effectivePlan,
      };
    }
  } catch {
    // fallback
  }

  return checkWeeklyVideoQuota(undefined, targetAcc, nowMs);
}
