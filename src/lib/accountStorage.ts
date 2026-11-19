/**
 * CreatorFlow AI — Account-Isolated Local Cache & Cloud Firestore Sync
 * Enforces strict per-account namespacing to prevent cross-account data leaks.
 * Account A data is 100% isolated from Account B data, both locally and in Firestore (`/workspaces/{accountId}/resources/{resource}`).
 */

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { CreatorProfile, VideoProject, RecommendedVideoIdea, VideoAnalytics, ContentOpportunity, ContentPack, CreatorActivityStats } from '../types';
import { AssistantMessage } from './assistantStorage';
import { getCurrentAccount } from './auth';

// Anonymous baseline key
export const ANONYMOUS_ACCOUNT_ID = 'anonymous_workspace';

export function getActiveAccountId(): string {
  const user = getCurrentAccount();
  return user && user.id ? user.id : ANONYMOUS_ACCOUNT_ID;
}

export function getAccountScopedKey(accountId: string, resource: string): string {
  const cleanId = (accountId || ANONYMOUS_ACCOUNT_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `cf_acc_${cleanId}_${resource}_v1`;
}

/**
 * Asynchronously push an account-scoped resource to Firestore if the user is signed in
 * and their Firebase Auth UID matches the target accountId.
 */
async function syncResourceToCloud(accountId: string, resource: string, data: any): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!accountId || accountId === ANONYMOUS_ACCOUNT_ID) return;
  if (!auth.currentUser || auth.currentUser.uid !== accountId) return;

  try {
    const payloadJson = JSON.stringify(data).slice(0, 490000);
    const ref = doc(db, 'workspaces', accountId, 'resources', resource);
    await setDoc(ref, {
      accountId,
      resource,
      payloadJson,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking cloud sync
    console.warn(`Cloud sync skipped for ${resource}:`, err);
  }
}

/**
 * Pull all workspace resources from Firestore into the isolated local cache for the authenticated account.
 */
export async function syncAccountWorkspaceFromCloud(accountId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!accountId || accountId === ANONYMOUS_ACCOUNT_ID) return;
  if (!auth.currentUser || auth.currentUser.uid !== accountId) return;

  const resources = [
    'profile',
    'projects',
    'ideas',
    'content_packs',
    'analytics',
    'activity_stats',
    'saved_opportunities',
    'dismissed_opportunities',
    'production_kit',
    'guided_workflow',
    'onboarding_tour',
    'situation_lab',
  ];

  await Promise.all(
    resources.map(async (resName) => {
      try {
        const ref = doc(db, 'workspaces', accountId, 'resources', resName);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data && typeof data.payloadJson === 'string') {
            const key = getAccountScopedKey(accountId, resName);
            localStorage.setItem(key, data.payloadJson);
          }
        } else {
          // If local account cache already has data, push it up to initialize cloud workspace
          const key = getAccountScopedKey(accountId, resName);
          const localRaw = localStorage.getItem(key);
          if (localRaw) {
            try {
              const parsed = JSON.parse(localRaw);
              await syncResourceToCloud(accountId, resName, parsed);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore offline or missing resource
      }
    })
  );

  try {
    window.dispatchEvent(new CustomEvent('creatorflow_workspace_hydrated', { detail: { accountId } }));
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// PROFILE ISOLATION
// -------------------------------------------------------------
export function getIsolatedProfile(accountId: string = getActiveAccountId()): CreatorProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getAccountScopedKey(accountId, 'profile');
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CreatorProfile;
  } catch {
    return null;
  }
}

export function saveIsolatedProfile(profile: CreatorProfile, accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'profile');
    localStorage.setItem(key, JSON.stringify(profile));
    syncResourceToCloud(accountId, 'profile', profile);
  } catch (err) {
    console.error('Error saving isolated profile:', err);
  }
}

// -------------------------------------------------------------
// PROJECTS ISOLATION
// -------------------------------------------------------------
export function getIsolatedProjects(accountId: string = getActiveAccountId()): VideoProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAccountScopedKey(accountId, 'projects');
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIsolatedProjects(projects: VideoProject[], accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'projects');
    localStorage.setItem(key, JSON.stringify(projects));
    syncResourceToCloud(accountId, 'projects', projects);
  } catch (err) {
    console.error('Error saving isolated projects:', err);
  }
}

// -------------------------------------------------------------
// IDEAS ISOLATION
// -------------------------------------------------------------
export function getIsolatedIdeas(accountId: string = getActiveAccountId()): RecommendedVideoIdea[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getAccountScopedKey(accountId, 'ideas');
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveIsolatedIdeas(ideas: RecommendedVideoIdea[], accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'ideas');
    localStorage.setItem(key, JSON.stringify(ideas));
    syncResourceToCloud(accountId, 'ideas', ideas);
  } catch (err) {
    console.error('Error saving isolated ideas:', err);
  }
}

// -------------------------------------------------------------
// CONTENT PACKS ISOLATION
// -------------------------------------------------------------
export function getIsolatedContentPacks(accountId: string = getActiveAccountId()): ContentPack[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAccountScopedKey(accountId, 'content_packs');
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIsolatedContentPacks(packs: ContentPack[], accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = packs.slice(0, 40);
    const key = getAccountScopedKey(accountId, 'content_packs');
    localStorage.setItem(key, JSON.stringify(trimmed));
    syncResourceToCloud(accountId, 'content_packs', trimmed);
  } catch (err) {
    console.error('Error saving isolated content packs:', err);
  }
}

export function clearIsolatedContentPacks(accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'content_packs');
    localStorage.removeItem(key);
    localStorage.removeItem('creatorflow_saved_packs');
    syncResourceToCloud(accountId, 'content_packs', []);
  } catch (err) {
    console.error('Error clearing isolated content packs:', err);
  }
}

// -------------------------------------------------------------
// ANALYTICS ISOLATION
// -------------------------------------------------------------
export function getIsolatedAnalytics(accountId: string = getActiveAccountId()): VideoAnalytics[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAccountScopedKey(accountId, 'analytics');
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIsolatedAnalytics(records: VideoAnalytics[], accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'analytics');
    localStorage.setItem(key, JSON.stringify(records));
    syncResourceToCloud(accountId, 'analytics', records);
  } catch (err) {
    console.error('Error saving isolated analytics:', err);
  }
}

// -------------------------------------------------------------
// ACTIVITY STATS ISOLATION
// -------------------------------------------------------------
export function getIsolatedActivityStats(accountId: string = getActiveAccountId()): Partial<CreatorActivityStats> | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getAccountScopedKey(accountId, 'activity_stats');
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Partial<CreatorActivityStats>) : null;
  } catch {
    return null;
  }
}

export function saveIsolatedActivityStats(stats: CreatorActivityStats, accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'activity_stats');
    localStorage.setItem(key, JSON.stringify(stats));
    localStorage.removeItem('creatorflow_activity_stats_v3');
    syncResourceToCloud(accountId, 'activity_stats', stats);
  } catch (err) {
    console.error('Error saving isolated activity stats:', err);
  }
}

export function clearIsolatedActivityStats(accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'activity_stats');
    localStorage.removeItem(key);
    localStorage.removeItem('creatorflow_activity_stats_v3');
    syncResourceToCloud(accountId, 'activity_stats', null);
  } catch (err) {
    console.error('Error clearing isolated activity stats:', err);
  }
}

export async function deleteCloudWorkspaceResources(accountId: string, resources: string[]): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!accountId || accountId === ANONYMOUS_ACCOUNT_ID) return;
  if (!auth.currentUser || auth.currentUser.uid !== accountId) return;

  await Promise.all(
    resources.map(async (resName) => {
      try {
        const ref = doc(db, 'workspaces', accountId, 'resources', resName);
        await deleteDoc(ref);
      } catch {
        // non-blocking cleanup
      }
    })
  );
}

export function clearAllAccountWorkspaceData(
  accountId: string = getActiveAccountId(),
  options?: { includeProfileAndTour?: boolean }
): void {
  if (typeof window === 'undefined') return;
  const includeProfileAndTour = Boolean(options?.includeProfileAndTour);
  const resources = [
    'projects',
    'ideas',
    'content_packs',
    'analytics',
    'activity_stats',
    'saved_opportunities',
    'dismissed_opportunities',
    'production_kit',
    'guided_workflow',
    'assistant_history',
    'situation_lab',
    ...(includeProfileAndTour ? ['profile', 'onboarding_tour', 'user_prefs'] : []),
  ];

  for (const res of resources) {
    try {
      localStorage.removeItem(getAccountScopedKey(accountId, res));
      if (!includeProfileAndTour && res !== 'assistant_history') {
        const emptyVal = res === 'guided_workflow' || res === 'production_kit' || res === 'activity_stats' ? null : [];
        syncResourceToCloud(accountId, res, emptyVal);
      }
    } catch {
      // ignore
    }
  }

  if (includeProfileAndTour) {
    const cleanId = (accountId || ANONYMOUS_ACCOUNT_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
    const scopedPrefixes = [
      `creatorflow_plan_subscription_v3_${cleanId}`,
      `creatorflow_usage_counters_v3_${cleanId}`,
      `creatorflow_custom_annual_config_v3_${cleanId}`,
      `cf_radar_daily_usage_v2_${cleanId}`,
      `cf_usage_cache_v1_${cleanId}`,
      `cf_assistant_usage_${cleanId}`,
      `creatorflow_video_quota_v1_${cleanId}`,
      `creatorflow_achievements_v2_${cleanId}`,
      `creatorflow_milestone_events_v2_${cleanId}`,
      `creatorflow_gen_count_${accountId}`,
    ];
    for (const k of scopedPrefixes) {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    }
    deleteCloudWorkspaceResources(accountId, resources.filter((r) => r !== 'assistant_history' && r !== 'user_prefs')).catch(() => {});
  }

  // Remove any legacy global unscoped keys so they never bleed back
  const legacyKeys = [
    'creatorflow_saved_packs',
    'creatorflow_video_projects_v3',
    'creatorflow_video_analytics_v1',
    'creatorflow_ideas_v3',
    'creatorflow_activity_stats_v3',
    'creatorflow_production_kit_v1',
  ];
  for (const k of legacyKeys) {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }
}

// -------------------------------------------------------------
// ASSISTANT HISTORY ISOLATION
// -------------------------------------------------------------
export function getIsolatedAssistantHistory(accountId: string = getActiveAccountId()): AssistantMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAccountScopedKey(accountId, 'assistant_history');
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as AssistantMessage[];
  } catch {
    return [];
  }
}

export function saveIsolatedAssistantHistory(messages: AssistantMessage[], accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = messages.slice(-20);
    const key = getAccountScopedKey(accountId, 'assistant_history');
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error saving isolated assistant history:', err);
  }
}

export function clearIsolatedAssistantHistory(accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'assistant_history');
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Error clearing isolated assistant history:', err);
  }
}

// -------------------------------------------------------------
// PRODUCTION KIT ISOLATION
// -------------------------------------------------------------
export function getIsolatedProductionKit(accountId: string = getActiveAccountId()): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getAccountScopedKey(accountId, 'production_kit');
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveIsolatedProductionKit(kit: any, accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'production_kit');
    localStorage.setItem(key, JSON.stringify(kit));
    syncResourceToCloud(accountId, 'production_kit', kit);
  } catch (err) {
    console.error('Error saving isolated production kit:', err);
  }
}

// -------------------------------------------------------------
// RADAR OPPORTUNITIES ISOLATION (SAVED & DISMISSED)
// -------------------------------------------------------------
export function getIsolatedSavedOpportunities(accountId: string = getActiveAccountId()): ContentOpportunity[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAccountScopedKey(accountId, 'saved_opportunities');
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIsolatedOpportunity(opportunity: ContentOpportunity, accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getIsolatedSavedOpportunities(accountId);
    const existingIndex = list.findIndex((o) => o.id === opportunity.id);
    const nextList = [...list];
    const withSavedFlag: ContentOpportunity = { ...opportunity, isSaved: true };
    if (existingIndex >= 0) {
      nextList[existingIndex] = withSavedFlag;
    } else {
      nextList.unshift(withSavedFlag);
    }
    const key = getAccountScopedKey(accountId, 'saved_opportunities');
    localStorage.setItem(key, JSON.stringify(nextList));
    syncResourceToCloud(accountId, 'saved_opportunities', nextList);
    window.dispatchEvent(new CustomEvent('creatorflow_opportunity_saved', { detail: { opportunity } }));
  } catch (err) {
    console.error('Error saving isolated opportunity:', err);
  }
}

export function removeIsolatedSavedOpportunity(opportunityId: string, accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getIsolatedSavedOpportunities(accountId);
    const nextList = list.filter((o) => o.id !== opportunityId);
    const key = getAccountScopedKey(accountId, 'saved_opportunities');
    localStorage.setItem(key, JSON.stringify(nextList));
    syncResourceToCloud(accountId, 'saved_opportunities', nextList);
    window.dispatchEvent(new CustomEvent('creatorflow_opportunity_removed', { detail: { opportunityId } }));
  } catch (err) {
    console.error('Error removing isolated opportunity:', err);
  }
}

export function isOpportunitySaved(opportunityId: string, accountId: string = getActiveAccountId()): boolean {
  const list = getIsolatedSavedOpportunities(accountId);
  return list.some((o) => o.id === opportunityId);
}

export function getIsolatedDismissedOpportunityIds(accountId: string = getActiveAccountId()): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAccountScopedKey(accountId, 'dismissed_opportunities');
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function dismissIsolatedOpportunity(opportunityId: string, accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getIsolatedDismissedOpportunityIds(accountId);
    if (!list.includes(opportunityId)) {
      list.push(opportunityId);
      const key = getAccountScopedKey(accountId, 'dismissed_opportunities');
      localStorage.setItem(key, JSON.stringify(list));
      syncResourceToCloud(accountId, 'dismissed_opportunities', list);
      window.dispatchEvent(new CustomEvent('creatorflow_opportunity_dismissed', { detail: { opportunityId } }));
    }
  } catch (err) {
    console.error('Error dismissing isolated opportunity:', err);
  }
}

export function clearDismissedOpportunities(accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'dismissed_opportunities');
    localStorage.removeItem(key);
    syncResourceToCloud(accountId, 'dismissed_opportunities', []);
  } catch (err) {
    console.error('Error clearing dismissed opportunities:', err);
  }
}

// -------------------------------------------------------------
// GUIDED WORKFLOW ISOLATION
// -------------------------------------------------------------
export function getIsolatedGuidedWorkflow(accountId: string = getActiveAccountId()): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getAccountScopedKey(accountId, 'guided_workflow');
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveIsolatedGuidedWorkflow(state: any, accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'guided_workflow');
    localStorage.setItem(key, JSON.stringify(state));
    syncResourceToCloud(accountId, 'guided_workflow', state);
  } catch (err) {
    console.error('Error saving isolated guided workflow state:', err);
  }
}

export function clearIsolatedGuidedWorkflow(accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getAccountScopedKey(accountId, 'guided_workflow');
    localStorage.removeItem(key);
    syncResourceToCloud(accountId, 'guided_workflow', null);
  } catch (err) {
    console.error('Error clearing isolated guided workflow state:', err);
  }
}

// -------------------------------------------------------------
// SITUATION LAB CASES ISOLATION
// -------------------------------------------------------------
export function getIsolatedSituationCases(accountId: string = getActiveAccountId()): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAccountScopedKey(accountId, 'situation_lab');
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveIsolatedSituationCases(cases: any[], accountId: string = getActiveAccountId()): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = Array.isArray(cases) ? cases.slice(0, 30) : [];
    const key = getAccountScopedKey(accountId, 'situation_lab');
    localStorage.setItem(key, JSON.stringify(trimmed));
    syncResourceToCloud(accountId, 'situation_lab', trimmed);
  } catch (err) {
    console.error('Error saving isolated situation lab cases:', err);
  }
}

// -------------------------------------------------------------
// DATA MIGRATION & CONFLICT-SAFE MERGE STRATEGY
// -------------------------------------------------------------
export function migrateAnonymousDataToAccount(
  targetAccountId: string,
  choice: 'keep' | 'fresh'
): { migratedItems: string[]; conflictsResolved: number } {
  const migratedItems: string[] = [];
  let conflictsResolved = 0;

  if (typeof window === 'undefined') {
    return { migratedItems, conflictsResolved };
  }

  if (choice === 'keep') {
    // 1. Projects — safe non-destructive merge by project ID
    const existingTargetProjects = getIsolatedProjects(targetAccountId);
    let sourceProjects = getIsolatedProjects(ANONYMOUS_ACCOUNT_ID);
    if (sourceProjects.length === 0) {
      try {
        const legacy = localStorage.getItem('creatorflow_video_projects_v3');
        if (legacy) sourceProjects = JSON.parse(legacy);
      } catch {
        // ignore
      }
    }
    if (Array.isArray(sourceProjects) && sourceProjects.length > 0) {
      const mergedMap = new Map<string, VideoProject>();
      existingTargetProjects.forEach((p) => mergedMap.set(p.id, p));
      sourceProjects.forEach((p) => {
        if (mergedMap.has(p.id)) {
          conflictsResolved++;
        } else {
          mergedMap.set(p.id, p);
        }
      });
      saveIsolatedProjects(Array.from(mergedMap.values()), targetAccountId);
      migratedItems.push(`${sourceProjects.length} project(s)`);
    }

    // 2. Profile — only migrate if target account hasn't completed onboarding yet
    const existingTargetProfile = getIsolatedProfile(targetAccountId);
    let sourceProfile = getIsolatedProfile(ANONYMOUS_ACCOUNT_ID);
    if (!sourceProfile) {
      try {
        const legacy = localStorage.getItem('creatorflow_creator_profile_v3');
        if (legacy) sourceProfile = JSON.parse(legacy);
      } catch {
        // ignore
      }
    }
    if (sourceProfile) {
      if (!existingTargetProfile || !existingTargetProfile.onboardingCompleted) {
        saveIsolatedProfile(sourceProfile, targetAccountId);
        migratedItems.push('Creator profile');
      } else {
        conflictsResolved++;
      }
    }

    // 3. Analytics — safe non-destructive merge by record ID
    const existingTargetAnalytics = getIsolatedAnalytics(targetAccountId);
    let sourceAnalytics = getIsolatedAnalytics(ANONYMOUS_ACCOUNT_ID);
    if (sourceAnalytics.length === 0) {
      try {
        const legacy = localStorage.getItem('creatorflow_video_analytics_v1');
        if (legacy) sourceAnalytics = JSON.parse(legacy);
      } catch {
        // ignore
      }
    }
    if (Array.isArray(sourceAnalytics) && sourceAnalytics.length > 0) {
      const mergedAnalytics = new Map<string, VideoAnalytics>();
      existingTargetAnalytics.forEach((a) => mergedAnalytics.set(a.id, a));
      sourceAnalytics.forEach((a) => {
        if (mergedAnalytics.has(a.id)) {
          conflictsResolved++;
        } else {
          mergedAnalytics.set(a.id, a);
        }
      });
      saveIsolatedAnalytics(Array.from(mergedAnalytics.values()), targetAccountId);
      migratedItems.push(`${sourceAnalytics.length} analytics record(s)`);
    }
  }

  // Clear anonymous and legacy unscoped keys so they never leak into another account
  localStorage.removeItem(getAccountScopedKey(ANONYMOUS_ACCOUNT_ID, 'profile'));
  localStorage.removeItem(getAccountScopedKey(ANONYMOUS_ACCOUNT_ID, 'projects'));
  localStorage.removeItem(getAccountScopedKey(ANONYMOUS_ACCOUNT_ID, 'ideas'));
  localStorage.removeItem(getAccountScopedKey(ANONYMOUS_ACCOUNT_ID, 'analytics'));
  localStorage.removeItem(getAccountScopedKey(ANONYMOUS_ACCOUNT_ID, 'activity_stats'));
  localStorage.removeItem(getAccountScopedKey(ANONYMOUS_ACCOUNT_ID, 'assistant_history'));
  localStorage.removeItem(getAccountScopedKey(ANONYMOUS_ACCOUNT_ID, 'production_kit'));
  localStorage.removeItem(getAccountScopedKey(ANONYMOUS_ACCOUNT_ID, 'guided_workflow'));
  localStorage.removeItem('creatorflow_creator_profile_v3');
  localStorage.removeItem('creatorflow_video_projects_v3');
  localStorage.removeItem('creatorflow_video_analytics_v1');
  localStorage.removeItem('creatorflow_ideas_v3');
  localStorage.removeItem('creatorflow_activity_stats_v3');

  return { migratedItems, conflictsResolved };
}
