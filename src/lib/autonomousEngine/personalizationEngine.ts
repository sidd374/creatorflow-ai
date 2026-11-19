/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CreatorFlow AI — Personalization and Feedback Engine
 * Stores user preferences, ratings, and accepted/rejected strategies per account in localStorage.
 * Adjusts candidate ranking and strategy weights based on user feedback.
 * Strictly respects account scoping and privacy boundaries.
 */

import { CreativeStrategyType, UserGenerationPreferences } from './types';
import { ToneType } from '../../types';

export type ExplicitFeedbackAction = 'accepted' | 'rejected' | 'upvoted' | 'downvoted';
export type ImplicitFeedbackAction =
  | 'copied_title'
  | 'copied_hook'
  | 'exported_pack'
  | 'regenerated_without_copy'
  | 'edited_output';

export interface FeedbackEvent {
  id: string;
  timestamp: string;
  task: string;
  strategy: CreativeStrategyType;
  action: ExplicitFeedbackAction | ImplicitFeedbackAction;
  rating?: number; // 1 to 5 stars
  // Privacy boundary: raw scripts, topics, prompts, or edited user text are never stored here.
}

export interface UserPersonalizationProfile {
  accountId: string;
  enabled?: boolean;
  preferredTone?: ToneType;
  preferredLanguage?: string;
  strategyWeights: Record<CreativeStrategyType, number>; // Base 1.0, adjusted up/down
  totalGenerationsEvaluated: number;
  implicitSignalsCount?: number;
  lastUpdatedAt?: string;
  recentFeedbackEvents: FeedbackEvent[];
}

const STORAGE_PREFIX = 'cf_autonomous_personalization_v1_';
const inMemoryNodeProfiles = new Map<string, UserPersonalizationProfile>();

function getStorageKey(accountId: string = 'default_user'): string {
  const cleanId = accountId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${STORAGE_PREFIX}${cleanId}`;
}

export function getOrCreatePersonalizationProfile(accountId: string = 'default_user'): UserPersonalizationProfile {
  if (typeof window === 'undefined') {
    const existing = inMemoryNodeProfiles.get(accountId);
    if (existing) return existing;
    const fresh = createDefaultProfile(accountId);
    inMemoryNodeProfiles.set(accountId, fresh);
    return fresh;
  }

  try {
    const raw = localStorage.getItem(getStorageKey(accountId));
    if (raw) {
      const parsed = JSON.parse(raw) as UserPersonalizationProfile;
      return {
        ...createDefaultProfile(accountId),
        ...parsed,
        enabled: parsed.enabled !== false,
        strategyWeights: {
          ...createDefaultProfile(accountId).strategyWeights,
          ...(parsed.strategyWeights || {}),
        },
        recentFeedbackEvents: Array.isArray(parsed.recentFeedbackEvents) ? parsed.recentFeedbackEvents : [],
      };
    }
  } catch {
    // Fall back to default
  }

  const fresh = createDefaultProfile(accountId);
  savePersonalizationProfile(fresh);
  return fresh;
}

function createDefaultProfile(accountId: string): UserPersonalizationProfile {
  const defaultWeights: Record<CreativeStrategyType, number> = {
    curiosity_mystery: 1.0,
    problem_solution: 1.1,
    unexpected_contrast: 1.0,
    storytelling_case_study: 1.0,
    myth_vs_fact: 1.0,
    practical_tutorial: 1.1,
    question_led: 1.0,
    beginner_friendly: 1.0,
    contrarian_perspective: 0.95,
    emotional_narrative: 0.95,
  };

  return {
    accountId,
    enabled: true,
    strategyWeights: defaultWeights,
    totalGenerationsEvaluated: 0,
    implicitSignalsCount: 0,
    recentFeedbackEvents: [],
  };
}

export function savePersonalizationProfile(profile: UserPersonalizationProfile): void {
  // Enforce privacy boundary: never persist raw feedbackText/scripts/prompts inside feedback events
  const sanitized: UserPersonalizationProfile = {
    ...profile,
    recentFeedbackEvents: (profile.recentFeedbackEvents || []).map((ev) => ({
      id: ev.id,
      timestamp: ev.timestamp,
      task: ev.task,
      strategy: ev.strategy,
      action: ev.action,
      ...(typeof ev.rating === 'number' ? { rating: ev.rating } : {}),
    })),
  };

  if (typeof window === 'undefined') {
    inMemoryNodeProfiles.set(sanitized.accountId, sanitized);
    return;
  }
  try {
    localStorage.setItem(getStorageKey(sanitized.accountId), JSON.stringify(sanitized));
  } catch {
    // Gracefully handle storage failure
  }
}

export function isPersonalizationEnabled(accountId: string = 'default_user'): boolean {
  return getOrCreatePersonalizationProfile(accountId).enabled !== false;
}

export function setPersonalizationEnabled(accountId: string, enabled: boolean): UserPersonalizationProfile {
  const profile = getOrCreatePersonalizationProfile(accountId);
  profile.enabled = enabled;
  profile.lastUpdatedAt = new Date().toISOString();
  savePersonalizationProfile(profile);
  return profile;
}

export function resetPersonalizationProfile(accountId: string = 'default_user'): UserPersonalizationProfile {
  const fresh = createDefaultProfile(accountId);
  fresh.lastUpdatedAt = new Date().toISOString();
  savePersonalizationProfile(fresh);
  return fresh;
}

/**
 * Record explicit user feedback on a generated candidate
 */
export function recordCandidateFeedback(
  accountId: string,
  strategy: CreativeStrategyType,
  action: ExplicitFeedbackAction,
  task: string,
  rating?: number
): UserPersonalizationProfile {
  const profile = getOrCreatePersonalizationProfile(accountId);
  if (profile.enabled === false) {
    return profile;
  }

  const now = new Date().toISOString();
  const event: FeedbackEvent = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    task,
    strategy,
    action,
    ...(typeof rating === 'number' ? { rating } : {}),
  };

  profile.recentFeedbackEvents = [event, ...profile.recentFeedbackEvents.slice(0, 49)];
  profile.totalGenerationsEvaluated += 1;
  profile.lastUpdatedAt = now;

  // Adjust strategy weights conservatively
  const currentWeight = profile.strategyWeights[strategy] ?? 1.0;
  if (action === 'accepted' || action === 'upvoted') {
    profile.strategyWeights[strategy] = Math.min(1.5, Number((currentWeight + 0.05).toFixed(3)));
  } else if (action === 'rejected' || action === 'downvoted') {
    profile.strategyWeights[strategy] = Math.max(0.5, Number((currentWeight - 0.08).toFixed(3)));
  }

  savePersonalizationProfile(profile);
  return profile;
}

/**
 * Record lightweight implicit creator signal (copy title, copy hook, export pack, regenerate without copy, edit output).
 * Privacy-preserving: stores only aggregate strategy weights and anonymous signal counts.
 */
export function recordImplicitSignal(
  accountId: string,
  strategy: CreativeStrategyType,
  action: ImplicitFeedbackAction,
  task: string
): UserPersonalizationProfile {
  const profile = getOrCreatePersonalizationProfile(accountId);
  if (profile.enabled === false) {
    return profile;
  }

  const now = new Date().toISOString();
  const event: FeedbackEvent = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    task,
    strategy,
    action,
  };

  profile.recentFeedbackEvents = [event, ...profile.recentFeedbackEvents.slice(0, 49)];
  profile.totalGenerationsEvaluated += 1;
  profile.implicitSignalsCount = (profile.implicitSignalsCount || 0) + 1;
  profile.lastUpdatedAt = now;

  const currentWeight = profile.strategyWeights[strategy] ?? 1.0;
  if (action === 'copied_title' || action === 'copied_hook' || action === 'exported_pack') {
    profile.strategyWeights[strategy] = Math.min(1.5, Number((currentWeight + 0.03).toFixed(3)));
  } else if (action === 'edited_output') {
    profile.strategyWeights[strategy] = Math.min(1.5, Number((currentWeight + 0.015).toFixed(3)));
  } else if (action === 'regenerated_without_copy') {
    profile.strategyWeights[strategy] = Math.max(0.5, Number((currentWeight - 0.02).toFixed(3)));
  }

  savePersonalizationProfile(profile);
  return profile;
}

/**
 * Converts personalization profile into generation preferences
 */
export function getPreferencesFromProfile(profile: UserPersonalizationProfile): UserGenerationPreferences {
  if (profile.enabled === false) {
    return {
      preferredTone: undefined,
      preferredLanguage: undefined,
      favoriteStrategies: [],
      dislikedStrategies: [],
    };
  }

  const favorites: CreativeStrategyType[] = [];
  const disliked: CreativeStrategyType[] = [];

  for (const [strat, weight] of Object.entries(profile.strategyWeights) as [CreativeStrategyType, number][]) {
    if (weight >= 1.15) favorites.push(strat);
    if (weight <= 0.85) disliked.push(strat);
  }

  return {
    preferredTone: profile.preferredTone,
    preferredLanguage: profile.preferredLanguage,
    favoriteStrategies: favorites,
    dislikedStrategies: disliked,
  };
}
