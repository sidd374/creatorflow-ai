/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Strictly per-UID response cache for the CreatorFlow Intelligence Engine.
 * Zero cross-user leakage: all keys include hashed UID, and clearUserIntelligenceCache(uid)
 * purges all cached items for that account on key removal, model switch, or account deletion.
 */

import crypto from 'crypto';
import type { GeminiModelId, IntelligenceExecutionResponse, IntelligenceTaskType } from './types.ts';

interface CachedResponseEntry {
  uid: string;
  expiresAt: number;
  response: IntelligenceExecutionResponse;
}

const DEFAULT_RESPONSE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const MAX_CACHE_ENTRIES = 500;
const userResponseCache = new Map<string, CachedResponseEntry>();

export function buildUserResponseCacheKey(params: {
  uid: string;
  task: IntelligenceTaskType;
  model: GeminiModelId;
  inputFingerprint: unknown;
  contextFingerprint: unknown;
}): string {
  const payload = JSON.stringify({
    uid: params.uid,
    task: params.task,
    model: params.model,
    input: params.inputFingerprint,
    ctx: params.contextFingerprint,
  });
  return `${params.uid}:${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

export function getCachedIntelligenceResponse(
  uid: string,
  cacheKey: string
): IntelligenceExecutionResponse | null {
  const entry = userResponseCache.get(cacheKey);
  if (!entry) return null;
  if (entry.uid !== uid) {
    // Defense-in-depth strict UID verification
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    userResponseCache.delete(cacheKey);
    return null;
  }
  return entry.response;
}

export function setCachedIntelligenceResponse(
  uid: string,
  cacheKey: string,
  response: IntelligenceExecutionResponse,
  ttlMs = DEFAULT_RESPONSE_TTL_MS
): void {
  if (userResponseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = userResponseCache.keys().next().value;
    if (oldestKey) userResponseCache.delete(oldestKey);
  }
  userResponseCache.set(cacheKey, {
    uid,
    expiresAt: Date.now() + ttlMs,
    response,
  });
}

export function clearUserIntelligenceCache(uid: string): number {
  let removed = 0;
  for (const [k, entry] of userResponseCache.entries()) {
    if (entry.uid === uid) {
      userResponseCache.delete(k);
      removed++;
    }
  }
  return removed;
}

export function clearAllIntelligenceCachesForTests(): void {
  userResponseCache.clear();
}
